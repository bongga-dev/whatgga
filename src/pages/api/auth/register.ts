import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { users } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../../../lib/auth';
import { randomUUID } from 'crypto';
import { sendTelegramLog } from '../../../lib/telegram';

// Protect registration with a Master Password/Code. 
const DEV_SECRET_CODE = 'BONGGA_DEV_2026';

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const body = await request.json();
        const { email, password, authCode } = body;

        if (!email || !password || !authCode) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
        }

        if (authCode !== DEV_SECRET_CODE) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Invalid Registration Code' }), { status: 403 });
        }

        const existing = await db.query.users.findFirst({
            where: eq(users.email, email)
        });

        if (existing) {
            return new Response(JSON.stringify({ error: 'Email already registered' }), { status: 409 });
        }

        const userId = randomUUID();
        const hashedPassword = hashPassword(password);

        await db.insert(users).values({
            id: userId,
            email: email,
            passwordHash: hashedPassword,
            createdAt: new Date()
        });

        // Auto login by setting secure cookie
        cookies.set('whatgga_auth', userId, {
            path: '/',
            httpOnly: true,
            secure: false, // development
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7 // 1 week
        });

        await sendTelegramLog(`🎉 *New Setup: Root Admin Registered*\nAdmin credentials initialized for: \`${email}\``);

        return new Response(JSON.stringify({ success: true }), { status: 201 });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
