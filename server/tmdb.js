const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

export async function fetchTrendingMovies(accessToken, timeWindow = 'week', page = 1) {
  const response = await fetch(`${TMDB_BASE_URL}/trending/movie/${timeWindow}?page=${page}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`);
  }

  const data = await response.json();
  const movies = data.results || [];
  const totalPages = data.total_pages || 1;

  // Fetch IMDB IDs for each movie in parallel
  const moviesWithImdbIds = await Promise.all(
    movies.map(async (movie) => {
      const imdbId = await fetchImdbId(accessToken, movie.id);
      return {
        ...movie,
        imdb_id: imdbId
      };
    })
  );

  // Filter out movies without IMDB IDs and transform to OMDb-compatible format
  const results = moviesWithImdbIds
    .filter(movie => movie.imdb_id)
    .map(movie => ({
      Title: movie.title,
      Year: movie.release_date ? movie.release_date.substring(0, 4) : '',
      imdbID: movie.imdb_id,
      Type: 'movie',
      Poster: movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : 'N/A'
    }));

  return {
    results,
    page,
    totalPages
  };
}

async function fetchImdbId(accessToken, tmdbId) {
  try {
    const response = await fetch(`${TMDB_BASE_URL}/movie/${tmdbId}/external_ids`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.imdb_id || null;
  } catch (error) {
    console.error(`Failed to fetch IMDB ID for TMDB ID ${tmdbId}:`, error);
    return null;
  }
}
