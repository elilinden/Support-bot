"use client";

import { AlertTriangle, Info, AlertOctagon } from "lucide-react";
import type { SafetyFlagSeverity } from "@/lib/types";

interface SafetyBadgeProps {
  severity: SafetyFlagSeverity;
  message: string;
}

export function SafetyBadge({ severity, message }: SafetyBadgeProps) {
  const config = {
    info: {
      className: "badge-info",
      Icon: Info,
    },
    warning: {
      className: "badge-warning",
      Icon: AlertTriangle,
    },
    critical: {
      className: "badge-critical",
      Icon: AlertOctagon,
    },
  };

  const { className, Icon } = config[severity];

  return (
    <span className={className}>
      <Icon className="h-3 w-3" />
      {message}
    </span>
  );
}
