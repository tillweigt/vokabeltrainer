// Speichert den Lernstand im Browser (localStorage), also pro Gerät, ohne Server.
// Jeder Zugriff ist abgesichert: Fehlt der Speicher oder ist er kaputt,
// läuft die App trotzdem weiter, nur ohne gespeicherten Fortschritt.

import { emptyLedger } from "./logic.js";

const PREFIX = "vokabeltrainer:v1";

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

/** Sternekonto: { earned, redemptions: [{ date, amount }] } */
export function loadStars() {
  const ledger = read(`${PREFIX}:sterne`, null);
  const valid =
    ledger && Number.isInteger(ledger.earned) && Array.isArray(ledger.redemptions);
  return valid ? ledger : emptyLedger();
}

export function saveStars(ledger) {
  write(`${PREFIX}:sterne`, ledger);
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
