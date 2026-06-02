import { useWatchlist } from "../hooks/useWatchlist";

interface Props {
  ticker: string;
  size?: "sm" | "md";
}

export default function WatchButton({ ticker, size = "sm" }: Props) {
  const { has, toggle } = useWatchlist();
  const watched = has(ticker);
  const px = size === "md" ? "text-base" : "text-sm";

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toggle(ticker);
      }}
      title={watched ? "Remove from watchlist" : "Add to watchlist"}
      aria-pressed={watched}
      className={`${px} leading-none px-1.5 py-0.5 rounded transition ${
        watched
          ? "text-amber-500 hover:text-amber-600"
          : "text-slate-300 hover:text-slate-500"
      }`}
    >
      {watched ? "★" : "☆"}
    </button>
  );
}
