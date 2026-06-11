/**
 * voicePlayer — client-side voice orchestrator (docs/21), a module singleton
 * in the soundManager mold. Owns:
 *  - the persisted voice on/off toggle ("ada:voice-enabled", default OFF —
 *    voice is strictly opt-in, no audio is ever generated unrequested)
 *  - playback: server TTS (premium, /api/tts → Kokoro) with automatic
 *    fallback to the free Web Speech engine
 *  - a per-message blob cache so a replay NEVER re-bills
 *  - the session's running voice cost (shown live in the debate HUD)
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

type Listener<T> = (value: T) => void;

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
   * Auto voice-over after a turn's typewriter: no-ops unless the user has
   * voice ON. Resolves when the speech ends (the runner awaits it so the next
   * turn doesn't talk over this one).
   */
  speakAuto(message: SpeakableMessage, serverTts: boolean, signal?: AbortSignal): Promise<void> {
    if (!this.enabled) return Promise.resolve();
    return this.speak(message, serverTts, signal);
  }

  /** Manual replay from a message card — honors the click even if voice is off. */
  replay(message: SpeakableMessage, serverTts: boolean): void {
    void this.speak(message, serverTts);
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

  private async speak(
    message: SpeakableMessage,
    serverTts: boolean,
    signal?: AbortSignal,
  ): Promise<void> {
    this.stop();
    const text = toSpeechText(message.content);
    if (text === "") return;

    // Local controller so a later stop()/speak() cancels THIS run; the
    // caller's signal (match abort) chains into it.
    const abort = new AbortController();
    this.speechAbort = abort;
    const onCallerAbort = () => abort.abort();
    signal?.addEventListener("abort", onCallerAbort, { once: true });

    this.setPlaying(message.id);
    try {
      if (serverTts && (await this.playServer(message, abort.signal))) return;
      if (abort.signal.aborted) return;
      await speakWithWebSpeech(text, message.speaker, abort.signal);
    } finally {
      signal?.removeEventListener("abort", onCallerAbort);
      if (this.playingId === message.id) this.setPlaying(null);
    }
  }

  /** Returns true when server audio handled the speech (incl. abort mid-play). */
  private async playServer(message: SpeakableMessage, signal: AbortSignal): Promise<boolean> {
    try {
      let blob = this.cache.get(message.id);
      if (!blob) {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: message.content, speaker: message.speaker }),
          signal,
        });
        if (!res.ok) return false; // 503 unconfigured / 429 capped → Web Speech
        blob = await res.blob();
        this.cache.set(message.id, blob);
        const cost = Number(res.headers.get("x-tts-cost-usd"));
        if (Number.isFinite(cost) && cost > 0) {
          this.costUsd += cost;
          this.costListeners.forEach((fn) => fn(this.costUsd));
        }
      }
      if (signal.aborted) return true;
      await this.playBlob(blob, signal);
      return true;
    } catch {
      // Aborted → done; network failure → let Web Speech take over.
      return signal.aborted;
    }
  }

  private playBlob(blob: Blob, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      this.audio = audio;
      this.audioUrl = url;
      const finish = () => {
        signal.removeEventListener("abort", onAbort);
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

  private setPlaying(id: string | null): void {
    if (this.playingId === id) return;
    this.playingId = id;
    this.playingListeners.forEach((fn) => fn(id));
  }
}

export const voicePlayer = new VoicePlayer();
