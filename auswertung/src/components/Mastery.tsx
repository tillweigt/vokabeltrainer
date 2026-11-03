import type { Data } from "plotly.js-dist-min";
import { useState } from "react";
import type { Analysis } from "../analysis/analyze";
import { RECENT_ANSWERS } from "../analysis/app-logic";
import { LEVEL_LABELS, LEVEL_RANGES, LEVELS, type Level, type VocabRow } from "../analysis/mastery";
import { MIX_SCOPE_ID } from "../analysis/vocab";
import { formatDaysAgo, formatPercent, LEVEL_COLORS, shortTitle } from "../format";
import { Dots, LevelChip, Section } from "./Common";
import { dateAxis, Plot } from "./Plot";

const levelName = (level: Level) => (LEVEL_RANGES[level] ? `${LEVEL_LABELS[level]} (${LEVEL_RANGES[level]})` : LEVEL_LABELS[level]);

export function MasterySection({ analysis }: { analysis: Analysis }) {
  const [scopeId, setScopeId] = useState(MIX_SCOPE_ID);
  const scope = analysis.scopes.find((s) => s.id === scopeId) ?? analysis.scopes[0];
  const days = analysis.levelsOverTime.get(scope.id) ?? [];
  const ids = new Set(scope.vocab.map((v) => v.id));

  return (
    <Section id="koennen" title="Wie gut sitzen die Vokabeln?">
      <p className="note">
        Pro Vokabel wird aus den letzten {RECENT_ANSWERS} Antworten geschätzt, wie wahrscheinlich sie richtig
        beantwortet wird: (richtige + 1) / (Antworten + 2). Das ist genau die Gewichtung der Super-Liste. Wenige
        Antworten bleiben nahe 50 %, erst viele in dieselbe Richtung führen an die Ränder. Nachgetragene Antworten
        zählen mit.
      </p>
      <DistributionPlot analysis={analysis} />

      <div className="toolbar">
        <h3>Zeitverlauf und alle Vokabeln</h3>
        <label>
          Bereich{" "}
          <select value={scope.id} onChange={(event) => setScopeId(event.target.value)}>
            {analysis.scopes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {days.length > 0 && (
        <Plot
          label={`Stufen im Zeitverlauf: ${scope.label}`}
          height={300}
          data={LEVELS.map(
            (level): Data => ({
              type: "scatter",
              mode: "lines",
              stackgroup: "levels",
              name: levelName(level),
              x: days.map((day) => day.date),
              y: days.map((day) => day.counts[level]),
              line: { width: 0.5, color: LEVEL_COLORS[level] },
              fillcolor: LEVEL_COLORS[level],
              hovertemplate: `%{x|%d.%m.}: %{y} ${LEVEL_LABELS[level]}<extra></extra>`,
            }),
          )}
          layout={{
            xaxis: dateAxis(days.length),
            yaxis: { title: { text: "Vokabeln" }, rangemode: "tozero" },
          }}
        />
      )}
      <VocabTable rows={analysis.rows.filter((row) => ids.has(row.vocab.id))} />
    </Section>
  );
}

function DistributionPlot({ analysis }: { analysis: Analysis }) {
  const labels = analysis.distributions.map((d) => `${d.scope.label} (${d.scope.vocab.length})`);
  return (
    <Plot
      label="Verteilung der Stufen pro Liste"
      height={80 + 50 * labels.length}
      data={LEVELS.map(
        (level): Data => ({
          type: "bar",
          orientation: "h",
          name: levelName(level),
          y: labels,
          x: analysis.distributions.map((d) => d.counts[level]),
          marker: { color: LEVEL_COLORS[level] },
          text: analysis.distributions.map((d) => (d.counts[level] > 0 ? String(d.counts[level]) : "")),
          textposition: "inside",
          insidetextanchor: "middle",
          hovertemplate: `%{y}: %{x} ${LEVEL_LABELS[level]}<extra></extra>`,
        }),
      )}
      layout={{
        barmode: "stack",
        margin: { t: 10, r: 20, b: 30, l: 260 },
        yaxis: { autorange: "reversed", automargin: true },
        xaxis: { title: { text: "Vokabeln" } },
      }}
    />
  );
}

type SortKey = "key" | "frage" | "list" | "estimate" | "answers" | "daysAgo";

const SORTERS: Record<SortKey, (a: VocabRow, b: VocabRow) => number> = {
  key: (a, b) => a.vocab.card.key.localeCompare(b.vocab.card.key, "de"),
  frage: (a, b) => a.vocab.card.frage.localeCompare(b.vocab.card.frage, "de"),
  list: (a, b) => a.vocab.list.titel.localeCompare(b.vocab.list.titel, "de"),
  // nie gefragte Vokabeln immer ans Ende
  estimate: (a, b) => (a.estimate ?? 2) - (b.estimate ?? 2),
  answers: (a, b) => a.history.length - b.history.length,
  daysAgo: (a, b) => (a.daysAgo ?? Infinity) - (b.daysAgo ?? Infinity),
};

function VocabTable({ rows }: { rows: VocabRow[] }) {
  const [sort, setSort] = useState<{ key: SortKey; ascending: boolean }>({ key: "estimate", ascending: true });
  const sorted = [...rows].sort((a, b) => (sort.ascending ? 1 : -1) * SORTERS[sort.key](a, b));
  const header = (key: SortKey, title: string) => (
    <th>
      <button
        type="button"
        className="sort"
        onClick={() => setSort({ key, ascending: sort.key === key ? !sort.ascending : true })}
      >
        {title}
        {sort.key === key ? (sort.ascending ? " ▲" : " ▼") : ""}
      </button>
    </th>
  );
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {header("key", "Vokabel")}
            {header("frage", "Frage")}
            {header("list", "Liste")}
            <th>Letzte {RECENT_ANSWERS}</th>
            {header("estimate", "Schätzung")}
            <th>Stufe</th>
            {header("answers", "Antworten")}
            {header("daysAgo", "Zuletzt gefragt")}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.vocab.id}>
              <td>{row.vocab.card.key}</td>
              <td>{row.vocab.card.frage}</td>
              <td className="muted nowrap">{shortTitle(row.vocab.list.titel)}</td>
              <td>
                <Dots history={row.history} />
              </td>
              <td className="number">{formatPercent(row.estimate)}</td>
              <td>
                <LevelChip level={row.level} />
              </td>
              <td className="number">{row.history.length}</td>
              <td>{formatDaysAgo(row.daysAgo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
