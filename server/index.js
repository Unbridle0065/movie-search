import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { fetchParentsGuide } from './parentsGuide.js';
import { fetchRottenTomatoesScores } from './rottenTomatoes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Trust reverse proxy (NGINX)
app.set('trust proxy', 1);

// Security hardening
app.disable('x-powered-by');
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://movies.nuttracker.net',
  credentials: true
}));
app.use(express.json());

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Auth middleware - protects API routes
const requireAuth = (req, res, next) => {
  if (req.session?.authenticated) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Rate limiting for API routes (100 requests per 15 minutes)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' }
});
app.use('/api/', apiLimiter);

// Stricter rate limiting for login (5 attempts per 15 minutes)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts, please try again later' }
});

// Serve static frontend files in production
app.use(express.static(join(__dirname, '../dist')));

const OMDB_API_KEY = process.env.OMDB_API_KEY;

if (!OMDB_API_KEY) {
  console.error('Missing OMDB_API_KEY environment variable');
  console.error('Get a free key at: https://www.omdbapi.com/apikey.aspx');
  process.exit(1);
}

// Auth endpoints
app.post('/api/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  const validUser = process.env.AUTH_USER || 'admin';
  const validPass = process.env.AUTH_PASS || 'changeme';

  if (username === validUser && password === validPass) {
    req.session.authenticated = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.get('/api/auth/check', (req, res) => {
  res.json({ authenticated: !!req.session?.authenticated });
});

// Search movies by title
app.get('/api/search', requireAuth, async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Missing search query' });
  }

  try {
    // Run both search (s) and exact title match (t) in parallel
    // The search endpoint may miss exact matches that the title endpoint finds
    const [searchResponse, titleResponse] = await Promise.all([
      fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(query)}&type=movie`),
      fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(query)}&type=movie`)
    ]);

    const [searchData, titleData] = await Promise.all([
      searchResponse.json(),
      titleResponse.json()
    ]);

    // Deduplicate results by IMDB ID
    const seen = new Set();
    const results = [];

    // Add exact title match first if found (prioritize exact matches)
    if (titleData.Response === 'True' && titleData.imdbID) {
      seen.add(titleData.imdbID);
      results.push({
        Title: titleData.Title,
        Year: titleData.Year,
        imdbID: titleData.imdbID,
        Type: titleData.Type,
        Poster: titleData.Poster
      });
    }

    // Add search results, skipping duplicates
    if (searchData.Response === 'True' && searchData.Search) {
      for (const movie of searchData.Search) {
        if (!seen.has(movie.imdbID)) {
          seen.add(movie.imdbID);
          results.push(movie);
        }
      }
    }

    if (results.length === 0) {
      return res.json({ results: [], error: searchData.Error || 'Movie not found!' });
    }

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search movies' });
  }
});

// Get movie details by IMDB ID
app.get('/api/movie/:imdbId', requireAuth, async (req, res) => {
  const { imdbId } = req.params;

  // Validate IMDB ID format (tt followed by 7+ digits)
  if (!/^tt\d{7,}$/.test(imdbId)) {
    return res.status(400).json({ error: 'Invalid IMDB ID format' });
  }

  try {
    const response = await fetch(
      `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${imdbId}&plot=full`
    );
    const data = await response.json();

    if (data.Response === 'False') {
      return res.status(404).json({ error: data.Error });
    }

    // Fetch Rotten Tomatoes scores (critic + audience)
    let rtScores = null;
    try {
      rtScores = await fetchRottenTomatoesScores(data.Title, data.Year);
    } catch (e) {
      console.error('RT fetch error:', e);
    }

    // Fallback to OMDb RT score if scraping fails
    const omdbRtRating = data.Ratings?.find(r => r.Source === 'Rotten Tomatoes');

    res.json({
      ...data,
      rottenTomatoes: {
        criticScore: rtScores?.criticScore || omdbRtRating?.Value || null,
        audienceScore: rtScores?.audienceScore || null,
        url: rtScores?.url || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch movie details' });
  }
});

// Get IMDB Parents Guide
app.get('/api/parents-guide/:imdbId', requireAuth, async (req, res) => {
  const { imdbId } = req.params;

  // Validate IMDB ID format (tt followed by 7+ digits)
  if (!/^tt\d{7,}$/.test(imdbId)) {
    return res.status(400).json({ error: 'Invalid IMDB ID format' });
  }

  try {
    const guide = await fetchParentsGuide(imdbId);
    res.json(guide);
  } catch (error) {
    console.error('Parents guide error:', error);
    res.status(500).json({ error: 'Failed to fetch parents guide' });
  }
});

// Serve index.html for all other routes (SPA support)
app.get('/{*splat}', (req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
