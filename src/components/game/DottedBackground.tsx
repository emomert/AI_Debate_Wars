/**
 * DottedBackground — a fixed decorative dotted layer.
 *
 * The page <body> already paints the dotted grid (globals.css). This component
 * adds a soft radial vignette on top so the arcade content "pops" toward the
 * centre. It's purely decorative and ignored by screen readers.
 */

export function DottedBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        background:
          "radial-gradient(80% 60% at 50% 0%, rgba(255,217,26,0.10), transparent 70%), radial-gradient(70% 60% at 100% 100%, rgba(139,92,246,0.08), transparent 70%)",
      }}
    />
  );
}
