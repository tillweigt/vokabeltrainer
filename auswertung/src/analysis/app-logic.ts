// Brücke zur App: dieselben Funktionen wie im Vokabeltrainer (js/logic.js), hier mit Typen.
// So rechnet die Auswertung garantiert genauso wie die App, etwa bei Sternen und Gewicht.

import * as logic from "../../../js/logic.js";
import type { Backup, Card, Ledger, VocabList } from "./types";

export const RECENT_ANSWERS: number = logic.RECENT_ANSWERS;

export const normalize: (text: string) => string = logic.normalize;
export const buildCards: (list: VocabList) => Card[] = logic.buildCards;
export const weight: (history: string) => number = logic.weight;
export const starsFor: (history: string) => number = logic.starsFor;
export const balance: (ledger: Ledger) => number = logic.balance;
export const parseBackup: (text: string) => { backup?: Backup; error?: string } = logic.parseBackup;
export const daysBetween: (from: string, to: string) => number = logic.daysBetween;
export const formatShortDate: (isoDate: string) => string = logic.formatShortDate;
