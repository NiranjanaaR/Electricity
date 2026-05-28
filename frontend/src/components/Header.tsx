interface Props {
  onRunAnalysis: () => void;
  running: boolean;
  analysisDate?: string;
}

export default function Header({ onRunAnalysis, running, analysisDate }: Props) {
  return (
    <header className="bg-gradient-to-r from-nordic-900 to-nordic-700 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center font-bold">
              OB
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
              OsloBørs AI Assistant
            </h1>
          </div>
          <p className="text-sm text-white/70 mt-1">
            Daily technical analysis of Oslo Børs stocks &middot; educational only,
            no automatic trading
          </p>
        </div>
        <div className="flex items-center gap-3">
          {analysisDate && (
            <span className="text-xs text-white/70">
              Last analysis: <span className="font-medium text-white">{analysisDate}</span>
            </span>
          )}
          <button
            onClick={onRunAnalysis}
            disabled={running}
            className="px-4 py-2 rounded-md bg-white text-nordic-900 text-sm font-medium hover:bg-nordic-50 disabled:opacity-50 transition"
          >
            {running ? "Running…" : "Run analysis"}
          </button>
        </div>
      </div>
    </header>
  );
}
