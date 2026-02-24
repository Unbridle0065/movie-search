import { useState } from 'react';
import { getPosterUrl } from '../utils/posterUrl';

function MovieRow({ movie, index, onMovieClick, actions }) {
  const posterUrl = getPosterUrl(movie.poster);
  const hasPoster = posterUrl !== null;
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      onClick={() => onMovieClick(movie.imdb_id)}
      style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}
      className="w-full flex items-center gap-4 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors text-left animate-fade-in-up opacity-0"
    >
      <div className="w-12 h-[72px] relative rounded flex-shrink-0 overflow-hidden">
        {(!hasPoster || !loaded) && (
          <div className={`absolute inset-0 bg-gray-700 flex items-center justify-center ${hasPoster ? 'animate-pulse' : ''}`}>
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
          </div>
        )}
        {hasPoster && (
          <img
            src={posterUrl}
            alt={movie.title}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-medium truncate">{movie.title}</h3>
        {movie.year && (
          <p className="text-gray-400 text-sm">{movie.year}</p>
        )}
        {movie.watched_date && (
          <p className="text-gray-500 text-xs mt-0.5">
            {new Date(movie.watched_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        )}
      </div>
      {actions}
      <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-fade-in opacity-0">
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 p-3 bg-gray-800 rounded-lg">
            <div className="w-12 h-[72px] bg-gray-700 rounded animate-pulse flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-5 w-48 bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-16 bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="w-5 h-5 bg-gray-700 rounded animate-pulse flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

function groupByMonth(movies) {
  const groups = {};
  for (const movie of movies) {
    const date = new Date(movie.watched_date + 'T00:00:00');
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!groups[key]) {
      groups[key] = { label, movies: [] };
    }
    groups[key].movies.push(movie);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([, group]) => group);
}

function EmptyState({ type }) {
  if (type === 'watched') {
    return (
      <div className="text-center py-12 animate-fade-in opacity-0">
        <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
        </svg>
        <p className="text-gray-400">No watched movies yet</p>
        <p className="text-gray-500 text-sm mt-1">Mark movies as watched to track your viewing history</p>
      </div>
    );
  }
  return (
    <div className="text-center py-12 animate-fade-in opacity-0">
      <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
      <p className="text-gray-400">Your watchlist is empty</p>
      <p className="text-gray-500 text-sm mt-1">Search for movies and add them to your list</p>
    </div>
  );
}

export default function WatchlistView({
  movies,
  onMovieClick,
  sortBy,
  sortOrder,
  onSortChange,
  isLoading,
  activeSubTab,
  onSubTabChange,
  watchedMovies,
  onWatchedMovieClick,
  watchedSortBy,
  watchedSortOrder,
  onWatchedSortChange,
  watchedLoading
}) {
  const isWantToWatch = activeSubTab === 'wantToWatch';
  const currentLoading = isWantToWatch ? isLoading : watchedLoading;
  const showGrouping = !isWantToWatch && (watchedSortBy === 'watched_date' || watchedSortBy === 'added_at');

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-800 rounded-lg p-1 mb-6">
        <button
          onClick={() => onSubTabChange('wantToWatch')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            isWantToWatch
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Want to Watch{movies.length > 0 ? ` (${movies.length})` : ''}
        </button>
        <button
          onClick={() => onSubTabChange('watched')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            !isWantToWatch
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Watched{watchedMovies.length > 0 ? ` (${watchedMovies.length})` : ''}
        </button>
      </div>

      {currentLoading ? (
        <LoadingSkeleton />
      ) : isWantToWatch ? (
        /* Want to Watch tab */
        movies.length === 0 ? (
          <EmptyState type="wantToWatch" />
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Want to Watch</h2>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [by, order] = e.target.value.split('-');
                  onSortChange(by, order);
                }}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="added_at-desc">Recently Added</option>
                <option value="added_at-asc">Oldest First</option>
                <option value="title-asc">A-Z</option>
                <option value="title-desc">Z-A</option>
              </select>
            </div>

            <div className="space-y-3">
              {movies.map((movie, index) => (
                <MovieRow
                  key={movie.imdb_id}
                  movie={movie}
                  index={index}
                  onMovieClick={onMovieClick}
                />
              ))}
            </div>
          </div>
        )
      ) : (
        /* Watched tab */
        watchedMovies.length === 0 ? (
          <EmptyState type="watched" />
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Watched</h2>
              <select
                value={`${watchedSortBy}-${watchedSortOrder}`}
                onChange={(e) => {
                  const [by, order] = e.target.value.split('-');
                  onWatchedSortChange(by, order);
                }}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="watched_date-desc">Recently Watched</option>
                <option value="watched_date-asc">Oldest First</option>
                <option value="title-asc">A-Z</option>
                <option value="title-desc">Z-A</option>
              </select>
            </div>

            {showGrouping ? (
              groupByMonth(watchedMovies).map((group) => (
                <div key={group.label} className="mb-6">
                  <h3 className="text-gray-400 text-sm font-medium mb-3 sticky top-0 bg-gray-950 py-2 z-10">
                    {group.label}
                  </h3>
                  <div className="space-y-3">
                    {group.movies.map((movie, index) => (
                      <MovieRow
                        key={movie.imdb_id}
                        movie={movie}
                        index={index}
                        onMovieClick={onWatchedMovieClick}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="space-y-3">
                {watchedMovies.map((movie, index) => (
                  <MovieRow
                    key={movie.imdb_id}
                    movie={movie}
                    index={index}
                    onMovieClick={onWatchedMovieClick}
                  />
                ))}
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
