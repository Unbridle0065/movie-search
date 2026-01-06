# Movie Search

A webapp to search for movies and view Rotten Tomatoes scores and IMDB Parents Guide information.

## Features

- Search movies by title
- View movie posters in a responsive grid
- Movie details including:
  - Rotten Tomatoes Critics & Audience scores
  - IMDB rating & Metacritic score
  - IMDB Parents Guide (Sex & Nudity, Violence, Profanity, etc.)

## Setup

1. Get a free OMDb API key at https://www.omdbapi.com/apikey.aspx

2. Clone and install:
   ```bash
   git clone https://github.com/Unbridle0065/movie-search.git
   cd movie-search
   npm install
   ```

3. Create `.env` file:
   ```
   OMDB_API_KEY=your_key_here
   ```

4. Run both servers:
   ```bash
   # Terminal 1 - Backend
   npm run server

   # Terminal 2 - Frontend
   npm run dev
   ```

5. Open http://localhost:5173

## Docker (Self-Hosting)

1. Clone the repo and create `.env`:
   ```bash
   git clone https://github.com/Unbridle0065/movie-search.git
   cd movie-search
   echo "OMDB_API_KEY=your_key_here" > .env
   ```

2. Run with Docker Compose:
   ```bash
   docker compose up -d
   ```

3. Open http://your-server-ip:3001

### TrueNAS SCALE

1. Go to **Apps** > **Discover Apps** > **Custom App**
2. Or use Dockge/Portainer to deploy the `docker-compose.yml`
3. Set environment variable `OMDB_API_KEY`
4. Map port 3001

To use your domain, set up a reverse proxy (Traefik, nginx, or Cloudflare Tunnel).

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Express.js
- **APIs**: OMDb API, Rotten Tomatoes (scraped), IMDB (scraped)
