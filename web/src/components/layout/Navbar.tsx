"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Scale,
  Home,
  PlusCircle,
  Settings,
  Moon,
  Sun,
  FolderOpen,
  MessageSquare,
  BookOpen,
} from "lucide-react";
import { useSettingsStore } from "@/lib/store";
import { useSessionStore } from "@/lib/store";

export function Navbar() {
  const pathname = usePathname();
  const { darkMode, updateSettings } = useSettingsStore();
  const sessions = useSessionStore((s) => s.sessions);

  const latestSession = sessions[sessions.length - 1];
  const latestId = latestSession?.id;
  const latestStatus = latestSession?.status;

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/new", label: "New Case", icon: PlusCircle },
    ...(latestId && (latestStatus === "interview" || latestStatus === "active")
      ? [
          {
            href: `/case/${latestId}/interview`,
            label: "Interview",
            icon: MessageSquare,
          },
        ]
      : []),
    ...(latestId && latestStatus === "active"
      ? [
          {
            href: `/case/${latestId}/roadmap`,
            label: "Roadmap",
            icon: BookOpen,
          },
        ]
      : []),
    ...(latestId
      ? [
          {
            href: `/case/${latestId}`,
            label: "Dashboard",
            icon: FolderOpen,
          },
        ]
      : []),
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav className="glass-nav no-print">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-mint to-accent-blue">
            <Scale className="h-5 w-5 text-black" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white/90">
            Pro Se Coach
          </span>
        </Link>

        {/* Nav Links */}
        <div className="hidden items-center gap-1 sm:flex">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-accent-mint"
                    : "text-white/60 hover:text-white/90"
                }`}
              >
                <span className="relative z-10 flex items-center gap-1.5">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 rounded-lg bg-white/[0.08]"
                    transition={{ type: "spring", duration: 0.5 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right: Dark mode toggle */}
        <button
          onClick={() => updateSettings({ darkMode: !darkMode })}
          className="btn-ghost rounded-full p-2"
          aria-label="Toggle dark mode"
        >
          {darkMode ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile nav */}
      <div className="flex items-center justify-around border-t border-white/5 py-2 sm:hidden">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs ${
                isActive ? "text-accent-mint" : "text-white/50"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
