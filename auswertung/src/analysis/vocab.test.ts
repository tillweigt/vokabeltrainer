import { describe, expect, test } from "vitest";
import { LISTS } from "./testdata";
import type { VocabList } from "./types";
import { catalog, scopes } from "./vocab";

// Erfundene Listen: gleiche Bedeutung „klein“ in zwei Englisch-Listen und in einem anderen Fach
const ONE: VocabList = {
  id: "eins",
  titel: "Eins",
  fach: "Englisch",
  typ: "vokabel",
  items: [
    { en: "little", de: ["klein"] },
    { en: "to listen to", auch: ["to listen"], de: ["zuhören"] },
  ],
};
const TWO: VocabList = { id: "zwei", titel: "Zwei", fach: "Englisch", typ: "vokabel", items: [{ en: "small", de: ["klein"] }] };
const FRENCH: VocabList = {
  id: "fr",
  titel: "Französisch",
  fach: "Französisch",
  typ: "vokabel",
  items: [{ en: "petit", de: ["klein"] }],
};

describe("catalog", () => {
  const vocab = catalog([ONE, TWO, FRENCH]);
  const byId = (id: string) => vocab.find((v) => v.id === id);

  test("bewertet wie die App: Lösungen aller Listen desselben Fachs, andere Fächer nicht", () => {
    expect(byId("eins|little")?.card.antworten).toEqual(["little", "small"]);
    expect(byId("zwei|small")?.card.antworten).toEqual(["small", "little"]);
    expect(byId("fr|petit")?.card.antworten).toEqual(["petit"]);
  });

  test("Varianten aus „auch“ sind erlaubt und stehen am Eintrag", () => {
    const listen = byId("eins|to listen to");
    expect(listen?.card.antworten).toEqual(["to listen to", "to listen"]);
    expect(listen?.item.auch).toEqual(["to listen"]);
  });

  test("jede Vokabel gehört zu ihrem eigenen Eintrag", () => {
    for (const v of vocab) expect(v.item.en).toBe(v.card.key);
  });

  test("die Bereiche bleiben pro Liste getrennt", () => {
    const all = scopes([ONE, TWO, FRENCH], vocab);
    expect(all.map((scope) => [scope.id, scope.vocab.length])).toEqual([
      ["alle", 3],
      ["eins", 2],
      ["zwei", 1],
      ["fr", 1],
    ]);
  });

  test("die erfundenen Testlisten überschneiden sich nicht (andere Tests verlassen sich darauf)", () => {
    for (const v of catalog(LISTS)) expect(v.card.antworten.length).toBeLessThanOrEqual(2);
    const im = catalog(LISTS).find((v) => v.card.key === "I'm …");
    expect(im?.card.antworten).toEqual(["I'm …", "My name is …"]);
  });
});
