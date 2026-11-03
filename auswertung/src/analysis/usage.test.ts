import { describe, expect, test } from "vitest";
import { answer, backfilled } from "./testdata";
import { weekStart } from "./time";
import { buildSessions, median, minutesPerWeek, realAnswers, summarize, timeline } from "./usage";

const at = (local: string, richtig = true) => answer(local, "test-a", "friend", richtig);

describe("Übungseinheiten", () => {
  test("neue Einheit erst nach mehr als 10 Minuten Pause", () => {
    const { sessions } = buildSessions([
      at("2026-11-01 11:00:00"),
      at("2026-11-01 11:10:00"), // genau 10 Minuten: noch dieselbe Einheit
      at("2026-11-01 11:20:01"),
    ]);
    expect(sessions.map((session) => session.answers)).toEqual([2, 1]);
  });

  test("Dauer: erste bis letzte Antwort plus typische Antwortzeit (Median der Abstände)", () => {
    const { sessions, answerSeconds } = buildSessions([
      at("2026-11-01 11:00:00"),
      at("2026-11-01 11:00:10", false),
      at("2026-11-01 11:00:30"),
      at("2026-11-01 11:01:00"),
    ]);
    expect(answerSeconds).toBe(20); // Abstände 10, 20, 30
    expect(sessions).toEqual([{ date: "2026-11-01", start: 39600, seconds: 80, answers: 4, correct: 3 }]);
  });

  test("ohne Abstände zum Messen: 15 Sekunden pro Antwort", () => {
    expect(buildSessions([at("2026-11-01 11:00:00")]).sessions[0].seconds).toBe(15);
  });

  test("nachgetragene Einträge zählen nicht", () => {
    const real = realAnswers([backfilled("2026-10-31 10:00:00", "test-a", "friend", true), at("2026-11-01 11:00:00")]);
    expect(real).toHaveLength(1);
  });

  test("Median", () => {
    expect(median([])).toBeNull();
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe("Durchschnitte und Zeitstrahl", () => {
  const { sessions } = buildSessions([
    at("2026-11-02 17:00:00"),
    at("2026-11-02 17:09:00"),
    at("2026-11-02 18:00:00"),
    at("2026-11-02 18:01:00"),
    at("2026-11-12 08:00:00"),
    at("2026-11-12 08:04:00"),
  ]);
  // Abstände in Einheiten: 540, 60, 240 → Median 240 s; Dauer 780 + 300 + 480 = 1560 s = 26 min

  test("über die ganze Zeit", () => {
    expect(summarize(sessions)).toEqual({
      firstDate: "2026-11-02",
      lastDate: "2026-11-12",
      days: 11,
      practiceDays: 2,
      sessions: 3,
      totalSeconds: 1560,
      daysPerWeek: 2 / (11 / 7),
      minutesPerWeek: 26 / (11 / 7),
      minutesPerPracticeDay: 13,
      minutesPerSession: 26 / 3,
    });
  });

  test("weniger als eine Woche wird nicht hochgerechnet", () => {
    expect(summarize(sessions.slice(0, 1))?.minutesPerWeek).toBe(13);
  });

  test("Zeitstrahl: 14 Tage bis zur letzten Antwort, auch ohne Übung", () => {
    const days = timeline(sessions, "2026-11-12");
    expect(days).toHaveLength(14);
    expect(days[0].date).toBe("2026-10-30");
    expect(days[13].date).toBe("2026-11-12");
    expect(days.filter((day) => day.sessions.length > 0).map((day) => [day.date, day.sessions.length])).toEqual([
      ["2026-11-02", 2],
      ["2026-11-12", 1],
    ]);
  });

  test("Minuten pro Woche, Montag bis Sonntag", () => {
    expect(minutesPerWeek(sessions)).toEqual([
      { week: "2026-11-02", minutes: 18 },
      { week: "2026-11-09", minutes: 8 },
    ]);
  });

  test("Wochenanfang ist Montag", () => {
    expect(weekStart("2026-11-01")).toBe("2026-10-26"); // Sonntag
    expect(weekStart("2026-11-02")).toBe("2026-11-02"); // Montag
  });
});
