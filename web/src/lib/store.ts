/**
 * Zustand store with localStorage persistence.
 * Manages client-side state for NY Family Court OP sessions and settings.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  CaseSession,
  UserSettings,
  ConversationMessage,
  TimelineEvent,
  GeneratedArtifact,
  SafetyFlag,
  UploadedDocument,
  OPFacts,
  ArtifactType,
} from "./types";
import { createDefaultOPFacts, DEFAULT_JURISDICTION } from "./types";
import { generateId } from "./utils";

// ============================================================
// Settings Store
// ============================================================

interface SettingsState extends UserSettings {
  updateSettings: (partial: Partial<UserSettings>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      tone: "plain",
      privacyMode: false,
      darkMode: true,
      county: "",
      updateSettings: (partial) => set((state) => ({ ...state, ...partial })),
    }),
    {
      name: "prose-coach-settings",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ============================================================
// Session Store
// ============================================================

interface SessionState {
  sessions: CaseSession[];
  activeSessionId: string | null;

  createSession: (partial?: Partial<CaseSession>) => string;
  getSession: (id: string) => CaseSession | undefined;
  getActiveSession: () => CaseSession | undefined;
  setActiveSession: (id: string) => void;
  updateSession: (id: string, partial: Partial<CaseSession>) => void;
  deleteSession: (id: string) => void;

  addMessage: (sessionId: string, message: Omit<ConversationMessage, "id" | "timestamp">) => void;
  addTimelineEvent: (sessionId: string, event: Omit<TimelineEvent, "id">) => void;
  removeTimelineEvent: (sessionId: string, eventId: string) => void;
  updateOPFacts: (sessionId: string, facts: Partial<OPFacts>) => void;
  addArtifact: (sessionId: string, artifact: { type: ArtifactType; title: string; content: string }) => void;
  addSafetyFlags: (sessionId: string, flags: Omit<SafetyFlag, "id" | "createdAt">[]) => void;
  addDocument: (sessionId: string, doc: Omit<UploadedDocument, "id" | "uploadedAt">) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,

      createSession: (partial) => {
        const id = generateId();
        const now = new Date().toISOString();
        const newSession: CaseSession = {
          id,
          createdAt: now,
          updatedAt: now,
          jurisdiction: partial?.jurisdiction || { ...DEFAULT_JURISDICTION },
          title: partial?.title || "Order of Protection Case",
          opFacts: partial?.opFacts || createDefaultOPFacts(),
          timeline: partial?.timeline || [],
          conversation: [],
          generatedArtifacts: [],
          safetyFlags: [],
          documents: [],
          intakeCompleted: false,
          intakeStep: 0,
          progressPercent: 0,
          ...partial,
        };
        set((state) => ({
          sessions: [...state.sessions, newSession],
          activeSessionId: id,
        }));
        return id;
      },

      getSession: (id) => get().sessions.find((s) => s.id === id),

      getActiveSession: () => {
        const { sessions, activeSessionId } = get();
        return sessions.find((s) => s.id === activeSessionId);
      },

      setActiveSession: (id) => set({ activeSessionId: id }),

      updateSession: (id, partial) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id
              ? { ...s, ...partial, updatedAt: new Date().toISOString() }
              : s
          ),
        })),

      deleteSession: (id) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
          activeSessionId:
            state.activeSessionId === id ? null : state.activeSessionId,
        })),

      addMessage: (sessionId, message) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  updatedAt: new Date().toISOString(),
                  conversation: [
                    ...s.conversation,
                    {
                      ...message,
                      id: generateId(),
                      timestamp: new Date().toISOString(),
                    },
                  ],
                }
              : s
          ),
        })),

      addTimelineEvent: (sessionId, event) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  updatedAt: new Date().toISOString(),
                  timeline: [...s.timeline, { ...event, id: generateId() }].sort(
                    (a, b) =>
                      new Date(a.date).getTime() - new Date(b.date).getTime()
                  ),
                }
              : s
          ),
        })),

      removeTimelineEvent: (sessionId, eventId) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  updatedAt: new Date().toISOString(),
                  timeline: s.timeline.filter((e) => e.id !== eventId),
                }
              : s
          ),
        })),

      updateOPFacts: (sessionId, facts) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  updatedAt: new Date().toISOString(),
                  opFacts: deepMergeOPFacts(s.opFacts, facts),
                }
              : s
          ),
        })),

      addArtifact: (sessionId, artifact) => {
        const now = new Date().toISOString();
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  updatedAt: now,
                  generatedArtifacts: [
                    ...s.generatedArtifacts,
                    {
                      ...artifact,
                      id: generateId(),
                      version: 1,
                      createdAt: now,
                      updatedAt: now,
                    },
                  ],
                }
              : s
          ),
        }));
      },

      addSafetyFlags: (sessionId, flags) => {
        const now = new Date().toISOString();
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  updatedAt: now,
                  safetyFlags: [
                    ...s.safetyFlags,
                    ...flags.map((f) => ({
                      ...f,
                      id: generateId(),
                      createdAt: now,
                    })),
                  ],
                }
              : s
          ),
        }));
      },

      addDocument: (sessionId, doc) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  updatedAt: new Date().toISOString(),
                  documents: [
                    ...s.documents,
                    {
                      ...doc,
                      id: generateId(),
                      uploadedAt: new Date().toISOString(),
                    },
                  ],
                }
              : s
          ),
        })),
    }),
    {
      name: "prose-coach-sessions",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

/**
 * Deep merge for OPFacts — handles nested objects properly
 */
function deepMergeOPFacts(current: OPFacts, partial: Partial<OPFacts>): OPFacts {
  const merged = { ...current };
  const cur = current as unknown as Record<string, unknown>;
  const mrg = merged as unknown as Record<string, unknown>;

  for (const key of Object.keys(partial) as Array<keyof OPFacts>) {
    const val = partial[key];
    if (val === undefined) continue;

    if (
      typeof val === "object" &&
      val !== null &&
      !Array.isArray(val) &&
      typeof cur[key] === "object"
    ) {
      mrg[key] = {
        ...(cur[key] as object),
        ...val,
      };
    } else {
      mrg[key] = val as unknown;
    }
  }

  return merged;
}
