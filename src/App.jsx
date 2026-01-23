import { useState, useEffect } from 'react';
import SearchBar from './components/SearchBar';
import MovieGrid from './components/MovieGrid';
import MovieDetails from './components/MovieDetails';
import LoginPage from './components/LoginPage';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMovieId, setSelectedMovieId] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    fetch('/api/auth/check', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setIsAuthenticated(data.authenticated))
      .catch(() => setIsAuthenticated(false))
      .finally(() => setIsCheckingAuth(false));
  }, []);

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
    } catch (err) {
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
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  const hasContent = movies.length > 0 || error || (hasSearched && !isLoading);

  // Lock body scroll when there's no content to scroll
  useEffect(() => {
    if (!hasContent) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }

    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [hasContent]);

  return (
    <div className="bg-gray-950 min-h-screen">
      <header className="py-12 px-4 bg-gradient-to-b from-gray-900 to-gray-950">
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

      <main className="px-4 py-8 max-w-6xl mx-auto">
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

        <MovieGrid movies={movies} onMovieClick={setSelectedMovieId} />
      </main>

      {selectedMovieId && (
        <MovieDetails
          imdbId={selectedMovieId}
          onClose={() => setSelectedMovieId(null)}
        />
      )}
    </div>
  );
}

export default App;
