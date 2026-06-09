/**
 * GamePanel — the standard white panel/card with thick border + hard shadow
 * (docs/02_DESIGN.md). Optional title row and a corner sticker.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface GamePanelProps {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  sticker?: ReactNode;
  as?: "section" | "div" | "article";
  padding?: "sm" | "md" | "lg";
}

const PADDING: Record<NonNullable<GamePanelProps["padding"]>, string> = {
  sm: "p-3 sm:p-4",
  md: "p-4 sm:p-6",
  lg: "p-5 sm:p-8",
};

export function GamePanel({
  children,
  className,
  title,
  sticker,
  as: Tag = "section",
  padding = "md",
}: GamePanelProps) {
  return (
    <Tag
      className={cn(
        "relative rounded-panel border-4 border-ink bg-card shadow-hard",
        PADDING[padding],
        className,
      )}
    >
      {sticker ? (
        <div className="absolute -right-3 -top-3 rotate-6">{sticker}</div>
      ) : null}
      {title ? (
        <h2 className="mb-4 font-heading text-2xl font-extrabold sm:text-3xl">
          {title}
        </h2>
      ) : null}
      {children}
    </Tag>
  );
}
