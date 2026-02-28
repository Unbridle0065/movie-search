import MovieCard from './MovieCard';

const GRID_CLASSES = {
  1: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6',
  2: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6',
  3: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4',
  4: 'grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-2 md:gap-3',
};

export default function MovieGrid({ movies, onMovieClick, columns = 2 }) {
  if (movies.length === 0) {
    return null;
  }

  return (
    <div className={`grid ${GRID_CLASSES[columns] || GRID_CLASSES[2]}`}>
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
