"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  hover?: boolean;
  glow?: "mint" | "blue" | "purple" | "rose" | "none";
}

export function GlassCard({
  children,
  className,
  hover = false,
  glow = "none",
  ...props
}: GlassCardProps) {
  const glowColors = {
    mint: "shadow-accent-mint/5 hover:shadow-accent-mint/10",
    blue: "shadow-accent-blue/5 hover:shadow-accent-blue/10",
    purple: "shadow-accent-purple/5 hover:shadow-accent-purple/10",
    rose: "shadow-accent-rose/5 hover:shadow-accent-rose/10",
    none: "",
  };

  return (
    <motion.div
      className={cn(
        hover ? "glass-card-hover" : "glass-card",
        glowColors[glow],
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
