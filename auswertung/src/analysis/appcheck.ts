// App überprüfen: Bedeutet „sitzt“ wirklich gelernt? Fragt die Super-Liste die schweren
// Vokabeln wirklich öfter?

import { emptyCounts, LEVELS, levelOf, type Level } from "./mastery";
import { after, type Replay } from "./replay";
import type { Vocab } from "./vocab";

export interface MasteryPaths {
  /** Vokabeln mit mindestens einer Antwort */
  asked: number;
  /** davon schon einmal „sitzt“ */
  reached: number;
  /** pro erreichter Vokabel: so viele Antworten bis zum ersten „sitzt“ */
  answersUntil: number[];
  /** erreichte Vokabeln, die danach wieder falsch beantwortet wurden */
  relapses: number;
}

export function masteryPaths(vocab: Vocab[], played: Replay): MasteryPaths {
  const result: MasteryPaths = { asked: 0, reached: 0, answersUntil: [], relapses: 0 };
  for (const v of vocab) {
    const history = played.histories.get(v.id) ?? "";
    if (history === "") continue;
    result.asked++;
    for (let count = 1; count <= history.length; count++) {
      if (levelOf(history.slice(0, count)) !== "sitzt") continue;
      result.reached++;
      result.answersUntil.push(count);
      if (history.slice(count).includes("F")) result.relapses++;
      break;
    }
  }
  return result;
}

export interface SelectionFactor {
  level: Level;
  /** so oft kam in der Super-Liste eine Vokabel dieser Stufe dran */
  asked: number;
  /** so oft wäre es bei rein zufälliger Auswahl gewesen */
  expected: number;
}

/**
 * Vergleicht die Auswahl der Super-Liste mit reinem Zufall. Für jede Antwort aus der
 * Super-Liste zählt die Stufe der Vokabel davor; erwartet wird jede Stufe mit ihrem Anteil
 * an allen Vokabeln in diesem Moment. Faktor über 1 = öfter als Zufall.
 */
export function selectionFactors(vocab: Vocab[], played: Replay): SelectionFactor[] {
  const levels = new Map<string, Level>(vocab.map((v) => [v.id, "nie"]));
  const counts = { ...emptyCounts(), nie: vocab.length };
  const asked = emptyCounts();
  const expected = emptyCounts();
  for (const answer of played.answers) {
    const current = levels.get(answer.id);
    if (current === undefined) continue; // nicht in diesem Bereich
    if (answer.entry.modus === "super" && !answer.entry.nachgetragen) {
      asked[current]++;
      for (const level of LEVELS) expected[level] += counts[level] / vocab.length;
    }
    const next = levelOf(after(answer));
    counts[current]--;
    counts[next]++;
    levels.set(answer.id, next);
  }
  return LEVELS.map((level) => ({ level, asked: asked[level], expected: expected[level] }));
}
