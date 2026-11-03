// Können pro Vokabel: geschätzte Trefferwahrscheinlichkeit aus den letzten Antworten.
//
// (R + 1) / (n + 2) über die letzten RECENT_ANSWERS Antworten, also genau 1 − Gewicht der
// Super-Liste. Die Glättung behandelt unterschiedlich oft gefragte Vokabeln fair: Wenige
// Antworten bleiben nahe 50 %, erst viele Antworten in dieselbe Richtung führen an die Ränder.

import { daysBetween, RECENT_ANSWERS } from "./app-logic";
import { after, type Replay, type ReplayedAnswer } from "./replay";
import { dateOf, dateRange } from "./time";
import type { Scope, Vocab } from "./vocab";

export type Level = "nochNicht" | "wackelt" | "meistens" | "sitzt" | "nie";

/** Reihenfolge in Diagrammen: von schlecht nach gut, „nie gefragt“ zum Schluss */
export const LEVELS: Level[] = ["nochNicht", "wackelt", "meistens", "sitzt", "nie"];

export const LEVEL_LABELS: Record<Level, string> = {
  nochNicht: "noch nicht",
  wackelt: "wackelt",
  meistens: "meistens",
  sitzt: "sitzt",
  nie: "nie gefragt",
};

export const LEVEL_RANGES: Record<Level, string> = {
  nochNicht: "unter 40 %",
  wackelt: "40–60 %",
  meistens: "60–80 %",
  sitzt: "ab 80 %",
  nie: "",
};

export type LevelCounts = Record<Level, number>;

export const emptyCounts = (): LevelCounts => ({ nochNicht: 0, wackelt: 0, meistens: 0, sitzt: 0, nie: 0 });

function recent(history: string): { right: number; count: number } {
  const answers = [...history.slice(-RECENT_ANSWERS)];
  return { right: answers.filter((answer) => answer === "R").length, count: answers.length };
}

/** Geschätzte Trefferwahrscheinlichkeit, null = nie gefragt */
export function estimate(history: string): number | null {
  const { right, count } = recent(history);
  return count === 0 ? null : (right + 1) / (count + 2);
}

/**
 * Stufe einer Vokabel. Ganzzahlig gerechnet, damit Grenzfälle wie RRR = 4/5 = 80 % nicht an
 * Rundungsfehlern scheitern: Schätzung ≥ k/5 ⇔ 5 · (R + 1) ≥ k · (n + 2).
 */
export function levelOf(history: string): Level {
  const { right, count } = recent(history);
  if (count === 0) return "nie";
  const scaled = 5 * (right + 1);
  if (scaled >= 4 * (count + 2)) return "sitzt";
  if (scaled >= 3 * (count + 2)) return "meistens";
  if (scaled >= 2 * (count + 2)) return "wackelt";
  return "nochNicht";
}

export function countLevels(vocab: Vocab[], historyOf: (id: string) => string): LevelCounts {
  const counts = emptyCounts();
  for (const v of vocab) counts[levelOf(historyOf(v.id))]++;
  return counts;
}

export interface Distribution {
  scope: Scope;
  counts: LevelCounts;
}

export function distributions(scopes: Scope[], played: Replay): Distribution[] {
  return scopes.map((scope) => ({
    scope,
    counts: countLevels(scope.vocab, (id) => played.histories.get(id) ?? ""),
  }));
}

export interface LevelDay {
  date: string;
  counts: LevelCounts;
}

/** Stufen am Ende jedes Tages von `from` bis `to`, für den Zeitverlauf */
export function levelsOverTime(scope: Scope, answers: ReplayedAnswer[], from: string, to: string): LevelDay[] {
  const histories = new Map<string, string>();
  let next = 0;
  return dateRange(from, to).map((date) => {
    while (next < answers.length && dateOf(answers[next].entry.zeit) <= date) {
      const answer = answers[next++];
      histories.set(answer.id, after(answer));
    }
    return { date, counts: countLevels(scope.vocab, (id) => histories.get(id) ?? "") };
  });
}

export interface VocabRow {
  vocab: Vocab;
  history: string;
  estimate: number | null;
  level: Level;
  /** Datum der letzten Antwort und wie viele Tage das vor `today` war */
  lastAsked: string | null;
  daysAgo: number | null;
}

export function vocabRows(vocab: Vocab[], played: Replay, today: string): VocabRow[] {
  const lastAsked = new Map<string, string>();
  for (const answer of played.answers) lastAsked.set(answer.id, dateOf(answer.entry.zeit));
  return vocab.map((v) => {
    const history = played.histories.get(v.id) ?? "";
    const last = lastAsked.get(v.id) ?? null;
    return {
      vocab: v,
      history,
      estimate: estimate(history),
      level: levelOf(history),
      lastAsked: last,
      daysAgo: last === null ? null : daysBetween(last, today),
    };
  });
}
