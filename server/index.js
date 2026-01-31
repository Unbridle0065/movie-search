import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { fetchParentsGuide } from './parentsGuide.js';
import { fetchRottenTomatoesScores } from './rottenTomatoes.js';
import { fetchImdbRating } from './imdbRating.js';
import { searchImdb } from './imdbSearch.js';
import { initDatabase, migrateFromEnvAuth } from './db/index.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';

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
      imgSrc: ["'self'", "data:", "https://m.media-amazon.com", "https://images.rottentomatoes.com"],
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

// Session middleware
app.use(session({
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

// Rate limiting for API routes (100 requests per 15 minutes)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' }
});
app.use('/api/', apiLimiter);

// Serve static frontend files in production
app.use(express.static(join(__dirname, '../dist')));

// Auth and admin routes
app.use('/api', authRouter);
app.use('/api/admin', adminRouter);

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

    res.json({ results });
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

    // Fetch Rotten Tomatoes scores and IMDB rating (if needed) in parallel
    let rtScores = null;
    let imdbRating = null;
    const needsImdbRating = !data.imdbRating || data.imdbRating === 'N/A';

    try {
      const [rtResult, imdbResult] = await Promise.all([
        fetchRottenTomatoesScores(data.Title, data.Year).catch(e => {
          console.error('RT fetch error:', e);
          return null;
        }),
        needsImdbRating ? fetchImdbRating(req.params.imdbId).catch(e => {
          console.error('IMDB rating fetch error:', e);
          return null;
        }) : Promise.resolve(null)
      ]);
      rtScores = rtResult;
      imdbRating = imdbResult;
    } catch (e) {
      console.error('Fetch error:', e);
    }

    // Fallback to OMDb RT score if scraping fails
    const omdbRtRating = data.Ratings?.find(r => r.Source === 'Rotten Tomatoes');

    res.json({
      ...data,
      imdbRating: data.imdbRating !== 'N/A' ? data.imdbRating : (imdbRating?.rating?.toString() || 'N/A'),
      imdbVotes: data.imdbVotes !== 'N/A' ? data.imdbVotes : (imdbRating?.voteCount?.toLocaleString() || 'N/A'),
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

// Serve index.html for all other routes (SPA support)
app.get('/{*splat}', (req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
