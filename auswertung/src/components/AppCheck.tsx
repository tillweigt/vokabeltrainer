import type { Analysis } from "../analysis/analyze";
import { LEVEL_LABELS, LEVELS } from "../analysis/mastery";
import { median } from "../analysis/usage";
import { formatNumber, formatPercent, LEVEL_COLORS } from "../format";
import { Section } from "./Common";
import { countAxis, Plot } from "./Plot";

/** Darunter ist der Vergleich mit dem Zufall noch wenig aussagekräftig */
const FEW_ANSWERS = 50;

export function AppCheckSection({ analysis }: { analysis: Analysis }) {
  const { paths, factors } = analysis;
  const until = median(paths.answersUntil);
  const counts = new Map<number, number>();
  for (const count of paths.answersUntil) counts.set(count, (counts.get(count) ?? 0) + 1);
  const histogram = [...counts.entries()].sort((a, b) => a[0] - b[0]);

  const superAnswers = factors.reduce((sum, f) => sum + f.asked, 0);
  const shown = factors.filter((f) => f.expected > 0);

  return (
    <Section id="app" title="App überprüfen">
      <h3>Bedeutet „sitzt“ gelernt?</h3>
      {paths.reached === 0 ? (
        <p className="muted">Noch keine Vokabel hat „sitzt“ erreicht.</p>
      ) : (
        <>
          <p>
            Von {paths.asked} gefragten Vokabeln haben <strong>{paths.reached}</strong> schon einmal „sitzt“ erreicht,
            im Median nach {formatNumber(until ?? 0, Number.isInteger(until) ? 0 : 1)} Antworten (schnellstens nach 3). Danach wieder falsch:{" "}
            <strong>{paths.relapses}</strong> von {paths.reached} ({formatPercent(paths.relapses / paths.reached)}). Zum
            Vergleich: In einer Liste gilt eine Vokabel nach 3× richtig als geschafft.
          </p>
          <Plot
            label="Antworten bis zum ersten „sitzt“"
            height={240}
            data={[
              {
                type: "bar",
                x: histogram.map(([count]) => count),
                y: histogram.map(([, vocab]) => vocab),
                marker: { color: LEVEL_COLORS.sitzt },
                hovertemplate: "nach %{x} Antworten: %{y} Vokabeln<extra></extra>",
              },
            ]}
            layout={{
              xaxis: { title: { text: "Antworten bis zum ersten „sitzt“" }, dtick: 1 },
              yaxis: countAxis("Vokabeln", Math.max(...histogram.map(([, vocab]) => vocab))),
            }}
          />
        </>
      )}

      <h3>Fragt die Super-Liste die schweren Vokabeln öfter?</h3>
      {superAnswers === 0 ? (
        <p className="muted">Noch keine Antworten aus der Super-Liste.</p>
      ) : (
        <>
          <p>
            Pro Stufe: wie oft eine Vokabel dieser Stufe drankam, im Verhältnis zu rein zufälliger Auswahl. Über 1 heißt
            öfter als Zufall. Grundlage: {formatNumber(superAnswers)} Antworten aus der Super-Liste
            {superAnswers < FEW_ANSWERS && " (noch wenig Daten)"}.
          </p>
          <Plot
            label="Auswahl der Super-Liste im Vergleich zum Zufall"
            height={260}
            data={[
              {
                type: "bar",
                x: shown.map((f) => LEVEL_LABELS[f.level]),
                y: shown.map((f) => f.asked / f.expected),
                marker: { color: shown.map((f) => LEVEL_COLORS[f.level]) },
                text: shown.map((f) => `${formatNumber(f.asked / f.expected, 1)}×`),
                textposition: "outside",
                customdata: shown.map((f) => [f.asked, formatNumber(f.expected, 1)]),
                hovertemplate: "%{x}: %{customdata[0]}× dran, bei Zufall %{customdata[1]}×<extra></extra>",
              },
            ]}
            layout={{
              showlegend: false,
              xaxis: { categoryorder: "array", categoryarray: LEVELS.map((level) => LEVEL_LABELS[level]) },
              yaxis: { title: { text: "Faktor gegenüber Zufall" }, rangemode: "tozero" },
              shapes: [
                { type: "line", xref: "paper", x0: 0, x1: 1, y0: 1, y1: 1, line: { dash: "dash", color: "#6e6e73" } },
              ],
            }}
          />
        </>
      )}
    </Section>
  );
}
