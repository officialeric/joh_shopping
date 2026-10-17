import type { Locale } from "@/lib/i18n/config";
import * as sw from "./sw";
import * as en from "./en";

export const dictionaries = { sw, en } satisfies Record<Locale, typeof sw>;
export type Dictionary = typeof sw;
