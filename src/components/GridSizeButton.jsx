export default function GridSizeButton({ columns, onChange }) {
  const next = columns >= 4 ? 1 : columns + 1;

  // Generate grid dots SVG based on column count
  const renderGrid = () => {
    const rects = [];
    const n = columns;
    const padding = 3;
    const available = 24 - padding * 2;
    const gap = 2;
    const size = (available - gap * (n - 1)) / n;

    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        rects.push(
          <rect
            key={`${row}-${col}`}
            x={padding + col * (size + gap)}
            y={padding + row * (size + gap)}
            width={size}
            height={size}
            rx={1}
            fill="currentColor"
          />
        );
      }
    }
    return rects;
  };

  return (
    <button
      onClick={() => onChange(next)}
      className="fixed bottom-20 right-4 z-30 w-10 h-10 rounded-full bg-gray-800 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 shadow-lg transition-all duration-200 flex items-center justify-center"
      aria-label={`Grid size: ${columns} columns. Click for ${next}`}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        {renderGrid()}
      </svg>
    </button>
  );
}
