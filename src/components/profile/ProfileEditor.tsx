"use client";

/**
 * ProfileEditor — the user's public "fighter card" (docs/20): a unique handle
 * plus a preset arcade avatar, shown on shared matches, votes and comments.
 * Saves via the browser Supabase client (RLS: own row only). No handle yet →
 * the user appears as "Anonymous Fighter" across the community.
 *
 * The inner ProfileForm is shared with the first-sign-in onboarding step
 * (/welcome), which wraps it in its own panel and adds a Skip button.
 */

import { useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  AVATAR_PRESETS,
  isValidUsername,
  normalizeUsername,
} from "@/lib/community/profile";
import { GamePanel } from "@/components/game/GamePanel";
import { ArcadeButton } from "@/components/game/ArcadeButton";
import { useT } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils/cn";

type SaveState = "idle" | "saving" | "saved" | "taken" | "invalid" | "error";

interface ProfileFormProps {
  userId: string;
  /** Called after a successful save (welcome page navigates onward). */
  onSaved?: (username: string | null) => void;
}

export function ProfileForm({ userId, onSaved }: ProfileFormProps) {
  const d = useT();
  const t = d.community.profileCard;
  const supabase = getSupabaseBrowserClient();

  const [username, setUsername] = useState("");
  const [savedUsername, setSavedUsername] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string>(AVATAR_PRESETS[0]);
  const [loaded, setLoaded] = useState(false);
  const [state, setState] = useState<SaveState>("idle");

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("username, avatar")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          setUsername(data.username ?? "");
          setSavedUsername(data.username ?? null);
          if (data.avatar) setAvatar(data.avatar);
        }
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, userId]);

  if (!supabase) return null;

  const save = async () => {
    const handle = normalizeUsername(username);
    if (handle !== "" && !isValidUsername(handle)) {
      setState("invalid");
      return;
    }
    setState("saving");
    const { error } = await supabase.from("profiles").upsert(
      {
        user_id: userId,
        username: handle === "" ? null : handle,
        avatar,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) {
      // 23505 = unique violation → the handle is taken.
      setState(error.code === "23505" ? "taken" : "error");
      return;
    }
    setUsername(handle);
    setSavedUsername(handle === "" ? null : handle);
    setState("saved");
    onSaved?.(handle === "" ? null : handle);
  };

  const feedback: Partial<Record<SaveState, { text: string; tone: "ok" | "bad" }>> = {
    saved: { text: t.saved, tone: "ok" },
    taken: { text: t.usernameTaken, tone: "bad" },
    invalid: { text: t.invalidUsername, tone: "bad" },
    error: { text: t.error, tone: "bad" },
  };
  const fb = feedback[state];

  return (
    <>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Handle */}
        <div>
          <label
            htmlFor="profile-username"
            className="block text-[10px] font-bold uppercase tracking-wide text-ink/50"
          >
            {t.usernameLabel}
          </label>
          <input
            id="profile-username"
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setState("idle");
            }}
            placeholder={t.usernamePlaceholder}
            maxLength={20}
            disabled={!loaded || state === "saving"}
            className="mt-1 w-full rounded-card border-3 border-ink bg-paper p-2.5 font-mono text-sm focus-visible:outline-3 focus-visible:outline-offset-2"
          />
          <p className="mt-1 text-[11px] text-ink/45">{t.usernameHint}</p>
          {savedUsername === null && loaded ? (
            <p className="mt-1 text-[11px] text-ink/45">{t.anonymousNote}</p>
          ) : null}
        </div>

        {/* Avatar picker */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink/50">
            {t.avatarLabel}
          </p>
          <div className="mt-1 grid grid-cols-8 gap-1.5">
            {AVATAR_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setAvatar(preset);
                  setState("idle");
                }}
                disabled={!loaded || state === "saving"}
                aria-pressed={avatar === preset}
                className={cn(
                  "grid aspect-square place-items-center rounded-btn border-3 border-ink text-lg transition",
                  avatar === preset
                    ? "bg-arcade-yellow shadow-hard-sm"
                    : "bg-card hover:bg-surface",
                )}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <ArcadeButton
          variant="primary-green"
          size="sm"
          onClick={save}
          disabled={!loaded || state === "saving"}
        >
          {state === "saving" ? t.saving : t.save}
        </ArcadeButton>
        {fb ? (
          <p
            className={cn(
              "text-xs font-semibold",
              fb.tone === "ok" ? "text-arcade-green" : "text-arcade-red",
            )}
          >
            {fb.text}
          </p>
        ) : null}
      </div>
    </>
  );
}

export function ProfileEditor({ userId }: { userId: string }) {
  const d = useT();
  const t = d.community.profileCard;
  return (
    <GamePanel title={t.title} className="mt-5">
      <p className="text-sm text-ink/65">{t.blurb}</p>
      <ProfileForm userId={userId} />
    </GamePanel>
  );
}
