import type { ReactNode } from "react";
import type { Analysis } from "../analysis/analyze";
import { ERROR_DESCRIPTIONS, ERROR_KINDS, ERROR_LABELS, type ClassifiedError } from "../analysis/errors";
import { ERROR_COLORS, formatNumber, formatPercent } from "../format";
import { Dots, LevelChip, Section } from "./Common";
import { countAxis, Plot } from "./Plot";

/** So viele getippte Fehler pro Problemvokabel anzeigen */
const SHOWN_ERRORS = 5;

/** So viele Hinweise sofort zeigen, den Rest zum Aufklappen */
const SHOWN_HINTS = 5;

function ShortList({ items }: { items: ReactNode[] }) {
  return (
    <>
      <ul className="hints">{items.slice(0, SHOWN_HINTS)}</ul>
      {items.length > SHOWN_HINTS && (
        <details>
          <summary>{items.length - SHOWN_HINTS} weitere</summary>
          <ul className="hints">{items.slice(SHOWN_HINTS)}</ul>
        </details>
      )}
    </>
  );
}

export function ErrorsSection({ analysis }: { analysis: Analysis }) {
  const { errorSummary: summary, errors, hints } = analysis;
  const problems = analysis.rows
    .filter((row) => row.level === "nochNicht" || row.level === "wackelt")
    .sort((a, b) => (a.estimate ?? 0) - (b.estimate ?? 0) || b.history.length - a.history.length);
  const errorsOf = (id: string): ClassifiedError[] =>
    errors.filter((error) => error.vocab?.id === id).reverse().slice(0, SHOWN_ERRORS);

  return (
    <Section id="fehler" title="Wo hakt es?">
      {summary.total === 0 ? (
        <p className="muted">Noch keine falschen Antworten mit getippter Eingabe.</p>
      ) : (
        <>
          <p className="lead">
            Von {formatNumber(summary.total)} {summary.total === 1 ? "Fehler" : "Fehlern"}{" "}
            {summary.lenient === 1 ? "wäre" : "wären"} <strong>{formatNumber(summary.lenient)}</strong> bei lockerer
            Bewertung richtig gewesen ({formatPercent(summary.lenient / summary.total)}): Kleinigkeit, Kurzform oder „to“.
          </p>
          <Plot
            label="Fehlerarten"
            height={280}
            data={[
              {
                type: "bar",
                orientation: "h",
                y: ERROR_KINDS.map((kind) => `${ERROR_LABELS[kind]}: ${ERROR_DESCRIPTIONS[kind]}`),
                x: ERROR_KINDS.map((kind) => summary.counts[kind]),
                marker: { color: ERROR_KINDS.map((kind) => ERROR_COLORS[kind]) },
                text: ERROR_KINDS.map((kind) => String(summary.counts[kind])),
                textposition: "auto",
                hovertemplate: "%{y}: %{x}<extra></extra>",
              },
            ]}
            layout={{
              showlegend: false,
              margin: { t: 10, r: 20, b: 30, l: 380 },
              yaxis: { autorange: "reversed", automargin: true },
              xaxis: countAxis("Fehler", Math.max(...Object.values(summary.counts))),
            }}
          />
        </>
      )}

      <h3>Nochmal ansehen</h3>
      {hints.solutions.length === 0 && hints.questions.length === 0 && (
        <p className="muted">Zurzeit nichts auffällig.</p>
      )}
      {hints.solutions.length > 0 && (
        <>
          <p>
            <strong>Weitere Lösung erlauben oder Bewertung lockern?</strong> Hier waren die Fehler überwiegend
            Kleinigkeiten:
          </p>
          <ShortList
            items={hints.solutions.map((hint) => (
              <li key={hint.vocab.id}>
                „{hint.vocab.card.key}“ ({hint.vocab.card.frage}): {hint.lenient} von {hint.total} Fehlern, getippt{" "}
                {hint.examples.map((example) => `„${example}“`).join(", ")}
              </li>
            ))}
          />
        </>
      )}
      {hints.questions.length > 0 && (
        <>
          <p>
            <strong>Ist die deutsche Frage eindeutig?</strong> Hier wurde die Lösung einer anderen Vokabel getippt:
          </p>
          <ShortList
            items={hints.questions.map((hint) => (
              <li key={`${hint.vocab.id}→${hint.confusedWith.id}`}>
                Gefragt „{hint.vocab.card.frage}“ ({hint.vocab.card.key}), getippt „{hint.confusedWith.card.key}“ (Lösung
                von „{hint.confusedWith.card.frage}“){hint.count > 1 && `, ${hint.count}×`}
              </li>
            ))}
          />
        </>
      )}

      <h3>Problemvokabeln</h3>
      {problems.length === 0 ? (
        <p className="muted">Keine Vokabel in „noch nicht“ oder „wackelt“.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Vokabel</th>
                <th>Frage</th>
                <th>Stufe</th>
                <th>Letzte 5</th>
                <th>Zuletzt getippt (neueste zuerst)</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((row) => (
                <tr key={row.vocab.id}>
                  <td>{row.vocab.card.key}</td>
                  <td>{row.vocab.card.frage}</td>
                  <td>
                    <LevelChip level={row.level} />
                  </td>
                  <td>
                    <Dots history={row.history} />
                  </td>
                  <td>
                    {errorsOf(row.vocab.id).map((error, i) => (
                      <span key={i} className="typed">
                        <span className="mono">„{error.typed}“</span>{" "}
                        <span className="chip small" style={{ background: ERROR_COLORS[error.kind] }}>
                          {ERROR_LABELS[error.kind]}
                        </span>
                      </span>
                    ))}
                    {errorsOf(row.vocab.id).length === 0 && <span className="muted">nur nachgetragene Fehler</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}
