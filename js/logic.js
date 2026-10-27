// Reine Logik ohne Zugriff auf die Seite (DOM).
// Alles hier lässt sich später direkt mit Unit-Tests prüfen.

/** So oft muss eine Karte beim ersten Versuch richtig sein, dann gilt sie als geschafft. */
export const MASTERY_TARGET = 3;

/** Eine falsch beantwortete Karte kommt nach so vielen anderen Karten wieder. */
export const REPEAT_GAP = 3;

/**
 * Macht eine Antwort vergleichbar. Bewusst streng: Groß-/Kleinschreibung und
 * Satzzeichen zählen. Ausgeglichen wird nur, was man nicht sieht oder was das
 * iPhone selbst verändert.
 */
export function normalize(text) {
  return text
    .normalize("NFC")
    .replace(/[’‘ʼ´`]/g, "'") // das iPhone macht aus ' automatisch ’
    .replace(/[„“”]/g, '"')
    .replace(/…|\.\.\./g, "") // Platzhalter wie in „I'm …“
    .replace(/\s+/g, " ")
    .replace(/ ([?!.,;:])/g, "$1") // „in …?“ wird zu „in?“
    .trim();
}

/** Ist die Eingabe eine der erlaubten Antworten? */
export function isCorrect(input, answers) {
  const given = normalize(input);
  return given !== "" && answers.some((answer) => normalize(answer) === given);
}

/**
 * Macht aus einer Vokabelliste Karten für die Richtung Deutsch → Englisch.
 *
 * Mehrere englische Einträge können dieselbe deutsche Bedeutung haben
 * („I'm …“ und „My name is …“ → „Ich heiße …“). Deshalb zählt jedes Englisch,
 * dessen deutsche Varianten sich mit denen der Frage überschneiden.
 * Die eigene Lösung steht immer an erster Stelle.
 */
export function buildCards(list) {
  return list.items.map((item) => {
    const alternatives = list.items
      .filter((other) => other !== item && other.de.some((de) => item.de.includes(de)))
      .map((other) => other.en);
    return {
      key: item.en,
      frage: item.de.join(" / "),
      antworten: [item.en, ...alternatives],
    };
  });
}

/** Gibt eine gemischte Kopie zurück (Fisher-Yates). */
export function shuffle(array, random = Math.random) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function isMastered(progress, key) {
  return (progress[key] ?? 0) >= MASTERY_TARGET;
}

export function countMastered(cards, progress) {
  return cards.filter((card) => isMastered(progress, card.key)).length;
}

/**
 * Ein Durchgang: alle noch nicht geschafften Karten, gemischt.
 * Jeder Eintrag merkt sich, ob es noch der erste Versuch ist.
 */
export function startRound(cards, progress, random = Math.random) {
  const open = cards.filter((card) => !isMastered(progress, card.key));
  return shuffle(open, random).map((card) => ({ card, firstTry: true }));
}

/**
 * Nimmt die vorderste Karte aus der Warteschlange. Bei einer falschen Antwort
 * kommt sie REPEAT_GAP Karten später wieder (oder ans Ende, wenn weniger übrig sind).
 */
export function advanceQueue(queue, correct) {
  const [current, ...rest] = queue;
  if (correct) return rest;
  const position = Math.min(REPEAT_GAP, rest.length);
  return [...rest.slice(0, position), { ...current, firstTry: false }, ...rest.slice(position)];
}

/**
 * Zählt eine Antwort im Fortschritt. Nur ein richtiger erster Versuch zählt;
 * ein Fehler setzt nichts zurück.
 */
export function recordAnswer(progress, entry, correct) {
  if (!correct || !entry.firstTry) return progress;
  const key = entry.card.key;
  return { ...progress, [key]: (progress[key] ?? 0) + 1 };
}
