"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Send, Sparkles, User, FileText, ChevronRight, Zap, AlertCircle } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  isStreaming?: boolean;
}

const SourceChip = ({ name }: { name: string }) => (
  <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary hover:bg-primary/20 transition-all group">
    <FileText className="w-3 h-3" />
    <span>{name}</span>
    <ChevronRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
  </button>
);

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "# Welcome to Cortex Obsidian\n\nI have initialized the intelligence kernel. Upload documents via the **Document Library**, then ask me anything about them.\n\n- **Analyze** complex PDF structures\n- **Extract** key insights from your library\n- **Connect** related research papers",
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const conversationHistory = messages
    .filter((m) => !m.isStreaming)
    .map(({ role, content }) => ({ role, content }));

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setError(null);
    setInput("");
    setIsStreaming(true);

    // Append user message
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);

    // Placeholder streaming message
    const streamId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: streamId, role: "assistant", content: "", isStreaming: true },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationHistory }),
      });

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? "Failed to reach the AI service.");
      }

      // Read the SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let sources: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const rawChunk = decoder.decode(value, { stream: true });
        const lines = rawChunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.delta) {
              accumulated += parsed.delta;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamId ? { ...m, content: accumulated } : m
                )
              );
            }
            if (parsed.done) {
              sources = parsed.sources ?? [];
            }
          } catch {
            // Partial JSON – skip
          }
        }
      }

      // Finalise the streaming message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamId ? { ...m, isStreaming: false, sources } : m
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error.";
      setError(msg);
      // Remove the empty placeholder on failure
      setMessages((prev) => prev.filter((m) => m.id !== streamId));
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface">
      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center gap-3 p-4 sm:p-6 lg:p-8 bg-surface/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary">
          <Zap className="w-5 h-5 fill-primary/20" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white tracking-wide">Research Terminal</h2>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isStreaming ? "bg-amber-400 animate-pulse" : "bg-emerald-500 animate-pulse"}`} />
            <span className="text-[9px] font-bold text-on-surface-variant/40 tracking-widest uppercase">
              {isStreaming ? "Kernel Processing..." : "Encryption Active"}
            </span>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-4 lg:mx-8 mt-4 flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400/60 hover:text-red-400 transition-colors font-bold text-xs"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Stream */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 lg:px-12 py-8 space-y-8 lg:space-y-10 scroll-smooth"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              <div className={`flex items-start gap-3 lg:gap-4 max-w-[90%] lg:max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`
                  flex-shrink-0 w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center border
                  ${msg.role === "assistant"
                    ? "bg-primary/10 border-primary/20 text-primary"
                    : "bg-surface-bright border-white/10 text-on-surface-variant"}
                `}>
                  {msg.role === "assistant"
                    ? <Sparkles className={`w-3.5 h-3.5 lg:w-4 lg:h-4 ${msg.isStreaming ? "animate-spin" : ""}`} />
                    : <User className="w-3.5 h-3.5 lg:w-4 lg:h-4" />}
                </div>

                <div className="flex flex-col gap-2 lg:gap-3 min-w-0">
                  <div className={`
                    px-4 lg:px-6 py-3 lg:py-4 rounded-2xl text-sm lg:text-[15px] leading-relaxed
                    ${msg.role === "user"
                      ? "bg-primary text-on-primary font-medium shadow-lg"
                      : "bg-white/5 border border-white/10 text-on-surface backdrop-blur-md"}
                  `}>
                    {/* Show a pulsing cursor while streaming */}
                    {msg.isStreaming && msg.content === "" ? (
                      <div className="flex gap-1 items-center h-5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
                      </div>
                    ) : (
                      <div className="prose prose-sm lg:prose-base prose-invert max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                        {msg.isStreaming && <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse" />}
                      </div>
                    )}
                  </div>

                  {msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 lg:gap-2 px-1">
                      <span className="text-[9px] font-bold text-on-surface-variant/30 tracking-widest uppercase self-center">Sources:</span>
                      {msg.sources.map((source) => (
                        <SourceChip key={source} name={source} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input Bar */}
      <div className="p-4 lg:p-8 pt-2 z-20">
        <div className="max-w-4xl mx-auto relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-tertiary/10 to-primary/20 rounded-3xl blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000" />

          <div className="relative glass-panel rounded-2xl lg:rounded-3xl p-1.5 lg:p-2 flex items-center gap-2 shadow-2xl">
            <div className="pl-3 lg:pl-4 text-on-surface-variant/40 hidden sm:block">
              <Sparkles className="w-4 lg:w-5 h-4 lg:h-5" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={isStreaming ? "Kernel is responding..." : "Ask anything about your documents..."}
              disabled={isStreaming}
              className="flex-1 bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant/30 py-3 lg:py-4 px-2 text-sm lg:text-base disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className={`
                p-2.5 lg:p-3.5 rounded-xl lg:rounded-2xl transition-all duration-300
                ${input.trim() && !isStreaming
                  ? "bg-primary text-on-primary shadow-[0_0_20px_rgba(173,198,255,0.4)] scale-100"
                  : "bg-white/5 text-on-surface-variant/20 scale-95 cursor-not-allowed"}
              `}
            >
              <Send className="w-4 lg:w-5 h-4 lg:h-5" />
            </button>
          </div>

          <div className="hidden sm:flex items-center justify-center gap-6 mt-3 opacity-30 group-focus-within:opacity-100 transition-opacity">
            <p className="text-[8px] lg:text-[9px] font-bold text-on-surface-variant tracking-[0.15em] uppercase flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary" />
              Enter to Send
            </p>
            <p className="text-[8px] lg:text-[9px] font-bold text-on-surface-variant tracking-[0.15em] uppercase flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-tertiary" />
              RAG-powered answers
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
