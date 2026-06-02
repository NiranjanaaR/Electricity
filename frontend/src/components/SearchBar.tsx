interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder }: Props) {
  return (
    <div className="relative w-full sm:max-w-sm">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Search ticker, company, sector…"}
        className="w-full pl-10 pr-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-nordic-500 focus:border-nordic-500"
      />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="absolute left-3 top-3 h-4 w-4 text-slate-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
      </svg>
    </div>
  );
}
