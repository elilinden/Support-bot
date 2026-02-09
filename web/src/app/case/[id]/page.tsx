"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Scale,
  FileText,
  Clock,
  Shield,
  AlertTriangle,
  MessageSquare,
  Calendar,
  Users,
  Gavel,
  Trash2,
  ChevronRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Briefcase,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { CopyButton } from "@/components/ui/CopyButton";
import { SafetyBadge } from "@/components/ui/SafetyBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { useSessionStore } from "@/lib/store";
import {
  RELATIONSHIP_LABELS,
  LIVING_SITUATION_LABELS,
  RELIEF_LABELS,
  ARTIFACT_LABELS,
} from "@/lib/types";
import type { RelationshipCategory, LivingSituation, ReliefType, ArtifactType } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";

function BoolIcon({ val }: { val: boolean | null }) {
  if (val === true) return <CheckCircle2 className="h-4 w-4 text-accent-mint" />;
  if (val === false) return <XCircle className="h-4 w-4 text-accent-rose" />;
  return <HelpCircle className="h-4 w-4 text-white/30" />;
}

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const session = useSessionStore((s) => s.sessions.find((ss) => ss.id === id));
  const deleteSession = useSessionStore((s) => s.deleteSession);

  if (!session) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <Scale className="mb-4 h-12 w-12 text-white/20" />
          <h2 className="mb-2 text-xl font-semibold text-white/70">Session not found</h2>
          <p className="mb-6 text-white/40">This case may have been deleted.</p>
          <Link href="/new" className="btn-primary">Start New Case</Link>
        </div>
      </PageWrapper>
    );
  }

  const f = session.opFacts;

  const handleDelete = () => {
    if (window.confirm("Delete this case? This cannot be undone.")) {
      deleteSession(id);
      router.push("/");
    }
  };

  const evidenceItems = [
    { key: "texts", label: "Text messages" },
    { key: "callRecords", label: "Call records" },
    { key: "emails", label: "Emails" },
    { key: "photos", label: "Photos" },
    { key: "videos", label: "Videos" },
    { key: "medicalRecords", label: "Medical records" },
    { key: "policeReports", label: "Police reports" },
    { key: "witnesses", label: "Witnesses" },
    { key: "voicemails", label: "Voicemails" },
    { key: "socialMedia", label: "Social media" },
  ] as const;

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-8">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white/90">{session.title}</h1>
            <p className="mt-1 text-sm text-white/40">
              Created {formatDate(session.createdAt)} · Last updated {formatDateTime(session.updatedAt)}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href={`/case/${id}/coach`} className="btn-primary text-sm">
              <MessageSquare className="h-4 w-4" /> Continue Coaching
            </Link>
            <Link href={`/case/${id}/summary`} className="btn-secondary text-sm">
              <FileText className="h-4 w-4" /> View Summary
            </Link>
            <button onClick={handleDelete} className="btn-danger text-sm">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!session.intakeCompleted && (
          <GlassCard className="mb-4 border-yellow-500/20 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-400">Intake not completed</p>
                <p className="text-xs text-white/50">Complete the intake form to provide better coaching.</p>
              </div>
              <Link href="/new" className="btn-ghost text-sm text-yellow-400">Complete Intake <ChevronRight className="h-4 w-4" /></Link>
            </div>
          </GlassCard>
        )}

        <ProgressBar value={session.progressPercent} label="Case Progress" />
      </div>

      {/* Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Parties */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <GlassCard className="h-full p-5">
            <div className="mb-3 flex items-center gap-2 text-accent-mint">
              <Users className="h-5 w-5" />
              <h3 className="font-semibold">Parties & Relationship</h3>
            </div>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-white/40">Petitioner</dt><dd className="text-white/80">{f.petitionerName || "—"}</dd></div>
              <div><dt className="text-white/40">Respondent</dt><dd className="text-white/80">{f.respondentName || "—"}</dd></div>
              <div><dt className="text-white/40">Relationship</dt><dd className="text-white/80">{f.relationship ? RELATIONSHIP_LABELS[f.relationship as RelationshipCategory] : "—"}</dd></div>
              <div><dt className="text-white/40">Living situation</dt><dd className="text-white/80">{f.livingSituation ? LIVING_SITUATION_LABELS[f.livingSituation as LivingSituation] : "—"}</dd></div>
            </dl>
          </GlassCard>
        </motion.div>

        {/* Safety */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard className="h-full p-5">
            <div className="mb-3 flex items-center gap-2 text-accent-rose">
              <Shield className="h-5 w-5" />
              <h3 className="font-semibold">Safety Status</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><BoolIcon val={f.safety.safeNow} /> Safe now</div>
              <div className="flex items-center gap-2"><BoolIcon val={f.safety.firearmsPresent} /> Firearms present</div>
              <div className="flex items-center gap-2"><BoolIcon val={f.safety.strangulation} /> Strangulation history</div>
              <div className="flex items-center gap-2"><BoolIcon val={f.safety.suicideThreats} /> Suicide/homicide threats</div>
            </div>
            {session.safetyFlags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {session.safetyFlags.slice(-3).map((flag) => (
                  <SafetyBadge key={flag.id} severity={flag.severity} message={flag.message} />
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Incidents */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <GlassCard className="h-full p-5">
            <div className="mb-3 flex items-center gap-2 text-accent-blue">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="font-semibold">Incidents</h3>
            </div>
            <p className="text-2xl font-bold text-white/90">{f.incidents.length}</p>
            <p className="text-xs text-white/40">incidents documented</p>
            {f.mostRecentIncidentDate && (
              <p className="mt-2 text-sm text-white/60">Most recent: {f.mostRecentIncidentDate}</p>
            )}
            {f.patternDescription && (
              <p className="mt-2 text-xs text-white/50 line-clamp-3">{f.patternDescription}</p>
            )}
          </GlassCard>
        </motion.div>

        {/* Children */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GlassCard className="h-full p-5">
            <div className="mb-3 flex items-center gap-2 text-accent-purple">
              <Users className="h-5 w-5" />
              <h3 className="font-semibold">Children</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><BoolIcon val={f.children.childrenInvolved} /> Children involved</div>
              {f.children.childrenInvolved && (
                <>
                  <p className="text-white/60">Number: {f.children.numberOfChildren}</p>
                  <div className="flex items-center gap-2"><BoolIcon val={f.children.childrenWitnessedAbuse} /> Witnessed abuse</div>
                  <div className="flex items-center gap-2"><BoolIcon val={f.children.childrenDirectlyHarmed} /> Directly harmed</div>
                </>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Evidence */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <GlassCard className="h-full p-5">
            <div className="mb-3 flex items-center gap-2 text-accent-mint">
              <Briefcase className="h-5 w-5" />
              <h3 className="font-semibold">Evidence</h3>
            </div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {evidenceItems.map((item) => (
                <div key={item.key} className="flex items-center gap-1.5">
                  {f.evidence[item.key] ? (
                    <CheckCircle2 className="h-3 w-3 text-accent-mint" />
                  ) : (
                    <XCircle className="h-3 w-3 text-white/20" />
                  )}
                  <span className={f.evidence[item.key] ? "text-white/70" : "text-white/30"}>{item.label}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Relief */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <GlassCard className="h-full p-5">
            <div className="mb-3 flex items-center gap-2 text-accent-blue">
              <Gavel className="h-5 w-5" />
              <h3 className="font-semibold">Requested Relief</h3>
            </div>
            {f.requestedRelief.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {f.requestedRelief.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-white/70">
                    <CheckCircle2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-accent-mint" />
                    {RELIEF_LABELS[r as ReliefType]}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/30">None selected yet</p>
            )}
          </GlassCard>
        </motion.div>
      </div>

      {/* Timeline */}
      {session.timeline.length > 0 && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-8">
          <GlassCard className="p-6">
            <div className="mb-4 flex items-center gap-2 text-accent-mint">
              <Clock className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Timeline</h3>
            </div>
            <div className="space-y-3">
              {session.timeline.map((event) => (
                <div key={event.id} className="flex gap-4 border-l-2 border-white/10 pl-4">
                  <div className="flex-shrink-0">
                    <span className={`text-xs font-medium ${event.isDeadline ? "text-accent-rose" : "text-white/50"}`}>
                      {formatDate(event.date)} {event.isDeadline && "⚠️ DEADLINE"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/80">{event.title}</p>
                    <p className="text-xs text-white/50">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.section>
      )}

      {/* Generated Documents */}
      {session.generatedArtifacts.length > 0 && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-8">
          <GlassCard className="p-6">
            <div className="mb-4 flex items-center gap-2 text-accent-blue">
              <FileText className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Generated Documents</h3>
            </div>
            <div className="space-y-4">
              {session.generatedArtifacts.map((artifact) => (
                <div key={artifact.id} className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="badge-info">{ARTIFACT_LABELS[artifact.type as ArtifactType] || artifact.type}</span>
                      <span className="text-sm font-medium text-white/80">{artifact.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/30">{formatDate(artifact.createdAt)}</span>
                      <CopyButton text={artifact.content} />
                    </div>
                  </div>
                  <pre className="whitespace-pre-wrap text-xs text-white/60 line-clamp-6">{artifact.content}</pre>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.section>
      )}

      {/* Recent Conversation */}
      {session.conversation.length > 0 && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="mt-8">
          <GlassCard className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-accent-purple">
                <MessageSquare className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Recent Conversation</h3>
              </div>
              <Link href={`/case/${id}/coach`} className="btn-ghost text-sm">
                Open Coach <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {session.conversation.slice(-4).map((msg) => (
                <div key={msg.id} className={`text-sm ${msg.role === "user" ? "text-accent-blue" : "text-white/70"}`}>
                  <span className="font-medium">{msg.role === "user" ? "You" : "Coach"}:</span>{" "}
                  <span className="line-clamp-2">{msg.content.substring(0, 200)}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.section>
      )}

      {/* Disclaimer */}
      <p className="mt-8 text-center text-xs text-white/30">
        Educational information only. Not legal advice. NY Family Court — procedures may vary by county.
      </p>
    </PageWrapper>
  );
}
