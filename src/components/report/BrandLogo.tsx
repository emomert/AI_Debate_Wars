/**
 * BrandLogo — a round sticker with a brand's logo (SVGs in /public/brands,
 * sourced from the CC0 Simple Icons set, plus Grok/Zhipu marks from the
 * LobeHub icon set). Every catalogue brand has a real company mark; unknown
 * brands fall back to a generic face so the sticker never renders empty.
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
  Kimi: "moonshotai",
  Claude: "anthropic",
  Grok: "grok",
  Gemini: "googlegemini",
  Xiaomi: "xiaomi",
  GLM: "zhipu",
  MiniMax: "minimax",
  Nemotron: "nvidia",
  Meta: "meta",
  Mistral: "mistralai",
  Amazon: "amazonnova",
  Tencent: "tencenthunyuan",
  OpenRouter: "openrouter",
  openai: "openai",
  deepseek: "deepseek",
  openrouter: "openrouter",
  "Brave Search": "brave",
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
          🤖
        </span>
      )}
    </span>
  );
}
