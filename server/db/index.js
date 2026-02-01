import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DATABASE_PATH || join(__dirname, '../../data/movie-search.db');

// Ensure data directory exists
import { mkdirSync } from 'fs';
mkdirSync(dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

export function initDatabase() {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);

  // Migration: add used_at column to invites table if it doesn't exist
  const columns = db.prepare("PRAGMA table_info(invites)").all();
  if (!columns.some(col => col.name === 'used_at')) {
    db.exec('ALTER TABLE invites ADD COLUMN used_at TEXT');
    console.log('Migration: added used_at column to invites table');
  }

  console.log('Database initialized');
}

export async function migrateFromEnvAuth() {
  const existingUser = process.env.AUTH_USER;
  const existingPass = process.env.AUTH_PASS;

  if (!existingUser || !existingPass) {
    return;
  }

  // Check if any users exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count > 0) {
    return;
  }

  // Migrate env var user as admin
  const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  const passwordHash = await bcrypt.hash(existingPass, BCRYPT_ROUNDS);

  db.prepare(`
    INSERT INTO users (username, password_hash, is_admin)
    VALUES (?, ?, 1)
  `).run(existingUser, passwordHash);

  console.log(`Migrated ${existingUser} as admin user from environment variables`);
}
