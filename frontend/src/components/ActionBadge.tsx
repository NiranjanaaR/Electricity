interface Props {
  action: "BUY" | "WATCH" | "AVOID" | string;
}

const styles: Record<string, string> = {
  BUY: "bg-emerald-500 text-white",
  WATCH: "bg-amber-500 text-white",
  AVOID: "bg-slate-400 text-white",
};

export default function ActionBadge({ action }: Props) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-md tracking-wide ${styles[action] ?? "bg-slate-300"}`}>
      {action}
    </span>
  );
}
