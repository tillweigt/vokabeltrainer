// Fehlerarten: Woran lag eine falsche Antwort? Die App bleibt streng; die Einordnung hilft
// nur zu sehen, ob eine Vokabel eine weitere Lösung oder eine klarere Frage braucht.
// Alles mit festen Regeln, ohne KI: Das Ergebnis ist immer gleich und lässt sich testen.

import { isCorrect, normalize } from "./app-logic";
import type { Replay, ReplayedAnswer } from "./replay";
import type { Card } from "./types";
import type { Vocab } from "./vocab";

export type ErrorKind =
  | "jetztRichtig"
  | "kleinigkeit"
  | "kurzform"
  | "to"
  | "verwechslung"
  | "tippfehler"
  | "falsch";

/** In dieser Reihenfolge wird geprüft; die erste passende Stufe gewinnt. */
export const ERROR_KINDS: ErrorKind[] = [
  "jetztRichtig",
  "kleinigkeit",
  "kurzform",
  "to",
  "verwechslung",
  "tippfehler",
  "falsch",
];

export const ERROR_LABELS: Record<ErrorKind, string> = {
  jetztRichtig: "jetzt richtig",
  kleinigkeit: "Kleinigkeit",
  kurzform: "Kurzform",
  to: "„to“",
  verwechslung: "Verwechslung",
  tippfehler: "Tippfehler",
  falsch: "falsch",
};

export const ERROR_DESCRIPTIONS: Record<ErrorKind, string> = {
  jetztRichtig: "damals falsch, heute erlaubt (Lösung aus einer anderen Liste oder „auch“)",
  kleinigkeit: "nur Groß-/Kleinschreibung oder Satzzeichen",
  kurzform: "Kurz- statt Langform oder umgekehrt (here's ↔ here is)",
  to: "„to“ fehlt oder ist zu viel",
  verwechslung: "Lösung einer anderen Vokabel",
  tippfehler: "1–2 Buchstaben falsch",
  falsch: "alles andere",
};

/** Diese Fehler wären bei lockerer Bewertung richtig gewesen. */
export const LENIENT_KINDS: ReadonlySet<ErrorKind> = new Set(["kleinigkeit", "kurzform", "to"]);

/**
 * Diese Antworten waren damals falsch, sind nach den heutigen Listen aber richtig (z. B. eine
 * Lösung, die erst später in einer anderen Liste dazukam). Für „Nochmal ansehen“ zählen sie
 * nicht, denn dort ist nichts mehr zu tun.
 */
export const NOW_CORRECT: ErrorKind = "jetztRichtig";

// Bewusst eine feste Liste: Ein allgemeines „'s → is“ ginge schief, weil „Tom's ball“ ein
// Besitz-s ist. Beide Seiten werden gleich ausgeschrieben, Mehrdeutiges (I'd) stört deshalb nicht.
const CONTRACTIONS: Record<string, string> = {
  "i'm": "i am",
  "you're": "you are",
  "he's": "he is",
  "she's": "she is",
  "it's": "it is",
  "we're": "we are",
  "they're": "they are",
  "here's": "here is",
  "there's": "there is",
  "what's": "what is",
  "that's": "that is",
  "who's": "who is",
  "where's": "where is",
  "how's": "how is",
  "let's": "let us",
  "isn't": "is not",
  "aren't": "are not",
  "wasn't": "was not",
  "weren't": "were not",
  "don't": "do not",
  "doesn't": "does not",
  "didn't": "did not",
  "can't": "cannot",
  "won't": "will not",
  "wouldn't": "would not",
  "couldn't": "could not",
  "shouldn't": "should not",
  "haven't": "have not",
  "hasn't": "has not",
  "hadn't": "had not",
  "i've": "i have",
  "you've": "you have",
  "we've": "we have",
  "they've": "they have",
  "i'll": "i will",
  "you'll": "you will",
  "he'll": "he will",
  "she'll": "she will",
  "it'll": "it will",
  "we'll": "we will",
  "they'll": "they will",
  "i'd": "i would",
  "you'd": "you would",
  "he'd": "he would",
  "she'd": "she would",
  "we'd": "we would",
  "they'd": "they would",
};

const CONTRACTION_PATTERN = new RegExp(`\\b(${Object.keys(CONTRACTIONS).join("|")})\\b`, "g");

const lower = (text: string) => normalize(text).toLowerCase();
const strip = (text: string) => text.replace(/[.,!?;:"'()]/g, "").replace(/\s+/g, " ").trim();
const expand = (text: string) => text.replace(CONTRACTION_PATTERN, (word) => CONTRACTIONS[word]);

/** Stufe 1: ohne Groß-/Kleinschreibung und Satzzeichen */
export const relaxed = (text: string): string => strip(lower(text));
/** Stufe 2: zusätzlich Kurzformen ausgeschrieben */
export const expanded = (text: string): string => strip(expand(lower(text)));
/** Stufe 3: zusätzlich ohne „to“ am Anfang */
export const withoutTo = (text: string): string => expanded(text).replace(/^to /, "");

/**
 * Wie viele Buchstaben dürfen für einen Tippfehler falsch sein? Bei sehr kurzen Wörtern
 * keiner, denn „he“ → „me“ ist ein anderes Wort; bis 4 Buchstaben einer, sonst zwei.
 */
export function allowedTypos(solution: string): number {
  if (solution.length <= 2) return 0;
  if (solution.length <= 4) return 1;
  return 2;
}

/**
 * Levenshtein-Distanz: wie viele Buchstaben man mindestens einfügen, löschen oder ersetzen
 * muss, um von `a` zu `b` zu kommen. Klassisch mit dynamischer Programmierung, Zeile für Zeile.
 */
export function levenshtein(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + cost);
    }
    previous = row;
  }
  return previous[b.length];
}

export interface Classification {
  kind: ErrorKind;
  /** bei einer Verwechslung: die Vokabel, deren Lösung getippt wurde */
  confusedWith?: Vocab;
}

/**
 * Schlägt zu einer (gelockerten) Eingabe die Vokabel nach, deren Lösung sie ist,
 * einschließlich der Varianten aus `auch`.
 */
export function solutionIndex(vocab: Vocab[]): Map<string, Vocab> {
  const index = new Map<string, Vocab>();
  for (const v of vocab) {
    for (const spelling of [v.card.key, ...(v.item.auch ?? [])]) {
      const form = withoutTo(spelling);
      if (!index.has(form)) index.set(form, v);
    }
  }
  return index;
}

/**
 * Ordnet eine falsche Antwort ein. Zuerst: Wäre sie nach den heutigen Listen richtig?
 * Danach wird der Vergleich stufenweise lockerer.
 */
export function classify(typed: string, card: Card, solutions: Map<string, Vocab>): Classification {
  if (isCorrect(typed, card.antworten)) return { kind: NOW_CORRECT };
  const matchesAt = (relax: (text: string) => string) =>
    card.antworten.some((answer) => relax(answer) === relax(typed));
  if (matchesAt(relaxed)) return { kind: "kleinigkeit" };
  if (matchesAt(expanded)) return { kind: "kurzform" };
  if (matchesAt(withoutTo)) return { kind: "to" };

  const form = withoutTo(typed);
  const confusedWith = solutions.get(form);
  if (confusedWith) return { kind: "verwechslung", confusedWith };

  const isTypo = card.antworten.some((answer) => {
    const solution = withoutTo(answer);
    return levenshtein(form, solution) <= allowedTypos(solution);
  });
  return { kind: isTypo ? "tippfehler" : "falsch" };
}

export interface ClassifiedError extends Classification {
  answer: ReplayedAnswer;
  /** null, wenn die Vokabel nicht mehr in den Listen steht */
  vocab: Vocab | null;
  typed: string;
}

/** Alle falschen Antworten mit getippter Eingabe (also nicht die nachgetragenen). */
export function classifyErrors(played: Replay, vocab: Vocab[]): ClassifiedError[] {
  const byId = new Map(vocab.map((v) => [v.id, v]));
  const solutions = solutionIndex(vocab);
  const errors: ClassifiedError[] = [];
  for (const answer of played.answers) {
    const typed = answer.entry.getippt;
    if (answer.entry.richtig !== false || typed === null) continue;
    const v = byId.get(answer.id) ?? null;
    const card = v?.card ?? {
      listId: answer.listId,
      key: answer.key,
      frage: answer.entry.frage ?? "",
      antworten: [answer.key],
    };
    errors.push({ answer, vocab: v, typed, ...classify(typed, card, solutions) });
  }
  return errors;
}

export interface ErrorSummary {
  counts: Record<ErrorKind, number>;
  total: number;
  /** wären bei lockerer Bewertung richtig gewesen */
  lenient: number;
}

export function summarizeErrors(errors: ClassifiedError[]): ErrorSummary {
  const counts = Object.fromEntries(ERROR_KINDS.map((kind) => [kind, 0])) as Record<ErrorKind, number>;
  for (const error of errors) counts[error.kind]++;
  return {
    counts,
    total: errors.length,
    lenient: errors.filter((error) => LENIENT_KINDS.has(error.kind)).length,
  };
}

/** Eine Vokabel, deren Fehler überwiegend Kleinigkeiten sind: weitere Lösung erlauben? */
export interface SolutionHint {
  vocab: Vocab;
  lenient: number;
  total: number;
  examples: string[];
}

/** Eine Vokabel, bei der die Lösung einer anderen getippt wurde: ist die Frage eindeutig? */
export interface QuestionHint {
  vocab: Vocab;
  confusedWith: Vocab;
  count: number;
}

/** „Überwiegend“ = mindestens die Hälfte der Fehler und mindestens so viele */
export const MIN_LENIENT_ERRORS = 2;

export function reviewHints(errors: ClassifiedError[]): { solutions: SolutionHint[]; questions: QuestionHint[] } {
  const byVocab = new Map<string, { vocab: Vocab; errors: ClassifiedError[] }>();
  for (const error of errors) {
    if (!error.vocab || error.kind === NOW_CORRECT) continue;
    const group = byVocab.get(error.vocab.id) ?? { vocab: error.vocab, errors: [] };
    group.errors.push(error);
    byVocab.set(error.vocab.id, group);
  }

  const solutions: SolutionHint[] = [];
  const questions = new Map<string, QuestionHint>();
  for (const { vocab, errors: own } of byVocab.values()) {
    const lenient = own.filter((error) => LENIENT_KINDS.has(error.kind));
    if (lenient.length >= MIN_LENIENT_ERRORS && 2 * lenient.length >= own.length) {
      solutions.push({
        vocab,
        lenient: lenient.length,
        total: own.length,
        examples: [...new Set(lenient.map((error) => error.typed))],
      });
    }
    for (const error of own) {
      if (!error.confusedWith) continue;
      const key = `${vocab.id}→${error.confusedWith.id}`;
      const hint = questions.get(key) ?? { vocab, confusedWith: error.confusedWith, count: 0 };
      hint.count++;
      questions.set(key, hint);
    }
  }
  return {
    solutions: solutions.sort((a, b) => b.lenient - a.lenient),
    questions: [...questions.values()].sort((a, b) => b.count - a.count),
  };
}
