import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, delay } from '@whiskeysockets/baileys';
import pino from 'pino';
import { db } from '../db';
import { sessions } from '../db/schema';
import { eq } from 'drizzle-orm';
import * as QRCode from 'qrcode';
import path from 'path';
import { sendTelegramLog } from './telegram';

const globalAny: any = globalThis;

// Using a basic map to hold active sessions in-memory, attached to globalThis to survive Astro dev-mode HMR
if (!globalAny.__whatgga_activeSessions) {
    globalAny.__whatgga_activeSessions = new Map<string, ReturnType<typeof makeWASocket>>();
}
if (!globalAny.__whatgga_qrcodes) {
    globalAny.__whatgga_qrcodes = new Map<string, string>();
}

export const activeSessions: Map<string, ReturnType<typeof makeWASocket>> = globalAny.__whatgga_activeSessions;
export const qrCodes: Map<string, string> = globalAny.__whatgga_qrcodes;

const logger = pino({ level: 'silent' });

export async function createSession(sessionId: string) {
    const sessionDir = path.resolve(process.cwd(), 'sessions-data', sessionId);
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version, isLatest } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,
        auth: state,
        browser: ['Whatgga API Portal', 'Chrome', '1.0.0'],
        markOnlineOnConnect: true,
    });

    // Save active session in memory
    activeSessions.set(sessionId, sock);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            // Convert QR to Base64 data URI to be consumed by the frontend
            const qrBase64 = await QRCode.toDataURL(qr);
            qrCodes.set(sessionId, qrBase64);
            // Update DB
            await db.update(sessions).set({ status: 'qr' }).where(eq(sessions.id, sessionId));
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
            // 401 = logged_out, 403 = forced_close
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 403;
            qrCodes.delete(sessionId);

            if (shouldReconnect) {
                // Wait a bit before reconnecting
                await delay(3000);
                createSession(sessionId);
            } else {
                // Force offline status and delete session files to allow fresh reconnection
                await db.update(sessions).set({ status: 'offline' }).where(eq(sessions.id, sessionId));
                activeSessions.delete(sessionId);

                await sendTelegramLog(`⚠️ *WhatsApp Disconnected*\nSession \`${sessionId}\` was unlinked from the user's phone. Stored credentials have been wiped.`);

                try {
                    const fs = require('fs');
                    const sessionDir = path.resolve(process.cwd(), 'sessions-data', sessionId);
                    if (fs.existsSync(sessionDir)) {
                        fs.rmSync(sessionDir, { recursive: true, force: true });
                    }
                } catch (e) { }
            }
        } else if (connection === 'open') {
            qrCodes.delete(sessionId);
            // Update DB to connected
            await db.update(sessions).set({ status: 'connected' }).where(eq(sessions.id, sessionId));

            await sendTelegramLog(`📱 *WhatsApp Connected*\nSession \`${sessionId}\` is now actively bridged and online.`);
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type === 'notify') {
            for (const msg of m.messages) {
                if (!msg.key.fromMe) {
                    await triggerWebhook(sessionId, msg);
                }
            }
        }
    });

    return sock;
}

async function triggerWebhook(sessionId: string, message: any) {
    try {
        const sessionData = await db.query.sessions.findFirst({
            where: (s, { eq }) => eq(s.id, sessionId)
        });

        if (sessionData && sessionData.webhookUrl && sessionData.webhookUrl.startsWith('http')) {
            await fetch(sessionData.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId,
                    event: 'message',
                    data: message
                })
            });
        }
    } catch (error) {
        console.error(`Failed to trigger webhook for session ${sessionId}`, error);
    }
}

// Attach init flag to global to prevent duplicate boot sequences across API hot-reloads
if (typeof globalAny.__whatgga_initialized === 'undefined') {
    globalAny.__whatgga_initialized = false;
    globalAny.__whatgga_initPromise = null;
}

export async function initConnectedSessions() {
    if (globalAny.__whatgga_initialized) return;

    if (!globalAny.__whatgga_initPromise) {
        globalAny.__whatgga_initPromise = (async () => {
            const connectedSessions = await db.query.sessions.findMany({
                where: (s, { inArray }) => inArray(s.status, ['connected', 'qr'])
            });

            const promises = connectedSessions.map(session => createSession(session.id));
            await Promise.all(promises);
            globalAny.__whatgga_initialized = true;
        })();
    }

    return globalAny.__whatgga_initPromise;
}
