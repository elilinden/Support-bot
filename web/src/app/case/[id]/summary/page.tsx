"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Printer, ArrowLeft, Scale, Clock, Shield, FileText, Users, Gavel, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { CopyButton } from "@/components/ui/CopyButton";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { useSessionStore } from "@/lib/store";
import { RELATIONSHIP_LABELS, LIVING_SITUATION_LABELS, RELIEF_LABELS, ARTIFACT_LABELS } from "@/lib/types";
import type { RelationshipCategory, LivingSituation, ReliefType, ArtifactType } from "@/lib/types";
import { formatDate } from "@/lib/utils";

function B({ val }: { val: boolean | null }) {
  if (val === true) return <CheckCircle2 className="inline h-3.5 w-3.5 text-green-500" />;
  if (val === false) return <XCircle className="inline h-3.5 w-3.5 text-red-400" />;
  return <HelpCircle className="inline h-3.5 w-3.5 text-gray-400" />;
}

export default function SummaryPage() {
  const params = useParams();
  const id = params.id as string;
  const session = useSessionStore((s) => s.sessions.find((ss) => ss.id === id));

  if (!session) {
    return (
      <PageWrapper>
        <div className="py-32 text-center">
          <Scale className="mx-auto mb-4 h-12 w-12 text-white/20" />
          <h2 className="mb-2 text-xl font-semibold text-white/70">Session not found</h2>
          <Link href="/new" className="btn-primary mt-4">Start New Case</Link>
        </div>
      </PageWrapper>
    );
  }

  const f = session.opFacts;

  const summaryText = buildFullSummaryText(session, f);

  const evidenceItems = [
    { key: "texts" as const, label: "Text messages" },
    { key: "callRecords" as const, label: "Call records" },
    { key: "emails" as const, label: "Emails" },
    { key: "photos" as const, label: "Photos" },
    { key: "videos" as const, label: "Videos" },
    { key: "medicalRecords" as const, label: "Medical records" },
    { key: "policeReports" as const, label: "Police reports" },
    { key: "witnesses" as const, label: "Witnesses" },
    { key: "voicemails" as const, label: "Voicemails" },
    { key: "socialMedia" as const, label: "Social media" },
  ];

  return (
    <PageWrapper className="max-w-4xl">
      {/* Top bar */}
      <div className="no-print mb-8 flex items-center justify-between">
        <Link href={`/case/${id}`} className="btn-ghost text-sm">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <div className="flex gap-2">
          <CopyButton text={summaryText} label="Copy All" className="btn-secondary text-sm" />
          <button onClick={() => window.print()} className="btn-primary text-sm">
            <Printer className="h-4 w-4" /> Print / PDF
          </button>
        </div>
      </div>

      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-white/90">{session.title}</h1>
        <p className="mt-1 text-sm text-white/40">
          New York Family Court — {session.jurisdiction.county || "County not specified"} · Generated {formatDate(new Date().toISOString())}
        </p>
      </motion.div>

      {/* Parties */}
      <Section title="Parties & Relationship" icon={<Users className="h-5 w-5" />} content={
        `Petitioner: ${f.petitionerName || "—"}\nRespondent: ${f.respondentName || "—"}\nRelationship: ${f.relationship ? RELATIONSHIP_LABELS[f.relationship as RelationshipCategory] : "—"}\nLiving Situation: ${f.livingSituation ? LIVING_SITUATION_LABELS[f.livingSituation as LivingSituation] : "—"}${f.cohabitationDetails ? `\nDetails: ${f.cohabitationDetails}` : ""}`
      }>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-white/40">Petitioner</dt><dd className="text-white/80">{f.petitionerName || "—"}</dd></div>
          <div><dt className="text-white/40">Respondent</dt><dd className="text-white/80">{f.respondentName || "—"}</dd></div>
          <div><dt className="text-white/40">Relationship</dt><dd className="text-white/80">{f.relationship ? RELATIONSHIP_LABELS[f.relationship as RelationshipCategory] : "—"}</dd></div>
          <div><dt className="text-white/40">Living Situation</dt><dd className="text-white/80">{f.livingSituation ? LIVING_SITUATION_LABELS[f.livingSituation as LivingSituation] : "—"}</dd></div>
        </dl>
      </Section>

      {/* Safety */}
      <Section title="Safety Concerns" icon={<Shield className="h-5 w-5 text-accent-rose" />} content={
        `Safe now: ${f.safety.safeNow === null ? "Unknown" : f.safety.safeNow ? "Yes" : "No"}\nFirearms: ${f.safety.firearmsPresent === null ? "Unknown" : f.safety.firearmsPresent ? "Yes" : "No"}\nStrangulation: ${f.safety.strangulation === null ? "Unknown" : f.safety.strangulation ? "Yes" : "No"}\nSuicide threats: ${f.safety.suicideThreats === null ? "Unknown" : f.safety.suicideThreats ? "Yes" : "No"}${f.safety.threatsOfEscalation ? `\nThreats of escalation: ${f.safety.threatsOfEscalation}` : ""}${f.safety.technologyAbuse ? `\nTechnology abuse: ${f.safety.technologyAbuse}` : ""}`
      }>
        <div className="space-y-1.5 text-sm">
          <p><B val={f.safety.safeNow} /> Safe now</p>
          <p><B val={f.safety.firearmsPresent} /> Firearms present</p>
          <p><B val={f.safety.strangulation} /> Strangulation history</p>
          <p><B val={f.safety.suicideThreats} /> Suicide/homicide threats</p>
          {f.safety.threatsOfEscalation && <p className="text-white/60">Escalation: {f.safety.threatsOfEscalation}</p>}
          {f.safety.technologyAbuse && <p className="text-white/60">Tech abuse: {f.safety.technologyAbuse}</p>}
        </div>
      </Section>

      {/* Timeline */}
      {session.timeline.length > 0 && (
        <Section title="Incident Timeline" icon={<Clock className="h-5 w-5 text-accent-blue" />} content={
          session.timeline.map(e => `${e.date}: ${e.title}${e.isDeadline ? " [DEADLINE]" : ""} — ${e.description}`).join("\n")
        }>
          <div className="space-y-3">
            {session.timeline.map((evt) => (
              <div key={evt.id} className="border-l-2 border-white/10 pl-4">
                <span className={`text-xs font-medium ${evt.isDeadline ? "text-accent-rose" : "text-white/40"}`}>
                  {formatDate(evt.date)} {evt.isDeadline && "⚠️ DEADLINE"}
                </span>
                <p className="text-sm text-white/80">{evt.title}</p>
                <p className="text-xs text-white/50">{evt.description}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Incidents */}
      {f.incidents.length > 0 && (
        <Section title={`Incidents (${f.incidents.length})`} icon={<Shield className="h-5 w-5" />} content={
          f.incidents.map(inc => `${inc.date} ${inc.time} at ${inc.location}\n${inc.whatHappened}\nInjuries: ${inc.injuries}\nThreats: ${inc.threats}\nWitnesses: ${inc.witnesses}\nEvidence: ${inc.evidence}`).join("\n---\n")
        }>
          <div className="space-y-4">
            {f.incidents.map((inc, i) => (
              <div key={inc.id} className="rounded-lg border border-white/5 bg-white/[0.03] p-3 text-sm">
                <p className="font-medium text-white/80">Incident {i + 1} — {inc.date} {inc.time}</p>
                <p className="text-xs text-white/40">Location: {inc.location}</p>
                <p className="mt-1 text-white/70">{inc.whatHappened}</p>
                {inc.injuries && <p className="mt-1 text-xs text-accent-rose">Injuries: {inc.injuries}</p>}
                {inc.threats && <p className="text-xs text-yellow-400">Threats: {inc.threats}</p>}
                {inc.witnesses && <p className="text-xs text-white/50">Witnesses: {inc.witnesses}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Children */}
      <Section title="Children" icon={<Users className="h-5 w-5 text-accent-purple" />} content={
        `Involved: ${f.children.childrenInvolved === null ? "Unknown" : f.children.childrenInvolved ? "Yes" : "No"}${f.children.childrenInvolved ? `\nNumber: ${f.children.numberOfChildren}\nWitnessed: ${f.children.childrenWitnessedAbuse ? "Yes" : "No"}\nHarmed: ${f.children.childrenDirectlyHarmed ? "Yes" : "No"}` : ""}${f.children.childrenDetails ? `\nDetails: ${f.children.childrenDetails}` : ""}`
      }>
        <div className="space-y-1.5 text-sm">
          <p><B val={f.children.childrenInvolved} /> Children involved</p>
          {f.children.childrenInvolved && (
            <>
              <p className="text-white/60">Number: {f.children.numberOfChildren}</p>
              <p><B val={f.children.childrenWitnessedAbuse} /> Witnessed abuse</p>
              <p><B val={f.children.childrenDirectlyHarmed} /> Directly harmed</p>
              {f.children.childrenDetails && <p className="text-white/50">{f.children.childrenDetails}</p>}
            </>
          )}
        </div>
      </Section>

      {/* Evidence */}
      <Section title="Evidence Inventory" icon={<FileText className="h-5 w-5 text-accent-mint" />} content={
        evidenceItems.filter(i => f.evidence[i.key]).map(i => `✓ ${i.label}`).join("\n") || "No evidence documented"
      }>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {evidenceItems.map((item) => (
            <div key={item.key} className="flex items-center gap-2">
              {f.evidence[item.key] ? <CheckCircle2 className="h-4 w-4 text-accent-mint" /> : <XCircle className="h-4 w-4 text-white/20" />}
              <span className={f.evidence[item.key] ? "text-white/70" : "text-white/30"}>{item.label}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Relief */}
      <Section title="Requested Relief" icon={<Gavel className="h-5 w-5 text-accent-blue" />} content={
        f.requestedRelief.map(r => RELIEF_LABELS[r as ReliefType]).join("\n") || "None selected"
      }>
        {f.requestedRelief.length > 0 ? (
          <ul className="space-y-1.5 text-sm">
            {f.requestedRelief.map((r) => (
              <li key={r} className="flex items-start gap-2 text-white/70">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-mint" />
                {RELIEF_LABELS[r as ReliefType]}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-white/30">None selected</p>
        )}
      </Section>

      {/* Generated Documents */}
      {session.generatedArtifacts.length > 0 && (
        <Section title="Generated Documents" icon={<FileText className="h-5 w-5" />} content={
          session.generatedArtifacts.map(a => `[${ARTIFACT_LABELS[a.type as ArtifactType] || a.type}] ${a.title}\n${a.content}`).join("\n---\n")
        }>
          <div className="space-y-4">
            {session.generatedArtifacts.map((art) => (
              <div key={art.id} className="rounded-lg border border-white/5 bg-white/[0.03] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="badge-info">{ARTIFACT_LABELS[art.type as ArtifactType] || art.type}</span>
                    <span className="text-sm font-medium text-white/80">{art.title}</span>
                  </div>
                  <CopyButton text={art.content} />
                </div>
                <pre className="whitespace-pre-wrap text-xs text-white/60">{art.content}</pre>
                <p className="mt-2 text-[10px] text-accent-rose">
                  TEMPLATE / STARTER TEXT — NOT A LEGAL DOCUMENT. Review with a licensed attorney before use.
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Disclaimer */}
      <GlassCard className="mt-8 border-yellow-500/20 p-6 text-center">
        <p className="text-sm font-semibold text-yellow-400">Important Disclaimer</p>
        <p className="mt-2 text-xs text-white/50">
          This summary contains <strong>educational information only</strong> and does <strong>not</strong> constitute legal advice.
          No attorney-client relationship is formed. Laws and procedures vary by jurisdiction.
          Always consult with a licensed attorney before taking legal action.
          Jurisdiction: New York Family Court — procedures may vary by county.
        </p>
      </GlassCard>
    </PageWrapper>
  );
}

function Section({ title, icon, content, children }: {
  title: string;
  icon: React.ReactNode;
  content: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
      <GlassCard className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white/80">
            {icon}
            <h2 className="text-base font-semibold">{title}</h2>
          </div>
          <CopyButton text={content} />
        </div>
        {children}
      </GlassCard>
    </motion.div>
  );
}

function buildFullSummaryText(session: ReturnType<typeof useSessionStore.getState>["sessions"][0], f: ReturnType<typeof useSessionStore.getState>["sessions"][0]["opFacts"]): string {
  const lines = [
    `CASE SUMMARY: ${session.title}`,
    `NY Family Court — ${session.jurisdiction.county || "County not specified"}`,
    `Generated: ${new Date().toLocaleDateString()}`,
    "",
    "PARTIES",
    `Petitioner: ${f.petitionerName || "—"}`,
    `Respondent: ${f.respondentName || "—"}`,
    `Relationship: ${f.relationship || "—"}`,
    "",
    "SAFETY",
    `Safe now: ${f.safety.safeNow === null ? "Unknown" : f.safety.safeNow ? "Yes" : "No"}`,
    `Firearms: ${f.safety.firearmsPresent === null ? "Unknown" : f.safety.firearmsPresent ? "Yes" : "No"}`,
    "",
    "EDUCATIONAL INFORMATION ONLY. NOT LEGAL ADVICE.",
  ];
  return lines.join("\n");
}
