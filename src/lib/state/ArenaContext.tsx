"use client";

/**
 * Arena state — the single source of client state for the MVP (docs/10 says
 * "MVP can use local client state"). Holds the in-progress setup config and the
 * active session, and persists both to sessionStorage so navigating
 * Home → Setup → Debate → Result (or a refresh) doesn't lose the match.
 *
 * No provider/network logic lives here — it only orchestrates local state and
 * delegates session building to the orchestrator; real model calls happen
 * server-side via the debate API routes.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  DebateConfig,
  DebateSession,
  ModelColor,
  SelectedModel,
} from "@/lib/debate/debateTypes";
import {
  MODEL_CATALOG,
  getModelById,
  type ModelCatalogEntry,
} from "@/lib/models/modelRegistry";
import { createDebateSessions } from "@/lib/debate/orchestrator";
import { readClientLocale } from "@/lib/i18n/config";
import { fetchHealth } from "@/lib/api/debateClient";
import type { HealthResponse } from "@/lib/api/contracts";
import { soundManager } from "@/lib/audio/soundManager";

export type ProviderAvailability = HealthResponse["providers"];

const CONFIG_KEY = "ada:config";
const SESSION_KEY = "ada:session";

/** Persisted shape of the active match: one or more concurrent battle sessions. */
interface PersistedMatch {
  sessions: DebateSession[];
  activeBattleIndex: number;
}

/**
 * Read the persisted match, tolerating the OLD single-session shape (a bare
 * DebateSession) from before multi-battle — wrap it into a 1-element array so a
 * match in progress across the upgrade isn't lost.
 */
function parsePersistedMatch(raw: string): PersistedMatch | null {
  const parsed = JSON.parse(raw) as unknown;
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.sessions)) {
      const sessions = obj.sessions as DebateSession[];
      const idx = typeof obj.activeBattleIndex === "number" ? obj.activeBattleIndex : 0;
      return {
        sessions,
        activeBattleIndex: Math.min(Math.max(0, idx), Math.max(0, sessions.length - 1)),
      };
    }
    // Legacy single-session blob (has its own id/turns) → wrap it.
    if (typeof obj.id === "string" && Array.isArray(obj.turns)) {
      return { sessions: [parsed as DebateSession], activeBattleIndex: 0 };
    }
  }
  return null;
}

/** Map a catalogue entry into a slot-colored SelectedModel. */
export function toSelectedModel(
  entry: ModelCatalogEntry,
  color: ModelColor,
): SelectedModel {
  return {
    providerId: entry.providerId,
    modelId: entry.id,
    displayName: entry.displayName,
    nickname: entry.nickname,
    color,
  };
}

/**
 * The default fighter pair (cheap, broadly-available). Exported so the Home
 * "Try a Sample" fallback uses the SAME pair instead of duplicating the ids.
 */
export function defaultFighters(): { a: ModelCatalogEntry; b: ModelCatalogEntry } {
  return {
    a: getModelById("gpt-4o-mini") ?? MODEL_CATALOG[0],
    b: getModelById("deepseek-v4-flash") ?? MODEL_CATALOG[1],
  };
}

function defaultConfig(): DebateConfig {
  // Sensible cheap defaults; users switch fighters/brands in setup. (For a
  // key-free option, pick a free OpenRouter model with OPENROUTER_API_KEY set.)
  const { a, b } = defaultFighters();
  return {
    topic: "",
    mode: "debate",
    modelA: toSelectedModel(a, "blue"),
    modelB: toSelectedModel(b, "red"),
    roundCount: 3,
    tone: "serious",
    customTone: "",
    deepDebate: false,
    responseLength: "medium",
    pace: "manual",
    judge: { enabled: true, mode: "auto" },
  };
}

interface ArenaContextValue {
  config: DebateConfig;
  setConfig: (patch: Partial<DebateConfig>) => void;
  resetConfig: () => void;

  /**
   * The active match's battle sessions (1–3). Empty when there's no match.
   * Single-battle matches have exactly one entry.
   */
  sessions: DebateSession[];
  /** 0-based index of the battle currently being viewed in the arena/results. */
  activeBattleIndex: number;
  setActiveBattleIndex: (index: number) => void;
  /** Immutably replace one battle's session (used for per-turn persist + re-judge). */
  updateSession: (index: number, next: DebateSession) => void;

  /** The currently-viewed battle session (back-compat shim = sessions[active]). */
  session: DebateSession | null;
  /** Replace the WHOLE match with a single battle (Try-a-Sample, reopen, clear). */
  setSession: (session: DebateSession | null) => void;
  /** Build a fresh session PER battle from the current config and store them. */
  startMatch: () => DebateSession[];

  soundEnabled: boolean;
  toggleSound: () => void;

  musicEnabled: boolean;
  toggleMusic: () => void;

  /** Which providers have keys server-side (null until /api/health resolves). */
  availability: ProviderAvailability | null;

  hydrated: boolean;
}

const ArenaContext = createContext<ArenaContextValue | null>(null);

export function ArenaProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<DebateConfig>(defaultConfig);
  const [sessions, setSessionsState] = useState<DebateSession[]>([]);
  const [activeBattleIndex, setActiveBattleIndexState] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [availability, setAvailability] = useState<ProviderAvailability | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Ask the server which backends have keys configured.
  useEffect(() => {
    const controller = new AbortController();
    fetchHealth(controller.signal)
      .then((h) => setAvailability(h.providers))
      .catch(() =>
        setAvailability({
          openai: false,
          deepseek: false,
          openrouter: false,
          // A failed health fetch says nothing about server config. The
          // provider booleans above are advisory hints, but webSearch HARD
          // gates Deep Debate — stay optimistic and let the authoritative
          // server validator reject cleanly if search is truly unconfigured.
          webSearch: true,
          // Pessimistic: with health unknown, voice runs on free Web Speech.
          tts: false,
        }),
      );
    return () => controller.abort();
  }, []);

  // Rehydrate from sessionStorage / soundManager once on mount.
  useEffect(() => {
    try {
      const rawConfig = window.sessionStorage.getItem(CONFIG_KEY);
      if (rawConfig) setConfigState(JSON.parse(rawConfig) as DebateConfig);
      const rawSession = window.sessionStorage.getItem(SESSION_KEY);
      if (rawSession) {
        const match = parsePersistedMatch(rawSession);
        if (match) {
          setSessionsState(match.sessions);
          setActiveBattleIndexState(match.activeBattleIndex);
        }
      }
    } catch {
      /* corrupt storage — fall back to defaults */
    }
    setSoundEnabled(soundManager.hydrate());
    setMusicEnabled(soundManager.hydrateMusic());
    setHydrated(true);
  }, []);

  // Persist config. Gated on `hydrated` STATE (not a ref) so it never runs on
  // the pre-rehydration commit — otherwise the render-0 default config/session
  // would briefly overwrite (and delete) the just-restored values.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.sessionStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch {
      /* ignore */
    }
  }, [config, hydrated]);

  // Persist the whole match (all battle sessions + which one is active) under one
  // key, in one effect — so three near-simultaneous per-battle updates coalesce
  // into a single serialized write instead of racing.
  useEffect(() => {
    if (!hydrated) return;
    try {
      if (sessions.length > 0) {
        const payload: PersistedMatch = { sessions, activeBattleIndex };
        window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
      } else {
        window.sessionStorage.removeItem(SESSION_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [sessions, activeBattleIndex, hydrated]);

  // Cross-tab sound/music sync: mirror another tab's toggle into this tab's
  // soundManager + local state so two open tabs don't disagree (and the music
  // toggle stays consistent).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "ada:sound-enabled") {
        setSoundEnabled(soundManager.syncEnabledFromStorage());
      } else if (e.key === "ada:music-enabled") {
        setMusicEnabled(soundManager.syncMusicFromStorage());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setConfig = useCallback((patch: Partial<DebateConfig>) => {
    setConfigState((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfigState(defaultConfig());
  }, []);

  const setActiveBattleIndex = useCallback((index: number) => {
    setActiveBattleIndexState((prev) => (index === prev ? prev : index));
  }, []);

  const updateSession = useCallback((index: number, next: DebateSession) => {
    setSessionsState((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const copy = prev.slice();
      copy[index] = next;
      return copy;
    });
  }, []);

  // Back-compat shim: replace the WHOLE match with a single battle (Try-a-Sample,
  // reopen-from-history) or clear it (null). Per-battle updates use updateSession.
  // Installing a single session means a SINGLE-battle config, so drop any stale
  // extra battles — otherwise a later Rematch (which rebuilds from config) would
  // silently resurrect battles the user never set up for this match.
  const setSession = useCallback((next: DebateSession | null) => {
    setSessionsState(next ? [next] : []);
    setActiveBattleIndexState(0);
    setConfigState((prev) => (prev.battles && prev.battles.length ? { ...prev, battles: [] } : prev));
  }, []);

  const startMatch = useCallback(() => {
    // Single choke point for the Deep Debate format (3 rounds, standard tone):
    // Rematch buttons call startMatch without passing through the setup page's
    // normalization, so a stale persisted config must be clamped here too.
    const effective: DebateConfig = config.deepDebate
      ? { ...config, roundCount: 3, tone: "serious" }
      : config;
    // Stamp the debate with the language it should run in — the live UI locale,
    // read straight from the cookie so it's correct even if the persisted config
    // predates the current choice. One session per battle pairing (1–3).
    const next = createDebateSessions({ ...effective, language: readClientLocale() });
    setSessionsState(next);
    setActiveBattleIndexState(0);
    return next;
  }, [config]);

  const toggleSound = useCallback(() => {
    setSoundEnabled(soundManager.toggle());
  }, []);

  const toggleMusic = useCallback(() => {
    setMusicEnabled(soundManager.toggleMusic());
  }, []);

  // Derived active session — back-compat for consumers that still read a single
  // session (re-judge panels, share/publish, history saver, reopen).
  const session = sessions[activeBattleIndex] ?? null;

  const value = useMemo<ArenaContextValue>(
    () => ({
      config,
      setConfig,
      resetConfig,
      sessions,
      activeBattleIndex,
      setActiveBattleIndex,
      updateSession,
      session,
      setSession,
      startMatch,
      soundEnabled,
      toggleSound,
      musicEnabled,
      toggleMusic,
      availability,
      hydrated,
    }),
    [
      config,
      setConfig,
      resetConfig,
      sessions,
      activeBattleIndex,
      setActiveBattleIndex,
      updateSession,
      session,
      setSession,
      startMatch,
      soundEnabled,
      toggleSound,
      musicEnabled,
      toggleMusic,
      availability,
      hydrated,
    ],
  );

  return <ArenaContext.Provider value={value}>{children}</ArenaContext.Provider>;
}

export function useArena(): ArenaContextValue {
  const ctx = useContext(ArenaContext);
  if (!ctx) {
    throw new Error("useArena must be used within an ArenaProvider");
  }
  return ctx;
}
