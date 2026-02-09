"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Scale,
  Loader2,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shield,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { CopyButton } from "@/components/ui/CopyButton";
import { LoadingDots } from "@/components/ui/LoadingDots";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { useSessionStore, useSettingsStore } from "@/lib/store";
import { MAX_INTERVIEW_TURNS } from "@/lib/types";
import type { CoachResponse, ArtifactType } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^### (.*$)/gm, '<h4 class="text-sm font-semibold mt-3 mb-1">$1</h4>')
    .replace(/^## (.*$)/gm, '<h3 class="text-base font-semibold mt-3 mb-1">$1</h3>')
    .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc text-sm">$1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal text-sm">$1</li>')
    .replace(/\n/g, "<br />");
}

export default function InterviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const session = useSessionStore((s) => s.sessions.find((ss) => ss.id === id));
  const addMessage = useSessionStore((s) => s.addMessage);
  const updateOPFacts = useSessionStore((s) => s.updateOPFacts);
  const addTimelineEvent = useSessionStore((s) => s.addTimelineEvent);
  const addSafetyFlags = useSessionStore((s) => s.addSafetyFlags);
  const addArtifact = useSessionStore((s) => s.addArtifact);
  const updateSession = useSessionStore((s) => s.updateSession);
  const incrementTurnCount = useSessionStore((s) => s.incrementTurnCount);
  const setStatus = useSessionStore((s) => s.setStatus);
  const getMissingCriticalFields = useSessionStore((s) => s.getMissingCriticalFields);
  const tone = useSettingsStore((s) => s.tone);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [nextQuestions, setNextQuestions] = useState<string[]>([]);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [session?.conversation.length, scrollToBottom]);

  // Check completion conditions
  const turnCount = session?.interviewTurnCount ?? 0;
  const criticalMissing = session ? getMissingCriticalFields(id) : [];
  const isComplete = turnCount >= MAX_INTERVIEW_TURNS || criticalMissing.length === 0;

  // Auto-start: send initial analysis message on first load
  useEffect(() => {
    if (!session || hasStarted || session.conversation.length > 0) return;
    setHasStarted(true);
    sendInitialAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, hasStarted]);

  if (!session) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <Scale className="mb-4 h-12 w-12 text-white/20" />
          <h2 className="mb-2 text-xl font-semibold text-white/70">Session not found</h2>
          <Link href="/new" className="btn-primary mt-4">Start New Case</Link>
        </div>
      </PageWrapper>
    );
  }

  async function sendInitialAnalysis() {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: id,
          userMessage: "I just completed the intake form. Please review my information and ask me follow-up questions about anything that's missing or unclear.",
          opFacts: session.opFacts,
          jurisdiction: session.jurisdiction,
          timeline: session.timeline,
          conversationHistory: [],
          tone,
          mode: "interview",
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${res.status})`);
      }

      const data: CoachResponse = await res.json();
      addMessage(id, { role: "assistant", content: data.assistant_message });

      if (data.extracted_facts && Object.keys(data.extracted_facts).length > 0) {
        updateOPFacts(id, data.extracted_facts);
      }
      if (data.safety_flags?.length > 0) {
        addSafetyFlags(id, data.safety_flags);
      }
      setNextQuestions(data.next_questions || []);
      setMissingFields(data.missing_fields || []);
      if (data.progress_percent > 0) {
        updateSession(id, { progressPercent: data.progress_percent });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Something went wrong";
      setError(errMsg);
    } finally {
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  }

  async function sendMessage(messageText?: string) {
    const msg = (messageText || input).trim();
    if (!msg || loading || !session) return;

    setInput("");
    setError("");
    setLoading(true);

    addMessage(id, { role: "user", content: msg });
    incrementTurnCount(id);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: id,
          userMessage: msg,
          opFacts: session.opFacts,
          jurisdiction: session.jurisdiction,
          timeline: session.timeline,
          conversationHistory: session.conversation,
          tone,
          mode: "interview",
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${res.status})`);
      }

      const data: CoachResponse = await res.json();
      addMessage(id, { role: "assistant", content: data.assistant_message });

      if (data.extracted_facts && Object.keys(data.extracted_facts).length > 0) {
        updateOPFacts(id, data.extracted_facts);
      }
      if (data.timeline_events?.length > 0) {
        for (const evt of data.timeline_events) {
          addTimelineEvent(id, evt);
        }
      }
      if (data.safety_flags?.length > 0) {
        addSafetyFlags(id, data.safety_flags);
      }
      if (data.suggested_artifacts?.length > 0) {
        for (const art of data.suggested_artifacts) {
          addArtifact(id, { type: art.type as ArtifactType, title: art.title, content: art.content });
        }
      }
      if (data.progress_percent > 0) {
        updateSession(id, { progressPercent: data.progress_percent });
      }

      setNextQuestions(data.next_questions || []);
      setMissingFields(data.missing_fields || []);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Something went wrong";
      setError(errMsg);
      addMessage(id, { role: "system", content: `Error: ${errMsg}` });
    } finally {
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleFinish() {
    setStatus(id, "active");
    router.push(`/case/${id}/roadmap`);
  }

  return (
    <div className="relative z-10 flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header */}
      <div className="border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white/90">
              <MessageSquare className="mr-2 inline h-5 w-5 text-accent-blue" />
              Interview
            </h1>
            <p className="text-xs text-white/40">
              Round {Math.min(turnCount + 1, MAX_INTERVIEW_TURNS)} of {MAX_INTERVIEW_TURNS}
              {criticalMissing.length > 0 && (
                <span className="ml-2 text-yellow-400">
                  {criticalMissing.length} critical field{criticalMissing.length !== 1 ? "s" : ""} remaining
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-32">
              <ProgressBar
                value={Math.round((turnCount / MAX_INTERVIEW_TURNS) * 100)}
                label=""
              />
            </div>
            {isComplete && (
              <button onClick={handleFinish} className="btn-primary text-sm">
                View Final Roadmap
                <ArrowRight className="ml-1 h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Completion banner */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-accent-mint/20 bg-accent-mint/5 px-4 py-3"
          >
            <div className="mx-auto flex max-w-4xl items-center gap-3">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-accent-mint" />
              <div className="flex-1">
                <p className="text-sm font-medium text-accent-mint">Interview Complete</p>
                <p className="text-xs text-white/50">
                  {criticalMissing.length === 0
                    ? "All critical fields have been filled."
                    : `${MAX_INTERVIEW_TURNS} rounds completed.`}
                  {" "}You can continue chatting or generate your final roadmap.
                </p>
              </div>
              <button onClick={handleFinish} className="btn-primary text-sm">
                Generate Final Plan
                <ArrowRight className="ml-1 h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-4xl space-y-4">
          {session.conversation.length === 0 && !loading && (
            <div className="py-16 text-center">
              <Scale className="mx-auto mb-4 h-10 w-10 text-accent-mint/40" />
              <p className="text-white/40">Analyzing your intake data...</p>
            </div>
          )}

          {session.conversation.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`relative max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-accent-blue/20 text-white/90"
                    : msg.role === "system"
                      ? "bg-accent-rose/10 text-accent-rose/80"
                      : "bg-white/[0.06] text-white/80"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="absolute -top-1 right-2">
                    <CopyButton text={msg.content} />
                  </div>
                )}
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                <p className="mt-1 text-[10px] text-white/20">{formatDateTime(msg.timestamp)}</p>
              </div>
            </motion.div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-white/[0.06] px-4 py-3">
                <LoadingDots />
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Missing fields sidebar (collapsed into inline chips) */}
      {missingFields.length > 0 && !isComplete && (
        <div className="border-t border-white/5 px-4 py-2">
          <div className="mx-auto flex max-w-4xl items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-yellow-400" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/30">Missing:</span>
            <div className="flex flex-wrap gap-1">
              {missingFields.slice(0, 5).map((f) => (
                <span key={f} className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] text-yellow-400">
                  {f.replace(/[._]/g, " ")}
                </span>
              ))}
              {missingFields.length > 5 && (
                <span className="text-[10px] text-white/30">+{missingFields.length - 5} more</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Suggested questions */}
      <AnimatePresence>
        {nextQuestions.length > 0 && !loading && !isComplete && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/5 px-4 py-2"
          >
            <div className="mx-auto max-w-4xl">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-white/30">
                Quick answers
              </p>
              <div className="flex flex-wrap gap-1.5">
                {nextQuestions.slice(0, 4).map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/60 transition hover:bg-white/[0.08] hover:text-white/80"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <div className="border-t border-accent-rose/20 bg-accent-rose/5 px-4 py-2">
          <p className="mx-auto max-w-4xl text-xs text-accent-rose">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-white/10 px-4 py-3">
        <div className="mx-auto flex max-w-4xl gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isComplete ? "You can still add details, or click 'Generate Final Plan'..." : "Answer the questions above..."}
            rows={2}
            className="glass-input flex-1 resize-none text-sm"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="btn-primary self-end rounded-xl px-4 py-3 disabled:opacity-30"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
        <div className="mx-auto mt-1 flex max-w-4xl items-center justify-between">
          <p className="text-[10px] text-white/25">
            Educational information only. Not legal advice.
          </p>
          <div className="flex items-center gap-1 text-[10px] text-white/25">
            <Shield className="h-3 w-3" />
            Need help now? <a href="tel:18009426906" className="text-accent-rose hover:underline">1-800-942-6906</a>
          </div>
        </div>
      </div>
    </div>
  );
}
