// Reine Logik ohne Zugriff auf die Seite (DOM).
// Alles hier wird in tests/logic.test.js direkt mit Unit-Tests geprüft.

/** So oft muss eine Karte richtig sein, dann gilt sie in ihrer Liste als geschafft. */
export const MASTERY_TARGET = 3;

/** So viele Karten hat eine Portion der Super-Liste. */
export const PORTION_SIZE = 5;

/** Sterne für die erste richtige Antwort einer Vokabel. */
export const STARS_START = 8;

/** Nach so vielen richtigen Antworten halbiert sich der Sterne-Wert einer Vokabel. */
export const STARS_HALF_LIFE = MASTERY_TARGET;

/** Bonus pro Vokabel, wenn eine Liste komplett geschafft ist (🏆). */
export const ROUND_BONUS_PER_CARD = 1;

/** So viele der letzten Antworten zählen für das Gewicht in der Super-Liste. */
export const RECENT_ANSWERS = 5;

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
 * („I'm …“ und „My name is …“ → „Ich heiße …“). Deshalb zählt jedes Englisch
 * derselben Liste, dessen deutsche Varianten sich mit denen der Frage überschneiden.
 * Die eigene Lösung steht immer an erster Stelle.
 */
export function buildCards(list) {
  return list.items.map((item) => {
    const alternatives = list.items
      .filter((other) => other !== item && other.de.some((de) => item.de.includes(de)))
      .map((other) => other.en);
    return {
      listId: list.id,
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

// ---------- Einzelne Liste: 3× richtig ----------

export function isMastered(progress, key) {
  return (progress[key] ?? 0) >= MASTERY_TARGET;
}

export function countMastered(cards, progress) {
  return cards.filter((card) => isMastered(progress, card.key)).length;
}

/**
 * Wie viele Karten haben 0, 1, 2, … MASTERY_TARGET Treffer?
 * Der Index im Ergebnis ist die Anzahl der Treffer.
 */
export function countByHits(cards, progress) {
  const counts = new Array(MASTERY_TARGET + 1).fill(0);
  for (const card of cards) {
    counts[Math.min(progress[card.key] ?? 0, MASTERY_TARGET)]++;
  }
  return counts;
}

/**
 * Ein Durchgang: alle noch nicht geschafften Karten, gemischt.
 * Jede Karte kommt genau einmal, egal ob sie richtig oder falsch beantwortet wird.
 */
export function startRound(cards, progress, random = Math.random) {
  return shuffle(
    cards.filter((card) => !isMastered(progress, card.key)),
    random,
  );
}

/** Zählt eine richtige Antwort im Fortschritt der Liste. Ein Fehler setzt nichts zurück. */
export function recordAnswer(progress, card, correct) {
  if (!correct) return progress;
  return { ...progress, [card.key]: (progress[card.key] ?? 0) + 1 };
}

// ---------- Verlauf und Super-Liste ----------

/** Hängt eine Antwort an den Verlauf an: "R" für richtig, "F" für falsch. */
export function appendHistory(history, key, correct) {
  return { ...history, [key]: (history[key] ?? "") + (correct ? "R" : "F") };
}

/**
 * Gewicht einer Vokabel für die Super-Liste: geglättete Fehlerquote der
 * letzten RECENT_ANSWERS Antworten, (Fehler + 1) / (Antworten + 2).
 * Nie gefragt → 1/2, nur richtig → klein, aber nie 0.
 */
export function weight(history = "") {
  const recent = history.slice(-RECENT_ANSWERS);
  const errors = [...recent].filter((answer) => answer === "F").length;
  return (errors + 1) / (recent.length + 2);
}

/**
 * Zieht bis zu `size` verschiedene Karten. Jede Karte wird mit einer
 * Wahrscheinlichkeit proportional zu ihrem Gewicht gezogen (ohne Zurücklegen).
 */
export function drawPortion(cards, weightOf, size = PORTION_SIZE, random = Math.random) {
  const pool = cards.map((card) => ({ card, weight: weightOf(card) }));
  const portion = [];
  while (portion.length < size && pool.length > 0) {
    const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let target = random() * total;
    let index = pool.findIndex((entry) => (target -= entry.weight) < 0);
    if (index === -1) index = pool.length - 1; // nur bei Rundungsfehlern
    portion.push(pool.splice(index, 1)[0].card);
  }
  return portion;
}

/** Merkt sich eine Karte als { listId, key }, damit eine Portion gespeichert werden kann. */
export function cardRef(card) {
  return { listId: card.listId, key: card.key };
}

/**
 * Holt gespeicherte Karten wieder aus den aktuellen Karten, in derselben Reihenfolge.
 * Vokabeln, die es nach einem Update nicht mehr gibt, werden übersprungen.
 */
export function restoreQueue(refs, cards) {
  return refs
    .map((ref) => cards.find((card) => card.listId === ref.listId && card.key === ref.key))
    .filter((card) => card !== undefined);
}

// ---------- Sterne ----------

/**
 * Sterne für die nächste richtige Antwort: ⌈8 · 2^(−k/3)⌉, k = bisher richtige Antworten.
 * Alle 3 richtigen Antworten halbiert sich der Wert; durch das Aufrunden bleibt er
 * mindestens 1. Fehler zählen nicht mit, deshalb lässt sich das nicht austricksen.
 */
export function starsFor(history = "") {
  const k = [...history].filter((answer) => answer === "R").length;
  const value = Math.ceil(STARS_START * 2 ** (-k / STARS_HALF_LIFE));
  return Math.max(1, value); // nur Absicherung, falls 2^(−k/3) bei riesigem k auf 0 rundet
}

/** 🏆-Bonus für eine komplett geschaffte Liste. */
export function roundBonus(cardCount) {
  return cardCount * ROUND_BONUS_PER_CARD;
}

/** Leeres Sternekonto: verdient insgesamt und alle Einlösungen. */
export function emptyLedger() {
  return { earned: 0, redemptions: [] };
}

export function balance(ledger) {
  return ledger.earned - ledger.redemptions.reduce((sum, r) => sum + r.amount, 0);
}

export function addStars(ledger, stars) {
  return { ...ledger, earned: ledger.earned + stars };
}

export function redeem(ledger, amount, date) {
  return { ...ledger, redemptions: [...ledger.redemptions, { date, amount }] };
}

/** Die letzten Einlösungen, neueste zuerst. */
export function lastRedemptions(ledger, count = 3) {
  return ledger.redemptions.slice(-count).reverse();
}

/**
 * Prüft die Eingabe im Einlöse-Feld.
 * Ergebnis: { amount } wenn alles passt, sonst { error } mit einem Hinweis zum Anzeigen.
 */
export function parseRedemption(text, available) {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return { error: "Bitte eine ganze Zahl eingeben." };
  const amount = Number(trimmed);
  if (amount < 1) return { error: "Bitte mindestens 1 Stern eingeben." };
  if (amount > available) {
    return { error: `So viele Sterne hast du nicht (Kontostand: ${available}).` };
  }
  return { amount };
}

// ---------- Datum ----------

/** Lokales Datum als "2026-10-30" (toISOString würde in UTC umrechnen). */
export function localIsoDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** "2026-10-05" → "5.10." */
export function formatShortDate(isoDate) {
  const [, month, day] = isoDate.split("-");
  return `${Number(day)}.${Number(month)}.`;
}
