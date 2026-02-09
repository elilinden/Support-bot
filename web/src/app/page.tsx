"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Scale,
  Shield,
  FileText,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { useSessionStore } from "@/lib/store";

const features = [
  {
    icon: MessageSquare,
    title: "Guided Intake",
    description:
      "Step-by-step questions to gather the information needed for a Family Offense Petition.",
  },
  {
    icon: Scale,
    title: "Pro Se Coach",
    description:
      "Interactive coaching to help you understand the Order of Protection process.",
  },
  {
    icon: FileText,
    title: "OP-Focused Outputs",
    description:
      "2-minute scripts, evidence checklists, timelines, and what-to-expect guides.",
  },
  {
    icon: Shield,
    title: "Safety First",
    description:
      "Immediate danger detection with emergency resource referrals. Your safety is the priority.",
  },
  {
    icon: CheckCircle2,
    title: "Evidence Checklist",
    description:
      "Track texts, photos, police reports, medical records, and other evidence you have.",
  },
  {
    icon: AlertTriangle,
    title: "Risk & Safety Flags",
    description:
      "Automatic warnings for deadlines, jurisdiction issues, and safety concerns.",
  },
];

export default function LandingPage() {
  const sessions = useSessionStore((s) => s.sessions);
  const latestSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;

  return (
    <PageWrapper>
      {/* Hero */}
      <section className="mx-auto max-w-3xl pb-16 pt-12 text-center sm:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent-mint/20 bg-accent-mint/10 px-4 py-1.5 text-sm font-medium text-accent-mint">
            <Shield className="h-4 w-4" />
            NY Family Court — Orders of Protection
          </div>
          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Your Pro Se{" "}
            <span className="bg-gradient-to-r from-accent-mint to-accent-blue bg-clip-text text-transparent">
              Litigation Coach
            </span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-white/60">
            An educational tool to help you understand and prepare for the New
            York Family Court Order of Protection process. Not a lawyer. Not
            legal advice.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/new" className="btn-primary text-base">
              Start New Case
              <ArrowRight className="h-5 w-5" />
            </Link>
            {latestSession && (
              <Link
                href={`/case/${latestSession.id}`}
                className="btn-secondary text-base"
              >
                Continue Last Case
              </Link>
            )}
          </div>
        </motion.div>
      </section>

      {/* Safety Banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mx-auto mb-16 max-w-2xl"
      >
        <GlassCard className="border-accent-rose/20 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-rose" />
            <div className="text-sm">
              <p className="mb-1 font-semibold text-accent-rose">
                If you are in immediate danger:
              </p>
              <p className="text-white/70">
                Call <strong>911</strong>. NY Domestic Violence Hotline:{" "}
                <strong>1-800-942-6906</strong> (24/7). National DV Hotline:{" "}
                <strong>1-800-799-7233</strong>.
              </p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Features Grid */}
      <section className="mx-auto max-w-5xl pb-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i + 0.4, duration: 0.4 }}
            >
              <GlassCard hover className="h-full p-6">
                <feature.icon className="mb-4 h-8 w-8 text-accent-mint" />
                <h3 className="mb-2 text-lg font-semibold text-white/90">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-white/55">
                  {feature.description}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Disclaimer section */}
      <section className="mx-auto max-w-2xl pb-16 text-center">
        <GlassCard className="p-6">
          <h3 className="mb-3 text-lg font-semibold text-white/80">
            Important Disclaimer
          </h3>
          <p className="text-sm leading-relaxed text-white/50">
            This tool provides <strong>educational information only</strong>{" "}
            about the New York Family Court Order of Protection process. It is{" "}
            <strong>not legal advice</strong> and does not create an
            attorney-client relationship. Laws and procedures vary — always
            verify information with a licensed attorney. Do not share highly
            sensitive personal information (SSNs, account numbers) through this
            tool.
          </p>
        </GlassCard>
      </section>
    </PageWrapper>
  );
}
