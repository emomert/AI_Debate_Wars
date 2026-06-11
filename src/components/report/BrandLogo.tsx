/**
 * BrandLogo — a round sticker with a brand's logo (SVGs in /public/brands,
 * sourced from the CC0 Simple Icons set). Brands without a logo in the set
 * fall back to their roster emoji so every brand still gets a face.
 *
 * The sticker background is fixed white (not the adaptive surface token) so
 * dark-fill logos stay readable in dark mode.
 */

import Image from "next/image";
import { cn } from "@/lib/utils/cn";

/** brand / backend name → file in /public/brands (without extension). */
const LOGO_FILE: Record<string, string> = {
  OpenAI: "openai",
  DeepSeek: "deepseek",
  Qwen: "qwen",
  Llama: "meta",
  Kimi: "moonshotai",
  Gemma: "google",
  "GPT-OSS": "openai",
  Nemotron: "nvidia",
  OpenRouter: "openrouter",
  openai: "openai",
  deepseek: "deepseek",
  openrouter: "openrouter",
  "Brave Search": "brave",
};

const FALLBACK_EMOJI: Record<string, string> = {
  GLM: "🌀",
  Hermes: "🪽",
  Dolphin: "🐬",
  Poolside: "🏊",
  Liquid: "💧",
};

interface BrandLogoProps {
  brand: string;
  /** Icon size in px (the sticker adds padding around it). */
  size?: number;
  className?: string;
}

export function BrandLogo({ brand, size = 16, className }: BrandLogoProps) {
  const file = LOGO_FILE[brand];
  const box = size + 10;
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full border-2 border-ink bg-white",
        className,
      )}
      style={{ width: box, height: box }}
    >
      {file ? (
        <Image src={`/brands/${file}.svg`} alt="" width={size} height={size} />
      ) : (
        <span style={{ fontSize: size - 2 }} className="leading-none">
          {FALLBACK_EMOJI[brand] ?? "🤖"}
        </span>
      )}
    </span>
  );
}
