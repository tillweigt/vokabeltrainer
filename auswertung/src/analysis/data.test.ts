import { describe, expect, test } from "vitest";
import { starsFor } from "./app-logic";
import { checkData, isConsistent } from "./checks";
import { mergeBackups, readBackup } from "./data";
import { replay } from "./replay";
import { answer, backfilled, backup, LISTS } from "./testdata";
import { simulatedDevice } from "./testdevice";

describe("Sicherungsdateien lesen", () => {
  test("gültige Sicherung", () => {
    const text = JSON.stringify(backup("2026-11-02T16:39", {}));
    expect(readBackup("a.json", text)).toMatchObject({ file: { name: "a.json" } });
  });

  test("keine Sicherung: Fehlermeldung aus der App", () => {
    expect(readBackup("x.json", "{}")).toEqual({ name: "x.json", error: "Das ist keine Sicherung vom Vokabeltrainer." });
    expect(readBackup("y.json", "kein JSON")).toMatchObject({ error: expect.any(String) });
  });
});

describe("Zusammenführen", () => {
  const first = answer("2026-11-01 11:00:00", "test-a", "friend", true);
  const second = answer("2026-11-01 11:00:10", "test-a", "he", false);
  const third = answer("2026-11-02 11:00:00", "test-a", "friend", true);
  const older = backup("2026-11-01T12:00", {
    "vokabeltrainer:v1:protokoll": [first, second],
    "vokabeltrainer:v1:test-a:verlauf": { friend: "R", he: "F" },
    "vokabeltrainer:v1:sterne": { earned: 1, redemptions: [] },
  });
  const newer = backup("2026-11-02T12:00", {
    "vokabeltrainer:v1:protokoll": [second, third],
    "vokabeltrainer:v1:test-a:verlauf": { friend: "RR", he: "F" },
    "vokabeltrainer:v1:sterne": { earned: 2, redemptions: [] },
  });

  test("Doppelte aus überlappenden Dateien fallen weg, Reihenfolge der Dateien egal", () => {
    const dataset = mergeBackups(
      [
        { name: "neu.json", backup: newer },
        { name: "alt.json", backup: older },
      ],
      LISTS,
    );
    expect(dataset.entries).toEqual([first, second, third]);
    expect(dataset.files.map((file) => [file.name, file.entries])).toEqual([
      ["alt.json", 2],
      ["neu.json", 2],
    ]);
  });

  test("Verlauf und Sterne kommen aus der neuesten Sicherung", () => {
    const dataset = mergeBackups(
      [
        { name: "alt.json", backup: older },
        { name: "neu.json", backup: newer },
      ],
      LISTS,
    );
    expect(dataset.histories["test-a"]).toEqual({ friend: "RR", he: "F" });
    expect(dataset.histories["test-b"]).toEqual({});
    expect(dataset.ledger?.earned).toBe(2);
  });

  test("Sicherung von vor dem Protokoll: leeres Protokoll", () => {
    const dataset = mergeBackups([{ name: "uralt.json", backup: backup("2026-10-30T12:00", {}) }], LISTS);
    expect(dataset.entries).toEqual([]);
    expect(dataset.ledger).toBeNull();
  });
});

describe("Nachspielen", () => {
  test("Verlauf vor jeder Antwort; Sterne nachgetragener Antworten wie in der App", () => {
    const played = replay([
      backfilled("2026-10-31 10:00:00", "test-a", "friend", true),
      backfilled("2026-10-31 10:00:01", "test-a", "friend", false),
      backfilled("2026-10-31 10:00:02", "test-a", "friend", true),
      answer("2026-11-01 11:00:00", "test-a", "friend", true, { sterne: 6 }),
    ]);
    expect(played.answers.map((a) => [a.before, a.stars])).toEqual([
      ["", starsFor("")],
      ["R", 0],
      ["RF", starsFor("RF")],
      ["RFR", 6],
    ]);
    expect(played.answers.map((a) => a.stars)).toEqual([8, 0, 7, 6]);
    expect(played.histories.get("test-a|friend")).toBe("RFRR");
  });
});

describe("Datenprüfung", () => {
  /** Vier Sicherungen; zwischen jeder wird geübt */
  function fourBackups() {
    const device = simulatedDevice();
    device.backfilled("2026-10-31 10:00:00", "test-a", "friend", true);
    device.backfilled("2026-10-31 10:00:01", "test-a", "he", false);
    device.answer("2026-11-01 11:00:00", "test-a", "friend", true);
    const files = [device.backup("2026-11-01T12:00")];
    device.answer("2026-11-02 11:00:00", "test-a", "he", true);
    device.redeem("2026-11-02 12:00:00", 5);
    files.push(device.backup("2026-11-02T13:00"));
    device.answer("2026-11-03 11:00:00", "test-b", "bed", false, "bad");
    files.push(device.backup("2026-11-03T12:00"));
    device.answer("2026-11-04 11:00:00", "test-b", "bed", true);
    files.push(device.backup("2026-11-04T12:00"));
    return files;
  }

  test("alle Dateien: stimmig, auch die Sterne", () => {
    const dataset = mergeBackups(fourBackups(), LISTS);
    const check = checkData(dataset, replay(dataset.entries));
    expect(check.mismatches).toEqual([]);
    expect(check.starsApp).toBe(check.starsProtocol);
    expect(check.starsReconstructed).toBe(8);
    expect(isConsistent(check)).toBe(true);
  });

  test("eine fehlende Datei schadet nicht: die nächste überlappt", () => {
    const [a, , c, d] = fourBackups();
    const dataset = mergeBackups([a, c, d], LISTS);
    expect(isConsistent(checkData(dataset, replay(dataset.entries)))).toBe(true);
  });

  test("zwei fehlende Dateien hintereinander: Lücke wird erkannt", () => {
    const [a, , , d] = fourBackups();
    const dataset = mergeBackups([a, d], LISTS);
    const check = checkData(dataset, replay(dataset.entries));
    expect(isConsistent(check)).toBe(false);
    expect(check.mismatches).toContainEqual({ listId: "test-a", key: "he", protocol: "F", app: "FR" });
    expect(check.starsProtocol).not.toBe(check.starsApp);
  });
});
