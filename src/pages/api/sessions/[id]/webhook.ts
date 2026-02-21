import type { APIRoute } from 'astro';
import { db } from '../../../../db';
import { sessions } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export const POST: APIRoute = async ({ request, params }) => {
    const sessionId = params.id;
    if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Missing session Id' }), { status: 400 });
    }

    try {
        const data = await request.json();
        const webhookUrl = data.webhookUrl || null;

        const existing = await db.query.sessions.findFirst({
            where: eq(sessions.id, sessionId)
        });

        if (!existing) {
            return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404 });
        }

        await db.update(sessions).set({ webhookUrl }).where(eq(sessions.id, sessionId));

        return new Response(JSON.stringify({ success: true, webhookUrl }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};
