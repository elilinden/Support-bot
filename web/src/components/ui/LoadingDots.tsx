"use client";

export function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="typing-dot h-2 w-2 rounded-full bg-accent-mint/60" />
      <span className="typing-dot h-2 w-2 rounded-full bg-accent-mint/60" />
      <span className="typing-dot h-2 w-2 rounded-full bg-accent-mint/60" />
    </span>
  );
}
