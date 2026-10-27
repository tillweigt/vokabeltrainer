# Vokabeltrainer – Arbeitsregeln für Claude Code

Statische Lern-Website (HTML, CSS, Vanilla-JavaScript als ES-Module) für das iPhone. Fachliche Spezifikation: [PLAN.md](PLAN.md). Der Abschnitt „Stand: MVP“ dort hat Vorrang vor dem Rest.

## Zusammenarbeit

- Der Nutzer ist erfahrener Python-Entwickler und neu in JavaScript. Neue JS-Konzepte kurz mit einem Python-Vergleich erklären.
- Fragen im Text stellen, keine Auswahl-Popups.
- Umfang erst im Ping-Pong klären, dann bauen.
- **Git: Commits und Pushes macht nur der Nutzer.** Keine verändernden Git-Befehle ausführen, sondern Commit-Befehle zum Kopieren vorschlagen.
- Keine neuen Abhängigkeiten oder Tools ohne Rückfrage. Installationen, die sudo brauchen, führt der Nutzer selbst aus; vorab sagen, was gebraucht wird.
- Nur die Dateien ändern, die für die Aufgabe nötig sind.

## Code

- Hauptgerät ist das iPhone (Safari). Mobil zuerst denken.
- `js/logic.js`: reine Funktionen ohne DOM. `js/storage.js`: localStorage, jeder Zugriff in try/catch. `js/app.js`: DOM und Events.
- Bezeichner englisch. Datenfelder der Listen deutsch (`titel`, `fach`, `items`, `de`, `en`, `durchlauf`). UI-Texte und Kommentare deutsch.
- Keine Frameworks, kein Build-Step, keine npm-Pakete.
- iOS-Tastatur: `focus()` nur synchron im Tipp-/Submit-Handler aufrufen. Das Eingabefeld während der Abfrage nie `disabled` machen oder blurren.

## Umgebung und Befehle

- WSL2 im NAT-Modus: `localhost` funktioniert im Windows-Browser, das iPhone erreicht WSL aber nicht. Getestet wird am iPhone über GitHub Pages.
- Lokal starten: `python3 -m http.server 8000`, dann <http://localhost:8000>
- E2E-Tests: `uv run --with pytest-playwright pytest tests/e2e`

## Inhalte

- Vokabeln kommen als Fotos in den Chat. Daraus `lists/<id>.json` anlegen (Format wie `lists/en-pick-up-a.json`) und die ID in `lists/index.json` eintragen.
- Alles wörtlich übernehmen, nichts kürzen, keine Wörter weglassen. Mehrere deutsche Bedeutungen als einzelne Einträge in `de`.
