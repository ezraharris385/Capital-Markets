import React, { useState, useRef, useEffect } from "react";
import { useStore } from "../lib/store";
import { Icon } from "../components/Icon";
import { askAnalyst, ChatMsg } from "../lib/ai";

const SUGGESTIONS = [
  "What's my probability-weighted pipeline, and where is it concentrated?",
  "Which markets are tightest, and where should I be sourcing land?",
  "How do current rates and cap rates affect build-vs-buy right now?",
  "Which cost components are inflating fastest and what's the impact on a 48MW build?",
  "Who are the most active buyers I should be calling this quarter?",
];

export const Analyst: React.FC = () => {
  const { data, settings } = useStore();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [msgs, busy]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const next = [...msgs, { role: "user" as const, content: q }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const reply = await askAnalyst(next, data, settings);
      setMsgs((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setMsgs((m) => [...m, { role: "assistant", content: `⚠️ ${e.message || "Request failed."}\n\nCheck your API key in Settings, or continue — I'll answer from your local data.` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="col" style={{ gap: 0, height: "calc(100vh - 168px)" }}>
      {!settings.anthropicKey && (
        <div className="card" style={{ marginBottom: 12, borderColor: "color-mix(in srgb, var(--accent) 35%, var(--border))" }}>
          <div className="card-pad row" style={{ gap: 10 }}>
            <Icon name="ai" size={18} style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: 13 }}>Running in <strong>local analysis</strong> mode — I can answer from your live data now. Add an Anthropic API key in Settings for full cross-market reasoning.</span>
          </div>
        </div>
      )}

      <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div ref={scroller} style={{ flex: 1, overflowY: "auto", padding: "22px 24px" }}>
          {msgs.length === 0 && (
            <div className="col" style={{ gap: 18, maxWidth: 640, margin: "8vh auto 0", textAlign: "center", alignItems: "center" }}>
              <div className="brand-mark" style={{ width: 48, height: 48 }}>
                <Icon name="ai" size={26} style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>Meridian Analyst</div>
                <div className="muted" style={{ marginTop: 4 }}>Ask anything across your pipeline, markets, comps, rates and costs. I combine every dataset to answer.</div>
              </div>
              <div className="col" style={{ gap: 8, width: "100%", marginTop: 6 }}>
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="btn" style={{ justifyContent: "flex-start", textAlign: "left", padding: "11px 14px" }} onClick={() => send(s)}>
                    <Icon name="spark" size={15} style={{ color: "var(--accent)", flex: "none" }} /> {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className="row" style={{ alignItems: "flex-start", gap: 12, marginBottom: 20, flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, flex: "none", display: "grid", placeItems: "center", background: m.role === "user" ? "var(--surface-3)" : "var(--brand-deep-2)", color: m.role === "user" ? "var(--text-secondary)" : "var(--accent)" }}>
                {m.role === "user" ? <Icon name="firms" size={15} /> : <Icon name="ai" size={16} />}
              </div>
              <div style={{ maxWidth: "80%", background: m.role === "user" ? "var(--surface-2)" : "transparent", padding: m.role === "user" ? "10px 14px" : "4px 0", borderRadius: 12, fontSize: 13.5, lineHeight: 1.6 }}>
                <Markdown text={m.content} />
              </div>
            </div>
          ))}
          {busy && <div className="row" style={{ gap: 12 }}><div style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", background: "var(--brand-deep-2)", color: "var(--accent)" }}><Icon name="ai" size={16} /></div><span className="muted" style={{ fontSize: 13 }}>Analyzing your data<span className="dots">…</span></span></div>}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", padding: "14px 18px" }}>
          <div className="row" style={{ gap: 10 }}>
            <input className="input" placeholder="Ask the analyst — e.g. “What's my weighted pipeline by market?”"
              value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(input)} />
            <button className="btn btn-primary" onClick={() => send(input)} disabled={busy || !input.trim()}><Icon name="send" size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Minimal markdown: **bold**, bullet lists, _italic_, paragraphs.
function Markdown({ text }: { text: string }) {
  const blocks = text.split("\n");
  return (
    <>
      {blocks.map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
        const bullet = /^\s*[-•]\s+/.test(line);
        const content = inline(line.replace(/^\s*[-•]\s+/, ""));
        if (bullet) return <div key={i} className="row" style={{ alignItems: "flex-start", gap: 8, margin: "2px 0" }}><span style={{ color: "var(--accent)", lineHeight: 1.6 }}>•</span><span>{content}</span></div>;
        return <div key={i} style={{ margin: "3px 0" }}>{content}</div>;
      })}
    </>
  );
}
function inline(s: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|_[^_]+_)/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) parts.push(<strong key={k++}>{tok.slice(2, -2)}</strong>);
    else parts.push(<em key={k++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < s.length) parts.push(s.slice(last));
  return parts;
}
