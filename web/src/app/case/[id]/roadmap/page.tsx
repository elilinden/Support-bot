"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale,
  MapPin,
  FileText,
  Shield,
  Send,
  Loader2,
  Clock,
  Gavel,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Users,
  Phone,
  BookOpen,
  CalendarCheck,
  Truck,
  Eye,
  Award,
  Mic,
  Moon,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { SafetyBadge } from "@/components/ui/SafetyBadge";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { useSessionStore, useSettingsStore } from "@/lib/store";
import type { CoachResponse, ArtifactType, OPFacts } from "@/lib/types";
import { RELATIONSHIP_LABELS } from "@/lib/types";
import type { RelationshipCategory } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getField(facts: OPFacts, path: string): unknown {
  if (path.includes(".")) {
    const [parent, child] = path.split(".");
    const obj = (facts as unknown as Record<string, Record<string, unknown>>)[parent];
    return obj ? obj[child] : undefined;
  }
  return (facts as unknown as Record<string, unknown>)[path];
}

function boolLabel(val: unknown): string {
  if (val === true) return "Yes";
  if (val === false) return "No";
  return "Unknown";
}

// ---------------------------------------------------------------------------
// Roadmap step data (NY OP 9-step process)
// ---------------------------------------------------------------------------

interface RoadmapStep {
  number: number;
  title: string;
  icon: React.ElementType;
  getContent: (f: OPFacts) => React.ReactNode;
}

const ROADMAP_STEPS: RoadmapStep[] = [
  {
    number: 1,
    title: "Pick the Right Court",
    icon: MapPin,
    getContent: (f) => (
      <div className="space-y-2 text-sm text-white/70">
        <p>
          You will file in <strong className="text-white/90">
            {f.mostRecentIncidentDate ? "NY Family Court" : "NY Family Court"}
            {f.mostRecentIncidentDate ? "" : ""}
          </strong>
          {getField(f, "relationship") ? (
            <> because your relationship ({RELATIONSHIP_LABELS[f.relationship as RelationshipCategory] || f.relationship}) qualifies under FCA section 812.</>
          ) : (
            <>. Family Court handles Orders of Protection between family members, intimate partners, and members of the same household under FCA section 812.</>
          )}
        </p>
        <p>
          <strong>County:</strong> {f.mostRecentIncidentDate ? "File where the most recent incident occurred or where you currently live." : "You can file where the incident occurred or where you live."}
          {/* Show county if known */}
        </p>
        <div className="rounded-lg border border-accent-blue/20 bg-accent-blue/5 p-3">
          <p className="text-xs text-accent-blue">
            Family Court can issue an OP if the respondent is a current/former spouse, intimate partner, family member by blood or marriage, or someone you share a child with.
          </p>
        </div>
      </div>
    ),
  },
  {
    number: 2,
    title: "What to File (The Petition)",
    icon: FileText,
    getContent: (f) => (
      <div className="space-y-2 text-sm text-white/70">
        <p>
          You will fill out form <strong className="text-white/90">UCS-FC8-2</strong> (Family Offense Petition). This is a free form available at the Family Court clerk&apos;s window.
        </p>
        <p>Key sections you&apos;ll need to complete:</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>Your name (petitioner) and respondent&apos;s name</li>
          <li>Your relationship to the respondent: <strong className="text-white/90">{f.relationship ? RELATIONSHIP_LABELS[f.relationship as RelationshipCategory] : "Not yet specified"}</strong></li>
          <li>Description of the family offense(s) — what happened, when, where</li>
          <li>Most recent incident date: <strong className="text-white/90">{f.mostRecentIncidentDate || "Not yet specified"}</strong></li>
          <li>What relief you are requesting (stay-away, no-contact, etc.)</li>
        </ul>
        {f.incidents.length > 0 && (
          <div className="rounded-lg border border-accent-mint/20 bg-accent-mint/5 p-3">
            <p className="text-xs text-accent-mint">
              You have {f.incidents.length} incident{f.incidents.length !== 1 ? "s" : ""} documented. Include all of them in the petition with specific dates and descriptions.
            </p>
          </div>
        )}
      </div>
    ),
  },
  {
    number: 3,
    title: "Filing Day Procedure",
    icon: CalendarCheck,
    getContent: (f) => (
      <div className="space-y-2 text-sm text-white/70">
        <p>What to expect on the day you file:</p>
        <ol className="ml-4 list-decimal space-y-2">
          <li>Go to the <strong className="text-white/90">Family Court clerk&apos;s office</strong> in your county.</li>
          <li>Tell the clerk you want to file a <strong>Family Offense Petition</strong> for an Order of Protection.</li>
          <li>The clerk will give you the UCS-FC8-2 form. Fill it out (or bring a pre-filled copy).</li>
          <li>You may be assigned a <strong>Help Center attorney</strong> or court navigator — they can help you fill out the form.</li>
          <li>Once filed, you will be given a <strong>court date</strong> and may see a judge that same day for a Temporary Order of Protection (TOP).</li>
        </ol>
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
          <p className="text-xs text-yellow-400">
            Bring a valid photo ID and any evidence you have. Arrive early — courts can be busy.
          </p>
        </div>
      </div>
    ),
  },
  {
    number: 4,
    title: "Temporary Order of Protection (TOP)",
    icon: Shield,
    getContent: (f) => (
      <div className="space-y-2 text-sm text-white/70">
        <p>
          A judge can issue a <strong className="text-white/90">Temporary Order of Protection (TOP)</strong> the same day you file — often within hours.
        </p>
        <p>The TOP may include:</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>Stay-away order (from you, your home, work, school)</li>
          <li>No-contact order (no calls, texts, emails, third-party contact)</li>
          <li>Exclusive occupancy of shared residence</li>
          <li>Temporary custody of children</li>
          {getField(f, "safety.firearmsPresent") === true && (
            <li className="text-accent-rose"><strong>Surrender of firearms</strong> — critical given firearms are present</li>
          )}
        </ul>
        <p>
          The TOP is <strong className="text-white/90">effective immediately</strong> once signed by the judge and remains in effect until the next court date (usually 2-3 weeks).
        </p>
        {f.requestedRelief.length > 0 && (
          <div className="rounded-lg border border-accent-mint/20 bg-accent-mint/5 p-3">
            <p className="text-xs text-accent-mint">
              You&apos;ve indicated you want: {f.requestedRelief.join(", ").replace(/_/g, " ")}. Be sure to request all of these when you speak to the judge.
            </p>
          </div>
        )}
      </div>
    ),
  },
  {
    number: 5,
    title: "Service of Process",
    icon: Truck,
    getContent: () => (
      <div className="space-y-2 text-sm text-white/70">
        <p>
          The respondent must be <strong className="text-white/90">legally served</strong> with the petition and TOP. This means they receive official copies of the court papers.
        </p>
        <p><strong>Service methods:</strong></p>
        <ul className="ml-4 list-disc space-y-1">
          <li><strong>Personal service:</strong> A process server or sheriff delivers the papers directly to the respondent. This is the preferred method.</li>
          <li><strong>Substituted service:</strong> If personal service fails, the court may allow leaving papers with someone at the respondent&apos;s home or workplace.</li>
          <li><strong>Court-directed service:</strong> In some cases the court arranges service.</li>
        </ul>
        <div className="rounded-lg border border-accent-blue/20 bg-accent-blue/5 p-3">
          <p className="text-xs text-accent-blue">
            <strong>Important:</strong> YOU cannot serve the papers yourself. It must be done by someone 18+ who is not a party to the case, or by a professional process server or the sheriff&apos;s office.
          </p>
        </div>
      </div>
    ),
  },
  {
    number: 6,
    title: "Return Date (First Hearing)",
    icon: Clock,
    getContent: () => (
      <div className="space-y-2 text-sm text-white/70">
        <p>
          The <strong className="text-white/90">return date</strong> is your first hearing. Both you and the respondent appear before the judge.
        </p>
        <p>What may happen:</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>The judge may <strong>extend the TOP</strong> until the trial/fact-finding hearing.</li>
          <li>The respondent may <strong>consent</strong> to an Order of Protection without admitting guilt — this means no trial is needed.</li>
          <li>If the respondent <strong>contests</strong>, a fact-finding hearing (trial) will be scheduled.</li>
          <li>The judge may offer <strong>mediation</strong> or refer to services — you are NOT required to accept mediation in DV cases.</li>
        </ul>
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
          <p className="text-xs text-yellow-400">
            Bring all evidence. Be prepared to explain why you need the OP. You may want to practice your 2-minute statement.
          </p>
        </div>
      </div>
    ),
  },
  {
    number: 7,
    title: "Trial / Fact-Finding Hearing",
    icon: Gavel,
    getContent: (f) => (
      <div className="space-y-2 text-sm text-white/70">
        <p>
          If the respondent contests, there will be a <strong className="text-white/90">fact-finding hearing</strong> (trial). You must prove by a <strong>preponderance of the evidence</strong> (more likely than not) that a family offense occurred.
        </p>
        <p><strong>What to prepare:</strong></p>
        <ul className="ml-4 list-disc space-y-1">
          <li>Your testimony — tell the judge what happened in detail (dates, times, locations, specific actions)</li>
          <li>Physical evidence — photos, medical records, police reports, text messages</li>
          <li>Witness testimony — anyone who saw or heard the incidents</li>
          {getField(f, "children.childrenWitnessedAbuse") === true && (
            <li className="text-accent-purple">Children may be able to testify (the judge decides based on age/maturity)</li>
          )}
        </ul>
        <p>
          <strong>Standard of proof:</strong> Preponderance of evidence (lower than &quot;beyond reasonable doubt&quot; used in criminal court). You need to show it&apos;s <strong>more likely than not</strong> that the offense happened.
        </p>
        {f.incidents.length > 0 && (
          <div className="rounded-lg border border-accent-mint/20 bg-accent-mint/5 p-3">
            <p className="text-xs text-accent-mint">
              You have {f.incidents.length} documented incident{f.incidents.length !== 1 ? "s" : ""}. Prepare to testify about each one with specific details.
            </p>
          </div>
        )}
      </div>
    ),
  },
  {
    number: 8,
    title: "Final Order — Terms & Duration",
    icon: Award,
    getContent: (f) => (
      <div className="space-y-2 text-sm text-white/70">
        <p>
          If the judge finds a family offense occurred (or the respondent consents), a <strong className="text-white/90">Final Order of Protection</strong> is issued.
        </p>
        <p><strong>Duration:</strong></p>
        <ul className="ml-4 list-disc space-y-1">
          <li>Up to <strong>2 years</strong> for most cases</li>
          <li>Up to <strong>5 years</strong> for aggravated circumstances (serious physical injury, use of a weapon, violation of a prior OP, repeated offenses)</li>
          {getField(f, "safety.firearmsPresent") === true && (
            <li className="text-accent-rose">Firearms surrender may be ordered for the duration of the OP</li>
          )}
        </ul>
        <p><strong>Possible conditions:</strong></p>
        <ul className="ml-4 list-disc space-y-1">
          <li>Stay away from petitioner, home, work, school, children&apos;s school</li>
          <li>No contact (direct or through third parties)</li>
          <li>Exclusive occupancy of shared residence</li>
          <li>Temporary custody/visitation terms</li>
          <li>Batterer&apos;s intervention program</li>
          <li>Restitution for property damage or medical expenses</li>
          {getField(f, "safety.firearmsPresent") === true && <li className="text-accent-rose">Surrender of firearms</li>}
        </ul>
        <div className="rounded-lg border border-accent-blue/20 bg-accent-blue/5 p-3">
          <p className="text-xs text-accent-blue">
            Violation of an Order of Protection is a <strong>criminal offense</strong> (Criminal Contempt). Call 911 if the respondent violates the order.
          </p>
        </div>
      </div>
    ),
  },
  {
    number: 9,
    title: "What to Say & After-Hours Options",
    icon: Mic,
    getContent: (f) => (
      <div className="space-y-3 text-sm text-white/70">
        <div>
          <h4 className="mb-1 font-semibold text-white/80">Your 2-Minute Statement Template</h4>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs italic">
            <p>&quot;Your Honor, my name is [YOUR NAME]. I am here to request an Order of Protection against {f.respondentName || "[RESPONDENT NAME]"}, who is my {f.relationship ? RELATIONSHIP_LABELS[f.relationship as RelationshipCategory]?.toLowerCase() : "[RELATIONSHIP]"}.&quot;</p>
            <p className="mt-2">&quot;On {f.mostRecentIncidentDate || "[DATE]"}, [describe what happened — specific actions, threats, injuries].&quot;</p>
            <p className="mt-2">&quot;I am requesting [stay-away / no-contact / exclusive occupancy / etc.] because I fear for my safety{getField(f, "children.childrenInvolved") === true ? " and the safety of my children" : ""}.&quot;</p>
            <p className="mt-1 text-white/40">TEMPLATE / STARTER TEXT — NOT A LEGAL DOCUMENT</p>
          </div>
        </div>

        <div>
          <h4 className="mb-1 font-semibold text-white/80">After-Hours / Emergency Options</h4>
          <ul className="ml-4 list-disc space-y-1">
            <li><strong>911</strong> — If you are in immediate danger</li>
            <li><strong>NY DV Hotline:</strong> 1-800-942-6906 (24/7, multilingual)</li>
            <li><strong>National DV Hotline:</strong> 1-800-799-7233</li>
            <li><strong>Text:</strong> START to 88788</li>
            <li><strong>After-hours OP:</strong> In some counties, an on-call judge can issue an emergency TOP after court hours. Call your local police or the DV hotline for guidance.</li>
          </ul>
        </div>
      </div>
    ),
  },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function RoadmapPage() {
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
  const tone = useSettingsStore((s) => s.tone);

  const [quickInput, setQuickInput] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickFeedback, setQuickFeedback] = useState("");
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([1, 2]));
  const feedbackRef = useRef<HTMLDivElement>(null);

  // If session not in active mode, redirect to interview
  useEffect(() => {
    if (session && session.status !== "active") {
      router.push(`/case/${id}/interview`);
    }
  }, [session, id, router]);

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

  const f = session.opFacts;

  function toggleStep(stepNum: number) {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepNum)) {
        next.delete(stepNum);
      } else {
        next.add(stepNum);
      }
      return next;
    });
  }

  function expandAll() {
    setExpandedSteps(new Set(ROADMAP_STEPS.map((s) => s.number)));
  }

  function collapseAll() {
    setExpandedSteps(new Set());
  }

  async function sendQuickUpdate() {
    const msg = quickInput.trim();
    if (!msg || quickLoading || !session) return;

    setQuickInput("");
    setQuickFeedback("");
    setQuickLoading(true);

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
          conversationHistory: session.conversation.slice(-6),
          tone,
          mode: "roadmap_update",
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

      setQuickFeedback(data.assistant_message);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Something went wrong";
      setQuickFeedback(`Error: ${errMsg}`);
    } finally {
      setQuickLoading(false);
      setTimeout(() => feedbackRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }

  function handleQuickKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendQuickUpdate();
    }
  }

  return (
    <PageWrapper>
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="mb-1 text-2xl font-bold text-white/90 sm:text-3xl">
            <BookOpen className="mr-2 inline h-7 w-7 text-accent-mint" />
            Your Order of Protection Roadmap
          </h1>
          <p className="text-sm text-white/50">
            {session.title} — 9 steps from filing to final order
          </p>
        </div>

        {/* Quick Update Input */}
        <GlassCard className="mb-6 p-4" glow="blue">
          <div className="mb-2 flex items-center gap-2">
            <Send className="h-4 w-4 text-accent-blue" />
            <h3 className="text-sm font-semibold text-white/80">Quick Update</h3>
            <span className="text-xs text-white/40">Add new facts to instantly update your roadmap</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              onKeyDown={handleQuickKeyDown}
              placeholder='e.g., "I remembered he threatened me with a knife on Jan 5" or "I have text message screenshots"'
              className="glass-input flex-1 text-sm"
              disabled={quickLoading}
            />
            <button
              onClick={sendQuickUpdate}
              disabled={!quickInput.trim() || quickLoading}
              className="btn-primary rounded-xl px-4 disabled:opacity-30"
            >
              {quickLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <AnimatePresence>
            {quickFeedback && (
              <motion.div
                ref={feedbackRef}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 rounded-lg border border-accent-mint/20 bg-accent-mint/5 p-3"
              >
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-mint" />
                  <p className="text-xs text-white/70">{quickFeedback}</p>
                </div>
                <button
                  onClick={() => setQuickFeedback("")}
                  className="mt-1 text-[10px] text-white/30 hover:text-white/50"
                >
                  Dismiss
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>

        {/* Safety Flags */}
        {session.safetyFlags.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-1.5">
            {session.safetyFlags.map((flag) => (
              <SafetyBadge key={flag.id} severity={flag.severity} message={flag.message} />
            ))}
          </div>
        )}

        {/* Expand/Collapse controls */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white/80">
            The 9-Step NY Order of Protection Process
          </h2>
          <div className="flex gap-2">
            <button onClick={expandAll} className="btn-ghost text-xs">
              Expand All
            </button>
            <button onClick={collapseAll} className="btn-ghost text-xs">
              Collapse All
            </button>
          </div>
        </div>

        {/* Roadmap Steps */}
        <div className="space-y-3">
          {ROADMAP_STEPS.map((step) => {
            const isExpanded = expandedSteps.has(step.number);
            return (
              <GlassCard key={step.number} className="overflow-hidden">
                <button
                  onClick={() => toggleStep(step.number)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-white/[0.02]"
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-mint/20 to-accent-blue/20 text-sm font-bold text-accent-mint">
                    {step.number}
                  </div>
                  <step.icon className="h-5 w-5 flex-shrink-0 text-white/40" />
                  <span className="flex-1 text-sm font-semibold text-white/80">{step.title}</span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-white/30" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-white/30" />
                  )}
                </button>
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-white/5 px-5 py-4">
                        {step.getContent(f)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            );
          })}
        </div>

        {/* Timeline */}
        {session.timeline.length > 0 && (
          <GlassCard className="mt-6 p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-accent-blue">
              <Clock className="h-4 w-4" /> Your Timeline
            </h3>
            <div className="space-y-2">
              {session.timeline.map((evt) => (
                <div key={evt.id} className="border-l-2 border-white/10 pl-3">
                  <p className={`text-[10px] font-medium ${evt.isDeadline ? "text-accent-rose" : "text-white/40"}`}>
                    {evt.date} {evt.isDeadline ? "(DEADLINE)" : ""}
                  </p>
                  <p className="text-xs text-white/70">{evt.title}</p>
                  {evt.description && <p className="text-[10px] text-white/40">{evt.description}</p>}
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Generated Artifacts */}
        {session.generatedArtifacts.length > 0 && (
          <GlassCard className="mt-6 p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-accent-mint">
              <FileText className="h-4 w-4" /> Generated Documents
            </h3>
            <div className="space-y-3">
              {session.generatedArtifacts.map((art) => (
                <div key={art.id} className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
                  <p className="text-xs font-medium text-white/70">{art.title}</p>
                  <pre className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap text-[10px] text-white/50">{art.content}</pre>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Quick links */}
        <div className="mt-6 flex gap-3">
          <Link href={`/case/${id}`} className="btn-ghost flex-1 justify-center text-xs">
            Dashboard
          </Link>
          <Link href={`/case/${id}/summary`} className="btn-ghost flex-1 justify-center text-xs">
            Print Summary
          </Link>
          <Link href={`/case/${id}/interview`} className="btn-ghost flex-1 justify-center text-xs">
            Back to Interview
          </Link>
        </div>

        {/* Safety footer */}
        <div className="mt-6 mb-8 text-center">
          <p className="text-xs text-white/30">
            Educational information only — not legal advice. Need help? Call{" "}
            <a href="tel:18009426906" className="text-accent-rose hover:underline">1-800-942-6906</a>{" "}
            (NY DV Hotline, 24/7)
          </p>
        </div>
      </div>
    </PageWrapper>
  );
}
