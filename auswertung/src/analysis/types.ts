// Datenformate der App, siehe PLAN.md („Antwortprotokoll“) und lists/.

export interface VocabItem {
  en: string;
  de: string[];
}

export interface VocabList {
  id: string;
  titel: string;
  fach: string;
  typ: string;
  durchlauf?: number;
  items: VocabItem[];
}

/** Eine Karte wie in der App: Frage auf Deutsch, erlaubte Antworten auf Englisch. */
export interface Card {
  listId: string;
  key: string;
  frage: string;
  antworten: string[];
}

/** Ein Eintrag im Antwortprotokoll. Alle Felder sind immer da, Unbekanntes ist null. */
export interface ProtocolEntry {
  art: "antwort" | "runde" | "einloesung";
  zeit: string;
  liste: string | null;
  vokabel: string | null;
  frage: string | null;
  getippt: string | null;
  richtig: boolean | null;
  modus: "liste" | "super" | null;
  sterne: number | null;
  nachgetragen: boolean;
}

export interface Backup {
  app: string;
  version: number;
  exportiert: string;
  daten: Record<string, unknown>;
}

/** Sternekonto der App: verdient insgesamt und alle Einlösungen. */
export interface Ledger {
  earned: number;
  redemptions: { date: string; amount: number }[];
}
