import { db } from './db/index.js';

let stmtGet;
let stmtSet;
let stmtPurge;

export function initCache() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cache (
      key TEXT PRIMARY KEY,
      value TEXT,
      expires_at INTEGER
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache(expires_at)
  `);

  // Prepare statements for reuse
  stmtGet = db.prepare('SELECT value, expires_at FROM cache WHERE key = ?');
  stmtSet = db.prepare(
    'INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)'
  );
  stmtPurge = db.prepare('DELETE FROM cache WHERE expires_at < ?');

  // Purge expired rows on startup
  cachePurge();
  console.log('Cache initialized');
}

export function cacheGet(key) {
  const row = stmtGet.get(key);
  if (!row) return null;
  if (row.expires_at < Date.now()) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}

export function cacheSet(key, value, ttlMs) {
  const expiresAt = Date.now() + ttlMs;
  stmtSet.run(key, JSON.stringify(value), expiresAt);
}

export function cachePurge() {
  const result = stmtPurge.run(Date.now());
  if (result.changes > 0) {
    console.log(`Cache purge: removed ${result.changes} expired entries`);
  }
}

// TTL constants (milliseconds)
export const TTL = {
  OMDB: 24 * 60 * 60 * 1000,           // 24h
  TMDB_EXTID: 7 * 24 * 60 * 60 * 1000, // 7d
  RT: 24 * 60 * 60 * 1000,             // 24h
  RT_NULL: 1 * 60 * 60 * 1000,         // 1h for null/error results
  IMDB_RATING: 24 * 60 * 60 * 1000,    // 24h
  IMDB_RATING_NULL: 1 * 60 * 60 * 1000,// 1h for null
  PARENTS_GUIDE: 7 * 24 * 60 * 60 * 1000, // 7d
};
