import type { Data } from "plotly.js-dist-min";
import type { Analysis } from "../analysis/analyze";
import { formatShortDate } from "../analysis/app-logic";
import { clockTime, weekdayName } from "../analysis/time";
import { SESSION_GAP_SECONDS } from "../analysis/usage";
import { ACCENT, formatDate, formatDuration, formatNumber } from "../format";
import { Section, Tiles } from "./Common";
import { Plot } from "./Plot";

/** Sehr kurze Einheiten wären im Zeitstrahl unsichtbar: mindestens so breit zeichnen */
const MIN_BAR_SECONDS = 3 * 60;

export function UsageSection({ analysis }: { analysis: Analysis }) {
  const { summary, timeline, weekly, answerSeconds } = analysis.usage;
  if (!summary) {
    return (
      <Section id="nutzung" title="Nutzung">
        <p className="muted">Noch keine echten Antworten im Protokoll.</p>
      </Section>
    );
  }

  const period =
    summary.days === 1
      ? `bisher nur am ${formatDate(summary.firstDate)}`
      : `über ${summary.days} Tage (${formatDate(summary.firstDate)} bis ${formatDate(summary.lastDate)})`;
  return (
    <Section id="nutzung" title="Nutzung">
      <Tiles
        items={[
          { label: "Übungstage pro Woche", value: formatNumber(summary.daysPerWeek, 1), hint: period },
          { label: "Minuten pro Woche", value: formatNumber(summary.minutesPerWeek), hint: "Tage ohne Übung zählen mit" },
          { label: "Minuten pro Übungstag", value: formatNumber(summary.minutesPerPracticeDay) },
          {
            label: "Länge einer Einheit",
            value: `${formatNumber(summary.minutesPerSession)} Min`,
            hint: `${summary.sessions} ${summary.sessions === 1 ? "Einheit" : "Einheiten"} insgesamt`,
          },
        ]}
      />

      <h3>Die letzten 14 Tage</h3>
      <TimelinePlot timeline={timeline} />
      <p className="note">
        Eine Einheit endet nach {SESSION_GAP_SECONDS / 60} Minuten ohne Antwort. Dauer = erste bis letzte Antwort plus
        eine typische Antwortzeit (zurzeit {formatNumber(answerSeconds)} Sekunden). Sehr kurze Einheiten sind mindestens
        3 Minuten breit gezeichnet. Wie lange die App ohne Antwort offen war, ist nicht bekannt.
      </p>

      <h3>Minuten pro Woche</h3>
      <Plot
        label="Übungsminuten pro Woche"
        height={260}
        data={[
          {
            type: "bar",
            x: weekly.map((w) => `ab ${formatShortDate(w.week)}`),
            y: weekly.map((w) => w.minutes),
            marker: { color: ACCENT },
            hovertemplate: "Woche %{x}: %{y:.0f} Min<extra></extra>",
          },
        ]}
        layout={{
          xaxis: { type: "category" },
          yaxis: { title: { text: "Minuten" }, rangemode: "tozero" },
          bargap: 0.5,
        }}
      />
    </Section>
  );
}

function TimelinePlot({ timeline }: { timeline: Analysis["usage"]["timeline"] }) {
  const bars = timeline.flatMap((day, index) => day.sessions.map((session) => ({ index, session })));
  const hours = bars.flatMap(({ session }) => [session.start / 3600, (session.start + session.seconds) / 3600]);
  const from = hours.length ? Math.max(0, Math.floor(Math.min(...hours)) - 1) : 8;
  const to = hours.length ? Math.min(24, Math.ceil(Math.max(...hours)) + 1) : 20;

  const data: Data[] = [
    {
      type: "bar",
      orientation: "h",
      y: bars.map((bar) => bar.index),
      base: bars.map((bar) => bar.session.start / 3600),
      x: bars.map((bar) => Math.max(bar.session.seconds, MIN_BAR_SECONDS) / 3600),
      width: 0.6,
      marker: { color: ACCENT },
      hovertext: bars.map(({ session }) => {
        const end = clockTime(session.start + session.seconds);
        return `${clockTime(session.start)}–${end} · ${formatDuration(session.seconds)} · ${session.answers} Antworten, ${session.correct} richtig`;
      }),
      hoverinfo: "text",
    },
  ];
  return (
    <Plot
      label="Übungseinheiten der letzten 14 Tage"
      height={420}
      data={data}
      layout={{
        margin: { t: 10, r: 20, b: 40, l: 80 },
        showlegend: false,
        yaxis: {
          tickvals: timeline.map((_, index) => index),
          ticktext: timeline.map((day) => `${weekdayName(day.date)} ${formatShortDate(day.date)}`),
          range: [timeline.length - 0.5, -0.5], // älteste oben
          gridcolor: "#eee",
        },
        xaxis: {
          range: [from, to],
          dtick: to - from > 8 ? 2 : 1,
          ticksuffix: " Uhr",
          gridcolor: "#eee",
        },
      }}
    />
  );
}
