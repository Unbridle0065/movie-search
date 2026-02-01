export default function WatchlistView({
  movies,
  onMovieClick,
  sortBy,
  sortOrder,
  onSortChange,
  isLoading
}) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400">Loading watchlist...</div>
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        <p className="text-gray-400">Your watchlist is empty</p>
        <p className="text-gray-500 text-sm mt-1">Search for movies and add them to your list</p>
      </div>
    );
  }

  return (
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
        {movies.map((movie) => (
          <button
            key={movie.imdb_id}
            onClick={() => onMovieClick(movie.imdb_id)}
            className="w-full flex items-center gap-4 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors text-left"
          >
            {movie.poster && movie.poster !== 'N/A' ? (
              <img
                src={movie.poster}
                alt={movie.title}
                referrerPolicy="no-referrer"
                className="w-12 h-[72px] object-cover rounded flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-[72px] bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-medium truncate">{movie.title}</h3>
              {movie.year && (
                <p className="text-gray-400 text-sm">{movie.year}</p>
              )}
            </div>
            <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
