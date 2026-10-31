// Unit-Tests für js/logic.js. Aufruf: make unit  (oder: node --test tests/*.test.js)
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  MASTERY_TARGET,
  PORTION_SIZE,
  addStars,
  appendHistory,
  backupFileName,
  buildBackup,
  daysBetween,
  isBackupDue,
  lastBackupText,
  localIsoDateTime,
  parseBackup,
  registerTap,
  balance,
  buildCards,
  cardRef,
  countByHits,
  countMastered,
  drawPortion,
  emptyLedger,
  formatShortDate,
  isCorrect,
  lastRedemptions,
  localIsoDate,
  parseRedemption,
  recordAnswer,
  redeem,
  restoreQueue,
  roundBonus,
  speechText,
  starsFor,
  startRound,
  weight,
} from "../js/logic.js";

/** Zufallsgenerator mit festem Startwert, damit die Tests immer gleich laufen (mulberry32). */
function seededRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LIST = {
  id: "test",
  items: [
    { en: "I'm …", de: ["Ich heiße …", "Ich bin …"] },
    { en: "My name is …", de: ["Ich heiße …"] },
    { en: "boy", de: ["Junge"] },
  ],
};

describe("isCorrect", () => {
  const cases = [
    ["What’s your name?", "What's your name?", true], // iPhone-Apostroph
    ["  What's  your name? ", "What's your name?", true], // Leerzeichen
    ["I'm", "I'm …", true], // Platzhalter weglassen
    ["I'm ...", "I'm …", true],
    ["Are you on holiday in ?", "Are you on holiday in …?", true],
    ["what's your name?", "What's your name?", false], // Groß/klein zählt
    ["What's your name", "What's your name?", false], // Satzzeichen zählen
    ["", "boy", false],
  ];
  for (const [input, answer, expected] of cases) {
    test(`${JSON.stringify(input)} → ${expected}`, () => {
      assert.equal(isCorrect(input, [answer]), expected);
    });
  }
});

describe("buildCards", () => {
  test("Deutsch → Englisch, eigene Lösung zuerst, Mehrdeutigkeit innerhalb der Liste", () => {
    const [im, myName, boy] = buildCards(LIST);
    assert.deepEqual(im, {
      listId: "test",
      key: "I'm …",
      frage: "Ich heiße … / Ich bin …",
      antworten: ["I'm …", "My name is …"],
    });
    assert.deepEqual(myName.antworten, ["My name is …", "I'm …"]);
    assert.deepEqual(boy.antworten, ["boy"]);
  });
});

describe("Liste: Durchgänge und Punkte", () => {
  const cards = buildCards(LIST);

  test("ein Durchgang enthält jede offene Karte genau einmal", () => {
    const round = startRound(cards, {}, seededRandom(1));
    assert.equal(round.length, 3);
    assert.deepEqual(new Set(round.map((card) => card.key)), new Set(["I'm …", "My name is …", "boy"]));
  });

  test("geschaffte Karten kommen nicht mehr", () => {
    const round = startRound(cards, { boy: MASTERY_TARGET }, seededRandom(1));
    assert.deepEqual(round.map((card) => card.key).sort(), ["I'm …", "My name is …"]);
  });

  test("richtig zählt +1, falsch setzt nichts zurück", () => {
    const boy = cards[2];
    let progress = recordAnswer({}, boy, true);
    progress = recordAnswer(progress, boy, false);
    progress = recordAnswer(progress, boy, true);
    assert.deepEqual(progress, { boy: 2 });
  });

  test("Stufen und geschafft zählen", () => {
    const progress = { "I'm …": 1, boy: 3 };
    assert.deepEqual(countByHits(cards, progress), [1, 1, 0, 1]);
    assert.equal(countMastered(cards, progress), 1);
  });
});

describe("Verlauf", () => {
  test("hängt R und F an", () => {
    let history = appendHistory({}, "boy", true);
    history = appendHistory(history, "boy", false);
    history = appendHistory(history, "girl", true);
    assert.deepEqual(history, { boy: "RF", girl: "R" });
  });
});

describe("weight: (Fehler + 1) / (Antworten + 2) über die letzten 5", () => {
  const cases = [
    ["", 1 / 2], // nie gefragt
    ["R", 1 / 3],
    ["F", 2 / 3],
    ["RRRRR", 1 / 7],
    ["RRRRF", 2 / 7],
    ["FFRRF", 4 / 7],
    ["FFFFF", 6 / 7],
    ["FFFFFRRRRR", 1 / 7], // alte Fehler zählen nicht mehr
  ];
  for (const [history, expected] of cases) {
    test(`${JSON.stringify(history)} → ${expected.toFixed(3)}`, () => {
      assert.ok(Math.abs(weight(history) - expected) < 1e-12);
    });
  }

  test("nie 0, auch nach vielen richtigen Antworten", () => {
    assert.ok(weight("R".repeat(100)) > 0);
  });
});

describe("drawPortion", () => {
  const cards = Array.from({ length: 30 }, (_, i) => ({ key: `w${i}` }));

  test("10 Karten, keine doppelt", () => {
    const portion = drawPortion(cards, () => 1, 10, seededRandom(7));
    assert.equal(portion.length, 10);
    assert.equal(new Set(portion.map((card) => card.key)).size, 10);
  });

  test("weniger als 10 Karten: alle kommen", () => {
    const portion = drawPortion(cards.slice(0, 4), () => 1, 10, seededRandom(7));
    assert.deepEqual(portion.map((card) => card.key).sort(), ["w0", "w1", "w2", "w3"]);
  });

  test("schwere Karten werden passend zum Gewicht öfter gezogen", () => {
    // 1 schwere Karte (6/7) und 9 leichte (je 1/7): erwarteter Anteil 6/15 = 40 %
    const few = cards.slice(0, 10);
    const weightOf = (card) => (card.key === "w0" ? 6 / 7 : 1 / 7);
    const random = seededRandom(42);
    const draws = 10000;
    let hard = 0;
    for (let i = 0; i < draws; i++) {
      if (drawPortion(few, weightOf, 1, random)[0].key === "w0") hard++;
    }
    const share = hard / draws;
    assert.ok(share > 0.37 && share < 0.43, `Anteil ${share}`);
  });

  test("leichte Karten kommen trotzdem dran", () => {
    const weightOf = (card) => (card.key === "w0" ? 6 / 7 : 1 / 7);
    const random = seededRandom(3);
    const seen = new Set();
    for (let i = 0; i < 50; i++) {
      for (const card of drawPortion(cards, weightOf, 10, random)) seen.add(card.key);
    }
    assert.equal(seen.size, cards.length);
  });
});

describe("Portion speichern und fortsetzen", () => {
  const cards = [
    { listId: "a", key: "boy", frage: "Junge" },
    { listId: "a", key: "girl", frage: "Mädchen" },
    { listId: "b", key: "boy", frage: "Junge" },
  ];

  test("eine Portion hat 5 Karten", () => {
    assert.equal(PORTION_SIZE, 5);
  });

  test("Karten kommen in gespeicherter Reihenfolge zurück", () => {
    const refs = [cards[2], cards[0]].map(cardRef);
    assert.deepEqual(restoreQueue(refs, cards), [cards[2], cards[0]]);
  });

  test("Vokabeln, die es nicht mehr gibt, werden übersprungen", () => {
    const refs = [{ listId: "a", key: "weg" }, cardRef(cards[1])];
    assert.deepEqual(restoreQueue(refs, cards), [cards[1]]);
  });
});

describe("starsFor: ⌈8 · 2^(−k/3)⌉, k = bisher richtig", () => {
  const expected = [8, 7, 6, 4, 4, 3, 2, 2, 2, 1, 1, 1];
  expected.forEach((stars, k) => {
    test(`k = ${k} → ${stars}`, () => {
      assert.equal(starsFor("R".repeat(k)), stars);
    });
  });

  test("Fehler ändern den Wert nicht", () => {
    assert.equal(starsFor("FFFF"), 8);
    assert.equal(starsFor("RFRF"), starsFor("RR"));
  });

  test("nie weniger als 1, auch nach sehr vielen richtigen Antworten", () => {
    assert.equal(starsFor("R".repeat(10000)), 1);
  });

  test("absichtlich falsch antworten bringt nichts", () => {
    // Summe der Sterne über eine Folge von Antworten
    const total = (answers) => {
      let history = "";
      let stars = 0;
      for (const answer of answers) {
        if (answer === "R") stars += starsFor(history);
        history += answer;
      }
      return stars;
    };
    // 10 richtige Antworten bringen gleich viel, egal wie viele Fehler dazwischen liegen
    assert.equal(total("RRRRRRRRRR"), total("FRFRFRFRFRFRFRFRFRFR"));
    assert.equal(total("RRR"), 8 + 7 + 6);
  });
});

describe("Sternekonto", () => {
  test("🏆-Bonus: 1 Stern pro Vokabel", () => {
    assert.equal(roundBonus(29), 29);
  });

  test("verdienen, einlösen, Kontostand", () => {
    let ledger = addStars(emptyLedger(), 50);
    ledger = redeem(ledger, 20, "2026-10-30");
    ledger = addStars(ledger, 7);
    assert.equal(balance(ledger), 37);
    assert.deepEqual(ledger.redemptions, [{ date: "2026-10-30", amount: 20 }]);
  });

  test("die letzten 3 Einlösungen, neueste zuerst", () => {
    let ledger = addStars(emptyLedger(), 100);
    for (const amount of [1, 2, 3, 4]) ledger = redeem(ledger, amount, "2026-10-30");
    assert.deepEqual(
      lastRedemptions(ledger).map((r) => r.amount),
      [4, 3, 2],
    );
  });
});

describe("parseRedemption", () => {
  const cases = [
    ["20", 50, { amount: 20 }],
    [" 20 ", 50, { amount: 20 }],
    ["50", 50, { amount: 50 }],
    ["", 50, { error: "Bitte eine ganze Zahl eingeben." }],
    ["abc", 50, { error: "Bitte eine ganze Zahl eingeben." }],
    ["2.5", 50, { error: "Bitte eine ganze Zahl eingeben." }],
    ["-3", 50, { error: "Bitte eine ganze Zahl eingeben." }],
    ["0", 50, { error: "Bitte mindestens 1 Stern eingeben." }],
    ["51", 50, { error: "So viele Sterne hast du nicht (Kontostand: 50)." }],
  ];
  for (const [text, available, expected] of cases) {
    test(`${JSON.stringify(text)} bei ${available} → ${JSON.stringify(expected)}`, () => {
      assert.deepEqual(parseRedemption(text, available), expected);
    });
  }
});

describe("Datum", () => {
  test("lokales Datum ohne Umrechnung nach UTC", () => {
    assert.equal(localIsoDate(new Date(2026, 9, 5, 23, 30)), "2026-10-05");
  });

  test("kurze Anzeige", () => {
    assert.equal(formatShortDate("2026-10-05"), "5.10.");
    assert.equal(formatShortDate("2026-12-28"), "28.12.");
  });
});

describe("speechText: Text zum Vorlesen", () => {
  const cases = [
    ["living room", "living room"],
    ["I'm …", "I'm"],
    ["We're from ...", "We're from"],
    ["Are you on holiday in …?", "Are you on holiday in?"],
    ["What’s your name?", "What's your name?"],
  ];
  for (const [text, expected] of cases) {
    test(`${JSON.stringify(text)} → ${JSON.stringify(expected)}`, () => {
      assert.equal(speechText(text), expected);
    });
  }
});

describe("Geheimzugang: 5× tippen innerhalb von 3 Sekunden", () => {
  const tapAt = (times) => {
    let state = { taps: [], unlocked: false };
    for (const time of times) state = registerTap(state.taps, time);
    return state.unlocked;
  };

  test("5 schnelle Tipps schalten frei", () => {
    assert.equal(tapAt([0, 300, 600, 900, 1200]), true);
  });

  test("4 Tipps reichen nicht", () => {
    assert.equal(tapAt([0, 300, 600, 900]), false);
  });

  test("zu langsam: alte Tipps verfallen", () => {
    assert.equal(tapAt([0, 800, 1600, 2400, 3200]), false);
  });

  test("nach dem Freischalten beginnt das Zählen von vorn", () => {
    assert.deepEqual(registerTap([0, 1, 2, 3], 4), { taps: [], unlocked: true });
  });
});

describe("Sicherungsdatei", () => {
  const when = new Date(2026, 9, 31, 8, 5);

  test("Zeitpunkt und Dateiname mit Uhrzeit", () => {
    assert.equal(localIsoDateTime(when), "2026-10-31T08:05");
    assert.equal(backupFileName(when), "vokabeltrainer-2026-10-31-0805.json");
  });

  test("Inhalt: Kennung, Version, Zeitpunkt und Daten", () => {
    const entries = { "vokabeltrainer:v1:sterne": { earned: 5, redemptions: [] } };
    assert.deepEqual(buildBackup(entries, when), {
      app: "vokabeltrainer",
      version: 1,
      exportiert: "2026-10-31T08:05",
      daten: entries,
    });
  });

  test("eine eigene Sicherung wird wieder erkannt", () => {
    const backup = buildBackup({ "vokabeltrainer:v1:portion": null }, when);
    assert.deepEqual(parseBackup(JSON.stringify(backup)), { backup });
  });

  const notABackup = { error: "Das ist keine Sicherung vom Vokabeltrainer." };
  const invalid = {
    "kein JSON": "hallo",
    "falsche App": JSON.stringify({ app: "andere", version: 1, exportiert: "2026-10-31T08:05", daten: {} }),
    "unbekannte Version": JSON.stringify({ app: "vokabeltrainer", version: 2, exportiert: "2026-10-31T08:05", daten: {} }),
    "ohne Zeitpunkt": JSON.stringify({ app: "vokabeltrainer", version: 1, daten: {} }),
    "Daten als Liste": JSON.stringify({ app: "vokabeltrainer", version: 1, exportiert: "2026-10-31T08:05", daten: [] }),
    "fremder Schlüssel": JSON.stringify({ app: "vokabeltrainer", version: 1, exportiert: "2026-10-31T08:05", daten: { fremd: 1 } }),
    "null": "null",
  };
  for (const [name, text] of Object.entries(invalid)) {
    test(`wird abgelehnt: ${name}`, () => {
      assert.deepEqual(parseBackup(text), notABackup);
    });
  }
});

describe("Erinnerung an die Sicherung", () => {
  test("Tage zwischen zwei Daten, auch über Monatsgrenzen", () => {
    assert.equal(daysBetween("2026-10-24", "2026-10-31"), 7);
    assert.equal(daysBetween("2026-10-29", "2026-11-02"), 4);
    assert.equal(daysBetween("2026-10-24", "2026-10-26"), 2); // über die Zeitumstellung
  });

  test("Text", () => {
    assert.equal(lastBackupText(null, "2026-10-31"), "Letzte Sicherung: noch nie");
    assert.equal(lastBackupText("2026-10-31", "2026-10-31"), "Letzte Sicherung: heute");
    assert.equal(lastBackupText("2026-10-30", "2026-10-31"), "Letzte Sicherung: gestern");
    assert.equal(lastBackupText("2026-10-22", "2026-10-31"), "Letzte Sicherung: vor 9 Tagen");
  });

  test("fällig ab 7 Tagen oder wenn noch nie gesichert", () => {
    assert.equal(isBackupDue(null, "2026-10-31"), true);
    assert.equal(isBackupDue("2026-10-25", "2026-10-31"), false);
    assert.equal(isBackupDue("2026-10-24", "2026-10-31"), true);
  });
});
