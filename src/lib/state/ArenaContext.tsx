"use client";

/**
 * Arena state — the single source of client state for the MVP (docs/10 says
 * "MVP can use local client state"). Holds the in-progress setup config and the
 * active mock session, and persists both to sessionStorage so navigating
 * Home → Setup → Debate → Result (or a refresh) doesn't lose the match.
 *
 * No provider/network logic lives here — it only orchestrates local state and
 * delegates session building to the Phase 1 mock engine.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import { createDebateSession } from "@/lib/debate/orchestrator";
import { fetchHealth } from "@/lib/api/debateClient";
import type { HealthResponse } from "@/lib/api/contracts";
import { soundManager } from "@/lib/audio/soundManager";

export type ProviderAvailability = HealthResponse["providers"];

const CONFIG_KEY = "ada:config";
const SESSION_KEY = "ada:session";

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

function defaultConfig(): DebateConfig {
  // Sensible cheap defaults; users switch fighters/brands in setup. (For a
  // key-free option, pick a free OpenRouter model with OPENROUTER_API_KEY set.)
  const a = getModelById("gpt-4o-mini") ?? MODEL_CATALOG[0];
  const b = getModelById("deepseek-v4-flash") ?? MODEL_CATALOG[1];
  return {
    topic: "",
    mode: "debate",
    modelA: toSelectedModel(a, "blue"),
    modelB: toSelectedModel(b, "red"),
    roundCount: 3,
    tone: "serious",
    responseLength: "medium",
    pace: "manual",
    judge: { enabled: true, mode: "auto" },
  };
}

interface ArenaContextValue {
  config: DebateConfig;
  setConfig: (patch: Partial<DebateConfig>) => void;
  resetConfig: () => void;

  session: DebateSession | null;
  setSession: (session: DebateSession | null) => void;
  /** Build a fresh mock session from the current config and store it. */
  startMatch: () => DebateSession;

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
  const [session, setSessionState] = useState<DebateSession | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [availability, setAvailability] = useState<ProviderAvailability | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const skipPersist = useRef(true);

  // Ask the server which backends have keys configured.
  useEffect(() => {
    const controller = new AbortController();
    fetchHealth(controller.signal)
      .then((h) => setAvailability(h.providers))
      .catch(() =>
        setAvailability({ openai: false, deepseek: false, openrouter: false }),
      );
    return () => controller.abort();
  }, []);

  // Rehydrate from sessionStorage / soundManager once on mount.
  useEffect(() => {
    try {
      const rawConfig = window.sessionStorage.getItem(CONFIG_KEY);
      if (rawConfig) setConfigState(JSON.parse(rawConfig) as DebateConfig);
      const rawSession = window.sessionStorage.getItem(SESSION_KEY);
      if (rawSession) setSessionState(JSON.parse(rawSession) as DebateSession);
    } catch {
      /* corrupt storage — fall back to defaults */
    }
    setSoundEnabled(soundManager.hydrate());
    setMusicEnabled(soundManager.hydrateMusic());
    setHydrated(true);
    skipPersist.current = false;
  }, []);

  // Persist config.
  useEffect(() => {
    if (skipPersist.current) return;
    try {
      window.sessionStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch {
      /* ignore */
    }
  }, [config]);

  // Persist session.
  useEffect(() => {
    if (skipPersist.current) return;
    try {
      if (session) {
        window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      } else {
        window.sessionStorage.removeItem(SESSION_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [session]);

  const setConfig = useCallback((patch: Partial<DebateConfig>) => {
    setConfigState((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfigState(defaultConfig());
  }, []);

  const setSession = useCallback((next: DebateSession | null) => {
    setSessionState(next);
  }, []);

  const startMatch = useCallback(() => {
    const next = createDebateSession(config);
    setSessionState(next);
    return next;
  }, [config]);

  const toggleSound = useCallback(() => {
    setSoundEnabled(soundManager.toggle());
  }, []);

  const toggleMusic = useCallback(() => {
    setMusicEnabled(soundManager.toggleMusic());
  }, []);

  const value = useMemo<ArenaContextValue>(
    () => ({
      config,
      setConfig,
      resetConfig,
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
