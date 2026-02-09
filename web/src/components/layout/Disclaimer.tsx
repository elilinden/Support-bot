"use client";

import { AlertTriangle } from "lucide-react";

export function Disclaimer() {
  return (
    <div className="no-print fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2">
        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-yellow-400" />
        <p className="text-center text-xs text-white/50">
          <span className="font-semibold text-yellow-400/80">
            Educational information only. Not legal advice.
          </span>{" "}
          No attorney-client relationship is formed. Consult a licensed attorney
          for your specific situation.
        </p>
      </div>
    </div>
  );
}
