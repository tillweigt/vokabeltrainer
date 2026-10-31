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

/**
 * Text für die Sprachausgabe. Dieselbe Bereinigung wie beim Vergleich reicht:
 * Vor allem verschwinden Platzhalter wie „…“, sonst stolpert die Stimme darüber.
 */
export function speechText(text) {
  return normalize(text);
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

/** Lokales Datum mit Uhrzeit als "2026-10-31T18:30" */
export function localIsoDateTime(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${localIsoDate(date)}T${hours}:${minutes}`;
}

/** Ganze Tage von einem Datum zum anderen, z. B. "2026-10-24" → "2026-10-31" = 7 */
export function daysBetween(fromIsoDate, toIsoDate) {
  const toUtc = (isoDate) => {
    const [year, month, day] = isoDate.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUtc(toIsoDate) - toUtc(fromIsoDate)) / 86400000);
}

// ---------- Eltern-Bereich und Datensicherung ----------

export const BACKUP_APP = "vokabeltrainer";
export const BACKUP_VERSION = 1;

/** Ab so vielen Tagen ohne Sicherung wird die Erinnerung orange. */
export const BACKUP_REMINDER_DAYS = 7;

const NOT_A_BACKUP = "Das ist keine Sicherung vom Vokabeltrainer.";

/**
 * Geheimzugang: merkt sich die Zeitpunkte der letzten Tipps.
 * Freigeschaltet, wenn `count` Tipps innerhalb von `windowMs` Millisekunden kamen.
 */
export function registerTap(taps, now, count = 5, windowMs = 3000) {
  const recent = [...taps.filter((time) => now - time < windowMs), now];
  return recent.length >= count ? { taps: [], unlocked: true } : { taps: recent, unlocked: false };
}

/** "vokabeltrainer-2026-10-31-1830.json" */
export function backupFileName(date) {
  const [day, time] = localIsoDateTime(date).split("T");
  return `${BACKUP_APP}-${day}-${time.replace(":", "")}.json`;
}

/** Inhalt der Sicherungsdatei: alle Einträge der App plus Kennung, Version und Zeitpunkt. */
export function buildBackup(entries, date) {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportiert: localIsoDateTime(date),
    daten: entries,
  };
}

/**
 * Liest eine Sicherungsdatei und prüft, ob sie vom Vokabeltrainer stammt.
 * Ergebnis: { backup } wenn alles passt, sonst { error } mit einem Hinweis zum Anzeigen.
 */
export function parseBackup(text) {
  let backup;
  try {
    backup = JSON.parse(text);
  } catch {
    return { error: NOT_A_BACKUP };
  }
  const data = backup?.daten;
  const valid =
    backup?.app === BACKUP_APP &&
    backup.version === BACKUP_VERSION &&
    /^\d{4}-\d{2}-\d{2}/.test(backup.exportiert ?? "") &&
    data !== null &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    Object.keys(data).every((key) => key.startsWith(`${BACKUP_APP}:`));
  return valid ? { backup } : { error: NOT_A_BACKUP };
}

/** "Letzte Sicherung: vor 9 Tagen" (bzw. heute, gestern, noch nie) */
export function lastBackupText(lastIsoDate, todayIsoDate) {
  if (!lastIsoDate) return "Letzte Sicherung: noch nie";
  const days = daysBetween(lastIsoDate, todayIsoDate);
  if (days <= 0) return "Letzte Sicherung: heute";
  if (days === 1) return "Letzte Sicherung: gestern";
  return `Letzte Sicherung: vor ${days} Tagen`;
}

/** Ist eine Sicherung fällig (noch nie oder vor mindestens BACKUP_REMINDER_DAYS Tagen)? */
export function isBackupDue(lastIsoDate, todayIsoDate) {
  return !lastIsoDate || daysBetween(lastIsoDate, todayIsoDate) >= BACKUP_REMINDER_DAYS;
}

// ---------- Antwortprotokoll (für die Auswertung, siehe PLAN.md) ----------

/** Höchstens so viele Einträge bleiben auf dem Gerät, die ältesten fallen weg. */
export const PROTOCOL_LIMIT = 5000;

/** Ab so vielen Einträgen wird die Anzeige im Eltern-Bereich orange. */
export const PROTOCOL_WARNING = 4000;

const MODE_NAMES = { list: "liste", mix: "super" };

// Jeder Eintrag hat immer alle Felder; Unbekanntes ist null.
const EMPTY_ENTRY = {
  art: null,
  zeit: null,
  liste: null,
  vokabel: null,
  frage: null,
  getippt: null,
  richtig: null,
  modus: null,
  sterne: null,
  nachgetragen: false,
};

/** Lokale Zeit mit Sekunden und Zeitzone: "2026-10-31T18:32:05+01:00" */
export function localIsoDateTimeWithZone(date) {
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const offset = -date.getTimezoneOffset(); // Minuten östlich von UTC
  const sign = offset >= 0 ? "+" : "-";
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
  const minutes = String(Math.abs(offset) % 60).padStart(2, "0");
  return `${localIsoDateTime(date)}:${seconds}${sign}${hours}:${minutes}`;
}

/** Eintrag für eine Antwort, `mode` ist "list" oder "mix" */
export function answerEntry(card, typed, correct, mode, stars, date) {
  return {
    ...EMPTY_ENTRY,
    art: "antwort",
    zeit: localIsoDateTimeWithZone(date),
    liste: card.listId,
    vokabel: card.key,
    frage: card.frage,
    getippt: typed,
    richtig: correct,
    modus: MODE_NAMES[mode],
    sterne: stars,
  };
}

/** Eintrag für eine komplett geschaffte Liste (🏆), `bonus` = Bonus-Sterne */
export function roundEntry(listId, bonus, date) {
  return {
    ...EMPTY_ENTRY,
    art: "runde",
    zeit: localIsoDateTimeWithZone(date),
    liste: listId,
    modus: "liste",
    sterne: bonus,
  };
}

/** Eintrag für eingelöste Sterne: `sterne` ist negativ */
export function redemptionEntry(amount, date) {
  return { ...EMPTY_ENTRY, art: "einloesung", zeit: localIsoDateTimeWithZone(date), sterne: -amount };
}

/**
 * Hängt einen Eintrag an. `saved` = wie viele der ältesten Einträge schon in der letzten
 * Sicherung stehen. Fallen über PROTOCOL_LIMIT alte Einträge weg, wird `saved` mitgezählt.
 */
export function appendToProtocol(entries, saved, entry, limit = PROTOCOL_LIMIT) {
  const all = [...entries, entry];
  const dropped = Math.max(0, all.length - limit);
  return { entries: all.slice(dropped), saved: Math.max(0, saved - dropped) };
}

/**
 * Nach einer erfolgreichen Sicherung mit `inBackup` Einträgen: Die ältesten `saved` Einträge
 * standen schon in der vorletzten Sicherung und werden gelöscht. Der Rest der eben
 * gesicherten Einträge zählt ab jetzt als „schon gesichert“ (Überlappung um eine Sicherung).
 */
export function pruneAfterBackup(entries, saved, inBackup) {
  return { entries: entries.slice(saved), saved: Math.max(0, inBackup - saved) };
}

/** "2026-10-31T10:00:00+01:00", "…10:00:01…", …: Zeitpunkte der nachgetragenen Einträge */
function backfillTime(index) {
  const total = 10 * 3600 + index; // ab 10:00:00, sekundenweise
  const pad = (n) => String(n).padStart(2, "0");
  const time = `${pad(Math.floor(total / 3600))}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
  return `2026-10-31T${time}+01:00`;
}

/**
 * Macht einmalig aus dem bisherigen Verlauf (R/F ohne Zeitpunkt) Protokolleinträge.
 * Laut Till wurde vorher nur am 31.10.2026 geübt; die Frage kommt aus der heutigen Liste.
 */
export function backfillProtocol(lists, historyOf) {
  const entries = [];
  for (const list of lists) {
    const questions = Object.fromEntries(buildCards(list).map((card) => [card.key, card.frage]));
    for (const [key, answers] of Object.entries(historyOf(list.id))) {
      for (const answer of answers) {
        entries.push({
          ...EMPTY_ENTRY,
          art: "antwort",
          zeit: backfillTime(entries.length),
          liste: list.id,
          vokabel: key,
          frage: questions[key] ?? null,
          richtig: answer === "R",
          nachgetragen: true,
        });
      }
    }
  }
  return entries;
}

/** "Im Protokoll: 1.234 Einträge" */
export function protocolText(count) {
  return `Im Protokoll: ${count.toLocaleString("de-DE")} ${count === 1 ? "Eintrag" : "Einträge"}`;
}

export function isProtocolNearlyFull(count) {
  return count >= PROTOCOL_WARNING;
}
