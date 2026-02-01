import { db } from '../db/index.js';

export function addMovie(userId, { imdbId, title, year, poster }) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO watchlist (user_id, imdb_id, title, year, poster, added_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);
  return stmt.run(userId, imdbId, title, year || null, poster || null);
}

export function removeMovie(userId, imdbId) {
  const stmt = db.prepare('DELETE FROM watchlist WHERE user_id = ? AND imdb_id = ?');
  return stmt.run(userId, imdbId);
}

export function getWatchlist(userId, sortBy = 'added_at', sortOrder = 'desc') {
  const validSortColumns = ['added_at', 'title'];
  const validSortOrders = ['asc', 'desc'];

  const column = validSortColumns.includes(sortBy) ? sortBy : 'added_at';
  const order = validSortOrders.includes(sortOrder) ? sortOrder : 'desc';

  const stmt = db.prepare(`
    SELECT imdb_id, title, year, poster, added_at
    FROM watchlist
    WHERE user_id = ?
    ORDER BY ${column} ${order}
  `);
  return stmt.all(userId);
}

export function getWatchlistIds(userId) {
  const stmt = db.prepare('SELECT imdb_id FROM watchlist WHERE user_id = ?');
  return stmt.all(userId).map(row => row.imdb_id);
}
