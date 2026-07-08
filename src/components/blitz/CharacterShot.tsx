"use client";

/**
 * CharacterShot — the full-screen "camera" on the active speaker (the objection-
 * meme framing: one fighter fills the stage at a time). A hard cut is sold with a
 * white flash + scale pop; a slow push-in runs while they talk. Until bespoke art
 * exists, an intentional placeholder hero stands in. All motion is reduce-motion
 * gated.
 */

import Image from "next/image";
import { motion } from "framer-motion";

import type { SelectedModel } from "@/lib/debate/debateTypes";
import { getModelById } from "@/lib/models/modelRegistry";
import { useReduceMotion } from "@/lib/motion/useReduceMotion";
import { characterArt, type BlitzPose } from "@/lib/debate/blitzCharacters";
import { BrandLogo } from "@/components/report/BrandLogo";

const SIDE_GRADIENT: Record<"A" | "B", string> = {
  A: "from-arcade-blue/30 via-paper to-paper",
  B: "from-arcade-red/30 via-paper to-paper",
};

export function CharacterShot({
  model,
  side,
  pose,
  talking,
}: {
  model: SelectedModel;
  side: "A" | "B";
  pose: BlitzPose;
  talking: boolean;
}) {
  const reduce = useReduceMotion();
  const info = getModelById(model.modelId);
  const avatar = info?.avatar ?? "🤖";
  const brand = info?.brand ?? "";
  const art = characterArt(model.modelId, pose);

  return (
    <div className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-b ${SIDE_GRADIENT[side]}`}>
      {/* White flash covering the hard cut. */}
      {reduce ? null : (
        <motion.div
          initial={{ opacity: 0.95 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="pointer-events-none absolute inset-0 z-30 bg-white"
        />
      )}

      {/* Camera: scale pop on cut, then a slow push-in while talking. */}
      <motion.div
        initial={reduce ? false : { scale: 1.14, opacity: 0 }}
        animate={reduce ? {} : { scale: talking ? 1.06 : 1, opacity: 1 }}
        transition={
          reduce
            ? undefined
            : { opacity: { duration: 0.18 }, scale: talking ? { duration: 6, ease: "linear" } : { duration: 0.25, ease: "easeOut" } }
        }
        className="flex flex-col items-center gap-3"
      >
        {art ? (
          <Image
            src={art}
            alt={model.displayName}
            width={520}
            height={520}
            priority
            className="max-h-[46vh] w-auto object-contain drop-shadow-2xl"
          />
        ) : (
          <PlaceholderHero avatar={avatar} bob={talking && !reduce} />
        )}
        <div className="flex items-center gap-2">
          <span className="rounded-badge border-3 border-ink bg-paper px-3 py-1 font-display text-ink shadow-hard-sm">
            {model.displayName}
          </span>
          {brand ? <BrandLogo brand={brand} size={16} /> : null}
        </div>
      </motion.div>
    </div>
  );
}

/** Intentional stand-in until bespoke character art lands (see blitzCharacters). */
function PlaceholderHero({ avatar, bob }: { avatar: string; bob: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        animate={bob ? { y: [0, -7, 0] } : { y: 0 }}
        transition={bob ? { duration: 0.42, repeat: Infinity, ease: "easeInOut" } : { duration: 0 }}
        className="grid h-52 w-52 place-items-center rounded-modal border-4 border-ink bg-card text-[7.5rem] shadow-hard sm:h-64 sm:w-64 sm:text-[9rem]"
      >
        <span aria-hidden>{avatar}</span>
      </motion.div>
      <span className="rounded-badge border-2 border-ink bg-arcade-yellow px-2 py-0.5 text-[10px] font-bold text-night">
        art coming soon
      </span>
    </div>
  );
}
