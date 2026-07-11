"use client";

/**
 * Sound manager (docs/12_SOUND_ANIMATION.md).
 *
 * SFX are SYNTHESIZED with the Web Audio API by default — short chiptune-style
 * blips that fit the arcade feel — with optional real-file overrides per key
 * (SFX_ASSETS, served from public/music/, falling back to synth when missing).
 * The background track plays from public/music/background.mp3 when present.
 * Muted by default; the preference is persisted to localStorage. The
 * AudioContext is created lazily on the first user gesture (enabling sound or
 * any click) to satisfy browser autoplay policies.
 */

export type SoundKey =
  | "buttonClick"
  | "modeSelect"
  | "modelSelected"
  | "debateStart"
  | "roundStart"
  | "typingStart"
  | "turnComplete"
  | "costTick"
  | "judgeEnter"
  | "verdictReveal"
  | "next"
  | "error"
  | "blitzHit"
  | "blitzWhoosh"
  | "blitzObjection"
  | "blitzKO"
  | "blitzRoundTitle";

const STORAGE_KEY = "ada:sound-enabled";
const MUSIC_STORAGE_KEY = "ada:music-enabled";

// If you drop a real track here it plays instead of the generative synth below.
// (See public/music/README.md.)
const MUSIC_ASSET = "/music/background.mp3";
// The raw track is mastered loud — keep it WAY under the SFX so it reads as a
// faint ambience (user feedback, twice: barely-there is ideal).
const MUSIC_FILE_VOLUME = 0.03;

// Dedicated verdict suspense cue: loops while the judge deliberates and is
// stopped the moment the verdict is disclosed (falls back to the judgeEnter
// synth blip when the file is missing/blocked).
const DRUM_ROLL_ASSET = "/music/drum_roll.mp3";
const DRUM_ROLL_VOLUME = 0.5;

// Real-file SFX overrides — same pattern as the music track: when the file
// exists it plays instead of the synthesized pattern for that key.
const SFX_ASSETS: Partial<Record<SoundKey, string>> = {
  roundStart: "/music/round_start.mp3",
};
// roundStart is the only file SFX; lowered 30% (0.5 → 0.35) per feedback.
const SFX_FILE_VOLUME = 0.35;

// Generative fallback — a chill lo-fi loop: Dm7 → G7 → Cmaj7 → Am7 (ii–V–I–vi in
// C), with a soft pad, a walking bass, and a sparse pentatonic melody motif that
// gives it a recognisable tune instead of a generic pad drone.
const MUSIC_STEP_DUR = 0.5; // seconds per step
const STEPS_PER_BAR = 8;
const MUSIC_BARS = 4;
const MUSIC_STEPS = MUSIC_BARS * STEPS_PER_BAR; // 32-step (~16s) loop

const MUSIC_PADS: number[][] = [
  [293.66, 349.23, 440.0], // Dm7  (D F A)
  [246.94, 293.66, 392.0], // G7   (B D G)
  [261.63, 329.63, 392.0], // Cmaj7 (C E G)
  [220.0, 261.63, 329.63], // Am7  (A C E)
];
const MUSIC_BASS = [146.83, 196.0, 130.81, 110.0]; // D3 G3 C3 A2

// Sparse C-major-pentatonic melody (0 = rest), one entry per absolute step.
const MUSIC_MELODY = [
  659.25, 0, 587.33, 0, 0, 0, 783.99, 0, // bar 1
  587.33, 0, 0, 0, 659.25, 0, 0, 0, // bar 2
  523.25, 0, 659.25, 0, 783.99, 0, 0, 0, // bar 3
  880.0, 0, 783.99, 0, 659.25, 0, 0, 0, // bar 4
];

interface Note {
  freq: number;
  start: number; // seconds offset
  dur: number;
  type?: OscillatorType;
  gain?: number;
}

/** Each key is a tiny sequence of notes. */
const PATTERNS: Record<SoundKey, Note[]> = {
  // The everyday "click" family is SINE, not square — square harmonics read as
  // harsh/clicky on rapid taps (owner feedback, July 2026). Squares stay
  // reserved for the celebratory fanfares below.
  buttonClick: [{ freq: 620, start: 0, dur: 0.09, type: "sine", gain: 0.14 }],
  next: [
    { freq: 520, start: 0, dur: 0.07, type: "sine", gain: 0.13 },
    { freq: 700, start: 0.06, dur: 0.09, type: "sine", gain: 0.13 },
  ],
  modeSelect: [
    { freq: 500, start: 0, dur: 0.06, type: "triangle", gain: 0.14 },
    { freq: 660, start: 0.06, dur: 0.08, type: "triangle", gain: 0.14 },
  ],
  modelSelected: [
    { freq: 523.25, start: 0, dur: 0.07, type: "sine", gain: 0.14 },
    { freq: 783.99, start: 0.07, dur: 0.11, type: "sine", gain: 0.14 },
  ],
  debateStart: [
    { freq: 392, start: 0, dur: 0.1, type: "square", gain: 0.16 },
    { freq: 523, start: 0.1, dur: 0.1, type: "square", gain: 0.16 },
    { freq: 784, start: 0.2, dur: 0.16, type: "square", gain: 0.16 },
  ],
  roundStart: [
    { freq: 330, start: 0, dur: 0.08, type: "triangle", gain: 0.11 },
    { freq: 494, start: 0.09, dur: 0.12, type: "triangle", gain: 0.11 },
  ],
  typingStart: [{ freq: 240, start: 0, dur: 0.05, type: "sine", gain: 0.07 }],
  turnComplete: [
    { freq: 660, start: 0, dur: 0.06, type: "triangle", gain: 0.13 },
    { freq: 990, start: 0.07, dur: 0.1, type: "triangle", gain: 0.13 },
  ],
  costTick: [{ freq: 1200, start: 0, dur: 0.03, type: "square", gain: 0.05 }],
  judgeEnter: [
    { freq: 294, start: 0, dur: 0.12, type: "sawtooth", gain: 0.12 },
    { freq: 440, start: 0.12, dur: 0.12, type: "sawtooth", gain: 0.12 },
    { freq: 587, start: 0.24, dur: 0.18, type: "sawtooth", gain: 0.12 },
  ],
  verdictReveal: [
    { freq: 523, start: 0, dur: 0.1, type: "square", gain: 0.16 },
    { freq: 659, start: 0.1, dur: 0.1, type: "square", gain: 0.16 },
    { freq: 784, start: 0.2, dur: 0.1, type: "square", gain: 0.16 },
    { freq: 1047, start: 0.3, dur: 0.24, type: "square", gain: 0.16 },
  ],
  error: [
    { freq: 200, start: 0, dur: 0.16, type: "sawtooth", gain: 0.16 },
    { freq: 140, start: 0.16, dur: 0.22, type: "sawtooth", gain: 0.16 },
  ],
  // Blitz cues (Phase 1 synth; blitzObjection/blitzKO get hero MP3 overrides in
  // Phase 2 via SFX_ASSETS).
  blitzWhoosh: [{ freq: 300, start: 0, dur: 0.09, type: "sine", gain: 0.08 }],
  blitzHit: [
    { freq: 180, start: 0, dur: 0.05, type: "square", gain: 0.18 },
    { freq: 90, start: 0.05, dur: 0.08, type: "sawtooth", gain: 0.16 },
  ],
  blitzObjection: [
    { freq: 440, start: 0, dur: 0.06, type: "square", gain: 0.2 },
    { freq: 660, start: 0.06, dur: 0.06, type: "square", gain: 0.2 },
    { freq: 880, start: 0.12, dur: 0.14, type: "square", gain: 0.2 },
  ],
  blitzKO: [
    { freq: 784, start: 0, dur: 0.1, type: "square", gain: 0.2 },
    { freq: 523, start: 0.1, dur: 0.1, type: "square", gain: 0.2 },
    { freq: 262, start: 0.2, dur: 0.28, type: "sawtooth", gain: 0.2 },
  ],
  blitzRoundTitle: [
    { freq: 523, start: 0, dur: 0.08, type: "triangle", gain: 0.14 },
    { freq: 784, start: 0.08, dur: 0.12, type: "triangle", gain: 0.14 },
  ],
};

class SoundManager {
  private enabled = false;
  private hydrated = false;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private listeners = new Set<(enabled: boolean) => void>();

  // Background music
  private musicEnabled = false;
  private musicHydrated = false;
  private musicMaster: GainNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private musicNextTime = 0;
  private musicStep = 0;
  private musicListeners = new Set<(enabled: boolean) => void>();
  private musicAudio: HTMLAudioElement | null = null; // real-file track, if present

  // Real-file SFX (cached per key; a key falls back to synth permanently if
  // its file is missing or fails to play).
  private sfxAudio = new Map<SoundKey, HTMLAudioElement>();
  private sfxFileBroken = new Set<SoundKey>();

  // Verdict drum roll (looping suspense cue, start/stop controlled).
  private drumRollAudio: HTMLAudioElement | null = null;

  // One-shot retry armed when autoplay policy blocks the default-on music.
  private musicGestureArmed = false;

  hydrate(): boolean {
    if (this.hydrated) return this.enabled;
    if (typeof window !== "undefined") {
      try {
        this.enabled = window.localStorage.getItem(STORAGE_KEY) === "true";
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

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      try {
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      } catch {
        return null;
      }
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
    if (value) this.ensureContext(); // create on the enabling gesture
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, String(value));
      } catch {
        /* ignore */
      }
    }
    this.listeners.forEach((fn) => fn(value));
    if (value) this.play("buttonClick"); // little confirmation chirp
  }

  toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  subscribe(fn: (enabled: boolean) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  play(key: SoundKey): void {
    if (!this.enabled) return;
    if (this.playFileSfx(key)) return; // real file handles this key
    this.playSynth(key);
  }

  /**
   * Try the real-file override for a key. Returns true when a file is handling
   * playback; if the file turns out to be missing/broken the first play falls
   * back to the synth and the key is marked broken for future calls.
   */
  private playFileSfx(key: SoundKey): boolean {
    const src = SFX_ASSETS[key];
    if (!src || this.sfxFileBroken.has(key) || typeof window === "undefined") {
      return false;
    }
    try {
      let audio = this.sfxAudio.get(key);
      if (!audio) {
        audio = new Audio(src);
        audio.preload = "auto";
        audio.volume = SFX_FILE_VOLUME;
        this.sfxAudio.set(key, audio);
      }
      audio.currentTime = 0;
      void audio.play().catch((err: unknown) => {
        // NotAllowedError is the browser's autoplay policy (no user gesture yet,
        // e.g. a sound fired right after a reload) — transient, so the file must
        // NOT be permanently disabled. Anything else (404 → NotSupportedError,
        // decode failures) means the file is genuinely unusable.
        const transient =
          err instanceof DOMException && err.name === "NotAllowedError";
        if (!transient) this.sfxFileBroken.add(key);
        this.playSynth(key); // don't lose this occurrence
      });
      return true;
    } catch {
      this.sfxFileBroken.add(key);
      return false;
    }
  }

  private playSynth(key: SoundKey): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const pattern = PATTERNS[key];
    if (!pattern) return;
    const now = ctx.currentTime;
    try {
      for (const note of pattern) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = note.type ?? "square";
        osc.frequency.value = note.freq;
        const t0 = now + note.start;
        const peak = note.gain ?? 0.12;
        // Quick attack, smooth decay — avoids clicks.
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + note.dur);
        osc.connect(gain);
        gain.connect(this.master);
        osc.start(t0);
        osc.stop(t0 + note.dur + 0.02);
      }
    } catch {
      /* never let audio break the UI */
    }
  }

  /**
   * A short, soft, slightly-randomized keystroke tick for the typewriter — the
   * pitch varies per key so a stream of them sounds like real typing rather than
   * a metronome. Throttled by the caller (~15/sec).
   */
  keystroke(): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 600 + Math.random() * 380; // ~600–980 Hz
      const t0 = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.045, t0 + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.03);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + 0.045);
    } catch {
      /* ignore */
    }
  }

  // ── Verdict drum roll ─────────────────────────────────────────────────────

  /**
   * Play the verdict drum roll ONCE (not looped) and resolve when it FINISHES,
   * so the caller can reveal the verdict exactly as the sound ends. Resolves
   * immediately when sound is off / the file can't play / the request is
   * aborted, and has a safety cap so a missing "ended" event can't hang the
   * reveal forever. Cut early with stopDrumRoll().
   */
  playVerdictRoll(signal?: AbortSignal): Promise<void> {
    return new Promise<void>((resolve) => {
      if (typeof window === "undefined" || !this.enabled) {
        resolve();
        return;
      }
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(cap);
        audio?.removeEventListener("ended", finish);
        signal?.removeEventListener("abort", finish);
        resolve();
      };
      const cap = setTimeout(finish, 12_000); // never hang the reveal

      let audio: HTMLAudioElement | null = null;
      try {
        if (!this.drumRollAudio) {
          const a = new Audio(DRUM_ROLL_ASSET);
          a.preload = "auto";
          a.volume = DRUM_ROLL_VOLUME;
          this.drumRollAudio = a;
        }
        audio = this.drumRollAudio;
        audio.loop = false; // one drumroll, then reveal
        audio.currentTime = 0;
        audio.addEventListener("ended", finish, { once: true });
        signal?.addEventListener("abort", finish, { once: true });
        void audio.play().catch(() => finish()); // blocked/missing → reveal now
      } catch {
        finish();
      }
    });
  }

  stopDrumRoll(): void {
    if (!this.drumRollAudio) return;
    try {
      this.drumRollAudio.pause();
      this.drumRollAudio.currentTime = 0;
    } catch {
      /* ignore */
    }
  }

  // ── Background music (generative, calm, looping) ─────────────────────────

  hydrateMusic(): boolean {
    if (this.musicHydrated) return this.musicEnabled;
    if (typeof window !== "undefined") {
      try {
        // OFF by default (matches SFX): no surprise autoplay on first click. It
        // only turns on when the user presses the music button (persists "true").
        this.musicEnabled =
          window.localStorage.getItem(MUSIC_STORAGE_KEY) === "true";
      } catch {
        this.musicEnabled = false;
      }
      this.installVisibilityHandler();
    }
    this.musicHydrated = true;
    if (this.musicEnabled) this.startMusic(); // resume after reload if it was on
    return this.musicEnabled;
  }

  /**
   * Pause music while the tab is hidden and resume when it's visible again. This
   * also fixes multi-tab overlap (default-on music): only the foreground tab
   * actually plays the background track. Toggling persists nothing — it's a pure
   * playback gate that respects the current musicEnabled preference.
   */
  private visibilityHandlerInstalled = false;
  private installVisibilityHandler(): void {
    if (this.visibilityHandlerInstalled || typeof document === "undefined") return;
    this.visibilityHandlerInstalled = true;
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.stopMusic(); // pause without clearing musicEnabled
      } else if (this.musicEnabled) {
        this.startMusic();
      }
    });
  }

  /** Re-read the persisted sound pref (cross-tab storage event). */
  syncEnabledFromStorage(): boolean {
    let next = false;
    try {
      next = window.localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      next = false;
    }
    if (next !== this.enabled) {
      this.enabled = next;
      if (next) this.ensureContext();
      this.listeners.forEach((fn) => fn(next));
    }
    return this.enabled;
  }

  /** Re-read the persisted music pref (cross-tab storage event). */
  syncMusicFromStorage(): boolean {
    let next = true;
    try {
      next = window.localStorage.getItem(MUSIC_STORAGE_KEY) !== "false";
    } catch {
      next = true;
    }
    if (next !== this.musicEnabled) {
      this.musicEnabled = next;
      if (next) this.startMusic();
      else this.stopMusic();
      this.musicListeners.forEach((fn) => fn(next));
    }
    return this.musicEnabled;
  }

  isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  setMusicEnabled(value: boolean): void {
    this.musicEnabled = value;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(MUSIC_STORAGE_KEY, String(value));
      } catch {
        /* ignore */
      }
    }
    if (value) this.startMusic();
    else this.stopMusic();
    this.musicListeners.forEach((fn) => fn(value));
  }

  toggleMusic(): boolean {
    this.setMusicEnabled(!this.musicEnabled);
    return this.musicEnabled;
  }

  subscribeMusic(fn: (enabled: boolean) => void): () => void {
    this.musicListeners.add(fn);
    return () => this.musicListeners.delete(fn);
  }

  private startMusic(): void {
    if (typeof window === "undefined") return;
    // Prefer a real track if one was dropped in /public/music; otherwise fall
    // back to the generative synth loop.
    if (!this.musicAudio) {
      const a = new Audio(MUSIC_ASSET);
      a.loop = true;
      a.preload = "auto";
      a.volume = MUSIC_FILE_VOLUME;
      this.musicAudio = a;
    }
    this.musicAudio
      .play()
      .then(() => {
        // If music was switched off while play() was resolving (rapid toggle),
        // don't leave the file playing.
        if (!this.musicEnabled) {
          this.musicAudio?.pause();
          return;
        }
        this.stopSynth(); // real file playing → don't also run synth
      })
      .catch((err: unknown) => {
        // Switched off meanwhile → start nothing (prevents a phantom synth track
        // when toggling music off/on rapidly).
        if (!this.musicEnabled) return;
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          // Autoplay policy (no gesture yet): retry on first interaction rather
          // than falling back to the synth, which would be equally blocked.
          this.armMusicGestureRetry();
        } else if (err instanceof DOMException && err.name === "AbortError") {
          // play() interrupted by a pause() (rapid toggle) — NOT a real failure,
          // so do NOT start the synth fallback. This was the multi-track bug.
        } else {
          this.startSynth(); // genuinely no file (or it failed) → synth
        }
      });
  }

  /** Retry the (default-on) music on the user's first interaction. */
  private armMusicGestureRetry(): void {
    if (this.musicGestureArmed || typeof window === "undefined") return;
    this.musicGestureArmed = true;
    const retry = () => {
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
      this.musicGestureArmed = false;
      if (this.musicEnabled) this.startMusic();
    };
    window.addEventListener("pointerdown", retry);
    window.addEventListener("keydown", retry);
  }

  private stopMusic(): void {
    if (this.musicAudio) {
      try {
        this.musicAudio.pause();
      } catch {
        /* ignore */
      }
    }
    this.stopSynth();
  }

  private startSynth(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (!this.musicMaster) {
      this.musicMaster = ctx.createGain();
      this.musicMaster.gain.value = 0;
      this.musicMaster.connect(ctx.destination);
    }
    const now = ctx.currentTime;
    this.musicMaster.gain.cancelScheduledValues(now);
    this.musicMaster.gain.setValueAtTime(this.musicMaster.gain.value, now);
    this.musicMaster.gain.linearRampToValueAtTime(0.5, now + 1.5); // gentle fade-in
    if (this.musicTimer != null) return; // already running
    this.musicNextTime = ctx.currentTime + 0.15;
    this.musicStep = 0;
    this.musicTimer = setInterval(() => this.musicTick(), 60);
  }

  private stopSynth(): void {
    if (this.musicMaster && this.ctx) {
      const now = this.ctx.currentTime;
      this.musicMaster.gain.cancelScheduledValues(now);
      this.musicMaster.gain.setValueAtTime(this.musicMaster.gain.value, now);
      this.musicMaster.gain.linearRampToValueAtTime(0, now + 0.4); // fade-out
    }
    if (this.musicTimer != null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  /** Lookahead scheduler: queue any notes due within the next ~120ms. */
  private musicTick(): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicMaster) return;
    const lookahead = 0.12;
    while (this.musicNextTime < ctx.currentTime + lookahead) {
      this.scheduleMusicStep(this.musicStep, this.musicNextTime);
      this.musicNextTime += MUSIC_STEP_DUR;
      this.musicStep = (this.musicStep + 1) % MUSIC_STEPS;
    }
  }

  private scheduleMusicStep(step: number, time: number): void {
    const bar = Math.floor(step / STEPS_PER_BAR) % MUSIC_BARS;
    const inBar = step % STEPS_PER_BAR;
    const barLen = MUSIC_STEP_DUR * STEPS_PER_BAR;

    if (inBar === 0) {
      // Walking bass + a soft sustained pad on each bar's downbeat.
      this.musicNote(MUSIC_BASS[bar], time, barLen * 0.95, "triangle", 0.13);
      for (const tone of MUSIC_PADS[bar]) {
        this.musicNote(tone, time, barLen * 0.9, "sine", 0.045);
      }
    } else if (inBar === 4) {
      // A gentle mid-bar shimmer for movement.
      this.musicNote(MUSIC_PADS[bar][2], time, MUSIC_STEP_DUR * 1.5, "sine", 0.04);
    }

    // The melody motif is what gives the loop its identity (brighter triangle).
    const mel = MUSIC_MELODY[step % MUSIC_STEPS];
    if (mel > 0) {
      this.musicNote(mel, time, MUSIC_STEP_DUR * 1.6, "triangle", 0.09);
    }
  }

  private musicNote(
    freq: number,
    t0: number,
    dur: number,
    type: OscillatorType,
    gain: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicMaster) return;
    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(this.musicMaster);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch {
      /* ignore */
    }
  }
}

export const soundManager = new SoundManager();

export function playSound(key: SoundKey): void {
  soundManager.play(key);
}

/** Soft keystroke tick for the typewriter effect. */
export function playKeystroke(): void {
  soundManager.keystroke();
}

/**
 * Play the verdict drum roll once; the promise resolves when it ENDS so the
 * caller reveals the verdict as the sound finishes.
 */
export function playVerdictRoll(signal?: AbortSignal): Promise<void> {
  return soundManager.playVerdictRoll(signal);
}

export function stopDrumRoll(): void {
  soundManager.stopDrumRoll();
}
