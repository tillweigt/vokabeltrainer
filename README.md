# Vokabeltrainer

Eine kleine Website zum Vokabellernen auf dem iPhone. Die deutsche Vokabel wird angezeigt, die englische Lösung muss eingetippt werden.

- **Einzelne Liste:** Jede offene Vokabel kommt pro Durchgang einmal. Nach 3× richtig ist sie geschafft. Sind alle geschafft, zählt 🏆 eine Runde, und es geht von vorn los.
- **🔀 Alle Englisch-Vokabeln:** Portionen zu 5 Karten aus allen Listen. Vokabeln, die zuletzt oft falsch waren, kommen öfter dran. Grundlage ist der Verlauf jeder Vokabel (`R`/`F`), Gewicht `(F + 1) / (n + 2)` über die letzten 5 Antworten. Eine angefangene Portion geht nach einer Pause weiter; wird zwischendurch in einer normalen Liste geantwortet, wird neu gezogen.
- **⭐ Sterne:** Jede richtige Antwort bringt `⌈8 · 2^(−k/3)⌉` Sterne (k = wie oft die Vokabel schon richtig war, also 8, 7, 6, 4, 4, 3, 2, …, mindestens 1). Fehler bringen nichts und kosten nichts. Für eine komplett geschaffte Liste (🏆) gibt es 1 Stern pro Vokabel extra. Auf der Startseite stehen der Kontostand, ein Feld zum Einlösen und die letzten 3 Einlösungen. Die Belohnung gibt es im echten Leben.
- **🔊 Anhören:** Nach dem Prüfen liest die eingebaute Sprachausgabe des iPhones die Lösung auf britischem Englisch vor, nur auf Knopfdruck. Ist nichts zu hören: Lautstärke und Stummschalter prüfen. Bessere Stimmen gibt es kostenlos unter *Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → Englisch*.

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

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html` | Die Bildschirme: Listen, Abfrage, „Liste geschafft“, Ergebnis der Super-Liste |
| `style.css` | Aussehen, für das iPhone optimiert |
| `js/logic.js` | Reine Logik: Antworten prüfen, Karten bilden, Durchgänge, Zählen, Verlauf, Gewicht, Portionen, Sterne |
| `js/storage.js` | Punkte, Runden, Verlauf, Sterne und angefangene Portion im `localStorage` speichern |
| `js/app.js` | Verbindet die Logik mit der Seite (Klicks, Anzeige) |
| `lists/` | Die Vokabellisten |
| `tools/serve.py` | Lokaler Entwicklungsserver ohne Browser-Cache |
| `tests/logic.test.js` | Unit-Tests mit `node --test` |
| `tests/e2e/` | Browser-Tests mit Playwright |

## Veröffentlichung

GitHub Pages veröffentlicht den Branch `main` unter <https://tillweigt.github.io/vokabeltrainer/>. Nach einem Push dauert es etwa eine Minute, bis die neue Version online ist.
