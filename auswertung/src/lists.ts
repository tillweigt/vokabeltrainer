// Die Vokabellisten der App werden beim Bauen mit eingepackt (Vite liest sie aus ../lists).
// Nach jeder neuen Liste baut GitHub Actions die Auswertung ohnehin neu.

import type { VocabList } from "./analysis/types";
import index from "../../lists/index.json";

const files = import.meta.glob<VocabList>("../../lists/*.json", { eager: true, import: "default" });

export const LISTS: VocabList[] = index
  .map((id) => files[`../../lists/${id}.json`])
  .filter((list) => list !== undefined);
