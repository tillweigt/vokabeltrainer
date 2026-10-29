// Speichert den Lernstand im Browser (localStorage), also pro Gerät, ohne Server.
// Jeder Zugriff ist abgesichert: Fehlt der Speicher oder ist er kaputt,
// läuft die App trotzdem weiter, nur ohne gespeicherten Fortschritt.

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
