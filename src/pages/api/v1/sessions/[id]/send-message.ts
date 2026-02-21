import type { APIRoute } from 'astro';
import { db } from '../../../../../db';
import { sessions, apiKeys } from '../../../../../db/schema';
import { activeSessions, initConnectedSessions } from '../../../../../lib/whatsapp';
import { eq, and } from 'drizzle-orm';
import { sendTelegramLog } from '../../../../../lib/telegram';

export const POST: APIRoute = async ({ request, params }) => {
    const sessionId = params.id;
    if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Missing session Id' }), { status: 400 });
    }

    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Missing or invalid Authorization header' }), { status: 401 });
        }

        const token = authHeader.split(' ')[1];

        // Validate API Key
        const keyRecord = await db.query.apiKeys.findFirst({
            where: and(eq(apiKeys.id, token), eq(apiKeys.sessionId, sessionId))
        });

        if (!keyRecord) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Invalid API Key for this session' }), { status: 401 });
        }

        // Ensure sessions are booted up if the server just restarted
        await initConnectedSessions();

        const sock = activeSessions.get(sessionId);
        if (!sock) {
            await sendTelegramLog(`⚠️ *Delivery Rejected (503 Service Unavailable)*\nn8n tried to send a message but session \`${sessionId}\` is missing from memory or not actively bridged. Verify Dashboard.`);
            return new Response(JSON.stringify({ error: `Session '${sessionId}' is not active or connected securely in the engine` }), { status: 503, headers: { 'Content-Type': 'application/json' } });
        }

        const data = await request.json();
        let toPhone = data.number;

        if (!toPhone) {
            return new Response(JSON.stringify({ error: 'Payload missing "number" field' }), { status: 400 });
        }

        // Format phone number to WhatsApp JID format
        if (!toPhone.includes('@s.whatsapp.net')) {
            toPhone = `${toPhone}@s.whatsapp.net`;
        }

        // Send response to n8n immediately to unblock workflows, process sending in background
        (async () => {
            let sent = false;
            let attempt = 0;

            while (attempt < 5 && !sent) {
                try {
                    await sock.sendMessage(toPhone, { text: data.message || '' });
                    sent = true;
                } catch (err: any) {
                    if (err.message && err.message.includes('Connection Closed')) {
                        attempt++;
                        if (attempt < 5) {
                            await new Promise(r => setTimeout(r, 4000)); // wait 4 seconds per attempt (20s total)
                        }
                    } else {
                        // Log unexpected error
                        await sendTelegramLog(`❌ *Message Delivery Error*\nSession: \`${sessionId}\`\nRecipient: \`${toPhone}\`\nError: \`${err.message}\``);
                        break;
                    }
                }
            }

            if (!sent && attempt >= 5) {
                await sendTelegramLog(`⚠️ *Message Delivery Failed (Timeout/Disconnect)*\nSession: \`${sessionId}\`\nRecipient: \`${toPhone}\`\nWhatsApp socket failed to boot up or connect within 20 seconds.`);
            }
        })();

        return new Response(JSON.stringify({ success: true, message: 'Message queued for delivery' }), {
            status: 202,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err: any) {
        await sendTelegramLog(`❌ *Message Delivery Error*\nSession: \`${sessionId}\`\nError: \`${err.message}\``);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
};
