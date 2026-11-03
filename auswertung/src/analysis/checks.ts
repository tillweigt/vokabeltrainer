// Datenprüfung: Passt das zusammengeführte Protokoll zum Stand der App?
// Fehlt eine Sicherungsdatei, hat das Protokoll eine Lücke (die App löscht nach jeder
// Sicherung die schon gesicherten Einträge). Dann weichen Verlauf oder Sterne ab.

import { balance } from "./app-logic";
import type { Dataset } from "./data";
import type { Replay } from "./replay";
import { vocabId } from "./vocab";

export interface HistoryMismatch {
  listId: string;
  key: string;
  protocol: string;
  app: string;
}

export interface DataCheck {
  /** Vokabeln, deren nachgespielter Verlauf nicht dem Verlauf der App entspricht */
  mismatches: HistoryMismatch[];
  /** Summe aller Sterne im Protokoll */
  starsProtocol: number;
  /** davon für nachgetragene Antworten nachgerechnet */
  starsReconstructed: number;
  /** Kontostand laut App (neueste Sicherung) */
  starsApp: number | null;
}

export function checkData(dataset: Dataset, played: Replay): DataCheck {
  const mismatches: HistoryMismatch[] = [];
  for (const [listId, appHistories] of Object.entries(dataset.histories)) {
    const prefix = vocabId(listId, "");
    const playedKeys = [...played.histories.keys()]
      .filter((id) => id.startsWith(prefix))
      .map((id) => id.slice(prefix.length));
    for (const key of new Set([...Object.keys(appHistories), ...playedKeys])) {
      const app = appHistories[key] ?? "";
      const protocol = played.histories.get(vocabId(listId, key)) ?? "";
      if (app !== protocol) mismatches.push({ listId, key, protocol, app });
    }
  }

  const answerStars = played.answers.reduce((sum, answer) => sum + answer.stars, 0);
  const otherStars = dataset.entries
    .filter((entry) => entry.art !== "antwort")
    .reduce((sum, entry) => sum + (entry.sterne ?? 0), 0);
  return {
    mismatches,
    starsProtocol: answerStars + otherStars,
    starsReconstructed: played.answers
      .filter((answer) => answer.entry.sterne === null)
      .reduce((sum, answer) => sum + answer.stars, 0),
    starsApp: dataset.ledger ? balance(dataset.ledger) : null,
  };
}

export const isConsistent = (check: DataCheck): boolean =>
  check.mismatches.length === 0 && check.starsApp === check.starsProtocol;
