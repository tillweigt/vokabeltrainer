import { useMemo, useState } from "react";
import { analyze } from "./analysis/analyze";
import { readBackup, type LoadedFile } from "./analysis/data";
import { AppCheckSection } from "./components/AppCheck";
import { DataCheckSection, Overview } from "./components/DataCheck";
import { ErrorsSection } from "./components/Errors";
import { FileLoader } from "./components/FileLoader";
import { MasterySection } from "./components/Mastery";
import { StarsSection } from "./components/Stars";
import { UsageSection } from "./components/Usage";
import { LISTS } from "./lists";

const SECTIONS = [
  ["pruefung", "Datenprüfung"],
  ["nutzung", "Nutzung"],
  ["koennen", "Können"],
  ["fehler", "Fehler"],
  ["app", "App"],
  ["sterne", "Sterne"],
];

export function App() {
  const [files, setFiles] = useState<LoadedFile[]>([]);
  const [problems, setProblems] = useState<{ name: string; error: string }[]>([]);
  // Neu gerechnet wird nur, wenn sich die Dateien ändern
  const analysis = useMemo(() => (files.length > 0 ? analyze(files, LISTS) : null), [files]);

  async function load(selected: File[]) {
    const results = await Promise.all(selected.map(async (file) => readBackup(file.name, await file.text())));
    setFiles(results.flatMap((result) => ("file" in result ? [result.file] : [])));
    setProblems(results.flatMap((result) => ("error" in result ? [result] : [])));
  }

  return (
    <main>
      <header className="page-header">
        <h1>Auswertung Vokabeltrainer</h1>
        <FileLoader onFiles={(selected) => void load(selected)} />
        {problems.length > 0 && (
          <ul className="file-errors">
            {problems.map((problem) => (
              <li key={problem.name}>
                {problem.name}: {problem.error}
              </li>
            ))}
          </ul>
        )}
        {analysis && <Overview analysis={analysis} />}
      </header>

      {analysis ? (
        <>
          <nav className="nav">
            {SECTIONS.map(([id, title]) => (
              <a key={id} href={`#${id}`}>
                {title}
              </a>
            ))}
          </nav>
          <DataCheckSection analysis={analysis} />
          <UsageSection analysis={analysis} />
          <MasterySection analysis={analysis} />
          <ErrorsSection analysis={analysis} />
          <AppCheckSection analysis={analysis} />
          <StarsSection analysis={analysis} />
        </>
      ) : (
        <Intro />
      )}
    </main>
  );
}

function Intro() {
  return (
    <section className="section intro">
      <p>
        Wähle die Sicherungsdateien aus dem geteilten iCloud-Ordner, am besten <strong>alle</strong>. Die App löscht
        nach jeder Sicherung, was schon gesichert ist; erst alle Dateien zusammen ergeben das ganze Protokoll. Doppelte
        Einträge fallen von selbst weg.
      </p>
      <p className="muted">
        Die Dateien werden nur hier im Browser gelesen, nichts wird hochgeladen oder gespeichert.
      </p>
    </section>
  );
}
