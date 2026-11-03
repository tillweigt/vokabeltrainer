import type { Analysis } from "../analysis/analyze";
import { isConsistent } from "../analysis/checks";
import { formatDate, formatDateTime, formatNumber } from "../format";
import { Section } from "./Common";

export function Overview({ analysis }: { analysis: Analysis }) {
  const { files, entries } = analysis.dataset;
  return (
    <p className="overview">
      {files.length === 1 ? "1 Datei" : `${files.length} Dateien`} geladen, neueste vom{" "}
      {formatDateTime(files[files.length - 1].exportiert)} · {formatNumber(entries.length)} Einträge im Protokoll
      {analysis.lastDate && <> · letzte Antwort am {formatDate(analysis.lastDate)}</>}
    </p>
  );
}

export function DataCheckSection({ analysis }: { analysis: Analysis }) {
  const { check } = analysis;
  const starsDiffer = check.starsApp !== check.starsProtocol;
  return (
    <Section id="pruefung" title="Datenprüfung">
      {isConsistent(check) ? (
        <p className="ok">
          ✓ Alles stimmig: Das Protokoll ergibt genau den Verlauf jeder Vokabel und den Kontostand der App (
          {formatNumber(check.starsProtocol)} Sterne).
        </p>
      ) : (
        <div className="warning">
          <p>
            <strong>Protokoll und App passen nicht zusammen.</strong> Wahrscheinlich fehlen Sicherungsdateien. Eine
            einzelne fehlende Datei schadet nicht, weil sich die Dateien überlappen, zwei hintereinander schon. Die
            Auswertung kann deshalb unvollständig sein.
          </p>
          {starsDiffer && (
            <p>
              Sterne laut Protokoll: {formatNumber(check.starsProtocol)}, laut App:{" "}
              {check.starsApp === null ? "unbekannt" : formatNumber(check.starsApp)}.
            </p>
          )}
          {check.mismatches.length > 0 && (
            <details>
              <summary>{check.mismatches.length} Vokabeln mit abweichendem Verlauf</summary>
              <table className="table compact">
                <thead>
                  <tr>
                    <th>Liste</th>
                    <th>Vokabel</th>
                    <th>Protokoll</th>
                    <th>App</th>
                  </tr>
                </thead>
                <tbody>
                  {check.mismatches.map((m) => (
                    <tr key={`${m.listId}|${m.key}`}>
                      <td>{m.listId}</td>
                      <td>{m.key}</td>
                      <td className="mono">{m.protocol || "–"}</td>
                      <td className="mono">{m.app || "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
        </div>
      )}
      {check.starsReconstructed > 0 && (
        <p className="note">
          Davon {formatNumber(check.starsReconstructed)} Sterne für nachgetragene Antworten (vor dem Protokoll) mit der
          Formel der App nachgerechnet.
        </p>
      )}
    </Section>
  );
}
