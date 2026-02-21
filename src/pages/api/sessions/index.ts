import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { sessions, apiKeys } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID, randomBytes } from 'crypto';
import { createSession, initConnectedSessions } from '../../../lib/whatsapp';
import { sendTelegramLog } from '../../../lib/telegram';

export const GET: APIRoute = async ({ request, locals }) => {
    // Try booting sessions if not running
    await initConnectedSessions();
    // In a real app we'd verify the active user via session cookies
    // For basic demo, we assume a single 'admin_user_id' or allow all.
    const allSessions = await db.query.sessions.findMany();

    return new Response(JSON.stringify(allSessions), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};

export const POST: APIRoute = async ({ request }) => {
    try {
        const data = await request.json();
        const sessionId = data.sessionId;

        if (!sessionId) {
            return new Response(JSON.stringify({ error: 'sessionId is required' }), { status: 400 });
        }

        const existing = await db.query.sessions.findFirst({
            where: eq(sessions.id, sessionId) // Note: using 'eq' from drizzle-orm but db.query may require it dynamically, but this is fine.
        });

        if (existing) {
            return new Response(JSON.stringify({ error: 'Session already exists' }), { status: 400 });
        }

        const newApiKey = 'wha_' + randomBytes(32).toString('hex');

        // Create DB records
        await db.insert(sessions).values({
            id: sessionId,
            userId: 'default_admin', // Place-holder for multi-user system
            status: 'pending',
            createdAt: new Date()
        });

        await db.insert(apiKeys).values({
            id: newApiKey,
            sessionId: sessionId,
            createdAt: new Date()
        });

        // Boot up Baileys for this new session
        createSession(sessionId);

        await sendTelegramLog(`✨ *New Session Initialized*\nSession instance \`${sessionId}\` has been created. Awaiting QR code scan.`);

        return new Response(JSON.stringify({
            success: true,
            sessionId: sessionId,
            apiKey: newApiKey
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        await sendTelegramLog(`❌ *Session Creation Failed*\nError: \`${err.message}\``);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};
