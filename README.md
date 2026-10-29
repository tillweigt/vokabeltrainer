# Vokabeltrainer

Eine kleine Website zum Vokabellernen auf dem iPhone. Die deutsche Vokabel wird angezeigt, die englische Lösung muss eingetippt werden. Jede Vokabel muss 3× auf Anhieb richtig sein, dann gilt sie als geschafft.

Es gibt kein Framework, keinen Build-Schritt und keinen Server-Code: nur HTML, CSS, JavaScript und JSON-Dateien.

## Kurzbefehle

| Befehl | Was passiert |
|---|---|
| `make` | Übersicht der Befehle |
| `make serve` | Website lokal starten (anderer Port: `make serve PORT=8080`) |
| `make test` | E2E-Tests laufen lassen (zusehen: `make test ARGS="--headed --slowmo 300"`) |

## Starten

```bash
make serve
```

(Dahinter steckt `python3 -m http.server 8000`.) Dann im Browser <http://localhost:8000> öffnen. Mit F12 öffnen sich die Entwicklerwerkzeuge, darin lässt sich mit dem Handy-Symbol die iPhone-Ansicht einschalten.

Ein Doppelklick auf `index.html` funktioniert nicht, weil der Browser JavaScript-Module nur über einen Server lädt.

## Testen

```bash
make test
```

(Dahinter steckt `uv run --with pytest-playwright pytest tests/e2e`.) Das Kommando startet einen eigenen Server, öffnet Chromium mit iPhone-Display und spielt die App durch. Einmalig vorher (fragt nach dem sudo-Passwort):

```bash
uv run --with pytest-playwright playwright install --with-deps chromium
```

Mit `make test ARGS="--headed --slowmo 300"` kann man zusehen.

## Neue Vokabelliste

1. Datei `lists/<id>.json` anlegen, Aufbau wie in `lists/en-pick-up-a.json`.
2. Die `<id>` in `lists/index.json` eintragen.
3. Lokal ausprobieren, Tests laufen lassen, committen, pushen.

## Fortschritt zurücksetzen

Der Fortschritt liegt im Browser des jeweiligen Geräts. Um eine Liste neu zu beginnen, in der Listendatei `"durchlauf"` um 1 erhöhen und pushen. Damit gehen auch die Punkte und der Runden-Zähler 🏆 auf 0. Wird eine einzelne Vokabel (`en`) geändert, beginnt nur diese wieder bei null.

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html` | Die drei Bildschirme: Listen, Abfrage, „Liste geschafft“ |
| `style.css` | Aussehen, für das iPhone optimiert |
| `js/logic.js` | Reine Logik: Antworten prüfen, Karten bilden, Warteschlange, Zählen |
| `js/storage.js` | Fortschritt im `localStorage` speichern |
| `js/app.js` | Verbindet die Logik mit der Seite (Klicks, Anzeige) |
| `lists/` | Die Vokabellisten |
| `tests/e2e/` | Browser-Tests mit Playwright |

## Veröffentlichung

GitHub Pages veröffentlicht den Branch `main` unter <https://tillweigt.github.io/vokabeltrainer/>. Nach einem Push dauert es etwa eine Minute, bis die neue Version online ist.
