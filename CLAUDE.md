# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start backend server (runs on localhost:3001)
npm run server

# Start frontend dev server (runs on localhost:5173, proxies /api to backend)
npm run dev

# Build frontend for production
npm run build

# Run ESLint
npm run lint
```

Development requires running both servers in separate terminals. The Vite dev server proxies `/api` requests to the Express backend.

## Architecture

This is a movie search webapp with a React frontend and Express backend that aggregates data from multiple sources.

**Data Flow:**
1. User searches → Frontend calls `/api/search?q=<query>` → Backend queries OMDb API
2. User clicks movie → Frontend fetches `/api/movie/:imdbId` (details + Rotten Tomatoes scores) and `/api/parents-guide/:imdbId` (IMDB parents guide)

**Backend (`server/`):**
- `index.js` - Express 5 server with API routes and SPA wildcard handler
- `rottenTomatoes.js` - Scrapes RT scores using JSON extraction from page HTML, falls back to search
- `parentsGuide.js` - Scrapes IMDB parents guide by parsing `__NEXT_DATA__` JSON from page

**Frontend (`src/`):**
- `App.jsx` - Main component with search/display state
- `components/MovieDetails.jsx` - Modal showing full details, ratings, and parents guide data
- `components/SearchBar.jsx`, `MovieCard.jsx`, `MovieGrid.jsx` - UI components

**Key Implementation Notes:**
- Web scrapers use browser User-Agent headers to avoid blocking
- RT scraper tries direct URL first, then falls back to search results
- IMDB scraper parses Next.js hydration data (brittle, may need updates if IMDB changes)
- Express 5 uses `{*splat}` wildcard syntax (not `*`) for catch-all routes

## Environment Setup

Requires `OMDB_API_KEY` in `.env` file. Get a free key from https://www.omdbapi.com/apikey.aspx
