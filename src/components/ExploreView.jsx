import { useEffect, useRef, useCallback } from 'react';
import MovieGrid from './MovieGrid';

const GENRES = [
  { value: '28', label: 'Action' },
  { value: '12', label: 'Adventure' },
  { value: '16', label: 'Animation' },
  { value: '35', label: 'Comedy' },
  { value: '80', label: 'Crime' },
  { value: '99', label: 'Documentary' },
  { value: '18', label: 'Drama' },
  { value: '10751', label: 'Family' },
  { value: '14', label: 'Fantasy' },
  { value: '27', label: 'Horror' },
  { value: '9648', label: 'Mystery' },
  { value: '10749', label: 'Romance' },
  { value: '878', label: 'Sci-Fi' },
  { value: '53', label: 'Thriller' },
  { value: '10752', label: 'War' },
  { value: '37', label: 'Western' }
];

export default function ExploreView({ movies, onMovieClick, isLoading, hasMore, onLoadMore, mode, onModeChange, genre, onGenreChange, columns }) {
  const loaderRef = useRef(null);

  const handleObserver = useCallback((entries) => {
    const [entry] = entries;
    if (entry.isIntersecting && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [hasMore, isLoading, onLoadMore]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px',
      threshold: 0
    });

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [handleObserver]);

  if (isLoading && movies.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400">Loading movies...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Explore</h2>
        <div className="flex items-center gap-2">
          {mode === 'genre' && (
            <select
              value={genre}
              onChange={(e) => onGenreChange(e.target.value)}
              className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500"
            >
              {GENRES.map(g => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          )}
          <select
            value={mode}
            onChange={(e) => onModeChange(e.target.value)}
            className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500"
          >
            <option value="week">Trending This Week</option>
            <option value="popular">Trending This Month</option>
            <option value="genre">Popular By Genre</option>
          </select>
        </div>
      </div>

      {movies.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No movies available.</p>
        </div>
      ) : (
        <>
          <MovieGrid movies={movies} onMovieClick={onMovieClick} columns={columns} />

          <div ref={loaderRef} className="py-8 text-center">
            {isLoading && (
              <div className="text-gray-400">Loading more...</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
