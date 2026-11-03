import { describe, expect, test } from "vitest";
import { weight } from "./app-logic";
import { distributions, estimate, levelOf, levelsOverTime, vocabRows, type Level } from "./mastery";
import { replay } from "./replay";
import { answer, backfilled, LISTS, seededRandom } from "./testdata";
import { catalog, scopes } from "./vocab";

describe("geschätzte Trefferwahrscheinlichkeit", () => {
  test.each<[string, number | null]>([
    ["", null],
    ["R", 2 / 3],
    ["RR", 3 / 4],
    ["RRR", 4 / 5],
    ["RRRRR", 6 / 7],
    ["F", 1 / 3],
    ["FRRR", 4 / 6],
    ["FFFFFRRRRR", 6 / 7], // nur die letzten 5 zählen
  ])("%s → %d", (history, expected) => {
    expect(estimate(history)).toBe(expected);
  });

  test("ist genau 1 − Gewicht der Super-Liste", () => {
    const random = seededRandom(7);
    for (let i = 0; i < 500; i++) {
      const history = Array.from({ length: Math.floor(random() * 9) + 1 }, () => (random() < 0.6 ? "R" : "F")).join("");
      expect(estimate(history)).toBeCloseTo(1 - weight(history), 12);
    }
  });
});

describe("Stufen", () => {
  test.each<[string, Level]>([
    ["", "nie"],
    ["R", "meistens"], // 67 %
    ["F", "nochNicht"], // 33 %
    ["RF", "wackelt"], // 50 %
    ["RR", "meistens"], // 75 %
    ["RRR", "sitzt"], // genau 80 %
    ["RRF", "meistens"], // genau 60 %
    ["RFF", "wackelt"], // genau 40 %
    ["FFF", "nochNicht"], // 20 %
    ["FRRR", "meistens"], // 67 %: ein alter Fehler zählt noch
    ["FRRRRR", "sitzt"], // der Fehler ist aus dem Fenster gefallen
    ["RRRRF", "meistens"], // 71 %
  ])("%s → %s", (history, level) => {
    expect(levelOf(history)).toBe(level);
  });
});

describe("Verteilung", () => {
  const vocab = catalog(LISTS);
  const allScopes = scopes(LISTS, vocab);
  const played = replay([
    backfilled("2026-10-31 10:00:00", "test-a", "friend", true),
    backfilled("2026-10-31 10:00:01", "test-a", "friend", true),
    answer("2026-11-01 11:00:00", "test-a", "friend", true),
    answer("2026-11-01 11:00:10", "test-b", "bed", false),
    answer("2026-11-03 09:00:00", "test-a", "he", true),
  ]);

  test("pro Liste und für die Super-Liste", () => {
    const result = distributions(allScopes, played);
    expect(result.map((d) => d.scope.label)).toEqual(["Alle Englisch-Vokabeln", "Liste A", "Liste B"]);
    expect(result[0].counts).toEqual({ sitzt: 1, meistens: 1, wackelt: 0, nochNicht: 1, nie: 7 });
    expect(result[1].counts).toEqual({ sitzt: 1, meistens: 1, wackelt: 0, nochNicht: 0, nie: 4 });
    expect(result[2].counts).toEqual({ sitzt: 0, meistens: 0, wackelt: 0, nochNicht: 1, nie: 3 });
  });

  test("Zeitverlauf: Stand am Ende jedes Tages, auch Tage ohne Antworten", () => {
    const days = levelsOverTime(allScopes[0], played.answers, "2026-10-31", "2026-11-03");
    expect(days.map((day) => day.date)).toEqual(["2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03"]);
    expect(days.map((day) => day.counts.sitzt)).toEqual([0, 1, 1, 1]);
    expect(days.map((day) => day.counts.meistens)).toEqual([1, 0, 0, 1]);
    expect(days.map((day) => day.counts.nie)).toEqual([9, 8, 8, 7]);
  });

  test("Tabelle: Verlauf und zuletzt gefragt", () => {
    const rows = vocabRows(vocab, played, "2026-11-03");
    const friend = rows.find((row) => row.vocab.card.key === "friend");
    expect(friend).toMatchObject({ history: "RRR", level: "sitzt", lastAsked: "2026-11-01", daysAgo: 2 });
    const never = rows.find((row) => row.vocab.card.key === "wardrobe");
    expect(never).toMatchObject({ history: "", estimate: null, level: "nie", lastAsked: null, daysAgo: null });
  });
});
