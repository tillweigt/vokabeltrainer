// Zahlen und Daten auf Deutsch anzeigen.

import type { ErrorKind } from "./analysis/errors";
import type { Level } from "./analysis/mastery";

export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export const formatPercent = (value: number | null): string =>
  value === null ? "–" : `${formatNumber(value * 100)} %`;

/** 420 → "7 Min", 3900 → "1 Std 5 Min" */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return "unter 1 Min";
  if (minutes < 60) return `${minutes} Min`;
  return `${Math.floor(minutes / 60)} Std ${minutes % 60} Min`;
}

/** "2026-11-02" → "2.11.2026" */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${Number(day)}.${Number(month)}.${year}`;
}

/** "2026-11-02T16:39" → "2.11.2026, 16:39" */
export const formatDateTime = (local: string): string => `${formatDate(local.slice(0, 10))}, ${local.slice(11, 16)}`;

/** "Unit 1 – It's fun at home" → "Unit 1" */
export const shortTitle = (titel: string): string => titel.split(" – ")[0];

export function formatDaysAgo(days: number | null): string {
  if (days === null) return "–";
  if (days <= 0) return "heute";
  if (days === 1) return "gestern";
  return `vor ${days} Tagen`;
}

export const LEVEL_COLORS: Record<Level, string> = {
  nochNicht: "#c62828",
  wackelt: "#ef8f00",
  meistens: "#9ccc65",
  sitzt: "#2e7d32",
  nie: "#d2d2d7",
};

export const ERROR_COLORS: Record<ErrorKind, string> = {
  jetztRichtig: "#66bb6a",
  kleinigkeit: "#9cc3ea",
  kurzform: "#6aa6de",
  to: "#3d85c6",
  verwechslung: "#8e6cc8",
  tippfehler: "#ef8f00",
  falsch: "#c62828",
};

export const ACCENT = "#0a66c2";
export const STAR = "#d99a00";
export const BAD = "#c62828";
