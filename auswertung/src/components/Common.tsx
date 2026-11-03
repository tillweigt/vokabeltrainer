// Kleine Bausteine, die mehrere Abschnitte nutzen.

import type { ReactNode } from "react";
import type { Level } from "../analysis/mastery";
import { LEVEL_LABELS } from "../analysis/mastery";
import { LEVEL_COLORS } from "../format";

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export interface Tile {
  label: string;
  value: string;
  hint?: string;
}

export function Tiles({ items }: { items: Tile[] }) {
  return (
    <div className="tiles">
      {items.map((item) => (
        <div key={item.label} className="tile">
          <div className="tile-value">{item.value}</div>
          <div className="tile-label">{item.label}</div>
          {item.hint && <div className="tile-hint">{item.hint}</div>}
        </div>
      ))}
    </div>
  );
}

/** Die letzten Antworten als Punkte: grün richtig, rot falsch, die neueste rechts */
export function Dots({ history, count = 5 }: { history: string; count?: number }) {
  if (history === "") return <span className="muted">–</span>;
  return (
    <span className="dots" title={history}>
      {[...history.slice(-count)].map((answer, i) => (
        <span key={i} className={answer === "R" ? "dot right" : "dot wrong"} />
      ))}
    </span>
  );
}

export function LevelChip({ level }: { level: Level }) {
  return (
    <span className="chip" style={{ background: LEVEL_COLORS[level], color: level === "meistens" || level === "nie" ? "#1d1d1f" : "#fff" }}>
      {LEVEL_LABELS[level]}
    </span>
  );
}
