"use client";

import { ReactNode, useEffect } from "react";
import { useSettingsStore } from "@/lib/store";
import { Navbar } from "./Navbar";
import { Disclaimer } from "./Disclaimer";

export function ClientProviders({ children }: { children: ReactNode }) {
  const darkMode = useSettingsStore((s) => s.darkMode);

  useEffect(() => {
    document.documentElement.classList.toggle("light", !darkMode);
  }, [darkMode]);

  return (
    <div className="relative min-h-screen">
      {/* Ambient glow effects */}
      <div className="ambient-glow ambient-glow-1" />
      <div className="ambient-glow ambient-glow-2" />
      <div className="ambient-glow ambient-glow-3" />

      <Navbar />
      {children}
      <Disclaimer />
    </div>
  );
}
