import { useEffect, useState } from 'react';

const SEVERITY_COLORS = {
  'None': 'bg-green-500',
  'Mild': 'bg-yellow-500',
  'Moderate': 'bg-orange-500',
  'Severe': 'bg-red-500',
  'Unknown': 'bg-gray-500'
};

function SeverityBadge({ severity }) {
  const colorClass = SEVERITY_COLORS[severity] || SEVERITY_COLORS['Unknown'];
  return (
    <span className={`${colorClass} text-white text-xs font-bold px-2 py-1 rounded`}>
      {severity}
    </span>
  );
}

function ParentsGuideSection({ category }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-750 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="font-medium text-white">{category.name}</span>
          <SeverityBadge severity={category.severity} />
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && category.items.length > 0 && (
        <div className="p-4 bg-gray-900 space-y-2">
          {category.items.map((item, i) => (
            <p key={i} className="text-gray-300 text-sm leading-relaxed">
              {item}
            </p>
          ))}
        </div>
      )}
      {expanded && category.items.length === 0 && (
        <div className="p-4 bg-gray-900">
          <p className="text-gray-500 text-sm italic">No details available</p>
        </div>
      )}
    </div>
  );
}

export default function MovieDetails({ imdbId, onClose }) {
  const [movie, setMovie] = useState(null);
  const [parentsGuide, setParentsGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const [movieRes, guideRes] = await Promise.all([
          fetch(`/api/movie/${imdbId}`),
          fetch(`/api/parents-guide/${imdbId}`)
        ]);

        if (!movieRes.ok) throw new Error('Failed to fetch movie');

        const movieData = await movieRes.json();
        setMovie(movieData);

        if (guideRes.ok) {
          const guideData = await guideRes.json();
          setParentsGuide(guideData);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [imdbId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-gray-900 p-8 rounded-xl max-w-md">
          <p className="text-red-400 mb-4">{error || 'Movie not found'}</p>
          <button onClick={onClose} className="text-blue-400 hover:text-blue-300">
            Go back
          </button>
        </div>
      </div>
    );
  }

  const hasPoster = movie.Poster && movie.Poster !== 'N/A';

  // Filter out non-category keys from parentsGuide
  const guideCategories = parentsGuide
    ? Object.entries(parentsGuide).filter(([key]) => !['link', 'error'].includes(key))
    : [];

  return (
    <div className="fixed inset-0 bg-black/90 overflow-y-auto z-50">
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={onClose}
            className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to search
          </button>

          <div className="bg-gray-900 rounded-2xl overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/3 flex-shrink-0">
                {hasPoster ? (
                  <img
                    src={movie.Poster}
                    alt={movie.Title}
                    className="w-full h-auto"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-gray-700 flex items-center justify-center">
                    <div className="text-center p-4">
                      <svg className="w-16 h-16 mx-auto text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                      </svg>
                      <span className="text-gray-400">No poster available</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 md:p-8 flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">{movie.Title}</h1>
                <p className="text-gray-400 mb-4">
                  {movie.Year} &bull; {movie.Runtime} &bull; {movie.Rated}
                </p>

                <p className="text-gray-300 mb-6 leading-relaxed">{movie.Plot}</p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Director</div>
                    <div className="text-white font-medium">{movie.Director}</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Genre</div>
                    <div className="text-white font-medium">{movie.Genre}</div>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-white mb-4">Ratings</h2>
                <div className="space-y-3 mb-6">
                  {(movie.rottenTomatoes?.criticScore || movie.rottenTomatoes?.audienceScore) && (
                    <div className="flex flex-wrap gap-3">
                      {movie.rottenTomatoes?.criticScore && (
                        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 flex items-center gap-3">
                          <span className="text-3xl">🍅</span>
                          <div>
                            <div className="text-2xl font-bold text-white">{movie.rottenTomatoes.criticScore}</div>
                            <div className="text-sm text-red-300">Critics</div>
                          </div>
                        </div>
                      )}
                      {movie.rottenTomatoes?.audienceScore && (
                        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 flex items-center gap-3">
                          <span className="text-3xl">🍿</span>
                          <div>
                            <div className="text-2xl font-bold text-white">{movie.rottenTomatoes.audienceScore}</div>
                            <div className="text-sm text-red-300">Audience</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {((movie.imdbRating && movie.imdbRating !== 'N/A') || (movie.Metascore && movie.Metascore !== 'N/A')) && (
                    <div className="flex flex-wrap gap-3">
                      {movie.imdbRating && movie.imdbRating !== 'N/A' && (
                        <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg p-4 flex items-center gap-3">
                          <span className="text-3xl">⭐</span>
                          <div>
                            <div className="text-2xl font-bold text-white">{movie.imdbRating}/10</div>
                            <div className="text-sm text-yellow-300">IMDB</div>
                          </div>
                        </div>
                      )}
                      {movie.Metascore && movie.Metascore !== 'N/A' && (
                        <div className="bg-green-900/50 border border-green-700 rounded-lg p-4 flex items-center gap-3">
                          <span className="text-3xl">📊</span>
                          <div>
                            <div className="text-2xl font-bold text-white">{movie.Metascore}</div>
                            <div className="text-sm text-green-300">Metacritic</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {parentsGuide && (
              <div className="p-6 md:p-8 border-t border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">IMDB Parents Guide</h2>
                  {parentsGuide.link && (
                    <a
                      href={parentsGuide.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                    >
                      View on IMDB
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
                {parentsGuide.error ? (
                  <p className="text-gray-400">
                    Unable to load parents guide. <a href={parentsGuide.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">View on IMDB</a>
                  </p>
                ) : (
                  <div className="space-y-3">
                    {guideCategories.map(([key, category]) => (
                      <ParentsGuideSection key={key} category={category} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
