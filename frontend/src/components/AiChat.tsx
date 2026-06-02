import { useState } from "react";
import { api } from "../api";

interface Message {
  role: "user" | "assistant" | "error";
  text: string;
}

const SUGGESTIONS = [
  "What are the main risks here?",
  "Summarise the recent news.",
  "What would change your view?",
  "How does this compare to its sector peers?",
];

export default function AiChat({ ticker }: { ticker: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async (q: string) => {
    const text = q.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setLoading(true);
    try {
      const res = await api.ask(ticker, text);
      setMessages((m) => [...m, { role: "assistant", text: res.answer }]);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setMessages((m) => [
        ...m,
        { role: "error", text: msg.includes("503")
            ? "Ask-AI is not configured. Set DEEPSEEK_API_KEY in backend/.env, restart the backend, and try again."
            : msg },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-700">
          Ask AI about {ticker}
        </h3>
        <span className="text-[10px] uppercase tracking-wide text-slate-400">
          DeepSeek
        </span>
      </div>

      {messages.length === 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-2">
            Ask anything about this stock. The assistant gets the same
            indicators, prices, and news this app does.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs px-2 py-1 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <ul className="space-y-3 mb-3 max-h-96 overflow-auto pr-1">
          {messages.map((m, i) => (
            <li key={i}>
              <div className={`text-[10px] uppercase tracking-wide mb-1 ${
                m.role === "user"
                  ? "text-slate-500"
                  : m.role === "error"
                  ? "text-rose-500"
                  : "text-nordic-700"
              }`}>
                {m.role === "user" ? "You" : m.role === "error" ? "Error" : "AI"}
              </div>
              <div className={`text-sm whitespace-pre-wrap leading-relaxed rounded-md p-2 ${
                m.role === "user"
                  ? "bg-slate-50 text-slate-800"
                  : m.role === "error"
                  ? "bg-rose-50 text-rose-700"
                  : "bg-nordic-50 text-slate-800"
              }`}>
                {m.text}
              </div>
            </li>
          ))}
          {loading && (
            <li className="text-xs text-slate-500">AI is thinking…</li>
          )}
        </ul>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask about ${ticker}…`}
          className="flex-1 px-3 py-2 text-sm rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-nordic-500 focus:border-nordic-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-3 py-2 rounded-md bg-nordic-700 text-white text-sm hover:bg-nordic-900 disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
