import fs from 'fs';
import path from 'path';

let cachedChatId: string | null = null;

const getEnvValue = (key: string): string | null => {
    try {
        const publicKey = `PUBLIC_${key}`;

        if (typeof process !== 'undefined' && process.env[key]) return process.env[key] as string;
        if (typeof process !== 'undefined' && process.env[publicKey]) return process.env[publicKey] as string;

        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) return import.meta.env[key] as string;
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[publicKey]) return import.meta.env[publicKey] as string;

        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf-8');
            const lines = envContent.split('\n');
            for (const line of lines) {
                if (line.startsWith(`${key}=`)) return line.substring(key.length + 1).trim();
                if (line.startsWith(`${publicKey}=`)) return line.substring(publicKey.length + 1).trim();
            }
        }
    } catch (e) { }
    return null;
};

const getTelegramToken = () => getEnvValue('TELEGRAM_TOKEN');
const getTelegramChatIdEnv = () => getEnvValue('TELEGRAM_CHAT_ID');

async function getChatId(): Promise<string | null> {
    const envChatId = getTelegramChatIdEnv();
    if (envChatId) return envChatId;

    if (cachedChatId) return cachedChatId;

    try {
        const token = getTelegramToken();
        if (!token) return null;

        const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=1`);
        const data = await response.json();

        if (data.ok && data.result.length > 0) {
            cachedChatId = data.result[0].message.chat.id.toString();
            return cachedChatId;
        }
        return null;
    } catch (e) {
        console.error('Failed to fetch Telegram Chat ID', e);
        return null;
    }
}

export async function sendTelegramLog(message: string) {
    try {
        const token = getTelegramToken();
        if (!token) return;

        const chatId = await getChatId();

        if (!chatId) {
            console.warn('Telegram Log Warning: No Chat ID found. Please send a direct message to your bot first so it can register your Chat ID.');
            return;
        }

        const prefix = '🤖 *Whatgga API Portal*\n\n';
        const finalMessage = prefix + message;

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: finalMessage,
                parse_mode: 'Markdown'
            })
        });
    } catch (e) {
        console.error('Telegram notification failed:', e);
    }
}
