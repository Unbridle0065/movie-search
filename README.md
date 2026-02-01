# Movie Search

A webapp to search for movies, view ratings and parental guidance information, and manage a personal watchlist.

## Features

- **Movie Search**: Search movies by title with poster grid display
- **Detailed Ratings**:
  - Rotten Tomatoes Critics & Audience scores
  - IMDB rating & Metacritic score
- **IMDB Parents Guide**: Sex & Nudity, Violence, Profanity, and other content warnings
- **Want to Watch List**: Save movies to a personal watchlist with sorting options
- **User Authentication**: Invite-based signup system with session management
- **Admin Panel**: Manage invite codes for new users

## Setup

1. Get a free OMDb API key at https://www.omdbapi.com/apikey.aspx

2. Clone and install:
   ```bash
   git clone https://github.com/Unbridle0065/movie-search.git
   cd movie-search
   npm install
   ```

3. Create `.env` file:
   ```bash
   OMDB_API_KEY=your_key_here
   SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   ```

4. Run both servers:
   ```bash
   # Terminal 1 - Backend
   npm run server

   # Terminal 2 - Frontend
   npm run dev
   ```

5. Open http://localhost:5173

### First-Time Setup

On first run, you can set `AUTH_USER` and `AUTH_PASS` environment variables to create an initial admin user. After that, use the admin panel to generate invite codes for additional users.

## Docker (Self-Hosting)

1. Clone the repo and create `.env`:
   ```bash
   git clone https://github.com/Unbridle0065/movie-search.git
   cd movie-search
   cat > .env << EOF
   OMDB_API_KEY=your_key_here
   SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   AUTH_USER=admin
   AUTH_PASS=your_secure_password
   EOF
   ```

2. Run with Docker Compose:
   ```bash
   docker compose up -d
   ```

3. Open http://your-server-ip:3001

Data is persisted in the `./data` directory (SQLite database).

### TrueNAS SCALE

1. Go to **Apps** > **Discover Apps** > **Custom App**
2. Or use Dockge/Portainer to deploy the `docker-compose.yml`
3. Set environment variables: `OMDB_API_KEY`, `SESSION_SECRET`, `AUTH_USER`, `AUTH_PASS`
4. Map port 3001
5. Mount a persistent volume to `/app/data`

To use your domain, set up a reverse proxy (Traefik, nginx, or Cloudflare Tunnel).

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Express.js + SQLite (better-sqlite3)
- **APIs**: OMDb API, Rotten Tomatoes (scraped), IMDB (scraped)
- **Auth**: Session-based with bcrypt password hashing
