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

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Express.js
- **APIs**: OMDb API, Rotten Tomatoes (scraped), IMDB (scraped)
