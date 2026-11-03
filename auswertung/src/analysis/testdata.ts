// Erfundene Testdaten für die Unit-Tests. Bewusst unabhängig von den echten Listen.

import type { Backup, ProtocolEntry, VocabList } from "./types";

export const LIST_A: VocabList = {
  id: "test-a",
  titel: "Liste A",
  fach: "Englisch",
  typ: "vokabel",
  items: [
    { en: "Here's your ball.", de: ["Hier ist dein Ball."] },
    { en: "to live", de: ["wohnen", "leben"] },
    { en: "friend", de: ["Freund", "Freundin"] },
    { en: "cupboard", de: ["Küchenschrank", "Schrank"] },
    { en: "wardrobe", de: ["Kleiderschrank"] },
    { en: "he", de: ["er"] },
  ],
};

export const LIST_B: VocabList = {
  id: "test-b",
  titel: "Liste B",
  fach: "Englisch",
  typ: "vokabel",
  items: [
    { en: "bed", de: ["Bett"] },
    { en: "bad", de: ["schlecht"] },
    { en: "I'm …", de: ["Ich heiße …", "Ich bin …"] },
    { en: "My name is …", de: ["Ich heiße …"] },
  ],
};

export const LISTS = [LIST_A, LIST_B];

const EMPTY: ProtocolEntry = {
  art: "antwort",
  zeit: "",
  liste: null,
  vokabel: null,
  frage: null,
  getippt: null,
  richtig: null,
  modus: null,
  sterne: null,
  nachgetragen: false,
};

/** "2026-11-01 11:00:25" → Zeitpunkt wie im Protokoll, Winterzeit */
export const zeit = (local: string): string => `${local.replace(" ", "T")}+01:00`;

/** Eine echte Antwort aus der Super-Liste; getippt ist die Lösung bzw. "x", Abweichendes über `extra` */
export function answer(
  local: string,
  liste: string,
  vokabel: string,
  richtig: boolean,
  extra: Partial<ProtocolEntry> = {},
): ProtocolEntry {
  return {
    ...EMPTY,
    zeit: zeit(local),
    liste,
    vokabel,
    getippt: richtig ? vokabel : "x",
    richtig,
    modus: "super",
    sterne: richtig ? 1 : 0,
    ...extra,
  };
}

/** Eine nachgetragene Antwort (ohne getippt, Modus und Sterne) */
export function backfilled(local: string, liste: string, vokabel: string, richtig: boolean): ProtocolEntry {
  return { ...EMPTY, zeit: zeit(local), liste, vokabel, richtig, nachgetragen: true };
}

export function round(local: string, liste: string, sterne: number): ProtocolEntry {
  return { ...EMPTY, art: "runde", zeit: zeit(local), liste, modus: "liste", sterne };
}

export function redemption(local: string, amount: number): ProtocolEntry {
  return { ...EMPTY, art: "einloesung", zeit: zeit(local), sterne: -amount };
}

export function backup(exportiert: string, daten: Record<string, unknown>): Backup {
  return { app: "vokabeltrainer", version: 1, exportiert, daten };
}

/** Kleiner Zufallsgenerator mit festem Startwert (mulberry32), damit Tests immer gleich laufen */
export function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
