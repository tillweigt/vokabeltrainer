import { distance as referenceDistance } from "fastest-levenshtein";
import { describe, expect, test } from "vitest";
import {
  allowedTypos,
  classify,
  classifyErrors,
  expanded,
  levenshtein,
  reviewHints,
  solutionIndex,
  summarizeErrors,
  type ErrorKind,
} from "./errors";
import { replay } from "./replay";
import { answer, backfilled, LISTS, seededRandom } from "./testdata";
import { catalog } from "./vocab";

const vocab = catalog(LISTS);
const solutions = solutionIndex(vocab);

function card(key: string) {
  const found = vocab.find((v) => v.card.key === key);
  if (!found) throw new Error(`Keine Vokabel ${key}`);
  return found.card;
}

describe("levenshtein", () => {
  test.each<[string, string, number]>([
    ["", "", 0],
    ["abc", "", 3],
    ["", "abc", 3],
    ["bed", "bad", 1],
    ["freind", "friend", 2],
    ["kitten", "sitting", 3],
    ["flaw", "lawn", 2],
  ])("%s → %s: %i", (a, b, expected) => {
    expect(levenshtein(a, b)).toBe(expected);
  });

  test("stimmt mit dem Paket fastest-levenshtein überein (Zufallswörter)", () => {
    const random = seededRandom(42);
    const letters = "abcd '"; // wenige Zeichen, damit sich die Wörter oft ähneln
    const word = () =>
      Array.from({ length: Math.floor(random() * 10) }, () => letters[Math.floor(random() * letters.length)]).join("");
    for (let i = 0; i < 5000; i++) {
      const a = word();
      const b = word();
      expect(levenshtein(a, b), `${a} / ${b}`).toBe(referenceDistance(a, b));
    }
  });
});

describe("Fehlerarten", () => {
  test.each<[string, string, ErrorKind]>([
    ["here's your ball", "Here's your ball.", "kleinigkeit"],
    ["Heres your ball.", "Here's your ball.", "kleinigkeit"],
    ["Here is your ball", "Here's your ball.", "kurzform"],
    ["live", "to live", "to"],
    ["to friend", "friend", "to"],
    ["wardrobe", "cupboard", "verwechslung"],
    ["bad", "bed", "verwechslung"], // ein anderes Wort aus den Listen, kein Tippfehler
    ["freind", "friend", "tippfehler"],
    ["bet", "bed", "tippfehler"],
    ["me", "he", "falsch"], // sehr kurzes Wort: kein Tippfehler
    ["house", "friend", "falsch"],
  ])("„%s“ für %s → %s", (typed, key, kind) => {
    expect(classify(typed, card(key), solutions).kind).toBe(kind);
  });

  test("auch die erlaubten Alternativen zählen (Ich heiße … → I'm …)", () => {
    expect(classify("i'm", card("My name is …"), solutions).kind).toBe("kleinigkeit");
  });

  test("bei einer Verwechslung steht dabei, mit welcher Vokabel", () => {
    expect(classify("wardrobe", card("cupboard"), solutions).confusedWith?.card.frage).toBe("Kleiderschrank");
  });

  test("Kurzformen nur aus der Tabelle, ein Besitz-s bleibt", () => {
    expect(expanded("It's Tom's ball.")).toBe("it is toms ball");
    expect(expanded("I'm here, aren't you?")).toBe("i am here are not you");
  });

  test.each<[string, number]>([
    ["he", 0],
    ["bed", 1],
    ["ball", 1],
    ["house", 2],
    ["here is your ball", 2],
  ])("erlaubte Tippfehler bei %s: %i", (solution, expected) => {
    expect(allowedTypos(solution)).toBe(expected);
  });
});

describe("falsche Antworten einordnen", () => {
  const played = replay([
    answer("2026-11-01 11:00:00", "test-a", "friend", false, { getippt: "freind" }),
    answer("2026-11-01 11:00:10", "test-a", "friend", true),
    backfilled("2026-10-31 10:00:00", "test-a", "he", false), // ohne getippt: nicht einzuordnen
    answer("2026-11-01 11:00:20", "test-a", "to live", false, { getippt: "live" }),
    answer("2026-11-01 11:00:30", "test-a", "verschwunden", false, { getippt: "weg" }),
  ]);
  const errors = classifyErrors(played, vocab);

  test("nur falsche Antworten mit getippter Eingabe", () => {
    expect(errors.map((error) => [error.typed, error.kind])).toEqual([
      ["freind", "tippfehler"],
      ["live", "to"],
      ["weg", "falsch"],
    ]);
  });

  test("Vokabeln, die es nicht mehr gibt, ohne Eintrag aus der Liste", () => {
    expect(errors[2].vocab).toBeNull();
  });

  test("Zusammenfassung: wären bei lockerer Bewertung richtig gewesen", () => {
    const summary = summarizeErrors(errors);
    expect(summary.total).toBe(3);
    expect(summary.lenient).toBe(1);
    expect(summary.counts.tippfehler).toBe(1);
  });
});

describe("Nochmal ansehen", () => {
  const wrong = (second: number, vokabel: string, getippt: string) =>
    answer(`2026-11-01 11:00:${String(second).padStart(2, "0")}`, vokabel === "bed" ? "test-b" : "test-a", vokabel, false, {
      getippt,
    });

  test("überwiegend Kleinigkeiten: weitere Lösung erlauben?", () => {
    const errors = classifyErrors(
      replay([
        wrong(1, "Here's your ball.", "Here is your ball."),
        wrong(2, "Here's your ball.", "here's your ball"),
        wrong(3, "Here's your ball.", "xyz"),
      ]),
      vocab,
    );
    const { solutions: hints } = reviewHints(errors);
    expect(hints).toHaveLength(1);
    expect(hints[0]).toMatchObject({ lenient: 2, total: 3 });
    expect(hints[0].examples).toEqual(["Here is your ball.", "here's your ball"]);
  });

  test("nur eine Kleinigkeit oder weniger als die Hälfte: kein Hinweis", () => {
    const one = classifyErrors(replay([wrong(1, "friend", "Friend")]), vocab);
    expect(reviewHints(one).solutions).toHaveLength(0);
    const fewer = classifyErrors(
      replay([
        wrong(1, "friend", "Friend"),
        wrong(2, "friend", "Friend!"),
        wrong(3, "friend", "abc"),
        wrong(4, "friend", "def"),
        wrong(5, "friend", "ghi"),
      ]),
      vocab,
    );
    expect(reviewHints(fewer).solutions).toHaveLength(0);
  });

  test("Verwechslungen: ist die deutsche Frage eindeutig?", () => {
    const errors = classifyErrors(
      replay([wrong(1, "cupboard", "wardrobe"), wrong(2, "cupboard", "Wardrobe"), wrong(3, "bed", "bad")]),
      vocab,
    );
    const { questions } = reviewHints(errors);
    expect(questions.map((hint) => [hint.vocab.card.key, hint.confusedWith.card.key, hint.count])).toEqual([
      ["cupboard", "wardrobe", 2],
      ["bed", "bad", 1],
    ]);
  });
});
