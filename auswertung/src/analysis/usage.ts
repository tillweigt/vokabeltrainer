// Nutzung: wann und wie lange geübt wurde. Grundlage sind die Zeitpunkte der echten
// Antworten; nachgetragene Einträge haben einen künstlichen Zeitpunkt und zählen hier nicht.

import { daysBetween } from "./app-logic";
import { addDays, dateOf, dateRange, secondsOfDay, toMs, weekStart, weekStarts } from "./time";
import type { ProtocolEntry } from "./types";

/** So lange ohne Antwort, dann ist eine Übungseinheit zu Ende */
export const SESSION_GAP_SECONDS = 10 * 60;

/** Typische Zeit für eine Antwort, solange es noch keine Abstände zum Messen gibt */
const FALLBACK_ANSWER_SECONDS = 15;

export interface Session {
  date: string;
  /** Sekunden seit Mitternacht */
  start: number;
  /** Dauer in Sekunden: erste bis letzte Antwort plus eine typische Antwortzeit */
  seconds: number;
  answers: number;
  correct: number;
}

export function realAnswers(entries: ProtocolEntry[]): ProtocolEntry[] {
  return entries.filter((entry) => entry.art === "antwort" && !entry.nachgetragen);
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Teilt die Antworten (nach Zeit sortiert) bei jeder Pause über SESSION_GAP_SECONDS. */
export function buildSessions(answers: ProtocolEntry[]): { sessions: Session[]; answerSeconds: number } {
  const groups: ProtocolEntry[][] = [];
  const gaps: number[] = [];
  for (const answer of answers) {
    const group = groups[groups.length - 1];
    const gap = group ? (toMs(answer.zeit) - toMs(group[group.length - 1].zeit)) / 1000 : Infinity;
    if (gap > SESSION_GAP_SECONDS) {
      groups.push([answer]);
    } else {
      group.push(answer);
      gaps.push(gap);
    }
  }
  // Die erste Antwort einer Einheit hat keinen Vorgänger: dafür eine typische Antwortzeit
  const answerSeconds = median(gaps) ?? FALLBACK_ANSWER_SECONDS;
  const sessions = groups.map((group) => {
    const first = group[0];
    const last = group[group.length - 1];
    return {
      date: dateOf(first.zeit),
      start: secondsOfDay(first.zeit),
      seconds: (toMs(last.zeit) - toMs(first.zeit)) / 1000 + answerSeconds,
      answers: group.length,
      correct: group.filter((answer) => answer.richtig).length,
    };
  });
  return { sessions, answerSeconds };
}

export interface UsageSummary {
  firstDate: string;
  lastDate: string;
  days: number;
  practiceDays: number;
  sessions: number;
  totalSeconds: number;
  daysPerWeek: number;
  minutesPerWeek: number;
  minutesPerPracticeDay: number;
  minutesPerSession: number;
}

/** Durchschnitte über die ganze Zeit von der ersten bis zur letzten Antwort. */
export function summarize(sessions: Session[]): UsageSummary | null {
  if (sessions.length === 0) return null;
  const firstDate = sessions[0].date;
  const lastDate = sessions[sessions.length - 1].date;
  const days = daysBetween(firstDate, lastDate) + 1;
  const weeks = Math.max(1, days / 7); // weniger als eine Woche nicht hochrechnen
  const practiceDays = new Set(sessions.map((session) => session.date)).size;
  const totalSeconds = sessions.reduce((sum, session) => sum + session.seconds, 0);
  const minutes = totalSeconds / 60;
  return {
    firstDate,
    lastDate,
    days,
    practiceDays,
    sessions: sessions.length,
    totalSeconds,
    daysPerWeek: practiceDays / weeks,
    minutesPerWeek: minutes / weeks,
    minutesPerPracticeDay: minutes / practiceDays,
    minutesPerSession: minutes / sessions.length,
  };
}

/** Die letzten `days` Tage bis `lastDate`, auch Tage ohne Übung. */
export function timeline(sessions: Session[], lastDate: string, days = 14): { date: string; sessions: Session[] }[] {
  return dateRange(addDays(lastDate, -(days - 1)), lastDate).map((date) => ({
    date,
    sessions: sessions.filter((session) => session.date === date),
  }));
}

/** Übungsminuten pro Woche (Montag bis Sonntag), auch Wochen ohne Übung. */
export function minutesPerWeek(sessions: Session[]): { week: string; minutes: number }[] {
  if (sessions.length === 0) return [];
  const weeks = weekStarts(sessions[0].date, sessions[sessions.length - 1].date);
  return weeks.map((week) => ({
    week,
    minutes:
      sessions
        .filter((session) => weekStart(session.date) === week)
        .reduce((sum, session) => sum + session.seconds, 0) / 60,
  }));
}
