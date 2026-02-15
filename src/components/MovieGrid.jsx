import MovieCard from './MovieCard';

export default function MovieGrid({ movies, onMovieClick }) {
  if (movies.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
      {movies.map((movie, index) => (
        <MovieCard
          key={movie.imdbID}
          movie={movie}
          onClick={() => onMovieClick(movie.imdbID)}
          index={index}
        />
      ))}
    </div>
  );
}
