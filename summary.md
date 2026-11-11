# Übergabe Vokabeltrainer – Stand 11.11.2026

Diese Datei ist die vollständige Übergabe aus einer langen Claude-Code-Session an eine neue Session **ohne Kontext**. Das Projekt wurde nur verschoben (neuer Ort unterhalb von `/home/tillweigt/code/perpetuum`), sonst ist alles gleich: gleiches Git-Repo, gleiches GitHub-Repo, gleiche Veröffentlichung. Till hat die Datei aus dem Chat übernommen, weil ein Hook der alten Session jedes Schreiben verboten hat.

---

## 0. Für die neue Session: so anfangen

1. Lesen, in dieser Reihenfolge: diese Datei, `CLAUDE.md` (Arbeitsregeln), `PLAN.md` (die Abschnitte „Stand: …“ ganz oben, neuester zuerst, haben Vorrang), `README.md`.
2. Stand prüfen: `git status`, `git log --oneline -5` (letzter bekannter Commit: `023aa95 Auswertung: TypeScript/React-Seite …`, auf `main` gepusht), dann `make test` (alles muss grün sein, siehe Abschnitt 4).
3. Falls nach dem Umzug etwas mit den npm-Paketen hakt: `rm -rf auswertung/node_modules` und `make auswertung-test` (installiert per `npm ci` neu, ohne sudo).
4. Dann die **geplante Umsetzung in Abschnitt 7** bauen. Till hat alles entschieden und „in einem Schritt“ freigegeben; im Zweifel kurz bestätigen lassen.
5. Am Ende jeder Antwort mit Dateiänderungen: Abschnitt **„Geänderte Dateien“** (Datei, was, warum) – Tills globale Vorgabe, er liest kein `git diff`.

Die alte Session liegt (falls lesbar) unter
`/home/tillweigt/.claude/projects/-home-tillweigt-code-vokabeltrainer/37305725-696b-4513-9368-fc90d1273c6a.jsonl` – nur als Notnagel, diese Datei soll reichen.

---

## 1. Projekt in Kürze

- Vokabeltrainer als **statische Website fürs iPhone** von Tills Tochter (Grundschule/Unterstufe, Englisch aus dem Schulbuch). Sie nutzt die App vom Home-Bildschirm (Safari).
- Live: <https://tillweigt.github.io/vokabeltrainer/>, Auswertung für Till: <https://tillweigt.github.io/vokabeltrainer/auswertung/>
- GitHub: öffentliches Repo `tillweigt/vokabeltrainer`. **Öffentlich → keine persönlichen Daten** (kein Name des Kindes, keine echten Sicherungsdateien).
- App: Vanilla JavaScript (ES-Module), HTML, CSS, **kein Framework, kein Build, keine npm-Pakete**.
- Auswertung (`auswertung/`): TypeScript, React, Vite, Plotly; Tests mit Vitest. Läuft am Computer, liest Sicherungsdateien nur im Browser.
- Veröffentlichung: GitHub Actions (`.github/workflows/pages.yml`) nach jedem Push auf `main` (Pages-Quelle ist auf „GitHub Actions“ umgestellt).

---

## 2. Zusammenarbeit mit Till

- Antworten auf **Deutsch, Anrede „du“**. Till ist **erfahrener Python-Entwickler**, neu in JavaScript/TypeScript. Neue JS/TS-Konzepte kurz **mit Python-Vergleich** erklären (z. B. `useMemo` ≈ `lru_cache`, `Promise.all` ≈ `asyncio.gather`, `package-lock.json` ≈ `uv.lock`).
- **Fragen im Text stellen, nie als Auswahl-Popup** (kein AskUserQuestion).
- **Umfang erst im Ping-Pong klären, dann bauen.** Till sagt ausdrücklich „Umsetzen“/„Loslegen“/„in einem Schritt“, wenn gebaut werden soll; „noch nicht anfangen“ heißt nur planen. Fragen gern mit Buchstaben/Nummern (a, b, c …); Till antwortet knapp („a passt; b …“), oft mit Tippfehlern – wohlwollend lesen, bei echter Mehrdeutigkeit nachfragen.
- **Git: Commits und Pushes macht nur Till.** Keine verändernden Git-Befehle; stattdessen Befehle zum Kopieren vorschlagen:
  ```bash
  git add -A
  git commit -m "…"
  git push
  ```
- **Keine neuen Abhängigkeiten/Tools ohne Rückfrage.** sudo-Installationen macht Till selbst; vorher sagen, was gebraucht wird.
- Nur nötige Dateien ändern. Jede Antwort mit Änderungen endet mit **„Geänderte Dateien“**.
- Empfehlungen geben statt Optionen ohne Wertung. Ehrlich berichten (Testergebnisse, Fehler, eigene Irrtümer korrigieren).
- Tills Lernziele (Hintergrund): TypeScript im Detail lernen (die Auswertung war der Einstieg), später App Store lernen (React Native/Expo). Bücher: Ousterhout „A Philosophy of Software Design“ ist sein Lieblingsbuch; er liest gerade Saltzer/Kaashoek „Principles of Computer System Design“ (Tipp gegeben: Kapitel 7–11 frei als PDF bei MIT OCW 6.033; Papers: Parnas 1972, End-to-End Arguments, Lampson „Hints“, Brooks „No Silver Bullet“).

---

## 3. Umgebung

- Windows 11 + **WSL2 (Ubuntu 24.04) im NAT-Modus**: `localhost` geht im Windows-Browser, das iPhone erreicht WSL nicht → **am iPhone wird über GitHub Pages getestet**.
- Node 22.19, npm 11.6, Python 3 + `uv`, Playwright-Chromium ist installiert (für `pytest-playwright`), `gh` CLI ist angemeldet (tillweigt).
- **Hook** `/etc/claude-code/hooks/grenze.py`: Claude Code darf nur unterhalb von `/home/tillweigt/code/perpetuum` arbeiten (sperrt Befehle und Schreiben) – deshalb der Umzug. Nicht umgehen; bei Sperren Till fragen.
- Sandbox mit Netz-Proxy möglich: npm-Registry und GitHub-API waren bisher erreichbar.
- Umzug auf ein MacBook ist geplant (später).
- Alle Pfade im Projekt sind relativ (Makefile, `tools/serve.py`, `tests/e2e/conftest.py`, `auswertung/vite.config.ts` mit `fs.allow: [".."]`) – der Umzug sollte nichts brechen.

### Befehle (`make` ohne Ziel zeigt die Übersicht)

| Befehl | Was |
|---|---|
| `make serve` | App lokal, `python3 tools/serve.py` ohne Browser-Cache, <http://localhost:8000> |
| `make auswertung` | Auswertung lokal (Vite), <http://localhost:5173> |
| `make test` | `unit` + `auswertung-test` + `e2e` |
| `make unit` | `node --test tests/*.test.js` (App-Logik) |
| `make auswertung-test` | Typprüfung (`tsc`) + Vitest |
| `make auswertung-build` | Build nach `auswertung/dist` |
| `make e2e` | baut die Auswertung, dann `uv run --with pytest-playwright pytest tests/e2e` (`ARGS="…"` für pytest, z. B. `--headed --slowmo 300`) |

Prozesse nie mit `pkill` beenden (hat einmal die eigene Shell beendet), sondern per PID.

---

## 4. Stand der Software

Details zu allen Funktionen stehen in `PLAN.md` („Stand: …“-Abschnitte) und `README.md`. Kurzfassung:

### App (Wurzelordner)
- `js/logic.js`: reine Funktionen (mit Unit-Tests in `tests/logic.test.js`). `js/storage.js`: localStorage, Präfix `vokabeltrainer:v1`, jeder Zugriff in try/catch. `js/app.js`: DOM und Events. `index.html`, `style.css`.
- Listen in `lists/<id>.json`, Reihenfolge in `lists/index.json` = `["en-pick-up-a", "en-unit-1"]`. Felder: `id`, `titel`, `fach`, `typ` („vokabel“), `durchlauf`, `items: [{en, de: [...]}]`. en-pick-up-a hat 24 Vokabeln, en-unit-1 („Unit 1 – It's fun at home“, S. 189/190) 29.
- Abfrage Deutsch → Englisch, **streng** (Groß/klein und Satzzeichen zählen; nur iPhone-Apostroph/Anführungszeichen und Platzhalter „…“ werden ausgeglichen, siehe `normalize`). Mehrdeutigkeit (gleiche deutsche Bedeutung) bisher **nur innerhalb einer Liste** (`buildCards`).
- Einzelne Liste: Durchgänge, jede offene Vokabel einmal pro Durchgang, 3× richtig = geschafft (Fehler setzen nichts zurück), dann 🏆 +1 und neue Runde; Stufen-Anzeige ○○○ … ●●●.
- Super-Liste „🔀 Alle Englisch-Vokabeln“ (Fach Englisch): Portionen zu 5, gezogen proportional zum Gewicht `(F+1)/(n+2)` über die letzten 5 Antworten; angefangene Portion wird fortgesetzt. Antworten zählen nur für den Verlauf, nicht für Punkte/Runden der Listen.
- Verlauf pro Vokabel (`R`/`F`), dauerhaft. Sterne: `⌈8·2^(−k/3)⌉` (k = bisher richtige Antworten der Vokabel), 🏆-Bonus = Anzahl Vokabeln der Liste, Einlösen mit Rückfrage, letzte 3 Einlösungen.
- 🔊 Vorlesen nach dem Prüfen (Web Speech, en-GB).
- Versteckter Eltern-Bereich (5× auf die Überschrift tippen): Sichern über das Teilen-Menü in einen geteilten iCloud-Ordner (Datei `vokabeltrainer-JJJJ-MM-TT-HHMM.json`), Wiederherstellen mit Vergleich, Anzeige „Letzte Sicherung“ und „Im Protokoll: N Einträge“.
- Antwortprotokoll (`vokabeltrainer:v1:protokoll`): Einträge für Antwort/Runde/Einlösung mit Feldern `art, zeit, liste, vokabel, frage, getippt, richtig, modus, sterne, nachgetragen`; nach jeder Sicherung werden die schon in der vorletzten Sicherung enthaltenen Einträge gelöscht (Überlappung; eine einzelne fehlende Datei schadet nicht, zwei hintereinander schon); Obergrenze 5000; Altdaten einmalig nachgetragen (31.10.2026 ab 10:00).
- iOS-Fallstricke (wichtig bei jeder UI-Änderung): `focus()` nur synchron im Tipp-/Submit-Handler; Eingabefeld nie `disabled`/blur; Return (`insertLineBreak`) in der `beforeinput`-Sperre durchlassen; `mousedown`-preventDefault auf Knöpfen; Schrift ≥ 16 px; Dateiauswahl über `<label for>`.

### Auswertung (`auswertung/`)
- `src/analysis/`: reine Logik mit Tests daneben (`*.test.ts`): `data.ts` (Einlesen, Zusammenführen ohne Doppelte), `replay.ts` (Protokoll nachspielen, Sterne nachgetragener Antworten mit `starsFor`), `checks.ts` (Datenprüfung gegen Verlauf und Kontostand), `usage.ts` (Einheiten: Ende nach >10 min Pause; Zeitstrahl 14 Tage; Durchschnitte), `mastery.ts` (Können `(R+1)/(n+2)` über letzte 5; Stufen sitzt/meistens/wackelt/noch nicht/nie), `errors.ts` (Fehlerarten Kleinigkeit/Kurzform/„to“/Verwechslung/Tippfehler/falsch, eigene Levenshtein-Funktion, Hinweise „Nochmal ansehen“), `appcheck.ts`, `stars.ts`, `analyze.ts` (setzt alles zusammen), `vocab.ts` (Katalog, Bereiche), `testdata.ts`/`testdevice.ts` (erfundene Testdaten, simuliertes iPhone).
- **`src/analysis/app-logic.ts` ist die typisierte Brücke zu `js/logic.js`** – App-Logik nie kopieren.
- `src/lists.ts` packt die Listen beim Bauen ein (`import.meta.glob`).
- `src/components/`: React-Abschnitte und eine eigene kleine Plotly-Hülle (`Plot.tsx`).
- Versionen: Vite 8.3, React 19.3, TypeScript 7.0, Vitest 5.1, plotly.js-dist-min 4.2 (bringt eigene Typen mit), @vitejs/plugin-react 6.2, fastest-levenshtein (nur Tests, Differenztest gegen die eigene Levenshtein-Funktion).
- Mit Tills echter Sicherung vom 2.11. geprüft: Datenprüfung stimmig, 308 Sterne, davon 217 für nachgetragene Antworten nachgerechnet, 55 Protokolleinträge.

### Tests (letzter Lauf, alle grün)
- `make unit`: 92 · `make auswertung-test`: 86 (+ Typprüfung) · `make e2e`: 59 (57 App im simulierten iPhone 13, 2 Auswertung am Desktop).
- E2E-Fixtures: `tests/e2e/conftest.py` startet `http.server`, `mini_list`-Fixture ersetzt die echten Listen durch eine Testliste (`test-mini`).

### Veröffentlichung
- `.github/workflows/pages.yml`: checkout v7, setup-node v7 (Node 22, npm-Cache), App-Unit-Tests, `npm ci` + Typprüfung + Vitest + Build der Auswertung, `_site` aus `index.html style.css js lists` + `auswertung/dist` → `_site/auswertung`, dann configure-pages v6, upload-pages-artifact v5, deploy-pages v5. Erster Lauf am 3.11. erfolgreich (~1 min). Schlägt etwas fehl, bleibt die alte Version online. E2E läuft nur lokal.
- `.gitignore`: `node_modules/`, `auswertung/dist/`, `vokabeltrainer-*.json` (echte Sicherungen).

---

## 5. Wichtige Entscheidungen (Kurzchronik)

- 27.10. MVP, Durchgänge, 3× richtig, 🏆-Runden. 29.10. Verlauf und Super-Liste. 30.10. Sterne, Vorlesen. 31.10. Datensicherung (Stufe 1 von Hand nach iCloud; Stufe 2 später: Google Apps Script → Google Drive), Antwortprotokoll. 3.11. Auswertung mit TypeScript/React, GitHub Actions.
- Bewertung bleibt **streng** („Nein strikt mit to“); „fast richtig“ bleibt in der App falsch. Die Auswertung zeigt nur, wo eine weitere Lösung oder klarere Frage helfen könnte.
- Sprache für die Zukunft: **TypeScript** (universell; Swift/Dart/Kotlin verworfen). Vorgemerkt in `PLAN.md`: App auf TypeScript/React umstellen; App Store über React Native/Expo (Apple Developer Program 99 €/Jahr, TestFlight; Schulbuch-Listen wären in einer öffentlichen App heikel).
- Auswertung: alles, was in `PLAN.md` „Stand: Auswertung“ steht; Tippfehler-Grenze: bis 2 Zeichen keiner, bis 4 Zeichen einer, sonst zwei.

---

## 6. Daten und Datenschutz

- Echte Sicherungsdateien liegen nur im geteilten iCloud-Ordner „Vokabeltrainer“ (Till hat Zugriff), **nie im Repo**. Testdaten immer erfinden (auch keine echten Eingaben des Kindes als Testbeispiele).
- Safari und die Home-Bildschirm-App haben getrennte Speicher; gesichert wird aus der Home-Bildschirm-App. Der Speicher hängt an der Adresse `tillweigt.github.io` → Veröffentlichung über Actions ändert nichts an den Daten.

---

## 7. Nächste Aufgabe: geplante Umsetzung (entschieden am 11.11.2026, „in einem Schritt“)

### 7.1 Neue Liste aus den Schulbuch-Seiten 191–192 (Unit 1, Fortsetzung)

Till hat ein PDF mit zwei Fotos geschickt (nicht im Projekt). Die Abschrift ist geprüft; Entscheidungen:
- eigene Liste für beide Seiten, Titel **„Unit 1 – Teil 2 (S. 191–192)“**, ID **`en-unit-1-teil-2`**, an `lists/index.json` anhängen
- „child, children (pl) = Kind“ → **zwei Einträge**: `child` = Kind, `children` = Kinder
- „there's (= there is)“ → `en: "there's"` plus **`auch: ["there is"]`** (beide richtig)
- „to listen (to)“ → `en: "to listen to"` plus **`auch: ["to listen"]`** (beide richtig)
- `Mr` **ohne Punkt**, wie im Buch; `Thanks.` und `Look!` mit Satzzeichen
- deutsche Zusätze **wörtlich** („Herr (Anrede)“, „ihr/-e (Pl.)“, „Traum-“ usw.); Semikolon im Buch = getrennte `de`-Einträge, Schrägstriche bleiben in einem Eintrag
- Lautschrift, Beispielsätze, Hinweise (!) und Übungsnummern nicht übernehmen

Inhalt von `lists/en-unit-1-teil-2.json` (58 Vokabeln, Reihenfolge wie im Buch; „…“ ist das Unicode-Zeichen U+2026 wie in den anderen Listen, Apostroph ASCII):

```json
{
  "id": "en-unit-1-teil-2",
  "titel": "Unit 1 – Teil 2 (S. 191–192)",
  "fach": "Englisch",
  "typ": "vokabel",
  "durchlauf": 1,
  "items": [
    { "en": "father", "de": ["Vater"] },
    { "en": "English", "de": ["englisch", "Englisch", "aus England", "Engländer/-in"] },
    { "en": "mother", "de": ["Mutter"] },
    { "en": "cousin", "de": ["Cousin/Cousine"] },
    { "en": "… is an only child", "de": ["… ist ein Einzelkind"] },
    { "en": "like", "de": ["wie"] },
    { "en": "dad", "de": ["Papa", "Vati"] },
    { "en": "always", "de": ["immer", "ständig"] },
    { "en": "easy", "de": ["einfach", "leicht"] },
    { "en": "our", "de": ["unser/-e"] },
    { "en": "uncle", "de": ["Onkel"] },
    { "en": "aunt", "de": ["Tante"] },
    { "en": "grandad", "de": ["Opa", "Opi"] },
    { "en": "grandma", "de": ["Oma", "Omi"] },
    { "en": "Tell me about …", "de": ["Erzähle/Erzählt mir von …"] },
    { "en": "guinea pig", "de": ["Meerschweinchen"] },
    { "en": "quiet", "de": ["still", "ruhig", "leise"] },
    { "en": "small", "de": ["klein"] },
    { "en": "child", "de": ["Kind"] },
    { "en": "children", "de": ["Kinder"] },
    { "en": "boring", "de": ["langweilig"] },
    { "en": "lucky number", "de": ["Glückszahl"] },
    { "en": "problem", "de": ["Problem", "Schwierigkeit"] },
    { "en": "part", "de": ["Teil", "Stadtteil"] },
    { "en": "end", "de": ["Ende", "Schluss"] },
    { "en": "long", "de": ["lang"] },
    { "en": "road", "de": ["Straße"] },
    { "en": "garden", "de": ["Garten"] },
    { "en": "in front of", "de": ["vor"] },
    { "en": "behind", "de": ["hinter"] },
    { "en": "only", "de": ["erst", "bloß", "nur"] },
    { "en": "Mr", "de": ["Herr (Anrede)"] },
    { "en": "now", "de": ["jetzt", "nun"] },
    { "en": "there's", "auch": ["there is"], "de": ["es gibt"] },
    { "en": "car", "de": ["Auto"] },
    { "en": "everywhere", "de": ["überall"] },
    { "en": "again", "de": ["wieder", "noch einmal", "noch mal"] },
    { "en": "Look!", "de": ["Schau/Schaut mal!"] },
    { "en": "floor", "de": ["Fußboden"] },
    { "en": "next to", "de": ["neben"] },
    { "en": "thing", "de": ["Ding", "Sache"] },
    { "en": "to listen to", "auch": ["to listen"], "de": ["zuhören", "anhören"] },
    { "en": "idea", "de": ["Idee", "Einfall"] },
    { "en": "loft", "de": ["Dachboden"] },
    { "en": "own", "de": ["eigene/-r/-s"] },
    { "en": "toy", "de": ["Spielzeug"] },
    { "en": "very", "de": ["sehr"] },
    { "en": "happy", "de": ["glücklich", "froh", "fröhlich"] },
    { "en": "fantasy", "de": ["Fantasie", "Traum-"] },
    { "en": "to play", "de": ["spielen"] },
    { "en": "cheese", "de": ["Käse"] },
    { "en": "fridge", "de": ["Kühlschrank"] },
    { "en": "their", "de": ["ihr/-e (Pl.)"] },
    { "en": "can", "de": ["können", "dürfen"] },
    { "en": "when", "de": ["wenn", "wann", "als"] },
    { "en": "to see", "de": ["sehen"] },
    { "en": "Thanks.", "de": ["Danke."] },
    { "en": "home", "de": ["Zuhause", "Heim"] }
  ]
}
```

Bekannte Überschneidung mit anderen Listen: „klein“ (`small` hier, `little` in `en-unit-1`). Nach dem Anlegen alle Überschneidungen deutscher Bedeutungen über alle Englisch-Listen per Skript auflisten und Till nennen.

### 7.2 App-Änderung: Mehrdeutigkeit über alle Listen eines Fachs + Feld `auch`

Entschieden:
- **Neues optionales Feld `auch: string[]`** pro Vokabel: weitere richtige Schreibweisen (Varianten aus dem Buch). Die heutige App ignoriert das Feld; mit der Änderung zählt es.
- **Richtig ist jede Lösung aus allen Listen desselben Fachs** (`fach`, z. B. Englisch), deren deutsche Bedeutungen sich mit denen der Frage überschneiden (exakter Vergleich der `de`-Einträge wie bisher), plus deren `auch`-Varianten – **in beiden Modi** (einzelne Liste und Super-Liste), damit dieselbe Frage überall gleich bewertet wird.
- Reihenfolge der erlaubten Antworten (`card.antworten`): eigene Lösung `en` zuerst, dann eigene `auch`, dann Alternativen aus derselben Liste, dann aus anderen Listen; ohne Doppelte.
- **Nur eine Lösung muss getippt werden; danach werden alle gezeigt:** nach einer **richtigen** Antwort zusätzlich „Auch richtig: …“ mit den übrigen gültigen Lösungen (ohne die getippte), nach einer **falschen** wie bisher „Richtig wäre: …“ plus „Auch richtig: …“. Das gilt für jede Karte mit mehreren Lösungen (auch die bestehenden Fälle innerhalb einer Liste wie „Ich heiße …“).
- Sterne und Verlauf zählen wie bisher für die **gefragte** Vokabel. 🔊 liest weiter die eigene Lösung (`en`).
- Alte Protokolleinträge bleiben, wie sie sind.

Umsetzungshinweise:
- `js/logic.js`: `buildCards(list)` erweitern, z. B. `buildCards(list, related = [list])` mit `related` = alle Listen desselben Fachs; `auch` einbeziehen. Unit-Tests in `tests/logic.test.js` (Fach-übergreifend, `auch`, Reihenfolge, keine Doppelten, andere Fächer zählen nicht).
- `js/app.js`: überall, wo Karten gebaut werden (einzelne Liste und `mixCards()`), die Listen desselben Fachs mitgeben (`MIX_SUBJECT = "Englisch"` gibt es schon). `showFeedback()` um „Auch richtig“ nach richtigen Antworten ergänzen (bestehende Anzeige für falsche Antworten vorher ansehen; `.also`-Stil existiert). `backfillProtocol` nutzt `buildCards` nur für die Frage – prüfen, dass nichts bricht.
- Auswertung: `auswertung/src/analysis/types.ts` (`VocabItem.auch?: string[]`), `app-logic.ts` (Signatur von `buildCards`), `vocab.ts` (`catalog` mit Listen desselben Fachs aufrufen, damit die Auswertung wie die App bewertet), `errors.ts` prüfen (`solutionIndex` ggf. mit `auch`-Varianten). Detail zum Klären mit Till, falls relevant: alte falsche Antworten, die nach neuer Regel richtig wären, landen in der Fehlerart „Kleinigkeit“.
- E2E (`tests/e2e/test_app.py`): z. B. zweite Mini-Liste mit gleicher deutscher Bedeutung → in Super-Liste und einzelner Liste gilt die andere Lösung; „Auch richtig“ erscheint nach richtiger Antwort; `auch`-Variante wird akzeptiert. Prüfen, ob Tests die echten Listen zählen (Helfer `real_lists`, Texte wie „N Vokabeln aus M Listen“) und mit der neuen Liste anpassen.
- Doku: neuer Abschnitt ganz oben in `PLAN.md` „Stand: Mehrdeutigkeit über Listen und Varianten (festgelegt am 11.11.2026)“ (ersetzt den Punkt „Geparkt: Mehrdeutigkeit über Listen hinweg“ im Abschnitt „Verlauf und Super-Liste“); `README.md` (Listenformat mit `auch`, Mehrdeutigkeit); `CLAUDE.md`, Abschnitt Inhalte: `auch` für Buch-Varianten wie „there's (= there is)“ oder „(to)“, deutsche Zusätze wörtlich, Formen wie „child, children“ als zwei Einträge.
- Danach `make test` komplett, Ergebnisse ehrlich berichten, Commit-Vorschlag, „Geänderte Dateien“.

Vorschlag Commit-Nachricht: `Unit 1 Teil 2 (S. 191–192); Mehrdeutigkeit über alle Listen eines Fachs, Varianten mit "auch", "Auch richtig" nach jeder Antwort`

---

## 8. Vorgemerkt und geparkt (nur auf Tills Ansage)

- `PLAN.md` „Vorgemerkt für später“: (1) App auf TypeScript/React umstellen (Lernmodus offen, Empfehlung Coaching; React fürs Web oder gleich React Native/Expo), (2) App Store (TestFlight zuerst; offen: öffentlich oder nur Familie, Android, MacBook).
- Datensicherung Stufe 2: automatisches Hochladen nach Google Drive über ein Apps Script, gleiches Dateiformat.
- Geparkt: Test-Modus mit mehreren ausgewählten Listen, Anzeige des Verlaufs in der App, Ideen in `PLAN.md` Abschnitt 14.

---

## 9. Bekannte Fallstricke

- GitHub Pages cacht etwa 10 Minuten; Listen lädt die App mit `fetch(…, {cache: "no-cache"})`. Browser-Cache bei lokalen Tests: `make serve` sendet `no-store`.
- Unter `make serve` zeigt `/auswertung/` nur den Quellcode-Einstieg; lokal die Auswertung mit `make auswertung` oder gebaut unter `/auswertung/dist/`.
- E2E-Tests für die Auswertung brauchen den Build (`make e2e` baut ihn automatisch).
- Die Auswertung sortiert das Protokoll nach Zeit; die App hängt in Echtzeit an, daher passt das.
- `ubuntu-latest` in Actions wechselt auf Ubuntu 26 – nur Hinweis, nichts zu tun.

---

## 10. Vorschlag für den ersten Prompt in der neuen Session

> Lies UEBERGABE.md, CLAUDE.md und die „Stand“-Abschnitte in PLAN.md. Prüf den Stand mit git status und make test. Dann setz Abschnitt 7 der Übergabe in einem Schritt um und melde dich mit Testergebnissen, Commit-Vorschlag und „Geänderte Dateien“.
