import { Router } from 'express';
import * as Watched from '../models/watched.js';

export const watchedRouter = Router();

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

function isStringOrNull(value) {
  return value === null || value === undefined || typeof value === 'string';
}

function isValidImdbId(value) {
  return typeof value === 'string' && /^tt\d{7,}$/.test(value);
}

function isValidDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

// All watched routes require authentication
watchedRouter.use((req, res, next) => {
  if (!req.session?.authenticated || !req.session?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// GET /api/watched - Get user's watched movies
watchedRouter.get('/', (req, res) => {
  const sortBy = ['title', 'watched_date', 'added_at'].includes(req.query.sort) ? req.query.sort : 'watched_date';
  const sortOrder = req.query.order === 'asc' ? 'asc' : 'desc';

  try {
    const movies = Watched.getWatched(req.session.userId, sortBy, sortOrder);
    res.json({ movies });
  } catch (error) {
    console.error('Get watched error:', error);
    res.status(500).json({ error: 'Failed to fetch watched movies' });
  }
});

// GET /api/watched/ids - Get just the IMDB IDs (for checking status)
watchedRouter.get('/ids', (req, res) => {
  try {
    const ids = Watched.getWatchedIds(req.session.userId);
    res.json({ ids });
  } catch (error) {
    console.error('Get watched IDs error:', error);
    res.status(500).json({ error: 'Failed to fetch watched IDs' });
  }
});

// POST /api/watched - Mark movie as watched (direct, not from watchlist)
watchedRouter.post('/', (req, res) => {
  const { imdbId, title, year, poster, watchedDate } = req.body;

  if (!isValidImdbId(imdbId)) {
    return res.status(400).json({ error: 'Invalid IMDB ID format' });
  }
  if (!isNonEmptyString(title)) {
    return res.status(400).json({ error: 'Title is required' });
  }
  if (!isStringOrNull(year) || !isStringOrNull(poster)) {
    return res.status(400).json({ error: 'Invalid field type' });
  }
  if (title.length > 500 || (year && year.length > 20) || (poster && poster.length > 1000)) {
    return res.status(400).json({ error: 'Field too long' });
  }
  if (watchedDate && !isValidDate(watchedDate)) {
    return res.status(400).json({ error: 'Invalid date format (expected YYYY-MM-DD)' });
  }

  try {
    Watched.addMovie(req.session.userId, { imdbId, title, year, poster, watchedDate });
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Add to watched error:', error);
    res.status(500).json({ error: 'Failed to mark as watched' });
  }
});

// POST /api/watched/move - Move from watchlist to watched (atomic)
watchedRouter.post('/move', (req, res) => {
  const { imdbId, title, year, poster, watchedDate } = req.body;

  if (!isValidImdbId(imdbId)) {
    return res.status(400).json({ error: 'Invalid IMDB ID format' });
  }
  if (!isNonEmptyString(title)) {
    return res.status(400).json({ error: 'Title is required' });
  }
  if (!isStringOrNull(year) || !isStringOrNull(poster)) {
    return res.status(400).json({ error: 'Invalid field type' });
  }
  if (title.length > 500 || (year && year.length > 20) || (poster && poster.length > 1000)) {
    return res.status(400).json({ error: 'Field too long' });
  }
  if (watchedDate && !isValidDate(watchedDate)) {
    return res.status(400).json({ error: 'Invalid date format (expected YYYY-MM-DD)' });
  }

  try {
    Watched.moveFromWatchlist(req.session.userId, { imdbId, title, year, poster, watchedDate });
    res.json({ success: true });
  } catch (error) {
    console.error('Move to watched error:', error);
    res.status(500).json({ error: 'Failed to move to watched' });
  }
});

// DELETE /api/watched/:imdbId - Remove from watched
watchedRouter.delete('/:imdbId', (req, res) => {
  const { imdbId } = req.params;

  if (!isValidImdbId(imdbId)) {
    return res.status(400).json({ error: 'Invalid IMDB ID format' });
  }

  try {
    Watched.removeMovie(req.session.userId, imdbId);
    res.json({ success: true });
  } catch (error) {
    console.error('Remove from watched error:', error);
    res.status(500).json({ error: 'Failed to remove from watched' });
  }
});
