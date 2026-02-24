import { useState, useEffect, useRef } from 'react';
import SearchBar from './components/SearchBar';
import MovieGrid from './components/MovieGrid';
import MovieDetails from './components/MovieDetails';
import AuthPage from './components/AuthPage';
import AdminPanel from './components/AdminPanel';
import UserMenu from './components/UserMenu';
import BottomNav from './components/BottomNav';
import WatchlistView from './components/WatchlistView';
import ExploreView from './components/ExploreView';
import { csrfHeaders } from './utils/csrf';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
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
  const [exploreMode, setExploreMode] = useState('week');
  const [exploreGenre, setExploreGenre] = useState('28'); // Default to Action
  const lastTrendingFetchRef = useRef(0);

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
        setUserEmail(data.email || null);
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
        headers: { ...csrfHeaders() },
        credentials: 'include'
      });
    } catch (_err) {
      // Ignore errors
    }
    setIsAuthenticated(false);
    setIsAdmin(false);
    setUserEmail(null);
    setMovies([]);
    setHasSearched(false);
    setActiveView('search');
    setWatchlistIds(new Set());
    setWatchlistMovies([]);
  }

  function handleLogin(userIsAdmin, email) {
    setIsAuthenticated(true);
    setIsAdmin(userIsAdmin);
    setUserEmail(email || null);
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
          headers: { ...csrfHeaders() },
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
          headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
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

  async function fetchExplore(page = 1, mode = exploreMode, genre = exploreGenre, append = false) {
    setTrendingLoading(true);
    try {
      let url = `/api/trending?page=${page}&time=${mode}`;
      if (mode === 'genre') {
        url += `&genre=${genre}`;
      }
      const response = await fetch(url, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (append) {
          setTrendingMovies(prev => [...prev, ...(data.results || [])]);
        } else {
          setTrendingMovies(data.results || []);
        }
        setTrendingPage(data.page);
        // Stop pagination if page returns no results (can happen due to server-side filtering)
        setTrendingHasMore(data.page < data.totalPages && data.results?.length > 0);
      }
    } catch (err) {
      console.error('Failed to fetch trending:', err);
    } finally {
      setTrendingLoading(false);
    }
  }

  function loadMoreExplore() {
    const now = Date.now();
    const timeSinceLastFetch = now - lastTrendingFetchRef.current;
    const throttleMs = 1000; // Minimum 1 second between requests

    if (!trendingLoading && trendingHasMore && timeSinceLastFetch >= throttleMs) {
      lastTrendingFetchRef.current = now;
      fetchExplore(trendingPage + 1, exploreMode, exploreGenre, true);
    }
  }

  function handleModeChange(mode) {
    setExploreMode(mode);
    setTrendingMovies([]);
    setTrendingPage(1);
    setTrendingHasMore(true);
    fetchExplore(1, mode, exploreGenre, false);
  }

  function handleGenreChange(genre) {
    setExploreGenre(genre);
    setTrendingMovies([]);
    setTrendingPage(1);
    setTrendingHasMore(true);
    fetchExplore(1, exploreMode, genre, false);
  }

  function handleMovieClick(imdbId, poster = null) {
    setSelectedMovieId(imdbId);
    setSelectedMoviePoster(poster);
  }

  function handleSearchMovieClick(imdbId) {
    const movie = movies.find(m => m.imdbID === imdbId);
    handleMovieClick(imdbId, movie?.Poster);
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
      fetchExplore(1, exploreMode, exploreGenre, false);
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
          <div className="absolute top-4 right-4">
            <UserMenu
              isAdmin={isAdmin}
              onLogout={handleLogout}
              onOpenAdmin={() => setShowAdminPanel(true)}
            />
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

            <MovieGrid movies={movies} onMovieClick={handleSearchMovieClick} />
          </>
        ) : activeView === 'trending' ? (
          <ExploreView
            movies={trendingMovies}
            onMovieClick={handleTrendingMovieClick}
            isLoading={trendingLoading}
            hasMore={trendingHasMore}
            onLoadMore={loadMoreExplore}
            mode={exploreMode}
            onModeChange={handleModeChange}
            genre={exploreGenre}
            onGenreChange={handleGenreChange}
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
