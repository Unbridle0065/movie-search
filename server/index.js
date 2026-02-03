import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import BetterSqlite3Store from 'better-sqlite3-session-store';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { fetchParentsGuide } from './parentsGuide.js';
import { fetchRottenTomatoesScores } from './rottenTomatoes.js';
import { fetchImdbRating } from './imdbRating.js';
import { searchImdb } from './imdbSearch.js';
import { fetchTrendingMovies, fetchPopularMovies, fetchDiscoverMovies, fetchTmdbPosterByImdbId } from './tmdb.js';
import { initDatabase, migrateFromEnvAuth, db } from './db/index.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { watchlistRouter } from './routes/watchlist.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize database
initDatabase();

// Validate required environment variables
const OMDB_API_KEY = process.env.OMDB_API_KEY;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET) {
  console.error('Missing SESSION_SECRET environment variable');
  console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

if (!OMDB_API_KEY) {
  console.error('Missing OMDB_API_KEY environment variable');
  console.error('Get a free key at: https://www.omdbapi.com/apikey.aspx');
  process.exit(1);
}

const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN;
if (!TMDB_ACCESS_TOKEN) {
  console.error('Missing TMDB_ACCESS_TOKEN environment variable');
  console.error('Get one at: https://www.themoviedb.org/settings/api');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Trust reverse proxy (NGINX)
app.set('trust proxy', 1);

// Security hardening
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://m.media-amazon.com", "https://images.rottentomatoes.com", "https://image.tmdb.org"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false // Allow loading images from external sources
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://movies.nuttracker.net',
  credentials: true
}));
app.use(express.json());

// Reject non-JSON content types for POST/PUT/PATCH requests
app.use('/api', (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    if (!req.is('application/json')) {
      return res.status(415).json({ error: 'Unsupported Media Type' });
    }
  }
  next();
});

// Session middleware with SQLite store for persistence
const SqliteStore = BetterSqlite3Store(session);
app.use(session({
  store: new SqliteStore({
    client: db,
    expired: {
      clear: true,
      intervalMs: 900000  // Clear expired sessions every 15 min
    }
  }),
  secret: SESSION_SECRET,
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

// Rate limiting for API routes (500 requests per 15 minutes)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests, please try again later' }
});
app.use('/api/', apiLimiter);

// Serve static frontend files in production
app.use(express.static(join(__dirname, '../dist')));

// Auth, admin, and watchlist routes
app.use('/api', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/watchlist', watchlistRouter);

// Migrate existing env var user to database (runs once)
migrateFromEnvAuth().catch(err => console.error('Migration error:', err));

// Search movies by title using IMDB GraphQL API
app.get('/api/search', requireAuth, async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Missing search query' });
  }

  try {
    const results = await searchImdb(query);

    if (results.length === 0) {
      return res.json({ results: [], error: 'Movie not found!' });
    }

    // Fetch TMDB posters and validate against OMDb in parallel
    const resultsWithValidation = await Promise.all(
      results.map(async (movie) => {
        const [tmdbPoster, omdbResponse] = await Promise.all([
          fetchTmdbPosterByImdbId(TMDB_ACCESS_TOKEN, movie.imdbID),
          fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${movie.imdbID}`)
            .then(r => r.json())
            .catch(() => ({ Response: 'False' }))
        ]);
        return {
          ...movie,
          Poster: tmdbPoster || movie.Poster,
          _omdbValid: omdbResponse.Response === 'True'
        };
      })
    );

    // Filter out movies not in OMDb or missing year/poster
    const filteredResults = resultsWithValidation
      .filter(movie => movie._omdbValid && movie.Year !== 'N/A' && movie.Poster !== 'N/A')
      .map(({ _omdbValid, ...movie }) => movie);

    res.json({ results: filteredResults });
  } catch (error) {
    console.error('IMDB search error:', error);
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

    // Fetch Rotten Tomatoes scores and IMDB data (if needed) in parallel
    let rtScores = null;
    let imdbData = null;
    const needsImdbRating = !data.imdbRating || data.imdbRating === 'N/A';
    const needsMpaaRating = !data.Rated || data.Rated === 'N/A';
    const plotTruncated = data.Plot?.endsWith('...');
    const needsImdbData = needsImdbRating || needsMpaaRating || plotTruncated;

    try {
      const [rtResult, imdbResult] = await Promise.all([
        fetchRottenTomatoesScores(data.Title, data.Year).catch(e => {
          console.error('RT fetch error:', e);
          return null;
        }),
        needsImdbData ? fetchImdbRating(req.params.imdbId).catch(e => {
          console.error('IMDB rating fetch error:', e);
          return null;
        }) : Promise.resolve(null)
      ]);
      rtScores = rtResult;
      imdbData = imdbResult;
    } catch (e) {
      console.error('Fetch error:', e);
    }

    // Fallback to OMDb RT score if scraping fails
    const omdbRtRating = data.Ratings?.find(r => r.Source === 'Rotten Tomatoes');

    // Use IMDB plot if OMDb plot is truncated
    const finalPlot = (plotTruncated && imdbData?.plot) ? imdbData.plot : data.Plot;

    res.json({
      ...data,
      Plot: finalPlot,
      Rated: data.Rated !== 'N/A' ? data.Rated : (imdbData?.mpaaRating || 'N/A'),
      imdbRating: data.imdbRating !== 'N/A' ? data.imdbRating : (imdbData?.rating?.toString() || 'N/A'),
      imdbVotes: data.imdbVotes !== 'N/A' ? data.imdbVotes : (imdbData?.voteCount?.toLocaleString() || 'N/A'),
      rottenTomatoes: {
        criticScore: rtScores?.criticScore || omdbRtRating?.Value || null,
        audienceScore: rtScores?.audienceScore || null,
        url: rtScores?.url || null
      }
    });
  } catch (_error) {
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

// Get trending/popular/genre movies from TMDB
app.get('/api/trending', requireAuth, async (req, res) => {
  try {
    const page = Math.min(Math.max(parseInt(req.query.page) || 1, 1), 500);
    const time = req.query.time;
    const genre = req.query.genre;

    let data;
    if (time === 'genre' && genre) {
      data = await fetchDiscoverMovies(TMDB_ACCESS_TOKEN, genre, page);
    } else if (time === 'popular') {
      data = await fetchPopularMovies(TMDB_ACCESS_TOKEN, page);
    } else {
      const timeWindow = time === 'day' ? 'day' : 'week';
      data = await fetchTrendingMovies(TMDB_ACCESS_TOKEN, timeWindow, page);
    }

    // Validate movies against OMDb in parallel
    const validatedResults = await Promise.all(
      data.results.map(async (movie) => {
        const omdbResponse = await fetch(
          `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${movie.imdbID}`
        ).then(r => r.json()).catch(() => ({ Response: 'False' }));
        return { ...movie, _omdbValid: omdbResponse.Response === 'True' };
      })
    );

    // Filter out movies not recognized by OMDb
    const filteredResults = validatedResults
      .filter(movie => movie._omdbValid)
      .map(({ _omdbValid, ...movie }) => movie);

    res.json({ ...data, results: filteredResults });
  } catch (error) {
    console.error('Trending fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch trending movies' });
  }
});

// Poster image proxy to bypass browser tracking protection
// This makes third-party CDN images appear as first-party requests
app.get('/api/poster-proxy', async (req, res) => {
  const encodedUrl = req.query.url;

  if (!encodedUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  let url;
  try {
    url = decodeURIComponent(encodedUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid URL encoding' });
  }

  // Security: Validate URL is from allowed domains (SSRF prevention)
  const ALLOWED_DOMAINS = [
    'm.media-amazon.com',
    'image.tmdb.org',
    'images-na.ssl-images-amazon.com'
  ];

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  if (!ALLOWED_DOMAINS.includes(parsedUrl.hostname)) {
    return res.status(403).json({ error: 'Domain not allowed' });
  }

  if (parsedUrl.protocol !== 'https:') {
    return res.status(403).json({ error: 'HTTPS required' });
  }

  try {
    const imageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!imageResponse.ok) {
      return res.status(imageResponse.status).json({ error: 'Failed to fetch image' });
    }

    const contentType = imageResponse.headers.get('content-type');

    if (!contentType || !contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'Not an image' });
    }

    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=604800, stale-while-revalidate=2592000',
      'X-Content-Type-Options': 'nosniff'
    });

    const buffer = await imageResponse.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Poster proxy error:', error);
    res.status(500).json({ error: 'Failed to proxy image' });
  }
});

// Serve index.html for all other routes (SPA support)
app.get('/{*splat}', (req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
