// Setzt die ganze Auswertung zusammen. Die Oberfläche zeigt das Ergebnis nur noch an.

import { masteryPaths, selectionFactors, type MasteryPaths, type SelectionFactor } from "./appcheck";
import { checkData, type DataCheck } from "./checks";
import { mergeBackups, type Dataset, type LoadedFile } from "./data";
import {
  classifyErrors,
  reviewHints,
  summarizeErrors,
  type ClassifiedError,
  type ErrorSummary,
  type QuestionHint,
  type SolutionHint,
} from "./errors";
import { distributions, levelsOverTime, vocabRows, type Distribution, type LevelDay, type VocabRow } from "./mastery";
import { replay } from "./replay";
import { starStats, type StarStats } from "./stars";
import { dateOf } from "./time";
import type { VocabList } from "./types";
import {
  buildSessions,
  minutesPerWeek,
  realAnswers,
  summarize,
  timeline,
  type Session,
  type UsageSummary,
} from "./usage";
import { catalog, MIX_SCOPE_ID, scopes, type Scope } from "./vocab";

export interface Analysis {
  dataset: Dataset;
  check: DataCheck;
  /** Datum der letzten echten Antwort („letzte Messung“), null ohne echte Antworten */
  lastDate: string | null;
  usage: {
    sessions: Session[];
    answerSeconds: number;
    summary: UsageSummary | null;
    timeline: { date: string; sessions: Session[] }[];
    weekly: { week: string; minutes: number }[];
  };
  scopes: Scope[];
  distributions: Distribution[];
  /** Zeitverlauf der Stufen pro Bereich (Super-Liste und jede Liste) */
  levelsOverTime: Map<string, LevelDay[]>;
  rows: VocabRow[];
  errors: ClassifiedError[];
  errorSummary: ErrorSummary;
  hints: { solutions: SolutionHint[]; questions: QuestionHint[] };
  paths: MasteryPaths;
  factors: SelectionFactor[];
  stars: StarStats;
}

export function analyze(files: LoadedFile[], lists: VocabList[]): Analysis {
  const dataset = mergeBackups(files, lists);
  const played = replay(dataset.entries);
  const vocab = catalog(lists);
  const allScopes = scopes(lists, vocab);
  const mixVocab = allScopes.find((scope) => scope.id === MIX_SCOPE_ID)?.vocab ?? [];

  const real = realAnswers(dataset.entries);
  const { sessions, answerSeconds } = buildSessions(real);
  const summary = summarize(sessions);
  const lastDate = real.length > 0 ? dateOf(real[real.length - 1].zeit) : null;

  // Für die Vokabeln zählen auch die nachgetragenen Antworten
  const firstAnswer = played.answers[0];
  const lastAnswer = played.answers[played.answers.length - 1];
  const until = lastDate ?? (lastAnswer ? dateOf(lastAnswer.entry.zeit) : null);
  const overTime = new Map<string, LevelDay[]>();
  if (firstAnswer && until) {
    for (const scope of allScopes) {
      overTime.set(scope.id, levelsOverTime(scope, played.answers, dateOf(firstAnswer.entry.zeit), until));
    }
  }

  const errors = classifyErrors(played, vocab);
  return {
    dataset,
    check: checkData(dataset, played),
    lastDate,
    usage: {
      sessions,
      answerSeconds,
      summary,
      timeline: lastDate ? timeline(sessions, lastDate) : [],
      weekly: minutesPerWeek(sessions),
    },
    scopes: allScopes,
    distributions: distributions(allScopes, played),
    levelsOverTime: overTime,
    rows: vocabRows(vocab, played, until ?? ""), // ohne Antworten gibt es kein „zuletzt gefragt“
    errors,
    errorSummary: summarizeErrors(errors),
    hints: reviewHints(errors),
    paths: masteryPaths(vocab, played),
    factors: selectionFactors(mixVocab, played),
    stars: starStats(dataset.entries, played, summary?.totalSeconds ?? 0),
  };
}
