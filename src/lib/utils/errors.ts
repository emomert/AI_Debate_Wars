/**
 * Normalized application errors (docs/03_ARCHITECTURE.md, docs/09_UX_FLOWS.md).
 *
 * Providers throw `ProviderError` with one of these codes; API routes serialize
 * them into a stable shape; the UI maps codes to playful-but-clear copy. Raw
 * provider error details are never forwarded to the client.
 */

export type AppErrorCode =
  | "MISSING_API_KEY"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_ERROR"
  | "INVALID_MODEL"
  | "INVALID_SESSION"
  | "INVALID_REQUEST"
  | "RATE_LIMITED"
  // Our OWN guards (distinct from the provider's RATE_LIMITED so the client
  // never silently auto-retries past them):
  | "TOO_MANY_REQUESTS" // per-IP request rate limit on the paid routes
  | "DAILY_LIMIT_REACHED" // global/per-IP daily spend cap
  | "INSUFFICIENT_CREDITS"
  | "TOKEN_LIMIT_EXCEEDED"
  | "UNKNOWN_ERROR";

export interface AppErrorShape {
  code: AppErrorCode;
  message: string;
}

export class ProviderError extends Error {
  code: AppErrorCode;
  constructor(code: AppErrorCode, message?: string) {
    super(message ?? code);
    this.name = "ProviderError";
    this.code = code;
  }
}

/** HTTP status for an error code, for API route responses. */
export function httpStatusForCode(code: AppErrorCode): number {
  switch (code) {
    case "INVALID_REQUEST":
    case "INVALID_SESSION":
    case "INVALID_MODEL":
      return 400;
    case "MISSING_API_KEY":
      return 401;
    case "RATE_LIMITED":
    case "TOO_MANY_REQUESTS":
    case "DAILY_LIMIT_REACHED":
      return 429;
    case "INSUFFICIENT_CREDITS":
      return 402;
    case "PROVIDER_TIMEOUT":
      return 504;
    case "TOKEN_LIMIT_EXCEEDED":
      return 422;
    default:
      return 502;
  }
}

/**
 * Friendly, on-brand UI copy for each error code (docs/09 error UX). Used by the
 * client so it never has to show a raw provider error.
 */
export function friendlyMessage(code: AppErrorCode): { title: string; body: string } {
  switch (code) {
    case "MISSING_API_KEY":
      return {
        title: "The arena has no power source",
        body: "A server-side API key is missing or rejected. Fighters need OPENAI_API_KEY, DEEPSEEK_API_KEY, or OPENROUTER_API_KEY; Deep Debate also needs a valid BRAVE_SEARCH_API_KEY for web search.",
      };
    case "PROVIDER_TIMEOUT":
      return {
        title: "The fighter froze mid-round",
        body: "The model took too long to respond. Try again or switch models.",
      };
    case "RATE_LIMITED":
      return {
        title: "The arena is cooling down",
        body: "The provider is rate-limiting requests. Wait a moment and try again.",
      };
    case "TOO_MANY_REQUESTS":
      return {
        title: "Whoa — slow down, champ",
        body: "You're starting matches faster than the arena can run them. Wait a few seconds and try again.",
      };
    case "DAILY_LIMIT_REACHED":
      return {
        title: "The arena hit today's limit",
        body: "Debator caps how much it can spend per day to keep the lights on. The limit's reached for now — come back tomorrow, or pick free models (they don't count against it).",
      };
    case "INSUFFICIENT_CREDITS":
      return {
        title: "This fighter is out of coins",
        body: "The provider account is out of credits for this model. Add credits, or pick a free model in setup.",
      };
    case "INVALID_MODEL":
      return {
        title: "That fighter isn't in the roster",
        body: "The selected model isn't available. Pick another model in setup.",
      };
    case "TOKEN_LIMIT_EXCEEDED":
      return {
        title: "That turn hit the token ceiling",
        body: "Try a shorter max response length and run it again.",
      };
    case "INVALID_SESSION":
    case "INVALID_REQUEST":
      return {
        title: "Something about this match looks off",
        body: "The match data was rejected. Head back to setup and start a fresh match.",
      };
    case "PROVIDER_ERROR":
    default:
      return {
        title: "The arena lights flickered",
        body: "The model didn't respond cleanly. Try again or switch models.",
      };
  }
}

/** Coerce any thrown value into an AppErrorShape. */
export function toAppError(err: unknown): AppErrorShape {
  if (err instanceof ProviderError) {
    return { code: err.code, message: err.message };
  }
  if (err instanceof DOMException && err.name === "AbortError") {
    return { code: "PROVIDER_TIMEOUT", message: "Request aborted/timed out" };
  }
  return { code: "UNKNOWN_ERROR", message: "Unexpected error" };
}
