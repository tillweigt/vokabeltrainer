import type { Data } from "plotly.js-dist-min";
import type { Analysis } from "../analysis/analyze";
import { formatShortDate } from "../analysis/app-logic";
import { plotTime } from "../analysis/time";
import { BAD, formatNumber, STAR } from "../format";
import { Section, Tiles } from "./Common";
import { dateAxis, Plot } from "./Plot";

export function StarsSection({ analysis }: { analysis: Analysis }) {
  const { stars } = analysis;
  const first = stars.bookings[0];

  // Kontostand als Treppe: Startwert aus der Zeit vor dem Protokoll, dann jede Buchung
  const line: Data = {
    type: "scatter",
    mode: "lines",
    line: { shape: "hv", color: STAR, width: 2 },
    name: "Kontostand",
    x: first ? [plotTime(first.zeit), ...stars.bookings.map((b) => plotTime(b.zeit))] : [],
    y: first ? [stars.startBalance, ...stars.bookings.map((b) => b.balance)] : [],
    hovertemplate: "%{x|%d.%m. %H:%M}: %{y} Sterne<extra></extra>",
  };
  const markers = (events: typeof stars.redemptions, name: string, symbol: "star" | "triangle-down", color: string): Data => ({
    type: "scatter",
    mode: "markers",
    name,
    x: events.map((e) => plotTime(e.zeit)),
    y: events.map((e) => e.balance),
    marker: { symbol, size: 11, color },
    customdata: events.map((e) => e.stars),
    hovertemplate: `%{x|%d.%m. %H:%M}: ${name} %{customdata:+d}<extra></extra>`,
  });

  return (
    <Section id="sterne" title="Sterne">
      <Tiles
        items={[
          { label: "Kontostand", value: formatNumber(stars.balance) },
          {
            label: "verdient",
            value: formatNumber(stars.earned),
            hint: `seit Beginn des Protokolls, davor ${formatNumber(stars.startBalance)}`,
          },
          { label: "eingelöst", value: formatNumber(stars.redeemed) },
          {
            label: "Sterne pro Übungsminute",
            value: stars.perMinute === null ? "–" : formatNumber(stars.perMinute, 1),
            hint: stars.perMinute ? `100 Sterne ≈ ${formatNumber(100 / stars.perMinute)} Minuten Üben` : undefined,
          },
          {
            label: "Sterne pro richtiger Antwort",
            value: stars.perCorrect === null ? "–" : formatNumber(stars.perCorrect, 1),
            hint: "sinkt, je öfter eine Vokabel schon richtig war",
          },
        ]}
      />
      {first && (
        <>
          <h3>Kontostand</h3>
          <Plot
            label="Kontostand im Zeitverlauf"
            height={300}
            data={[
              line,
              markers(stars.rounds, "🏆-Bonus", "star", STAR),
              markers(stars.redemptions, "Einlösung", "triangle-down", BAD),
            ]}
            layout={{
              xaxis: dateAxis(),
              yaxis: { title: { text: "Sterne" }, rangemode: "tozero" },
            }}
          />
          <h3>Verdient pro Woche</h3>
          <Plot
            label="Verdiente Sterne pro Woche"
            height={240}
            data={[
              {
                type: "bar",
                x: stars.weekly.map((w) => `ab ${formatShortDate(w.week)}`),
                y: stars.weekly.map((w) => w.earned),
                marker: { color: STAR },
                hovertemplate: "Woche %{x}: %{y} Sterne<extra></extra>",
              },
            ]}
            layout={{
              xaxis: { type: "category" },
              yaxis: { title: { text: "Sterne" }, rangemode: "tozero" },
              bargap: 0.5,
            }}
          />
        </>
      )}
    </Section>
  );
}
