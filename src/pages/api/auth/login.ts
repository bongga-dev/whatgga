import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { users } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '../../../lib/auth';
import { sendTelegramLog } from '../../../lib/telegram';

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const body = await request.json();
        const { email, password } = body;

        const authUser = await db.query.users.findFirst({
            where: eq(users.email, email)
        });

        if (!authUser) {
            await sendTelegramLog(`⚠️ *Failed Login Attempt* \nUnrecognized email tried to access: \`${email}\``);
            return new Response(JSON.stringify({ error: 'User mapping not found' }), { status: 404 });
        }

        const isValid = verifyPassword(password, authUser.passwordHash);

        if (!isValid) {
            await sendTelegramLog(`🚨 *Security Alert*\nFailed password attempt for admin: \`${email}\``);
            return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
        }

        cookies.set('whatgga_auth', authUser.id, {
            path: '/',
            httpOnly: true,
            secure: false, // For local dev
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7 // 1 week
        });

        await sendTelegramLog(`✅ *New Login Session*\nAdmin user logged in successfully: \`${authUser.email}\``);

        return new Response(JSON.stringify({ success: true, email: authUser.email }), { status: 200 });
    } catch (e: any) {
        await sendTelegramLog(`❌ *System Error during Login*\nError details: \`${e.message}\``);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
