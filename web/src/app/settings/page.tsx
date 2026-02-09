"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, Sun, Moon, Shield, Trash2, Info } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { useSettingsStore } from "@/lib/store";
import { useSessionStore } from "@/lib/store";
import { NY_COUNTIES } from "@/lib/types";

export default function SettingsPage() {
  const settings = useSettingsStore();
  const deleteAllSessions = useSessionStore((s) => s.sessions);
  const sessionStore = useSessionStore();
  const [clearConfirm, setClearConfirm] = useState(false);

  const handleClearAll = () => {
    if (clearConfirm) {
      for (const session of deleteAllSessions) {
        sessionStore.deleteSession(session.id);
      }
      setClearConfirm(false);
    } else {
      setClearConfirm(true);
      setTimeout(() => setClearConfirm(false), 5000);
    }
  };

  return (
    <PageWrapper className="max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8 flex items-center gap-3">
          <Settings className="h-7 w-7 text-accent-mint" />
          <h1 className="text-2xl font-bold text-white/90">Settings</h1>
        </div>

        {/* Tone */}
        <GlassCard className="mb-6 p-5">
          <h2 className="mb-3 text-base font-semibold text-white/80">Tone</h2>
          <p className="mb-3 text-xs text-white/40">
            Controls how the coach communicates with you.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => settings.updateSettings({ tone: "plain" })}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm transition ${
                settings.tone === "plain"
                  ? "border-accent-mint/40 bg-accent-mint/10 text-accent-mint"
                  : "border-white/10 bg-white/[0.04] text-white/50 hover:bg-white/[0.08]"
              }`}
            >
              <p className="font-medium">Plain Language</p>
              <p className="mt-1 text-xs opacity-60">Easy to understand, non-technical</p>
            </button>
            <button
              onClick={() => settings.updateSettings({ tone: "formal" })}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm transition ${
                settings.tone === "formal"
                  ? "border-accent-mint/40 bg-accent-mint/10 text-accent-mint"
                  : "border-white/10 bg-white/[0.04] text-white/50 hover:bg-white/[0.08]"
              }`}
            >
              <p className="font-medium">Formal</p>
              <p className="mt-1 text-xs opacity-60">Precise, court-appropriate language</p>
            </button>
          </div>
        </GlassCard>

        {/* County */}
        <GlassCard className="mb-6 p-5">
          <h2 className="mb-3 text-base font-semibold text-white/80">Default County</h2>
          <p className="mb-3 text-xs text-white/40">
            Pre-fills the county for new cases.
          </p>
          <select
            value={settings.county}
            onChange={(e) => settings.updateSettings({ county: e.target.value })}
            className="glass-input"
          >
            <option value="">Select county...</option>
            {NY_COUNTIES.map((county) => (
              <option key={county} value={county}>
                {county}
              </option>
            ))}
          </select>
        </GlassCard>

        {/* Privacy */}
        <GlassCard className="mb-6 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white/80">Privacy Mode</h2>
              <p className="mt-1 text-xs text-white/40">
                When enabled, suggests redacting names and personal details in outputs.
              </p>
            </div>
            <button
              onClick={() => settings.updateSettings({ privacyMode: !settings.privacyMode })}
              className={`relative h-7 w-12 rounded-full transition-colors ${
                settings.privacyMode ? "bg-accent-mint" : "bg-white/20"
              }`}
            >
              <div
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  settings.privacyMode ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </GlassCard>

        {/* Appearance */}
        <GlassCard className="mb-6 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white/80">Appearance</h2>
              <p className="mt-1 text-xs text-white/40">
                {settings.darkMode ? "Dark mode active" : "Light mode active"}
              </p>
            </div>
            <button
              onClick={() => settings.updateSettings({ darkMode: !settings.darkMode })}
              className={`relative flex h-7 w-12 items-center rounded-full transition-colors ${
                settings.darkMode ? "bg-accent-blue" : "bg-yellow-400"
              }`}
            >
              <div
                className={`absolute top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow transition-transform ${
                  settings.darkMode ? "translate-x-5" : "translate-x-0.5"
                }`}
              >
                {settings.darkMode ? (
                  <Moon className="h-3.5 w-3.5 text-accent-blue" />
                ) : (
                  <Sun className="h-3.5 w-3.5 text-yellow-500" />
                )}
              </div>
            </button>
          </div>
        </GlassCard>

        {/* Data */}
        <GlassCard className="mb-6 p-5">
          <h2 className="mb-3 text-base font-semibold text-white/80">Data Management</h2>
          <p className="mb-3 text-xs text-white/40">
            All data is stored locally in your browser (localStorage). Nothing is sent to any server
            except your messages to the AI coach.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClearAll}
              className={`btn-danger text-sm ${clearConfirm ? "animate-pulse" : ""}`}
            >
              <Trash2 className="h-4 w-4" />
              {clearConfirm ? "Click again to confirm" : "Clear All Sessions"}
            </button>
            <span className="text-xs text-white/30">
              {sessionStore.sessions.length} session(s) stored
            </span>
          </div>
        </GlassCard>

        {/* About */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 text-white/80">
            <Info className="h-5 w-5" />
            <h2 className="text-base font-semibold">About</h2>
          </div>
          <p className="mt-3 text-sm text-white/60">
            <strong>Pro Se Coach</strong> is an educational tool to help self-represented litigants
            understand the New York Family Court Order of Protection process.
          </p>
          <p className="mt-2 text-xs text-white/40">
            This tool is <strong>not a lawyer</strong> and does not provide legal advice.
            No attorney-client relationship is formed. Always consult with a licensed attorney.
          </p>
          <p className="mt-3 text-xs text-white/25">Version 0.1.0 · MVP</p>
        </GlassCard>
      </motion.div>
    </PageWrapper>
  );
}
