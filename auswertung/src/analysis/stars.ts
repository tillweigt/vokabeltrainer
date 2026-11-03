// Sterne: Kontostand im Zeitverlauf und Sterne im Verhältnis zur Übung.

import type { Replay } from "./replay";
import { dateOf, weekStart, weekStarts } from "./time";
import type { ProtocolEntry } from "./types";

export interface StarEvent {
  zeit: string;
  stars: number;
  /** Kontostand danach */
  balance: number;
}

export interface StarStats {
  /** Kontostand laut Protokoll */
  balance: number;
  /** Kontostand vor der ersten echten Buchung, aus den nachgetragenen Antworten */
  startBalance: number;
  /** verdient mit echten Antworten und 🏆-Boni */
  earned: number;
  redeemed: number;
  correctAnswers: number;
  /** Sterne pro richtiger Antwort (ohne 🏆-Boni) */
  perCorrect: number | null;
  /** Sterne pro Übungsminute (mit 🏆-Boni) */
  perMinute: number | null;
  /** jede echte Buchung, für den Verlauf des Kontostands */
  bookings: StarEvent[];
  redemptions: StarEvent[];
  rounds: (StarEvent & { listId: string | null })[];
  weekly: { week: string; earned: number }[];
}

export function starStats(entries: ProtocolEntry[], played: Replay, practiceSeconds: number): StarStats {
  const answerStars = new Map(played.answers.map((answer) => [answer.entry, answer.stars]));
  const stats: StarStats = {
    balance: 0,
    startBalance: 0,
    earned: 0,
    redeemed: 0,
    correctAnswers: 0,
    perCorrect: null,
    perMinute: null,
    bookings: [],
    redemptions: [],
    rounds: [],
    weekly: [],
  };
  let answerEarned = 0;
  const earnedByWeek = new Map<string, number>();

  for (const entry of entries) {
    const stars = answerStars.get(entry) ?? entry.sterne ?? 0;
    stats.balance += stars;
    if (entry.nachgetragen) {
      stats.startBalance += stars;
      continue;
    }
    if (stars === 0) continue;
    const event = { zeit: entry.zeit, stars, balance: stats.balance };
    stats.bookings.push(event);
    if (entry.art === "einloesung") {
      stats.redeemed -= stars;
      stats.redemptions.push(event);
      continue;
    }
    stats.earned += stars;
    const week = weekStart(dateOf(entry.zeit));
    earnedByWeek.set(week, (earnedByWeek.get(week) ?? 0) + stars);
    if (entry.art === "runde") {
      stats.rounds.push({ ...event, listId: entry.liste });
    } else {
      answerEarned += stars;
      stats.correctAnswers++;
    }
  }

  stats.perCorrect = stats.correctAnswers > 0 ? answerEarned / stats.correctAnswers : null;
  stats.perMinute = practiceSeconds > 0 ? stats.earned / (practiceSeconds / 60) : null;
  const real = entries.filter((entry) => !entry.nachgetragen);
  if (real.length > 0) {
    const weeks = weekStarts(dateOf(real[0].zeit), dateOf(real[real.length - 1].zeit));
    stats.weekly = weeks.map((week) => ({ week, earned: earnedByWeek.get(week) ?? 0 }));
  }
  return stats;
}
