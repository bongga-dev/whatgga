import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies }) => {
    cookies.delete('whatgga_auth', { path: '/' });
    return new Response(JSON.stringify({ success: true, message: 'Logged out' }), { status: 200 });
};
