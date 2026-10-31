# Vokabeltrainer

Eine kleine Website zum Vokabellernen auf dem iPhone. Die deutsche Vokabel wird angezeigt, die englische Lösung muss eingetippt werden.

- **Einzelne Liste:** Jede offene Vokabel kommt pro Durchgang einmal. Nach 3× richtig ist sie geschafft. Sind alle geschafft, zählt 🏆 eine Runde, und es geht von vorn los.
- **🔀 Alle Englisch-Vokabeln:** Portionen zu 5 Karten aus allen Listen. Vokabeln, die zuletzt oft falsch waren, kommen öfter dran. Grundlage ist der Verlauf jeder Vokabel (`R`/`F`), Gewicht `(F + 1) / (n + 2)` über die letzten 5 Antworten. Eine angefangene Portion geht nach einer Pause weiter; wird zwischendurch in einer normalen Liste geantwortet, wird neu gezogen.
- **⭐ Sterne:** Jede richtige Antwort bringt `⌈8 · 2^(−k/3)⌉` Sterne (k = wie oft die Vokabel schon richtig war, also 8, 7, 6, 4, 4, 3, 2, …, mindestens 1). Fehler bringen nichts und kosten nichts. Für eine komplett geschaffte Liste (🏆) gibt es 1 Stern pro Vokabel extra. Auf der Startseite stehen der Kontostand, ein Feld zum Einlösen und die letzten 3 Einlösungen. Die Belohnung gibt es im echten Leben.
- **🔊 Anhören:** Nach dem Prüfen liest die eingebaute Sprachausgabe des iPhones die Lösung auf britischem Englisch vor, nur auf Knopfdruck. Ist nichts zu hören: Lautstärke und Stummschalter prüfen. Bessere Stimmen gibt es kostenlos unter *Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → Englisch*.
- **Eltern-Bereich (versteckt):** 5× schnell auf die Überschrift „Vokabeltrainer“ tippen. Dort lassen sich die Daten sichern und wiederherstellen, siehe unten.

Es gibt kein Framework, keinen Build-Schritt und keinen Server-Code: nur HTML, CSS, JavaScript und JSON-Dateien.

## Kurzbefehle

| Befehl | Was passiert |
|---|---|
| `make` | Übersicht der Befehle |
| `make serve` | Website lokal starten (anderer Port: `make serve PORT=8080`) |
| `make test` | Alle Tests: erst `make unit`, dann `make e2e` |
| `make unit` | Unit-Tests für `js/logic.js` (Node, eingebauter Test-Runner) |
| `make e2e` | Browser-Tests (zusehen: `make e2e ARGS="--headed --slowmo 300"`) |

## Starten

```bash
make serve
```

Dahinter steckt [tools/serve.py](tools/serve.py): ein kleiner Webserver auf Basis von Pythons `http.server`, der dem Browser das Zwischenspeichern verbietet. So ist nach jeder Änderung ein normales Neuladen genug. Dann im Browser <http://localhost:8000> öffnen. Mit F12 öffnen sich die Entwicklerwerkzeuge, darin lässt sich mit dem Handy-Symbol die iPhone-Ansicht einschalten.

Ein Doppelklick auf `index.html` funktioniert nicht, weil der Browser JavaScript-Module nur über einen Server lädt.

## Testen

```bash
make test
```

**Unit-Tests** (`make unit`, dahinter `node --test tests/*.test.js`) prüfen die reine Logik in `js/logic.js`: Bewertung, Durchgänge, Verlauf, Gewicht und Ziehen der Portionen. Sie brauchen nur Node, keine Pakete. Der Zufall ist in den Tests über einen festen Startwert festgelegt, sie laufen also immer gleich.

**E2E-Tests** (`make e2e`, dahinter `uv run --with pytest-playwright pytest tests/e2e`) starten einen eigenen Server, öffnen Chromium mit iPhone-Display und spielen die App durch. Einmalig vorher (fragt nach dem sudo-Passwort):

```bash
uv run --with pytest-playwright playwright install --with-deps chromium
```

Mit `make e2e ARGS="--headed --slowmo 300"` kann man zusehen.

## Neue Vokabelliste

1. Datei `lists/<id>.json` anlegen, Aufbau wie in `lists/en-pick-up-a.json`.
2. Die `<id>` in `lists/index.json` eintragen.
3. Lokal ausprobieren, Tests laufen lassen, committen, pushen.

## Fortschritt zurücksetzen

Der Fortschritt liegt im Browser des jeweiligen Geräts. Um eine Liste neu zu beginnen, in der Listendatei `"durchlauf"` um 1 erhöhen und pushen. Damit gehen auch die Punkte und der Runden-Zähler 🏆 auf 0. Der Verlauf (`R`/`F`) bleibt dabei erhalten, er ist die Grundlage der Super-Liste und der Sterne. Auch der Sterne-Kontostand bleibt unberührt. Wird eine einzelne Vokabel (`en`) geändert, beginnt nur diese wieder bei null, auch mit neuem Verlauf.

## Daten sichern und wiederherstellen

Der ganze Lernstand (Punkte, Runden, Verlauf, Sterne, Einlösungen) liegt nur auf dem Gerät. Die Sicherung ist eine JSON-Datei `vokabeltrainer-JJJJ-MM-TT-HHMM.json`.

**Einmalig: geteilten iCloud-Ordner einrichten**

1. Auf deinem iPhone in der **Dateien**-App unter *iCloud Drive* einen Ordner anlegen, z. B. „Vokabeltrainer“. Am Mac geht das im Finder unter *iCloud Drive*.
2. Den Ordner lange drücken → **Teilen** → bei den Optionen *Nur eingeladene Personen* und **Änderungen erlauben** wählen → die Apple-ID deiner Tochter aus der Familie einladen (z. B. per Nachricht).
3. Auf ihrem iPhone die Einladung annehmen. Der Ordner erscheint dann in der Dateien-App unter *iCloud Drive* bzw. *Geteilt*.

**Sichern** (auf ihrem iPhone, und zwar in der **App vom Home-Bildschirm**, denn nur dort liegen ihre Daten)

1. 5× schnell auf „Vokabeltrainer“ tippen → Eltern-Bereich.
2. **💾 Daten sichern** → im Teilen-Menü **In Dateien sichern** → den geteilten Ordner wählen → *Sichern*.
3. Die Datei liegt jetzt in deinem iCloud Drive. „Letzte Sicherung“ zeigt „heute“. Nach 7 Tagen ohne Sicherung wird die Zeile orange.

Am Rechner gibt es kein Teilen-Menü. Dort wird die Datei einfach heruntergeladen.

**Wiederherstellen** (z. B. auf einem neuen Handy)

1. Eltern-Bereich öffnen → **Daten wiederherstellen** → die Datei im geteilten Ordner auswählen. Nach Name sortiert steht die neueste unten.
2. Die Rückfrage zeigt das Datum der Sicherung und die Sterne in der Sicherung und auf dem Gerät. Steht auf dem Gerät mehr, ist die Sicherung älter als der aktuelle Stand.
3. **Ja, einspielen** ersetzt den gesamten Stand auf dem Gerät.

Das Datum der letzten Sicherung gehört zum Gerät und wird weder gesichert noch ersetzt.

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html` | Die Bildschirme: Listen, Abfrage, „Liste geschafft“, Ergebnis der Super-Liste |
| `style.css` | Aussehen, für das iPhone optimiert |
| `js/logic.js` | Reine Logik: Antworten prüfen, Karten bilden, Durchgänge, Zählen, Verlauf, Gewicht, Portionen, Sterne |
| `js/storage.js` | Punkte, Runden, Verlauf, Sterne und angefangene Portion im `localStorage` speichern; alles exportieren und ersetzen für die Datensicherung |
| `js/app.js` | Verbindet die Logik mit der Seite (Klicks, Anzeige) |
| `lists/` | Die Vokabellisten |
| `tools/serve.py` | Lokaler Entwicklungsserver ohne Browser-Cache |
| `tests/logic.test.js` | Unit-Tests mit `node --test` |
| `tests/e2e/` | Browser-Tests mit Playwright |

## Veröffentlichung

GitHub Pages veröffentlicht den Branch `main` unter <https://tillweigt.github.io/vokabeltrainer/>. Nach einem Push dauert es etwa eine Minute, bis die neue Version online ist.
