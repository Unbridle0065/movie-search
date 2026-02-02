const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

// Language codes to filter out from trending (Indian + East Asian)
const FILTERED_LANGUAGE_CODES = ['hi', 'ta', 'te', 'ml', 'kn', 'bn', 'mr', 'pa', 'gu', 'zh', 'ko', 'ja', 'th'];

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

  // Filter out non-English regional movies
  const filteredMovies = movies.filter(
    movie => !FILTERED_LANGUAGE_CODES.includes(movie.original_language)
  );

  // Fetch IMDB IDs for each movie in parallel
  const moviesWithImdbIds = await Promise.all(
    filteredMovies.map(async (movie) => {
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

export async function fetchPopularMovies(accessToken, page = 1) {
  const response = await fetch(`${TMDB_BASE_URL}/movie/popular?page=${page}`, {
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

  // Filter out non-English regional movies
  const filteredMovies = movies.filter(
    movie => !FILTERED_LANGUAGE_CODES.includes(movie.original_language)
  );

  // Fetch IMDB IDs for each movie in parallel
  const moviesWithImdbIds = await Promise.all(
    filteredMovies.map(async (movie) => {
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

export async function fetchTmdbPosterByImdbId(accessToken, imdbId) {
  try {
    const response = await fetch(`${TMDB_BASE_URL}/find/${imdbId}?external_source=imdb_id`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const movie = data.movie_results?.[0];

    if (movie?.poster_path) {
      return `${TMDB_IMAGE_BASE}${movie.poster_path}`;
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch TMDB poster for ${imdbId}:`, error);
    return null;
  }
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
