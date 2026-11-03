import { describe, expect, test } from "vitest";
import index from "../../../lists/index.json";
import { LISTS as REAL_LISTS } from "../lists";
import { analyze } from "./analyze";
import { isConsistent } from "./checks";
import { backup, LISTS } from "./testdata";
import { simulatedDevice } from "./testdevice";

describe("ganze Auswertung", () => {
  const device = simulatedDevice();
  device.backfilled("2026-10-31 10:00:00", "test-a", "friend", true);
  device.answer("2026-11-01 11:00:00", "test-a", "friend", true);
  device.answer("2026-11-01 11:00:20", "test-a", "cupboard", false, "wardrobe");
  device.answer("2026-11-01 11:00:40", "test-a", "friend", true);
  const files = [device.backup("2026-11-01T12:00")];
  device.answer("2026-11-03 17:00:00", "test-b", "bed", false, "Bed.");
  device.redeem("2026-11-03 18:00:00", 10);
  files.push(device.backup("2026-11-03T18:30"));
  const analysis = analyze(files, LISTS);

  test("Datenprüfung stimmig", () => {
    expect(isConsistent(analysis.check)).toBe(true);
  });

  test("letzte Messung = letzte echte Antwort, nicht die Einlösung", () => {
    expect(analysis.lastDate).toBe("2026-11-03");
    expect(analysis.usage.timeline.at(-1)?.date).toBe("2026-11-03");
  });

  test("alle Bereiche sind berechnet", () => {
    expect(analysis.usage.sessions).toHaveLength(2);
    expect(analysis.distributions[0].counts.sitzt).toBe(1);
    expect(analysis.levelsOverTime.get("alle")?.map((day) => day.date)).toEqual([
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
    ]);
    expect(analysis.errors.map((error) => error.kind)).toEqual(["verwechslung", "kleinigkeit"]);
    expect(analysis.hints.questions).toHaveLength(1);
    expect(analysis.stars.redeemed).toBe(10);
  });

  test("eine Sicherung von vor dem Protokoll geht auch", () => {
    const empty = analyze([{ name: "alt.json", backup: backup("2026-10-30T12:00", {}) }], LISTS);
    expect(empty.lastDate).toBeNull();
    expect(empty.usage.summary).toBeNull();
    expect(empty.levelsOverTime.size).toBe(0);
    expect(empty.distributions[0].counts.nie).toBe(10);
  });
});

test("die echten Listen der App werden mit eingepackt", () => {
  expect(REAL_LISTS.map((list) => list.id)).toEqual(index);
  expect(REAL_LISTS.every((list) => list.items.length > 0)).toBe(true);
});
