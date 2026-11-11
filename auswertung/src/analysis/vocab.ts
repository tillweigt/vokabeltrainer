// Alle Vokabeln der aktuellen Listen und die Bereiche, für die ausgewertet wird.

import { buildCards } from "./app-logic";
import type { Card, VocabItem, VocabList } from "./types";

/** Die Super-Liste mischt alle Listen dieses Fachs (wie in js/app.js). */
export const MIX_SUBJECT = "Englisch";

/** Eindeutige Kennung einer Vokabel über alle Listen hinweg */
export const vocabId = (listId: string, key: string): string => `${listId}|${key}`;

export interface Vocab {
  id: string;
  list: VocabList;
  /** der Eintrag aus der Listendatei, z. B. für die Varianten in `auch` */
  item: VocabItem;
  card: Card;
}

/** Alle Vokabeln; erlaubt sind wie in der App auch Lösungen aus anderen Listen desselben Fachs. */
export function catalog(lists: VocabList[]): Vocab[] {
  return lists.flatMap((list) =>
    // buildCards macht aus jedem Item genau eine Karte, in derselben Reihenfolge
    buildCards(list, lists).map((card, index) => ({
      id: vocabId(list.id, card.key),
      list,
      item: list.items[index],
      card,
    })),
  );
}

/** Ein Bereich der Auswertung: die Super-Liste oder eine einzelne Liste */
export interface Scope {
  id: string;
  label: string;
  vocab: Vocab[];
}

export const MIX_SCOPE_ID = "alle";

/** Zuerst die Super-Liste, dann jede Liste einzeln, wie auf der Startseite der App. */
export function scopes(lists: VocabList[], vocab: Vocab[]): Scope[] {
  return [
    {
      id: MIX_SCOPE_ID,
      label: `Alle ${MIX_SUBJECT}-Vokabeln`,
      vocab: vocab.filter((v) => v.list.fach === MIX_SUBJECT),
    },
    ...lists.map((list) => ({
      id: list.id,
      label: list.titel,
      vocab: vocab.filter((v) => v.list === list),
    })),
  ];
}
