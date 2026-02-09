"use client";

import { motion } from "framer-motion";

interface ProgressBarProps {
  value: number;
  label?: string;
  showPercent?: boolean;
}

export function ProgressBar({
  value,
  label,
  showPercent = true,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className="w-full">
      {(label || showPercent) && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          {label && <span className="text-white/60">{label}</span>}
          {showPercent && (
            <span className="font-medium text-accent-mint">{clamped}%</span>
          )}
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-accent-mint to-accent-blue"
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
