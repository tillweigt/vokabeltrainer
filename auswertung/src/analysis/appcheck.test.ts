import { describe, expect, test } from "vitest";
import { masteryPaths, selectionFactors } from "./appcheck";
import { replay } from "./replay";
import { answer, backfilled, LIST_A, LISTS } from "./testdata";
import { catalog } from "./vocab";

const vocab = catalog(LISTS);

describe("Antworten bis „sitzt“", () => {
  test("erstes Erreichen und Rückfälle danach", () => {
    const answers = (key: string, history: string, minute: number) =>
      [...history].map((result, i) =>
        backfilled(`2026-10-31 10:${String(minute).padStart(2, "0")}:${String(i).padStart(2, "0")}`, "test-a", key, result === "R"),
      );
    const played = replay([
      ...answers("friend", "RRR", 1), // nach 3
      ...answers("he", "FRRRRR", 2), // nach 6: der Fehler muss erst aus dem Fenster
      ...answers("cupboard", "RRRF", 3), // nach 3, danach Rückfall
      ...answers("wardrobe", "RF", 4), // noch nicht erreicht
    ]);
    // Reihenfolge wie in der Liste: friend, cupboard, wardrobe, he
    expect(masteryPaths(vocab, played)).toEqual({ asked: 4, reached: 3, answersUntil: [3, 3, 6], relapses: 1 });
  });
});

describe("Auswahl der Super-Liste im Vergleich zum Zufall", () => {
  test("zählt die Stufe vor jeder Antwort und den Anteil der Stufe in diesem Moment", () => {
    const two = catalog([{ ...LIST_A, items: LIST_A.items.slice(2, 4) }]); // friend, cupboard
    const played = replay([
      answer("2026-11-01 11:00:00", "test-a", "friend", true), // vorher: nie (2 von 2 nie)
      answer("2026-11-01 11:00:10", "test-a", "friend", true), // vorher: meistens (1 nie, 1 meistens)
      answer("2026-11-01 11:00:20", "test-a", "cupboard", false), // vorher: nie (1 nie, 1 meistens)
      answer("2026-11-01 11:00:30", "test-a", "cupboard", true, { modus: "liste" }), // zählt nicht
      answer("2026-11-01 11:00:40", "test-a", "cupboard", true), // vorher: wackelt (1 meistens, 1 wackelt)
    ]);
    const factors = Object.fromEntries(selectionFactors(two, played).map((f) => [f.level, [f.asked, f.expected]]));
    expect(factors).toEqual({
      nie: [2, 2],
      meistens: [1, 1.5],
      wackelt: [1, 0.5],
      nochNicht: [0, 0],
      sitzt: [0, 0],
    });
  });
});
