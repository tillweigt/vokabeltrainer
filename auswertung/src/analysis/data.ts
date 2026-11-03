// Sicherungsdateien einlesen und zusammenführen.

import { parseBackup } from "./app-logic";
import { toMs } from "./time";
import type { Backup, Ledger, ProtocolEntry, VocabList } from "./types";

// Speicherschlüssel wie in js/storage.js
const PREFIX = "vokabeltrainer:v1";
const PROTOCOL_KEY = `${PREFIX}:protokoll`;
const STARS_KEY = `${PREFIX}:sterne`;
const historyKey = (listId: string) => `${PREFIX}:${listId}:verlauf`;

export interface LoadedFile {
  name: string;
  backup: Backup;
}

export type ReadResult = { file: LoadedFile } | { name: string; error: string };

export function readBackup(name: string, text: string): ReadResult {
  const { backup, error } = parseBackup(text);
  return backup ? { file: { name, backup } } : { name, error: error ?? "Datei nicht lesbar." };
}

export interface Dataset {
  /** Die geladenen Dateien, älteste zuerst */
  files: { name: string; exportiert: string; entries: number }[];
  /** Protokoll aus allen Dateien, ohne Doppelte, nach Zeit sortiert */
  entries: ProtocolEntry[];
  /** Verlauf laut App aus der neuesten Sicherung: Liste → Vokabel → "RRF" */
  histories: Record<string, Record<string, string>>;
  /** Sternekonto laut App aus der neuesten Sicherung */
  ledger: Ledger | null;
}

/** Doppelte Einträge aus überlappenden Sicherungen erkennt man an diesen Feldern (siehe README). */
export function entryKey(entry: ProtocolEntry): string {
  return JSON.stringify([entry.art, entry.zeit, entry.liste, entry.vokabel]);
}

function isEntry(value: unknown): value is ProtocolEntry {
  const entry = value as ProtocolEntry | null;
  return (
    typeof entry === "object" &&
    entry !== null &&
    typeof entry.art === "string" &&
    typeof entry.zeit === "string" &&
    !Number.isNaN(toMs(entry.zeit))
  );
}

/** Ältere Sicherungen (vor dem Protokoll) haben keins: dann leer. */
function protocolOf(backup: Backup): ProtocolEntry[] {
  const value = backup.daten[PROTOCOL_KEY];
  return Array.isArray(value) ? value.filter(isEntry) : [];
}

function ledgerOf(backup: Backup): Ledger | null {
  const value = backup.daten[STARS_KEY] as Ledger | undefined;
  return value && typeof value.earned === "number" && Array.isArray(value.redemptions) ? value : null;
}

function historiesOf(backup: Backup, listId: string): Record<string, string> {
  const value = backup.daten[historyKey(listId)];
  return typeof value === "object" && value !== null ? (value as Record<string, string>) : {};
}

/** Führt mindestens eine Sicherung zusammen. Verlauf und Sterne kommen aus der neuesten. */
export function mergeBackups(files: LoadedFile[], lists: VocabList[]): Dataset {
  const sorted = [...files].sort((a, b) => a.backup.exportiert.localeCompare(b.backup.exportiert));
  const seen = new Set<string>();
  const entries: ProtocolEntry[] = [];
  for (const { backup } of sorted) {
    for (const entry of protocolOf(backup)) {
      const key = entryKey(entry);
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push(entry);
    }
  }
  entries.sort((a, b) => toMs(a.zeit) - toMs(b.zeit)); // stabil: Gleichzeitiges bleibt in Reihenfolge

  const newest = sorted[sorted.length - 1].backup;
  return {
    files: sorted.map(({ name, backup }) => ({
      name,
      exportiert: backup.exportiert,
      entries: protocolOf(backup).length,
    })),
    entries,
    histories: Object.fromEntries(lists.map((list) => [list.id, historiesOf(newest, list.id)])),
    ledger: ledgerOf(newest),
  };
}
