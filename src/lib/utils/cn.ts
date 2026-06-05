/**
 * Tiny className combiner. Filters out falsy values and joins with spaces.
 * Avoids pulling in clsx/tailwind-merge for the MVP; callers should not pass
 * conflicting Tailwind utilities for the same property.
 */
export type ClassValue = string | number | false | null | undefined;

export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
