/**
 * voicePlayer — client-side voice orchestrator (docs/21), a module singleton
 * in the soundManager mold. Owns:
 *  - the persisted voice on/off toggle ("ada:voice-enabled", default OFF —
 *    voice is strictly opt-in, no audio is ever generated unrequested)
 *  - playback: server TTS (premium, /api/tts → OpenAI) with automatic
 *    fallback to the free Web Speech engine
 *  - a per-message blob cache so a replay NEVER re-bills
 *  - the session's running voice cost (shown live in the debate HUD)
 *
 * Sync model: `prepare()` fetches + readies the audio (and reports its
 * duration) BEFORE playback, so the runner can start the voice and the
 * typewriter together and pace the text reveal to the speech — words appear
 * as they're spoken instead of after the turn finishes typing.
 *
 * Voice can never break a match: every path resolves quietly on failure.
 */

import type { Speaker } from "@/lib/debate/debateTypes";
import { toSpeechText } from "@/lib/tts/speechText";
import { cancelWebSpeech, speakWithWebSpeech } from "@/lib/tts/webSpeech";

const VOICE_KEY = "ada:voice-enabled";

/** The slice of a message the player needs (full DebateMessage qualifies). */
export interface SpeakableMessage {
  id: string;
  content: string;
  speaker: Speaker;
}

/** How to source + style the speech for the current match. */
export interface SpeakOptions {
  /** Server TTS available (from /api/health)? false → Web Speech only. */
  serverTts: boolean;
  /** Match tone — server maps it to a voice-delivery instruction. */
  tone?: string;
  customTone?: string;
}

/**
 * Audio that's been fetched/readied and is waiting to start. `durationMs` is
 * the speech length (null when unknown) so the caller can pace a typewriter to
 * it; `play()` starts playback and resolves when it finishes (or is stopped).
 */
export interface PreparedSpeech {
  durationMs: number | null;
  play: () => Promise<void>;
}

type Listener<T> = (value: T) => void;

/** Rough Web Speech duration estimate (~210 wpm at the ~1.3× rate) so the text
 *  reveal paces to it too. */
function estimateSpeechMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1000, Math.round((words / 210) * 60_000));
}

class VoicePlayer {
  private enabled = false;
  private hydrated = false;

  private playingId: string | null = null;
  private costUsd = 0;

  private audio: HTMLAudioElement | null = null;
  private audioUrl: string | null = null;
  private speechAbort: AbortController | null = null;

  /** message id → fetched audio (cost was charged once, at fetch time). */
  private cache = new Map<string, Blob>();

  private enabledListeners = new Set<Listener<boolean>>();
  private playingListeners = new Set<Listener<string | null>>();
  private costListeners = new Set<Listener<number>>();

  /* ------------------------------ toggle state ----------------------------- */

  hydrate(): boolean {
    if (this.hydrated) return this.enabled;
    if (typeof window !== "undefined") {
      try {
        this.enabled = window.localStorage.getItem(VOICE_KEY) === "true";
      } catch {
        this.enabled = false;
      }
    }
    this.hydrated = true;
    return this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
    if (!value) this.stop();
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(VOICE_KEY, String(value));
      } catch {
        /* ignore */
      }
    }
    this.enabledListeners.forEach((fn) => fn(value));
  }

  toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  subscribeEnabled(fn: Listener<boolean>): () => void {
    this.enabledListeners.add(fn);
    return () => this.enabledListeners.delete(fn);
  }

  subscribePlaying(fn: Listener<string | null>): () => void {
    this.playingListeners.add(fn);
    return () => this.playingListeners.delete(fn);
  }

  subscribeCost(fn: Listener<number>): () => void {
    this.costListeners.add(fn);
    return () => this.costListeners.delete(fn);
  }

  getCostUsd(): number {
    return this.costUsd;
  }

  /* -------------------------------- playback ------------------------------- */

  /**
   * Fetch + ready the speech for a message and return a handle the caller
   * plays when it wants the voice to start (e.g. the moment the typewriter
   * begins). No-ops to a zero-duration handle when voice is off or there's
   * nothing speakable. Never throws.
   */
  async prepare(
    message: SpeakableMessage,
    opts: SpeakOptions,
    signal?: AbortSignal,
  ): Promise<PreparedSpeech> {
    this.stop();
    const text = toSpeechText(message.content);
    if (!this.enabled || text === "" || signal?.aborted) return NOOP_SPEECH;

    // Local controller so a later stop()/prepare() cancels THIS run; the
    // caller's signal (match abort) chains into it.
    const abort = new AbortController();
    this.speechAbort = abort;
    signal?.addEventListener("abort", () => abort.abort(), { once: true });

    if (opts.serverTts) {
      const blob = await this.fetchBlob(message, opts, abort.signal);
      if (abort.signal.aborted) return NOOP_SPEECH;
      if (blob) return await this.serverPrepared(blob, message.id, abort.signal);
    }
    if (abort.signal.aborted) return NOOP_SPEECH;
    return this.webSpeechPrepared(text, message.speaker, message.id, abort.signal);
  }

  /** Manual replay from a message card — honors the click even if voice is off. */
  replay(message: SpeakableMessage, opts: SpeakOptions): void {
    const wasEnabled = this.enabled;
    this.enabled = true; // a deliberate click always plays
    void this.prepare(message, opts)
      .then((p) => p.play())
      .finally(() => {
        this.enabled = wasEnabled;
      });
  }

  /** Stop whatever is playing (audio element or browser speech). */
  stop(): void {
    this.speechAbort?.abort();
    this.speechAbort = null;
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }
    cancelWebSpeech();
    this.setPlaying(null);
  }

  private async fetchBlob(
    message: SpeakableMessage,
    opts: SpeakOptions,
    signal: AbortSignal,
  ): Promise<Blob | null> {
    const cached = this.cache.get(message.id);
    if (cached) return cached;
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: message.content,
          speaker: message.speaker,
          tone: opts.tone,
          customTone: opts.customTone,
        }),
        signal,
      });
      if (!res.ok) return null; // 503 unconfigured / 429 capped → Web Speech
      const blob = await res.blob();
      this.cache.set(message.id, blob);
      const cost = Number(res.headers.get("x-tts-cost-usd"));
      if (Number.isFinite(cost) && cost > 0) {
        this.costUsd += cost;
        this.costListeners.forEach((fn) => fn(this.costUsd));
      }
      return blob;
    } catch {
      return null; // aborted / network error → caller falls back to Web Speech
    }
  }

  /** Build a server-audio handle; reads duration up front so text can pace to it. */
  private serverPrepared(
    blob: Blob,
    id: string,
    signal: AbortSignal,
  ): Promise<PreparedSpeech> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.preload = "auto";
      let settled = false;
      const ready = () => {
        if (settled) return;
        settled = true;
        const durationMs = Number.isFinite(audio.duration) ? audio.duration * 1000 : null;
        resolve({
          durationMs,
          play: () => this.playAudio(audio, url, id, signal),
        });
      };
      audio.addEventListener("loadedmetadata", ready, { once: true });
      audio.addEventListener("error", ready, { once: true });
      // Don't hang forever if metadata never fires.
      setTimeout(ready, 4000);
    });
  }

  private playAudio(
    audio: HTMLAudioElement,
    url: string,
    id: string,
    signal: AbortSignal,
  ): Promise<void> {
    return new Promise((resolve) => {
      if (signal.aborted) {
        URL.revokeObjectURL(url);
        return resolve();
      }
      this.audio = audio;
      this.audioUrl = url;
      this.setPlaying(id);
      const finish = () => {
        signal.removeEventListener("abort", onAbort);
        if (this.playingId === id) this.setPlaying(null);
        if (this.audioUrl === url) {
          URL.revokeObjectURL(url);
          this.audioUrl = null;
        }
        resolve();
      };
      const onAbort = () => {
        audio.pause();
        finish();
      };
      signal.addEventListener("abort", onAbort, { once: true });
      audio.onended = finish;
      audio.onerror = finish;
      // Autoplay policies can reject before any user gesture — resolve quietly.
      audio.play().catch(finish);
    });
  }

  private webSpeechPrepared(
    text: string,
    speaker: Speaker,
    id: string,
    signal: AbortSignal,
  ): PreparedSpeech {
    return {
      durationMs: estimateSpeechMs(text),
      play: () => {
        if (signal.aborted) return Promise.resolve();
        this.setPlaying(id);
        return speakWithWebSpeech(text, speaker, signal).finally(() => {
          if (this.playingId === id) this.setPlaying(null);
        });
      },
    };
  }

  private setPlaying(id: string | null): void {
    if (this.playingId === id) return;
    this.playingId = id;
    this.playingListeners.forEach((fn) => fn(id));
  }
}

/** Shared no-op handle for the "nothing to speak" paths. */
const NOOP_SPEECH: PreparedSpeech = { durationMs: 0, play: () => Promise.resolve() };

export const voicePlayer = new VoicePlayer();
