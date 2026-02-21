import type { APIRoute } from 'astro';
import { db } from '../../../../db';
import { sessions } from '../../../../db/schema';
import { qrCodes } from '../../../../lib/whatsapp';
import { eq } from 'drizzle-orm';
import { sendTelegramLog } from '../../../../lib/telegram';

export const GET: APIRoute = async ({ params }) => {
    const sessionId = params.id;
    if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Missing session Id' }), { status: 400 });
    }

    try {
        const session = await db.query.sessions.findFirst({
            where: eq(sessions.id, sessionId)
        });

        if (!session) {
            return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404 });
        }

        return new Response(JSON.stringify({
            status: session.status,
            qr: session.status === 'qr' ? qrCodes.get(sessionId) || null : null,
            webhookUrl: session.webhookUrl
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err: any) {
        await sendTelegramLog(`❌ *Status Check Failed*\nError: \`${err.message}\``);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};
