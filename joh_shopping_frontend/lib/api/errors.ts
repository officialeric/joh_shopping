import type { Dictionary } from "@/dictionaries";
import { ApiError } from "./core";

type ApiErrorKey = keyof Dictionary["common"]["apiErrors"];

/**
 * A translated message for any error from the API. Known codes (e.g.
 * "out_of_stock", "imei_taken:3567…") map to dictionary text; other
 * validation messages come through as sent; everything else is generic.
 */
export function apiErrorMessage(error: unknown, t: Dictionary): string {
  const messages = t.common.apiErrors;
  if (!(error instanceof ApiError)) return messages.generic;
  if (error.status === 429) return messages.too_many;
  if (error.status === 503) return messages.maintenance;
  if (error.status === 403 && error.message === "forbidden") return messages.forbidden;
  const code = error.code.split(":")[0] as ApiErrorKey;
  if (code in messages) return messages[code];
  return error.status === 422 && error.code ? error.code : messages.generic;
}

/** Field → translated message, for forms (first error per field). */
export function apiFieldErrors(error: unknown, t: Dictionary): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  const messages = t.common.apiErrors;
  return Object.fromEntries(
    Object.entries(error.errors).map(([field, list]) => {
      const code = (list[0] ?? "").split(":")[0] as ApiErrorKey;
      return [field, code in messages ? messages[code] : (list[0] ?? messages.generic)];
    }),
  );
}
