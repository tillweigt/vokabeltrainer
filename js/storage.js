// Speichert den Lernstand im Browser (localStorage), also pro Gerät, ohne Server.
// Jeder Zugriff ist abgesichert: Fehlt der Speicher oder ist er kaputt,
// läuft die App trotzdem weiter, nur ohne gespeicherten Fortschritt.

import { emptyLedger } from "./logic.js";

const PREFIX = "vokabeltrainer:v1";
const STARS_KEY = `${PREFIX}:sterne`;

// Gehört zum Gerät, nicht zum Lernstand: wird weder gesichert noch beim Wiederherstellen ersetzt.
const LAST_BACKUP_KEY = `${PREFIX}:letzte-sicherung`;

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`${key} konnte nicht gespeichert werden:`, error);
  }
}

// Wird „durchlauf“ in der Listendatei erhöht, entsteht ein neuer Schlüssel:
// Punkte und Runden dieser Liste beginnen wieder bei null.
function roundKey(list) {
  return `${PREFIX}:${list.id}:${list.durchlauf ?? 1}`;
}

// Der Verlauf hängt bewusst nicht an „durchlauf“ und bleibt beim Zurücksetzen erhalten.
function historyKey(listId) {
  return `${PREFIX}:${listId}:verlauf`;
}

/** Punkte einer Liste: { "<englisch>": anzahlRichtig, ... } */
export function loadProgress(list) {
  return read(roundKey(list), {});
}

export function saveProgress(list, progress) {
  write(roundKey(list), progress);
}

/** Wie oft die Liste schon komplett geschafft wurde (alle Vokabeln 3×). */
export function loadRounds(list) {
  const rounds = read(`${roundKey(list)}:runden`, 0);
  return Number.isInteger(rounds) && rounds > 0 ? rounds : 0;
}

export function saveRounds(list, rounds) {
  write(`${roundKey(list)}:runden`, rounds);
}

/** Verlauf aller Vokabeln einer Liste: { "<englisch>": "RRFR", ... } */
export function loadHistory(listId) {
  return read(historyKey(listId), {});
}

export function saveHistory(listId, history) {
  write(historyKey(listId), history);
}

function validLedger(ledger) {
  const valid =
    ledger && Number.isInteger(ledger.earned) && Array.isArray(ledger.redemptions);
  return valid ? ledger : emptyLedger();
}

/** Sternekonto: { earned, redemptions: [{ date, amount }] } */
export function loadStars() {
  return validLedger(read(STARS_KEY, null));
}

export function saveStars(ledger) {
  write(STARS_KEY, ledger);
}

/** Angefangene Portion der Super-Liste: { refs, answered, correct, stars } oder null */
export function loadPortion() {
  return read(`${PREFIX}:portion`, null);
}

export function savePortion(portion) {
  write(`${PREFIX}:portion`, portion);
}

export function clearPortion() {
  try {
    localStorage.removeItem(`${PREFIX}:portion`);
  } catch (error) {
    console.warn("Portion konnte nicht gelöscht werden:", error);
  }
}

// ---------- Datensicherung ----------

/** Alle Schlüssel des Lernstands (ohne das Datum der letzten Sicherung) */
function appKeys() {
  const keys = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${PREFIX}:`) && key !== LAST_BACKUP_KEY) keys.push(key);
    }
  } catch (error) {
    console.warn("Speicher konnte nicht gelesen werden:", error);
  }
  return keys;
}

/** Der ganze Lernstand als { "<schlüssel>": wert, ... } für die Sicherungsdatei */
export function exportEntries() {
  return Object.fromEntries(appKeys().map((key) => [key, read(key, null)]));
}

/** Ersetzt den ganzen Lernstand durch die Einträge einer Sicherung. */
export function replaceAllEntries(entries) {
  try {
    for (const key of appKeys()) localStorage.removeItem(key);
  } catch (error) {
    console.warn("Alter Stand konnte nicht gelöscht werden:", error);
  }
  for (const [key, value] of Object.entries(entries)) {
    if (key.startsWith(`${PREFIX}:`) && key !== LAST_BACKUP_KEY) write(key, value);
  }
}

/** Sternekonto aus den Einträgen einer Sicherung (für den Vergleich vor dem Einspielen) */
export function ledgerFromEntries(entries) {
  return validLedger(entries[STARS_KEY]);
}

/** Datum der letzten Sicherung auf diesem Gerät, z. B. "2026-10-31", oder null */
export function loadLastBackup() {
  return read(LAST_BACKUP_KEY, null);
}

export function saveLastBackup(isoDate) {
  write(LAST_BACKUP_KEY, isoDate);
}
