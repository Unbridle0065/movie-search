import { db } from '../db/index.js';

export function addMovie(userId, { imdbId, title, year, poster, watchedDate }) {
  const date = watchedDate || new Date().toISOString().split('T')[0];
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO watched (user_id, imdb_id, title, year, poster, watched_date, added_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  return stmt.run(userId, imdbId, title, year || null, poster || null, date);
}

export function removeMovie(userId, imdbId) {
  const stmt = db.prepare('DELETE FROM watched WHERE user_id = ? AND imdb_id = ?');
  return stmt.run(userId, imdbId);
}

export function getWatched(userId, sortBy = 'watched_date', sortOrder = 'desc') {
  const validSortColumns = ['watched_date', 'title', 'added_at'];
  const validSortOrders = ['asc', 'desc'];

  const column = validSortColumns.includes(sortBy) ? sortBy : 'watched_date';
  const order = validSortOrders.includes(sortOrder) ? sortOrder : 'desc';

  const stmt = db.prepare(`
    SELECT imdb_id, title, year, poster, watched_date, added_at
    FROM watched
    WHERE user_id = ?
    ORDER BY ${column} ${order}
  `);
  return stmt.all(userId);
}

export function getWatchedIds(userId) {
  const stmt = db.prepare('SELECT imdb_id FROM watched WHERE user_id = ?');
  return stmt.all(userId).map(row => row.imdb_id);
}

export function moveFromWatchlist(userId, { imdbId, title, year, poster, watchedDate }) {
  const date = watchedDate || new Date().toISOString().split('T')[0];
  const move = db.transaction(() => {
    db.prepare('DELETE FROM watchlist WHERE user_id = ? AND imdb_id = ?')
      .run(userId, imdbId);
    db.prepare(`
      INSERT OR REPLACE INTO watched (user_id, imdb_id, title, year, poster, watched_date, added_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(userId, imdbId, title, year || null, poster || null, date);
  });
  move();
}
