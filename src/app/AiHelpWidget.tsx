import { useEffect, useRef, useState } from "react";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  text: string;
}

const F: React.CSSProperties = { fontFamily: "'Pretendard GOV', sans-serif", letterSpacing: "-0.02em" };

export default function AiHelpWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading]);

  async function send() {
    const q = input.trim();
    if (!q || loading) return;
    setMessages(prev => [...prev, { id: ++idRef.current, role: "user", text: q }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessages(prev => [...prev, { id: ++idRef.current, role: "assistant", text: data.answer ?? "답변을 받지 못했어요." }]);
    } catch {
      setMessages(prev => [...prev, { id: ++idRef.current, role: "assistant", text: "답변 서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="AI 문의"
        style={{
          position: "fixed", right: 24, bottom: 24, zIndex: 10000,
          width: 56, height: 56, borderRadius: "50%",
          background: "#005FFF", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0px 4px 12px rgba(0,95,255,0.35)",
        }}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6 6L18 18M18 6L6 18" stroke="white" strokeWidth="2" strokeLinecap="round" /></svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M4 4h16v12H8l-4 4V4z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
            <circle cx="9" cy="10" r="1" fill="white" /><circle cx="12" cy="10" r="1" fill="white" /><circle cx="15" cy="10" r="1" fill="white" />
          </svg>
        )}
      </button>

      {open && (
        <div style={{
          position: "fixed", right: 24, bottom: 92, zIndex: 10000,
          width: 380, height: 520, background: "#FFFFFF",
          border: "1px solid #E4E5E9", borderRadius: 12,
          boxShadow: "0px 8px 24px rgba(34,34,34,0.16)",
          display: "flex", flexDirection: "column", overflow: "hidden", ...F,
        }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #E4E5E9", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#2E3238" }}>AI 문의</span>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2L14 14M14 2L2 14" stroke="#9197A1" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
          </div>

          <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.length === 0 && (
              <div style={{ color: "#767D8A", fontSize: 14, lineHeight: "20px" }}>
                통합장부·매출장부·매입장부 등 기능이나 이 플랫폼에 대해 궁금한 걸 물어보세요.
              </div>
            )}
            {messages.map(m => (
              <div key={m.id} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "80%", padding: "10px 14px", borderRadius: 12,
                  background: m.role === "user" ? "#005FFF" : "#F6F7F8",
                  color: m.role === "user" ? "#FFFFFF" : "#2E3238",
                  fontSize: 14, lineHeight: "20px", whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "10px 14px", borderRadius: 12, background: "#F6F7F8", color: "#767D8A", fontSize: 14 }}>답변 작성 중...</div>
              </div>
            )}
          </div>

          <div style={{ padding: 12, borderTop: "1px solid #E4E5E9", display: "flex", gap: 8, flexShrink: 0 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="궁금한 점을 입력하세요"
              style={{ flex: 1, minWidth: 0, height: 40, border: "1px solid #E4E5E9", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none", ...F }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              style={{
                width: 40, height: 40, borderRadius: 8, border: "none", flexShrink: 0,
                background: input.trim() && !loading ? "#005FFF" : "#E3E5E9",
                color: input.trim() && !loading ? "#FFFFFF" : "#9197A1",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 16L16 9L2 2L2 7.5L11 9L2 10.5L2 16Z" fill="currentColor" /></svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
