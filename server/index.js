import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { fetchParentsGuide } from './parentsGuide.js';
import { fetchRottenTomatoesScores } from './rottenTomatoes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static frontend files in production
app.use(express.static(join(__dirname, '../dist')));

const OMDB_API_KEY = process.env.OMDB_API_KEY;

if (!OMDB_API_KEY) {
  console.error('Missing OMDB_API_KEY environment variable');
  console.error('Get a free key at: https://www.omdbapi.com/apikey.aspx');
  process.exit(1);
}

// Search movies by title
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Missing search query' });
  }

  try {
    const response = await fetch(
      `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(query)}&type=movie`
    );
    const data = await response.json();

    if (data.Response === 'False') {
      return res.json({ results: [], error: data.Error });
    }

    res.json({ results: data.Search || [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search movies' });
  }
});

// Get movie details by IMDB ID
app.get('/api/movie/:imdbId', async (req, res) => {
  const { imdbId } = req.params;

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
app.get('/api/parents-guide/:imdbId', async (req, res) => {
  const { imdbId } = req.params;

  try {
    const guide = await fetchParentsGuide(imdbId);
    res.json(guide);
  } catch (error) {
    console.error('Parents guide error:', error);
    res.status(500).json({ error: 'Failed to fetch parents guide' });
  }
});

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
