import { expect, test } from "vitest";
import { mergeBackups } from "./data";
import { replay } from "./replay";
import { starStats } from "./stars";
import { answer, backfilled, LISTS, redemption, round } from "./testdata";

test("Kontostand, Verhältnis zur Übung und Verlauf", () => {
  const entries = [
    backfilled("2026-10-31 10:00:00", "test-a", "friend", true), // 8 Sterne, nachgerechnet
    answer("2026-11-02 11:00:00", "test-a", "friend", true, { sterne: 7 }),
    answer("2026-11-02 11:00:20", "test-a", "he", false),
    answer("2026-11-02 11:00:40", "test-a", "he", true, { sterne: 8 }),
    round("2026-11-02 11:00:41", "test-a", 6),
    redemption("2026-11-03 18:00:00", 20),
    answer("2026-11-10 11:00:00", "test-b", "bed", true, { sterne: 8 }),
  ];
  const stats = starStats(entries, replay(entries), 10 * 60);

  expect(stats).toMatchObject({
    startBalance: 8,
    balance: 8 + 7 + 8 + 6 - 20 + 8,
    earned: 7 + 8 + 6 + 8,
    redeemed: 20,
    correctAnswers: 3,
    perCorrect: (7 + 8 + 8) / 3,
    perMinute: 29 / 10,
  });
  expect(stats.bookings.map((b) => b.balance)).toEqual([15, 23, 29, 9, 17]);
  expect(stats.rounds).toEqual([{ zeit: entries[4].zeit, stars: 6, balance: 29, listId: "test-a" }]);
  expect(stats.redemptions.map((r) => r.stars)).toEqual([-20]);
  expect(stats.weekly).toEqual([
    { week: "2026-11-02", earned: 21 },
    { week: "2026-11-09", earned: 8 },
  ]);
});

test("nur nachgetragene Antworten: Startwert, aber keine Verhältnisse", () => {
  const entries = [backfilled("2026-10-31 10:00:00", "test-a", "friend", true)];
  const stats = starStats(entries, replay(entries), 0);
  expect(stats).toMatchObject({ startBalance: 8, balance: 8, earned: 0, perCorrect: null, perMinute: null });
  expect(stats.bookings).toEqual([]);
  expect(stats.weekly).toEqual([]);
});

test("Sterne aus dem Protokoll ergeben den Kontostand der App", () => {
  const entries = [answer("2026-11-02 11:00:00", "test-a", "friend", true, { sterne: 8 })];
  const dataset = mergeBackups(
    [
      {
        name: "a.json",
        backup: {
          app: "vokabeltrainer",
          version: 1,
          exportiert: "2026-11-02T12:00",
          daten: { "vokabeltrainer:v1:protokoll": entries, "vokabeltrainer:v1:sterne": { earned: 8, redemptions: [] } },
        },
      },
    ],
    LISTS,
  );
  expect(starStats(dataset.entries, replay(dataset.entries), 60).balance).toBe(8);
});
