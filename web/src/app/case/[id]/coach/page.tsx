"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Scale,
  Clock,
  Shield,
  FileText,
  AlertTriangle,
  ChevronRight,
  Loader2,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { CopyButton } from "@/components/ui/CopyButton";
import { LoadingDots } from "@/components/ui/LoadingDots";
import { SafetyBadge } from "@/components/ui/SafetyBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { useSessionStore, useSettingsStore } from "@/lib/store";
import type { CoachResponse, ArtifactType } from "@/lib/types";
import { ARTIFACT_LABELS, RELATIONSHIP_LABELS } from "@/lib/types";
import type { RelationshipCategory } from "@/lib/types";
import { formatDate, formatDateTime, containsSensitiveInfo, getSensitiveWarning } from "@/lib/utils";

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

export default function CoachPage() {
  const params = useParams();
  const id = params.id as string;
  const session = useSessionStore((s) => s.sessions.find((ss) => ss.id === id));
  const addMessage = useSessionStore((s) => s.addMessage);
  const updateOPFacts = useSessionStore((s) => s.updateOPFacts);
  const addTimelineEvent = useSessionStore((s) => s.addTimelineEvent);
  const addSafetyFlags = useSessionStore((s) => s.addSafetyFlags);
  const addArtifact = useSessionStore((s) => s.addArtifact);
  const updateSession = useSessionStore((s) => s.updateSession);
  const tone = useSettingsStore((s) => s.tone);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [nextQuestions, setNextQuestions] = useState<string[]>([]);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [sensitiveWarning, setSensitiveWarning] = useState("");
  const [mobileTab, setMobileTab] = useState<"chat" | "info">("chat");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [session?.conversation.length, scrollToBottom]);

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

  const handleInputChange = (text: string) => {
    setInput(text);
    if (containsSensitiveInfo(text)) {
      setSensitiveWarning(getSensitiveWarning());
    } else {
      setSensitiveWarning("");
    }
  };

  const sendMessage = async (messageText?: string) => {
    const msg = (messageText || input).trim();
    if (!msg || loading) return;

    setInput("");
    setSensitiveWarning("");
    setError("");
    setLoading(true);

    addMessage(id, { role: "user", content: msg });

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
          addArtifact(id, {
            type: art.type as ArtifactType,
            title: art.title,
            content: art.content,
          });
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
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const f = session.opFacts;

  const chatPane = (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {session.conversation.length === 0 && (
          <div className="py-16 text-center">
            <Scale className="mx-auto mb-4 h-10 w-10 text-accent-mint/40" />
            <p className="text-white/40">Start by describing your situation.</p>
            <p className="mt-1 text-xs text-white/25">
              Your Pro Se Coach will ask follow-up questions to understand your case.
            </p>
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
              <div
                dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
              />
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

      {/* Suggested questions */}
      <AnimatePresence>
        {nextQuestions.length > 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/5 px-4 py-2"
          >
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-white/30">
              Suggested questions
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <div className="border-t border-accent-rose/20 bg-accent-rose/5 px-4 py-2">
          <p className="text-xs text-accent-rose">{error}</p>
        </div>
      )}

      {/* Sensitive warning */}
      {sensitiveWarning && (
        <div className="border-t border-yellow-500/20 bg-yellow-500/5 px-4 py-2">
          <p className="text-xs text-yellow-400">{sensitiveWarning}</p>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-white/10 p-4">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your situation or ask a question..."
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
        <p className="mt-2 text-[10px] text-white/25">
          Educational information only. Not legal advice. Press Enter to send, Shift+Enter for new line.
        </p>
      </div>
    </div>
  );

  const infoPane = (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <ProgressBar value={session.progressPercent} label="Case Progress" />

      {/* Facts */}
      <GlassCard className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-accent-mint">Facts Gathered</h3>
        <dl className="space-y-1.5 text-xs">
          {f.petitionerName && <div><dt className="text-white/40">Petitioner</dt><dd className="text-white/70">{f.petitionerName}</dd></div>}
          {f.respondentName && <div><dt className="text-white/40">Respondent</dt><dd className="text-white/70">{f.respondentName}</dd></div>}
          {f.relationship && <div><dt className="text-white/40">Relationship</dt><dd className="text-white/70">{RELATIONSHIP_LABELS[f.relationship as RelationshipCategory]}</dd></div>}
          {f.mostRecentIncidentDate && <div><dt className="text-white/40">Most recent incident</dt><dd className="text-white/70">{f.mostRecentIncidentDate}</dd></div>}
          {f.incidents.length > 0 && <div><dt className="text-white/40">Incidents documented</dt><dd className="text-white/70">{f.incidents.length}</dd></div>}
          {!f.petitionerName && !f.respondentName && !f.relationship && !f.mostRecentIncidentDate && f.incidents.length === 0 && (
            <p className="text-white/30">No facts gathered yet. Start chatting to begin.</p>
          )}
        </dl>
      </GlassCard>

      {/* Timeline */}
      {session.timeline.length > 0 && (
        <GlassCard className="p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-accent-blue">
            <Clock className="h-4 w-4" /> Timeline
          </h3>
          <div className="space-y-2">
            {session.timeline.map((evt) => (
              <div key={evt.id} className="border-l-2 border-white/10 pl-3">
                <p className={`text-[10px] font-medium ${evt.isDeadline ? "text-accent-rose" : "text-white/40"}`}>
                  {formatDate(evt.date)} {evt.isDeadline && "⚠️"}
                </p>
                <p className="text-xs text-white/70">{evt.title}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Safety Flags */}
      {session.safetyFlags.length > 0 && (
        <GlassCard className="p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-accent-rose">
            <Shield className="h-4 w-4" /> Safety Flags
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {session.safetyFlags.map((flag) => (
              <SafetyBadge key={flag.id} severity={flag.severity} message={flag.message} />
            ))}
          </div>
        </GlassCard>
      )}

      {/* Missing fields */}
      {missingFields.length > 0 && (
        <GlassCard className="p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-yellow-400">
            <AlertTriangle className="h-4 w-4" /> Missing Information
          </h3>
          <ul className="space-y-1 text-xs text-white/50">
            {missingFields.map((field, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3" /> {field.replace(/[._]/g, " ")}
              </li>
            ))}
          </ul>
        </GlassCard>
      )}

      {/* Artifacts */}
      {session.generatedArtifacts.length > 0 && (
        <GlassCard className="p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-accent-mint">
            <FileText className="h-4 w-4" /> Generated Documents
          </h3>
          <div className="space-y-3">
            {session.generatedArtifacts.map((art) => (
              <div key={art.id} className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="badge-info text-[10px]">{ARTIFACT_LABELS[art.type as ArtifactType] || art.type}</span>
                  <CopyButton text={art.content} />
                </div>
                <p className="text-xs font-medium text-white/70">{art.title}</p>
                <pre className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap text-[10px] text-white/50">{art.content}</pre>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Quick Links */}
      <div className="flex gap-2">
        <Link href={`/case/${id}`} className="btn-ghost flex-1 justify-center text-xs">
          <MessageSquare className="h-3.5 w-3.5" /> Dashboard
        </Link>
        <Link href={`/case/${id}/summary`} className="btn-ghost flex-1 justify-center text-xs">
          <FileText className="h-3.5 w-3.5" /> Summary
        </Link>
      </div>
    </div>
  );

  return (
    <div className="relative z-10 flex h-[calc(100vh-3.5rem)] flex-col pb-10 sm:pb-0">
      {/* Mobile tabs */}
      <div className="flex border-b border-white/10 sm:hidden">
        <button
          onClick={() => setMobileTab("chat")}
          className={`flex-1 py-2.5 text-center text-sm font-medium transition ${mobileTab === "chat" ? "border-b-2 border-accent-mint text-accent-mint" : "text-white/40"}`}
        >
          <MessageSquare className="mx-auto mb-0.5 h-4 w-4" /> Chat
        </button>
        <button
          onClick={() => setMobileTab("info")}
          className={`flex-1 py-2.5 text-center text-sm font-medium transition ${mobileTab === "info" ? "border-b-2 border-accent-mint text-accent-mint" : "text-white/40"}`}
        >
          <FileText className="mx-auto mb-0.5 h-4 w-4" /> Info
        </button>
      </div>

      {/* Desktop: split pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat pane */}
        <div className={`flex-1 flex-col ${mobileTab === "chat" ? "flex" : "hidden"} sm:flex sm:border-r sm:border-white/10`}>
          {chatPane}
        </div>

        {/* Info pane */}
        <div className={`w-full flex-col sm:w-96 sm:flex-shrink-0 ${mobileTab === "info" ? "flex" : "hidden"} sm:flex`}>
          {infoPane}
        </div>
      </div>
    </div>
  );
}
