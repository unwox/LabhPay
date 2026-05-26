"use client";

/**
 * Stage 8 — LabhPay Assistant chat drawer.
 *
 * - Docked right-edge slide-out, focus-trapping while open.
 * - Suggested prompts at the top (fetched from /assistant/suggestions).
 * - Backend returns the full reply; we simulate streaming by revealing
 *   characters with a small interval (~12ms / char) so the UX feels live.
 * - Each assistant message has Copy + Regenerate (regenerate re-asks with
 *   the other model tier).
 */

import * as React from "react";
import {
  MessageCircle,
  X,
  Send,
  Copy,
  RefreshCcw,
  Sparkles,
  Bot,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  askAssistant,
  getAssistantSuggestions,
  type AssistantReply,
  ApiError,
} from "@/lib/api";

const STREAM_INTERVAL_MS = 12;

type Message =
  | { role: "user"; id: string; text: string }
  | {
      role: "assistant";
      id: string;
      text: string;          // currently revealed text
      full: string;          // full text from the server
      meta: AssistantReply;
      streaming: boolean;
      sourceQuestion: string; // the question that produced this reply
      regenerated: boolean;
    };

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function ChatDrawer() {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);

  // Fetch suggestions once when first opened.
  React.useEffect(() => {
    if (!open || suggestions.length) return;
    getAssistantSuggestions()
      .then((r) => setSuggestions(r.suggestions))
      .catch(() => setSuggestions([
        "Which subscriptions are recurring?",
        "Why is my bill high?",
        "Show my top 5 merchants this cycle.",
      ]));
  }, [open, suggestions.length]);

  // Auto-scroll on new messages or streaming updates.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // ESC closes; focus input on open.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    inputRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // ----- streaming simulation -----
  const startStreaming = React.useCallback((msgId: string) => {
    let i = 0;
    const tick = () => {
      setMessages((prev) => {
        const next = prev.map((m) => {
          if (m.role !== "assistant" || m.id !== msgId) return m;
          if (i >= m.full.length) {
            return { ...m, text: m.full, streaming: false };
          }
          i += Math.max(1, Math.round(m.full.length / 180)); // ~3 chars/tick
          return { ...m, text: m.full.slice(0, Math.min(i, m.full.length)) };
        });
        return next;
      });
      const stillStreaming = (
        document.querySelector(`[data-streaming="${msgId}"]`)
      );
      if (stillStreaming) {
        window.setTimeout(tick, STREAM_INTERVAL_MS);
      }
    };
    window.setTimeout(tick, STREAM_INTERVAL_MS);
  }, []);

  // ----- send turn -----
  async function send(question: string, opts?: { regenerate?: boolean }) {
    const q = question.trim();
    if (!q || busy) return;
    setError(null);
    setBusy(true);

    const userMsg: Message = { role: "user", id: uid(), text: q };
    if (!opts?.regenerate) {
      setMessages((prev) => [...prev, userMsg]);
    }
    setInput("");

    try {
      const reply = await askAssistant(q, { regenerate: !!opts?.regenerate });
      const assistantMsg: Message = {
        role: "assistant",
        id: uid(),
        full: reply.answer,
        text: "",
        meta: reply,
        streaming: true,
        sourceQuestion: q,
        regenerated: !!opts?.regenerate,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      startStreaming(assistantMsg.id);
    } catch (e) {
      const detail =
        e instanceof ApiError ? e.detail : e instanceof Error ? e.message : "Failed.";
      setError(detail);
    } finally {
      setBusy(false);
    }
  }

  async function regenerate(msg: Extract<Message, { role: "assistant" }>) {
    await send(msg.sourceQuestion, { regenerate: true });
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard may be blocked — silent */
    }
  }

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open LabhPay Assistant"
        className="fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-ink text-paper shadow-card-lg hover:bg-ink-soft transition-colors"
      >
        <MessageCircle size={22} strokeWidth={1.75} />
      </button>

      {/* Backdrop */}
      <div
        aria-hidden={!open}
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-ink/30 transition-opacity ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer */}
      <aside
        aria-hidden={!open}
        role="dialog"
        aria-label="LabhPay Assistant"
        className={`fixed inset-y-0 right-0 z-50 w-full sm:max-w-md bg-paper-card shadow-card-xl transition-transform duration-300 flex flex-col ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-ink/8">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-mist text-accent-ink">
              <Sparkles size={14} strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
                LabhPay Assistant
              </p>
              <p className="font-display text-base text-ink leading-tight">
                Ask anything about your bill.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-accent-mist"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <SuggestionList suggestions={suggestions} onPick={(s) => send(s)} />
          ) : (
            messages.map((m) =>
              m.role === "user" ? (
                <UserBubble key={m.id} text={m.text} />
              ) : (
                <AssistantBubble
                  key={m.id}
                  msg={m}
                  onCopy={() => copyText(m.text)}
                  onRegenerate={() => regenerate(m)}
                />
              )
            )
          )}
          {busy ? (
            <div className="flex items-center gap-2 text-ink-muted text-sm">
              <Bot size={14} /> Thinking…
            </div>
          ) : null}
          {error ? (
            <p className="text-sm text-ink-soft bg-paper-warm rounded-xl p-3">
              {error}
            </p>
          ) : null}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="border-t border-ink/8 p-3 bg-paper-card"
        >
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder="Ask about merchants, charges, subscriptions…"
              className="flex-1 resize-none rounded-2xl border border-ink/12 bg-paper px-4 py-3 text-[14px] text-ink placeholder-ink-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 max-h-32"
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={busy || !input.trim()}
              aria-label="Send"
            >
              <Send size={14} strokeWidth={1.75} />
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-ink-muted">
            Answers come from your statements only. Auto-deleted with your session.
          </p>
        </form>
      </aside>
    </>
  );
}

/* ---------- pieces ---------- */

function SuggestionList({
  suggestions,
  onPick,
}: {
  suggestions: string[];
  onPick: (s: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] uppercase tracking-eyebrow text-ink-muted">
        Try asking
      </p>
      <div className="flex flex-col gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="text-left text-[14px] text-ink bg-paper-warm hover:bg-accent-mist rounded-2xl px-4 py-3 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl bg-ink text-paper px-4 py-3 text-[14px]">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-eyebrow text-paper/70 mb-1">
          <User size={11} /> You
        </div>
        {text}
      </div>
    </div>
  );
}

function AssistantBubble({
  msg,
  onCopy,
  onRegenerate,
}: {
  msg: Extract<Message, { role: "assistant" }>;
  onCopy: () => void;
  onRegenerate: () => void;
}) {
  return (
    <div className="flex justify-start" data-streaming={msg.streaming ? msg.id : undefined}>
      <div className="max-w-[90%] rounded-2xl bg-paper-warm text-ink px-4 py-3 text-[14px] whitespace-pre-wrap">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-eyebrow text-ink-muted mb-1">
          <Bot size={11} /> Assistant
          {msg.meta.tier_used !== "none" ? (
            <span className="ml-1 px-1.5 py-px rounded-full bg-accent-mist text-accent-ink">
              {msg.meta.tier_used}
            </span>
          ) : null}
          {msg.regenerated ? (
            <span className="ml-1 px-1.5 py-px rounded-full bg-accent-soft text-accent-ink">
              regenerated
            </span>
          ) : null}
        </div>
        <div>{msg.text}{msg.streaming ? <span className="text-ink-muted">▍</span> : null}</div>

        {!msg.streaming ? (
          <div className="mt-3 flex items-center gap-2 text-[12px] text-ink-muted">
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex items-center gap-1 hover:text-ink"
              aria-label="Copy answer"
            >
              <Copy size={12} /> Copy
            </button>
            <button
              type="button"
              onClick={onRegenerate}
              className="inline-flex items-center gap-1 hover:text-ink"
              aria-label="Regenerate with different tier"
            >
              <RefreshCcw size={12} /> Regenerate
            </button>
            {msg.meta.txn_ids_cited.length ? (
              <span className="ml-auto">
                {msg.meta.txn_ids_cited.length} citation
                {msg.meta.txn_ids_cited.length === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
