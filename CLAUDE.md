# Vokabeltrainer – Arbeitsregeln für Claude Code

Statische Lern-Website (HTML, CSS, Vanilla-JavaScript als ES-Module) für das iPhone. Dazu in `auswertung/` eine Auswertung für die Eltern am Computer (TypeScript, React, Vite). Fachliche Spezifikation: [PLAN.md](PLAN.md). Die Abschnitte „Stand: …“ oben haben Vorrang vor dem Rest, der neueste zuerst.

## Zusammenarbeit

- Der Nutzer ist erfahrener Python-Entwickler und neu in JavaScript. Neue JS-Konzepte kurz mit einem Python-Vergleich erklären.
- Fragen im Text stellen, keine Auswahl-Popups.
- Umfang erst im Ping-Pong klären, dann bauen.
- **Git: Commits und Pushes macht nur der Nutzer.** Keine verändernden Git-Befehle ausführen, sondern Commit-Befehle zum Kopieren vorschlagen.
- Keine neuen Abhängigkeiten oder Tools ohne Rückfrage. Installationen, die sudo brauchen, führt der Nutzer selbst aus; vorab sagen, was gebraucht wird.
- Nur die Dateien ändern, die für die Aufgabe nötig sind.
- **Keine persönlichen Daten** (z. B. den Namen des Kindes) in Code, Dateien, Testdaten oder Commit-Nachrichten. Das Repo ist öffentlich. Echte Sicherungsdateien (`vokabeltrainer-*.json`) nie ins Repo, Testdaten immer erfinden.

## Code

- Hauptgerät ist das iPhone (Safari). Mobil zuerst denken.
- `js/logic.js`: reine Funktionen ohne DOM. `js/storage.js`: localStorage, jeder Zugriff in try/catch. `js/app.js`: DOM und Events.
- Bezeichner englisch. Datenfelder der Listen deutsch (`titel`, `fach`, `items`, `de`, `en`, `durchlauf`). UI-Texte und Kommentare deutsch.
- App (alles außerhalb von `auswertung/`): keine Frameworks, kein Build-Step, keine npm-Pakete.
- iOS-Tastatur: `focus()` nur synchron im Tipp-/Submit-Handler aufrufen. Das Eingabefeld während der Abfrage nie `disabled` machen oder blurren.
- Auswertung (`auswertung/`): TypeScript, React, Vite, Plotly; Tests mit Vitest. Reine Logik in `src/analysis/` (mit Unit-Tests daneben), Oberfläche in `src/components/`. Die Logik der App kommt typisiert über `src/analysis/app-logic.ts` aus `js/logic.js`, nicht kopieren. Weitere npm-Pakete nur nach Rückfrage.

## Umgebung und Befehle

- WSL2 im NAT-Modus: `localhost` funktioniert im Windows-Browser, das iPhone erreicht WSL aber nicht. Getestet wird am iPhone über GitHub Pages.
- Lokal starten: `make serve` (`python3 tools/serve.py`, ohne Browser-Cache), dann <http://localhost:8000>. Auswertung: `make auswertung`, dann <http://localhost:5173>
- Tests: `make test` = `make unit` (`node --test`, für `js/logic.js`) + `make auswertung-test` (Typprüfung und Vitest) + `make e2e` (baut die Auswertung, dann `uv run --with pytest-playwright pytest tests/e2e`, pytest-Optionen über `ARGS="..."`)
- Neue Logik in `js/logic.js` bekommt Unit-Tests in `tests/logic.test.js`.
- Veröffentlichung: GitHub Actions (`.github/workflows/pages.yml`) testet, baut die Auswertung und veröffentlicht App und Auswertung nach jedem Push auf `main`.

## Inhalte

- Vokabeln kommen als Fotos in den Chat. Daraus `lists/<id>.json` anlegen (Format wie `lists/en-pick-up-a.json`) und die ID in `lists/index.json` eintragen.
- Alles wörtlich übernehmen, nichts kürzen, keine Wörter weglassen. Mehrere deutsche Bedeutungen als einzelne Einträge in `de`.
