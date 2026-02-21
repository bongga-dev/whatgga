import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Ensure data directory exists
const dbDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(path.join(dbDir, 'sqlite.db'));
sqlite.pragma('journal_mode = WAL');

// Tentatively auto-create database if not exists (whenever the server opens)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS "users" (
    "id" text PRIMARY KEY NOT NULL,
    "email" text NOT NULL,
    "password_hash" text NOT NULL,
    "created_at" integer NOT NULL,
    CONSTRAINT "users_email_unique" UNIQUE("email")
  );
  
  CREATE TABLE IF NOT EXISTS "sessions" (
    "id" text PRIMARY KEY NOT NULL,
    "user_id" text NOT NULL,
    "status" text DEFAULT 'pending' NOT NULL,
    "webhook_url" text,
    "created_at" integer NOT NULL,
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action
  );

  CREATE TABLE IF NOT EXISTS "api_keys" (
    "id" text PRIMARY KEY NOT NULL,
    "session_id" text NOT NULL,
    "created_at" integer NOT NULL,
    FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON UPDATE no action ON DELETE cascade
  );
`);

export const db = drizzle(sqlite, { schema });

// Pre-create root user if missing
const rootCheck = sqlite.prepare('SELECT id FROM users WHERE email = ?').get('root');

if (!rootCheck) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync('bongga_dev', salt, 1000, 64, 'sha512').toString('hex');
  const passwordHash = `${salt}:${hash}`;

  sqlite.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(
    'root_admin',
    'root',
    passwordHash,
    Date.now()
  );
}
