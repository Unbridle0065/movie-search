import { useEffect, useRef, useCallback } from 'react';
import MovieGrid from './MovieGrid';

export default function TrendingView({ movies, onMovieClick, isLoading, hasMore, onLoadMore, timeWindow, onTimeWindowChange }) {
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
        <h2 className="text-xl font-bold text-white">Trending</h2>
        <select
          value={timeWindow}
          onChange={(e) => onTimeWindowChange(e.target.value)}
          className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500"
        >
          <option value="day">Today</option>
          <option value="week">This Week</option>
          <option value="popular">This Month</option>
        </select>
      </div>

      {movies.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No movies available.</p>
        </div>
      ) : (
        <>
          <MovieGrid movies={movies} onMovieClick={onMovieClick} />

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
