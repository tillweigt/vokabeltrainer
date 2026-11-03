// Eine kleine React-Hülle um Plotly: zeichnet das Diagramm in ein <div> und aktualisiert es,
// wenn sich Daten oder Layout ändern. Data und Layout haben dasselbe Format wie in Python.

import Plotly, { type Config, type Data, type Layout, type LayoutAxis } from "plotly.js-dist-min";
import { useEffect, useRef } from "react";

const DAY_MS = 24 * 3600 * 1000;

/** Datumsachse auf Deutsch: Uhrzeit erst beim Heranzoomen; bei wenigen Tagen ein Strich pro Tag */
export function dateAxis(days?: number): Partial<LayoutAxis> {
  return {
    type: "date",
    tickformatstops: [
      { dtickrange: [null, DAY_MS - 1], value: "%H:%M<br>%d.%m." },
      { dtickrange: [DAY_MS, null], value: "%d.%m." },
    ],
    ...(days !== undefined && days <= 21 ? { dtick: DAY_MS } : {}),
  };
}

/** Achse für Anzahlen: bei kleinen Zahlen nur ganze Striche */
export function countAxis(title: string, max: number): Partial<LayoutAxis> {
  return { title: { text: title }, rangemode: "tozero", ...(max <= 10 ? { dtick: 1 } : {}) };
}

const BASE_LAYOUT: Partial<Layout> = {
  font: { family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif", size: 13, color: "#1d1d1f" },
  separators: ",.", // Dezimalkomma
  margin: { t: 10, r: 20, b: 40, l: 60 },
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",
  legend: { orientation: "h", x: 0, y: 1.02, yanchor: "bottom" },
};

const CONFIG: Partial<Config> = {
  displaylogo: false,
  responsive: true,
  modeBarButtonsToRemove: ["lasso2d", "select2d"],
};

interface PlotProps {
  data: Data[];
  layout?: Partial<Layout>;
  height?: number;
  label: string;
}

export function Plot({ data, layout, height = 320, label }: PlotProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (element) void Plotly.react(element, data, { ...BASE_LAYOUT, height, ...layout }, CONFIG);
  }, [data, layout, height]);

  useEffect(() => {
    const element = ref.current;
    return () => {
      if (element) Plotly.purge(element);
    };
  }, []);

  return <div ref={ref} className="plot" role="img" aria-label={label} />;
}
