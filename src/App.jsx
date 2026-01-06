import { useState } from 'react';
import SearchBar from './components/SearchBar';
import MovieGrid from './components/MovieGrid';
import MovieDetails from './components/MovieDetails';

function App() {
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMovieId, setSelectedMovieId] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(query) {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
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

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="py-12 px-4 bg-gradient-to-b from-gray-900 to-gray-950">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            Movie Search
          </h1>
          <p className="text-gray-400 mb-8">
            Search for movies and view Rotten Tomatoes scores & parental guidance
          </p>
          <SearchBar onSearch={handleSearch} isLoading={isLoading} />
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

        {!hasSearched && (
          <div className="text-center py-12">
            <p className="text-gray-500">Search for a movie to get started</p>
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
