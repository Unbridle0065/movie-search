import { Router } from 'express';
import * as Watchlist from '../models/watchlist.js';

export const watchlistRouter = Router();

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

function isStringOrNull(value) {
  return value === null || value === undefined || typeof value === 'string';
}

function isValidImdbId(value) {
  return typeof value === 'string' && /^tt\d{7,}$/.test(value);
}

// All watchlist routes require authentication
watchlistRouter.use((req, res, next) => {
  if (!req.session?.authenticated || !req.session?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// GET /api/watchlist - Get user's watchlist
watchlistRouter.get('/', (req, res) => {
  const sortBy = req.query.sort === 'title' ? 'title' : 'added_at';
  const sortOrder = req.query.order === 'asc' ? 'asc' : 'desc';

  try {
    const movies = Watchlist.getWatchlist(req.session.userId, sortBy, sortOrder);
    res.json({ movies });
  } catch (error) {
    console.error('Get watchlist error:', error);
    res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
});

// GET /api/watchlist/ids - Get just the IMDB IDs (for checking status)
watchlistRouter.get('/ids', (req, res) => {
  try {
    const ids = Watchlist.getWatchlistIds(req.session.userId);
    res.json({ ids });
  } catch (error) {
    console.error('Get watchlist IDs error:', error);
    res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
});

// POST /api/watchlist - Add movie to watchlist
watchlistRouter.post('/', (req, res) => {
  const { imdbId, title, year, poster } = req.body;

  if (!isValidImdbId(imdbId)) {
    return res.status(400).json({ error: 'Invalid IMDB ID format' });
  }

  if (!isNonEmptyString(title)) {
    return res.status(400).json({ error: 'Title is required' });
  }

  if (!isStringOrNull(year) || !isStringOrNull(poster)) {
    return res.status(400).json({ error: 'Invalid field type' });
  }

  // Limit field lengths to prevent storage abuse
  if (title.length > 500 || (year && year.length > 20) || (poster && poster.length > 1000)) {
    return res.status(400).json({ error: 'Field too long' });
  }

  try {
    Watchlist.addMovie(req.session.userId, { imdbId, title, year, poster });
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Add to watchlist error:', error);
    res.status(500).json({ error: 'Failed to add to watchlist' });
  }
});

// DELETE /api/watchlist/:imdbId - Remove movie from watchlist
watchlistRouter.delete('/:imdbId', (req, res) => {
  const { imdbId } = req.params;

  if (!isValidImdbId(imdbId)) {
    return res.status(400).json({ error: 'Invalid IMDB ID format' });
  }

  try {
    Watchlist.removeMovie(req.session.userId, imdbId);
    res.json({ success: true });
  } catch (error) {
    console.error('Remove from watchlist error:', error);
    res.status(500).json({ error: 'Failed to remove from watchlist' });
  }
});
