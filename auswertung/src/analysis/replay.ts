// Spielt das Protokoll Antwort für Antwort nach, so wie die App ihren Verlauf aufbaut.

import { starsFor } from "./app-logic";
import type { ProtocolEntry } from "./types";
import { vocabId } from "./vocab";

export interface ReplayedAnswer {
  entry: ProtocolEntry;
  id: string;
  listId: string;
  key: string;
  /** Verlauf dieser Vokabel vor der Antwort, z. B. "RRF" */
  before: string;
  /** Sterne der Antwort; bei nachgetragenen Einträgen mit der Formel der App nachgerechnet */
  stars: number;
}

export interface Replay {
  answers: ReplayedAnswer[];
  /** Verlauf jeder Vokabel nach allen Antworten */
  histories: Map<string, string>;
}

export const after = (answer: ReplayedAnswer): string =>
  answer.before + (answer.entry.richtig ? "R" : "F");

export function replay(entries: ProtocolEntry[]): Replay {
  const histories = new Map<string, string>();
  const answers: ReplayedAnswer[] = [];
  for (const entry of entries) {
    if (entry.art !== "antwort" || entry.liste === null || entry.vokabel === null) continue;
    const id = vocabId(entry.liste, entry.vokabel);
    const before = histories.get(id) ?? "";
    const stars = entry.sterne ?? (entry.richtig ? starsFor(before) : 0);
    const answer = { entry, id, listId: entry.liste, key: entry.vokabel, before, stars };
    answers.push(answer);
    histories.set(id, after(answer));
  }
  return { answers, histories };
}
