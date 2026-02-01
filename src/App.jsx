import { useState, useEffect } from 'react';
import SearchBar from './components/SearchBar';
import MovieGrid from './components/MovieGrid';
import MovieDetails from './components/MovieDetails';
import AuthPage from './components/AuthPage';
import AdminPanel from './components/AdminPanel';
import BottomNav from './components/BottomNav';
import WatchlistView from './components/WatchlistView';
import TrendingView from './components/TrendingView';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMovieId, setSelectedMovieId] = useState(null);
  const [selectedMoviePoster, setSelectedMoviePoster] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [inviteToken, setInviteToken] = useState(null);
  const [activeView, setActiveView] = useState('search');
  const [watchlistIds, setWatchlistIds] = useState(new Set());
  const [watchlistMovies, setWatchlistMovies] = useState([]);
  const [watchlistSort, setWatchlistSort] = useState({ by: 'added_at', order: 'desc' });
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingPage, setTrendingPage] = useState(1);
  const [trendingHasMore, setTrendingHasMore] = useState(true);
  const [trendingTimeWindow, setTrendingTimeWindow] = useState('day');

  async function fetchWatchlistIds() {
    try {
      const response = await fetch('/api/watchlist/ids', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setWatchlistIds(new Set(data.ids || []));
      }
    } catch (err) {
      console.error('Failed to fetch watchlist IDs:', err);
    }
  }

  useEffect(() => {
    // Check for invite token in URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setInviteToken(token);
      // Clean URL without reloading
      window.history.replaceState({}, '', window.location.pathname);
    }

    fetch('/api/auth/check', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setIsAuthenticated(data.authenticated);
        setIsAdmin(data.isAdmin || false);
        if (data.authenticated) {
          fetchWatchlistIds();
        }
      })
      .catch(() => setIsAuthenticated(false))
      .finally(() => setIsCheckingAuth(false));
  }, []);

  async function handleLogout() {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (_err) {
      // Ignore errors
    }
    setIsAuthenticated(false);
    setIsAdmin(false);
    setMovies([]);
    setHasSearched(false);
    setActiveView('search');
    setWatchlistIds(new Set());
    setWatchlistMovies([]);
  }

  function handleLogin(userIsAdmin) {
    setIsAuthenticated(true);
    setIsAdmin(userIsAdmin);
    setInviteToken(null);
    fetchWatchlistIds();
  }

  async function fetchWatchlistWithSort(sortBy, sortOrder) {
    setWatchlistLoading(true);
    try {
      const response = await fetch(
        `/api/watchlist?sort=${sortBy}&order=${sortOrder}`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const data = await response.json();
        setWatchlistMovies(data.movies || []);
      }
    } catch (err) {
      console.error('Failed to fetch watchlist:', err);
    } finally {
      setWatchlistLoading(false);
    }
  }

  async function toggleWatchlist(movie, inWatchlist) {
    try {
      if (inWatchlist) {
        await fetch(`/api/watchlist/${movie.imdbID}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        setWatchlistIds(prev => {
          const next = new Set(prev);
          next.delete(movie.imdbID);
          return next;
        });
        setWatchlistMovies(prev => prev.filter(m => m.imdb_id !== movie.imdbID));
      } else {
        await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            imdbId: movie.imdbID,
            title: movie.Title,
            year: movie.Year,
            poster: movie.Poster
          })
        });
        setWatchlistIds(prev => new Set([...prev, movie.imdbID]));
        if (activeView === 'watchlist') {
          fetchWatchlistWithSort(watchlistSort.by, watchlistSort.order);
        }
      }
    } catch (err) {
      console.error('Failed to toggle watchlist:', err);
    }
  }

  async function handleSearch(query) {
    setIsLoading(true);
    setError(null);
    setMovies([]); // Clear previous results immediately
    setHasSearched(true);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setMovies([]);
      } else {
        setMovies(data.results || []);
      }
    } catch (_err) {
      setError('Failed to search movies. Is the server running?');
      setMovies([]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleClear() {
    setMovies([]);
    setError(null);
    setHasSearched(false);
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage onLogin={handleLogin} initialToken={inviteToken} />;
  }

  async function fetchTrending(page = 1, timeWindow = trendingTimeWindow, append = false) {
    setTrendingLoading(true);
    try {
      const response = await fetch(`/api/trending?page=${page}&time=${timeWindow}`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (append) {
          setTrendingMovies(prev => [...prev, ...(data.results || [])]);
        } else {
          setTrendingMovies(data.results || []);
        }
        setTrendingPage(data.page);
        setTrendingHasMore(data.page < data.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch trending:', err);
    } finally {
      setTrendingLoading(false);
    }
  }

  function loadMoreTrending() {
    if (!trendingLoading && trendingHasMore) {
      fetchTrending(trendingPage + 1, trendingTimeWindow, true);
    }
  }

  function handleTimeWindowChange(timeWindow) {
    setTrendingTimeWindow(timeWindow);
    setTrendingMovies([]);
    setTrendingPage(1);
    setTrendingHasMore(true);
    fetchTrending(1, timeWindow, false);
  }

  function handleMovieClick(imdbId, poster = null) {
    setSelectedMovieId(imdbId);
    setSelectedMoviePoster(poster);
  }

  function handleTrendingMovieClick(imdbId) {
    const movie = trendingMovies.find(m => m.imdbID === imdbId);
    handleMovieClick(imdbId, movie?.Poster);
  }

  function handleWatchlistMovieClick(imdbId) {
    const movie = watchlistMovies.find(m => m.imdb_id === imdbId);
    handleMovieClick(imdbId, movie?.poster);
  }

  function handleViewChange(view) {
    setActiveView(view);
    if (view === 'watchlist') {
      fetchWatchlistWithSort(watchlistSort.by, watchlistSort.order);
    } else if (view === 'trending' && trendingMovies.length === 0) {
      fetchTrending(1, false);
    }
  }

  function handleSortChange(by, order) {
    setWatchlistSort({ by, order });
    fetchWatchlistWithSort(by, order);
  }

  return (
    <div className="bg-gray-950 min-h-screen pb-16">
      {activeView === 'search' && (
        <header className="py-12 px-4 bg-gradient-to-b from-gray-900 to-gray-950 relative">
          {/* Admin and Logout buttons */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                aria-label="Admin Panel"
                title="Admin Panel"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Logout"
              title="Logout"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>

          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              Movie Search
            </h1>
            <p className="text-gray-400 mb-8">
              Search movies and view ratings & parental guidance
            </p>
            <SearchBar onSearch={handleSearch} onClear={handleClear} isLoading={isLoading} />
          </div>
        </header>
      )}

      <main className="px-4 py-8 max-w-6xl mx-auto">
        {activeView === 'search' ? (
          <>
            {error && (
              <div className="text-center py-12">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {!error && hasSearched && movies.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <p className="text-gray-400">No movies found. Try a different search.</p>
              </div>
            )}

            <MovieGrid movies={movies} onMovieClick={handleMovieClick} />
          </>
        ) : activeView === 'trending' ? (
          <TrendingView
            movies={trendingMovies}
            onMovieClick={handleTrendingMovieClick}
            isLoading={trendingLoading}
            hasMore={trendingHasMore}
            onLoadMore={loadMoreTrending}
            timeWindow={trendingTimeWindow}
            onTimeWindowChange={handleTimeWindowChange}
          />
        ) : (
          <WatchlistView
            movies={watchlistMovies}
            onMovieClick={handleWatchlistMovieClick}
            sortBy={watchlistSort.by}
            sortOrder={watchlistSort.order}
            onSortChange={handleSortChange}
            isLoading={watchlistLoading}
          />
        )}
      </main>

      {selectedMovieId && (
        <MovieDetails
          imdbId={selectedMovieId}
          fallbackPoster={selectedMoviePoster}
          onClose={() => { setSelectedMovieId(null); setSelectedMoviePoster(null); }}
          isInWatchlist={watchlistIds.has(selectedMovieId)}
          onToggleWatchlist={toggleWatchlist}
        />
      )}

      <BottomNav activeView={activeView} onViewChange={handleViewChange} />

      {showAdminPanel && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      )}
    </div>
  );
}

export default App;
