// Speichert den Lernstand im Browser (localStorage), also pro Gerät, ohne Server.
// Jeder Zugriff ist abgesichert: Fehlt der Speicher oder ist er kaputt,
// läuft die App trotzdem weiter, nur ohne gespeicherten Fortschritt.

const PREFIX = "vokabeltrainer:v1";

// Wird „durchlauf“ in der Listendatei erhöht, entsteht ein neuer Schlüssel
// und der Fortschritt dieser Liste beginnt wieder bei null.
function storageKey(list) {
  return `${PREFIX}:${list.id}:${list.durchlauf ?? 1}`;
}

/** Fortschritt einer Liste: { "<englisch>": anzahlRichtig, ... } */
export function loadProgress(list) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(list))) ?? {};
  } catch {
    return {};
  }
}

export function saveProgress(list, progress) {
  try {
    localStorage.setItem(storageKey(list), JSON.stringify(progress));
  } catch (error) {
    console.warn("Fortschritt konnte nicht gespeichert werden:", error);
  }
}
