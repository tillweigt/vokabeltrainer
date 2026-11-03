// Für Tests: ein simuliertes iPhone, das wie die App Antworten protokolliert, sichert und
// nach jeder Sicherung die schon gesicherten Einträge löscht (mit der Logik aus js/logic.js).

import { pruneAfterBackup } from "../../../js/logic.js";
import { starsFor } from "./app-logic";
import type { LoadedFile } from "./data";
import { backup, zeit } from "./testdata";
import type { Ledger, ProtocolEntry } from "./types";

export function simulatedDevice() {
  let protocol: ProtocolEntry[] = [];
  let saved = 0;
  const histories: Record<string, Record<string, string>> = {};
  const ledger: Ledger = { earned: 0, redemptions: [] };

  function record(entry: ProtocolEntry) {
    protocol.push(entry);
    if (entry.art === "antwort" && entry.liste && entry.vokabel) {
      const list = (histories[entry.liste] ??= {});
      list[entry.vokabel] = (list[entry.vokabel] ?? "") + (entry.richtig ? "R" : "F");
    }
  }

  function historyOf(liste: string, vokabel: string): string {
    return histories[liste]?.[vokabel] ?? "";
  }

  return {
    /** Antwort in der App: Sterne wie in der App */
    answer(local: string, liste: string, vokabel: string, richtig: boolean, getippt = richtig ? vokabel : "x") {
      const sterne = richtig ? starsFor(historyOf(liste, vokabel)) : 0;
      ledger.earned += sterne;
      record({
        art: "antwort",
        zeit: zeit(local),
        liste,
        vokabel,
        frage: null,
        getippt,
        richtig,
        modus: "super",
        sterne,
        nachgetragen: false,
      });
    },
    /** Alte Antwort aus der Zeit vor dem Protokoll (Sterne gab es damals schon) */
    backfilled(local: string, liste: string, vokabel: string, richtig: boolean) {
      if (richtig) ledger.earned += starsFor(historyOf(liste, vokabel));
      record({
        art: "antwort",
        zeit: zeit(local),
        liste,
        vokabel,
        frage: null,
        getippt: null,
        richtig,
        modus: null,
        sterne: null,
        nachgetragen: true,
      });
    },
    redeem(local: string, amount: number) {
      ledger.redemptions.push({ date: local.slice(0, 10), amount });
      record({
        art: "einloesung",
        zeit: zeit(local),
        liste: null,
        vokabel: null,
        frage: null,
        getippt: null,
        richtig: null,
        modus: null,
        sterne: -amount,
        nachgetragen: false,
      });
    },
    /** Sicherung wie in der App, danach Löschen mit Überlappung */
    backup(exportiert: string): LoadedFile {
      const daten: Record<string, unknown> = {
        "vokabeltrainer:v1:protokoll": structuredClone(protocol),
        "vokabeltrainer:v1:sterne": structuredClone(ledger),
      };
      for (const [liste, history] of Object.entries(histories)) {
        daten[`vokabeltrainer:v1:${liste}:verlauf`] = { ...history };
      }
      ({ entries: protocol, saved } = pruneAfterBackup(protocol, saved, protocol.length));
      return { name: `vokabeltrainer-${exportiert}.json`, backup: backup(exportiert, daten) };
    },
    get protocolLength() {
      return protocol.length;
    },
  };
}
