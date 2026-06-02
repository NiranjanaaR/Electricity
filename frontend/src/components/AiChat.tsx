import { useEffect, useRef, useState } from "react";
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

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
        {
          role: "error",
          text: msg.includes("503")
            ? "Ask-AI is not configured yet. Set DEEPSEEK_API_KEY in backend/.env, restart the backend, and try again."
            : msg,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-nordic-200 rounded-2xl shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-nordic-700 via-nordic-500 to-fuchsia-500 px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-xl">
            ✨
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-tight">
              Ask AI about {ticker}
            </h2>
            <p className="text-xs text-white/80">
              DeepSeek-powered analyst with full access to this stock's
              indicators, recent prices and news
            </p>
          </div>
        </div>
      </div>

      <div className="p-5">
        {messages.length === 0 && (
          <div className="text-sm text-slate-600 mb-4">
            Start with one of these, or type your own question below:
          </div>
        )}

        {messages.length === 0 && (
          <div className="grid sm:grid-cols-2 gap-2 mb-4">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-left text-sm px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:border-nordic-500 hover:bg-nordic-50 transition"
              >
                💬 {s}
              </button>
            ))}
          </div>
        )}

        {messages.length > 0 && (
          <div
            ref={scrollRef}
            className="space-y-3 mb-4 max-h-[28rem] overflow-auto pr-1"
          >
            {messages.map((m, i) => (
              <div key={i}>
                <div
                  className={`text-[10px] uppercase tracking-wide mb-1 ${
                    m.role === "user"
                      ? "text-slate-500"
                      : m.role === "error"
                      ? "text-rose-500"
                      : "text-nordic-700"
                  }`}
                >
                  {m.role === "user"
                    ? "You"
                    : m.role === "error"
                    ? "Error"
                    : "✨ AI"}
                </div>
                <div
                  className={`text-sm whitespace-pre-wrap leading-relaxed rounded-lg p-3 ${
                    m.role === "user"
                      ? "bg-slate-100 text-slate-800"
                      : m.role === "error"
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "bg-nordic-50 text-slate-800 border border-nordic-100"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-sm text-slate-500 italic flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-nordic-500 animate-pulse"></span>
                AI is thinking…
              </div>
            )}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask anything about ${ticker}…`}
            className="flex-1 px-3 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-nordic-500 focus:border-nordic-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-nordic-700 to-nordic-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            Ask ✨
          </button>
        </form>
      </div>
    </div>
  );
}
