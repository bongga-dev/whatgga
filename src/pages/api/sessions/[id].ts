import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { sessions, apiKeys } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { activeSessions } from '../../../lib/whatsapp';
import fs from 'fs';
import path from 'path';
import { sendTelegramLog } from '../../../lib/telegram';

export const DELETE: APIRoute = async ({ request, params }) => {
    const sessionId = params.id;
    if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Missing session Id' }), { status: 400 });
    }

    try {
        const existing = await db.query.sessions.findFirst({
            where: eq(sessions.id, sessionId)
        });

        if (!existing) {
            return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404 });
        }

        // Close engine socket if connected gracefully (catches closed errors)
        const sock = activeSessions.get(sessionId);
        if (sock) {
            try {
                await sock.logout();
            } catch (e) {
                // Ignore "Connection Closed" errors thrown by Baileys if the socket is already dead
            }
            activeSessions.delete(sessionId);
        }

        // Delete from DB (FK to apiKeys should cascade if supported, but let's delete explicitly safely)
        await db.delete(apiKeys).where(eq(apiKeys.sessionId, sessionId));
        await db.delete(sessions).where(eq(sessions.id, sessionId));

        // Delete physical credentials file
        const sessionDir = path.resolve(process.cwd(), 'sessions-data', sessionId);
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
        }

        await sendTelegramLog(`🗑️ *Sub-Session Terminated*\nSession \`${sessionId}\` was manually deleted from the dashboard. Socket unlinked and credentials destroyed.`);

        return new Response(JSON.stringify({ success: true, message: 'Deleted' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};
