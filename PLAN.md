# Lerntrainer als mobile Website (iPhone) – Projektplan

Dieses Dokument fasst ein Vorgespräch zusammen. Es dient als Grundlage, um die App mit Claude Code zuerst im Detail zu planen und dann in kleinen Schritten umzusetzen. Bitte nicht alles auf einmal bauen, sondern Phase für Phase (siehe Abschnitt 13 „Umsetzung in Etappen“). **Zuerst Abschnitt 0 (Arbeitsweise) und Abschnitt 4 (Setup) lesen.**

---

## Stand: Vorlesen (festgelegt am 30.10.2026)

- Knopf „🔊 Anhören“ in der Rückmeldung, **erst nach dem Prüfen** (vorher würde er die Lösung verraten), bei richtigen und falschen Antworten.
- **Nur auf Knopfdruck**, nie automatisch. Return bleibt „Weiter“.
- **Britisches Englisch** (`en-GB`) über die eingebaute Sprachausgabe des Geräts (Web Speech API): keine Bibliothek, keine Audiodateien, funktioniert offline.
- Vorgelesen wird immer die eigentliche Lösung der Karte, auch wenn eine erlaubte Alternative getippt wurde. Platzhalter „…“ werden vorher entfernt.
- Der Knopf nimmt dem Eingabefeld nicht den Fokus, die Tastatur bleibt offen.

---

## Stand: Sterne (festgelegt am 30.10.2026)

Ergänzt und ändert die Abschnitte „Stand: …“ darunter. Bei Widersprüchen gilt dieser Abschnitt.

**Sterne verdienen**
- Jede richtige Antwort bringt Sterne, in Liste und Super-Liste gleich: **⌈8 · 2^(−k/3)⌉**. k = Anzahl der bisherigen richtigen Antworten dieser Vokabel (`R` im Verlauf vor dieser Antwort). Ergibt 8, 7, 6, 4, 4, 3, 2, 2, 2, 1, 1 …: Alle 3 richtigen Antworten halbiert sich der Wert, durch das Aufrunden bleibt es bei mindestens 1.
- Falsche Antwort: 0 Sterne, es wird nichts abgezogen. Fehler verändern den Wert nicht, deshalb lässt sich das nicht austricksen.
- Mehrdeutigkeit: Die abgefragte Vokabel bekommt die Sterne.
- **🏆-Bonus:** Wird eine Liste komplett geschafft, gibt es +1 ⭐ pro Vokabel der Liste (auch wenn eine schon früher komplett geschaffte Liste nachträglich als Runde gezählt wird).
- **Start bei 0 ⭐**, keine rückwirkende Gutschrift. Der bisherige Verlauf zählt aber für k.

**Anzeige**
- Abfrage: `⭐ 3` neben der Frage (Wert der aktuellen Vokabel), nach einer richtigen Antwort „Richtig! +3 ⭐“. Der Kontostand steht oben in der Kopfzeile.
- Ende einer Portion der Super-Liste: „4 von 5 richtig · +23 ⭐“. Bei „Liste geschafft!“: „+29 ⭐ Bonus“.

**Kontostand und Einlösen**
- Startseite ganz oben: „⭐ 128 Sterne“, Zahlenfeld und Knopf „Einlösen“, darunter die letzten 3 Einlösungen mit Datum.
- Kontostand = verdient − eingelöst, getrennt gespeichert (nicht aus dem Verlauf berechnet), damit Korrekturen an Listen keine Sterne löschen.
- Einlösen: ganze Zahl von 1 bis zum Kontostand, Zahlentastatur, Rückfrage auf der Seite („20 ⭐ wirklich einlösen?“ mit „Ja“ und „Abbrechen“).
- Die Belohnung selbst gibt es im echten Leben. Die Sterne liegen nur auf dem Gerät: Gehen die Daten verloren, sind die Sterne weg.

**Super-Liste (Änderung)**
- Eine Portion hat **5** statt 10 Karten.
- Eine angefangene Portion wird gespeichert und fortgesetzt (App geschlossen, Akku leer, Pause, zurück zur Startseite). Der Knopf zeigt dann „weiter bei Karte 4 von 5“.
- Sie wird verworfen, sobald in einer normalen Liste **geantwortet** wird (Öffnen allein reicht nicht). Fehlt eine gespeicherte Vokabel nach einem Update, wird sie übersprungen. Bleibt nichts übrig, wird neu gezogen.

**Tests:** Unit-Tests für die Formel, den Kontostand und das Speichern der Portion, E2E-Tests für 5er-Portion, Sterne und Einlösen.

---

## Stand: Verlauf und Super-Liste (festgelegt am 29.10.2026)

Ergänzt und ändert den Abschnitt „Stand: MVP“ darunter. Bei Widersprüchen gilt dieser Abschnitt.

**Einzelne Listen (Änderung)**
- Jede offene Vokabel kommt pro Durchgang **genau einmal**, egal ob richtig oder falsch. Danach wird neu gemischt (einfach zufällig). Die Wiederholung „falsche Karte 3 Karten später“ entfällt.
- Unverändert: 3× richtig = geschafft, Fehler setzen nichts zurück, nach allen ●●● 🏆 +1 und neue Runde, Stufen-Anzeige.

**Verlauf pro Vokabel (neu)**
- Jede Antwort wird als `R` oder `F` angehängt, aus einzelnen Listen **und** der Super-Liste.
- Dauerhaft: bleibt nach „Liste geschafft!“ und beim Erhöhen von `durchlauf` erhalten. Nur intern, keine Anzeige.
- Beginnt mit dem Update leer. Neues `en` → neuer Verlauf.

**Super-Liste „Alle Englisch-Vokabeln“ (neu)**
- Ganz oben auf der Startseite: „🔀 Alle Englisch-Vokabeln · N Vokabeln aus M Listen · immer 10 Karten“.
- Enthält alle Vokabeln aller Englisch-Listen, auch geschaffte und nie geübte.
- Portion mit **10 verschiedenen** Vokabeln (bei weniger Vokabeln: alle).
- **Gewicht** = `(F + 1) / (n + 2)` über die **letzten 5** Antworten des Verlaufs (nie gefragt → 1/2). Gezogen wird zufällig proportional zum Gewicht, neu bei jeder Portion.
- Mehrdeutigkeit nur **innerhalb der eigenen Liste** (wie bisher).
- Oben „Karte 3 von 10“, keine Punkte. Ende: „7 von 10 richtig“ mit „Weiter üben“ und „Zur Übersicht“.
- Antworten gehen **nur in den Verlauf**, nicht in Punkte oder Runden der Listen.

**Tests:** Unit-Tests für `js/logic.js` mit `node --test` (`make unit`), E2E wie bisher (`make e2e`), beides mit `make test`.

**Geparkt:** Mehrdeutigkeit über Listen hinweg, Test-Modus mit mehreren ausgewählten Listen, Anzeige des Verlaufs.

---

## Stand: MVP (festgelegt am 27.10.2026)

Für die erste Live-Version gilt Folgendes. Wo es dem Rest des Dokuments widerspricht, hat dieser Abschnitt Vorrang.

- **Ziel:** so schnell wie möglich live. Refactoring und Unit-Tests kommen danach.
- **Hauptgerät:** iPhone (Safari).
- **Inhalte:** Vokabelfotos kommen in den Chat, Claude legt daraus `lists/<id>.json` an. Die Website bleibt rein statisch.
- **Mehrere Listen**, auf der Startseite nach Fach gruppiert, je Liste „X von Y geschafft“.
- **Nur Vokabeln, nur Deutsch → Englisch.** Angezeigt werden alle deutschen Varianten („Wie heißt du? / Wie heißen Sie?“).
- **Bewertung streng:** Groß-/Kleinschreibung und Satzzeichen zählen. Toleriert werden nur Apostroph-Varianten (`’` statt `'`), überflüssige Leerzeichen und der Platzhalter „…“ (bzw. „...“).
- **Mehrdeutigkeit:** Jedes Englisch, dessen deutsche Varianten sich mit der Frage überschneiden, zählt als richtig („Ich heiße …“ → „I'm …“ oder „My name is …“).
- **Feedback:** richtig → grün; falsch → rot mit richtiger Lösung (und Alternativen). Weiter **immer per Return oder Knopf**, nie automatisch. Die Tastatur bleibt offen.
- **Endlose Runde in Durchgängen:** Ein Durchgang enthält alle noch nicht geschafften Karten, gemischt. Eine falsche Karte kommt im selben Durchgang 3 Karten später wieder, bis sie richtig getippt ist.
- **Geschafft:** 3× richtig beim ersten Versuch im Durchgang. Ein Fehler setzt nichts zurück. Richtig nach einem Fehler im selben Durchgang zählt nicht. Geschaffte Karten kommen nicht mehr. Sind alle geschafft: „Liste geschafft!“.
- **Runden:** Sind alle Vokabeln geschafft, zählt das als eine Runde. Der Fortschritt wird geleert, beim nächsten Antippen beginnt die nächste Runde.
- **Anzeige Startseite:** „🏆 N× komplett geschafft“ (auch bei 0), „X von Y geschafft“ und die Stufen „○○○ 9 ●○○ 8 ●●○ 5 ●●● 2“.
- **Anzeige Abfrage:** „X von Y geschafft“ und 3 Punkte pro Karte (●●○), keine Rundenzahl.
- **Speicher:** `localStorage` auf dem Gerät. **Zurücksetzen** nur über den Code: Feld `"durchlauf"` in der Listendatei erhöhen (setzt Fortschritt und Runden zurück). Kein Knopf dafür.
- **Listenformat:** `lists/index.json` ist nur ein Array von IDs (`["en-pick-up-a"]`). Titel, Fach und `durchlauf` stehen in der Listendatei. `strikt` entfällt, es wird immer streng geprüft.
- **Hosting:** öffentliches Repo `vokabeltrainer` auf GitHub Pages (kein GitHub Pro).
- **Tests:** E2E mit Playwright (Python, pytest), ohne Projekt-Abhängigkeiten über `uv run --with`.
- **Git:** Commits und Pushes macht nur Till. Claude schlägt Befehle zum Kopieren vor.
- **Bewusst noch nicht:** Richtungs-Umschalter, Statistik/Serie/„heute geschafft“, „Nur Fehler üben“, Manifest/Icons/Standalone, `validate.py`, Mathe/Deutsch-Typen, Unit-Tests.

---

## 0. Arbeitsweise mit Claude Code (bitte zuerst lesen)

Ich bin erfahrener Python-Entwickler, habe aber **noch nie ein JavaScript-Projekt gemacht**. Ich arbeite in **VS Code**. Ziel ist nicht nur eine fertige App, sondern dass ich verstehe, wie sie funktioniert, und sie selbst ausführen, testen und debuggen kann.

Regeln für die Zusammenarbeit:

1. **Erst klären, dann bauen.** Bevor App-Code entsteht, klären wir gemeinsam das Setup (Abschnitt 4). Claude Code erklärt die Optionen, empfiehlt eine, ich entscheide.
2. **Kleine Schritte.** Jeder Schritt ist eine überschaubare Änderung (eine Funktion, ein UI-Element) und endet in einem **lauffähigen Zustand**.
3. **Nach jedem Schritt** erklärt Claude Code kurz:
   - was geändert wurde und warum,
   - welche JavaScript-Konzepte neu sind (gern mit Python-Vergleich),
   - wie ich es **starte** und was ich sehen sollte,
   - wie ich es **teste** (Unit-Test und/oder manuell im Browser),
   - wo ich beim **Debuggen** hinschaue (Konsole, Breakpoint, Local Storage).
4. **Auf mein Okay warten**, bevor der nächste Schritt beginnt.
5. **Nach jedem funktionierenden Schritt ein Git-Commit** mit klarer Nachricht, damit ich jederzeit zurück kann.
6. **Keine neuen Abhängigkeiten oder Tools ohne Rückfrage.** Lieber einfach und verständlich als elegant.
7. **Nur die Dateien ändern, die für den Schritt nötig sind.**
8. Logik möglichst als **reine Funktionen ohne DOM** schreiben, damit sie per Unit-Test prüfbar ist.

Diese Regeln werden in Phase 0 in eine `CLAUDE.md` im Repo übernommen, damit sie in jeder Sitzung automatisch gelten.

---

## 1. Ziel und Kontext

- **Nutzerin:** Meine Tochter (Grundschule / Unterstufe), lernt Englisch-Vokabeln aus dem Schulbuch. Später auch Mathe und Deutsch.
- **Problem mit bestehenden Apps:**
  - Duolingo erlaubt keine eigenen Vokabellisten.
  - Vokabelheld (iOS) kann Listen per Foto importieren, aber die eingebaute KI kürzt deutsche Sätze (z. B. „Wie alt bist du?“ → „Wie alt“). Außerdem fängt das Training mit Multiple Choice an, Schreiben kommt erst spät.
- **Kernanforderung:** Die Vokabel wird angezeigt, die Lösung muss **eingetippt** werden. Die App prüft, ob sie richtig ist, und zählt richtig/falsch pro Wort.
- **Beobachtung:** Am Handy lernt meine Tochter lieber als auf Papier. Motivation (sofortiges Feedback, sichtbarer Fortschritt, kleine Portionen) ist deshalb ein echtes Ziel, kein Extra.

## 2. Grundprinzip: Inhalte und App sind getrennt

Der Ablauf hat zwei Schritte:

1. **Inhalte erzeugen (außerhalb der App):** Foto der Buchseite an Claude (Chat) schicken → Claude liefert die Vokabeln als JSON → ich prüfe kurz → Datei wird ins Repo gelegt.
2. **Lernen (in der App):** Die App ist nur die Oberfläche. Sie lädt die JSON-Listen und fragt ab.

Daraus folgt: **kein Backend, kein API-Key, keine KI in der App.**

## 3. Technische Entscheidungen

| Thema | Entscheidung |
|---|---|
| Art der App | Statische mobile Website (HTML, CSS, Vanilla JavaScript) |
| Entwicklung | VS Code mit Claude Code |
| Frameworks / Build | Keine Frameworks, kein Bundler, kein Build-Step. Node.js höchstens für Unit-Tests (ohne npm-Abhängigkeiten) |
| Code-Struktur | ES-Module (`<script type="module">`), Logik getrennt vom DOM |
| Externe Bibliotheken | Keine (alles selbst geschrieben, Umfang ist klein) |
| Hosting | GitHub Pages (kostenlos, Update per `git push`) |
| Datenhaltung Inhalte | JSON-Dateien im Ordner `lists/` |
| Datenhaltung Fortschritt | `localStorage` im Browser des iPhones (pro Gerät) |
| „App-Gefühl“ | Über Safari „Zum Home-Bildschirm“, Web-App-Manifest, Standalone-Modus |
| Lokales Testen | `python -m http.server` im Projektordner |
| Hilfsskripte | Python (z. B. Validierung der JSON-Listen) |

**Bewusste Nicht-Ziele:** kein Login, keine Synchronisation zwischen Geräten, keine Server-Datenbank, keine KI-Bewertung offener Antworten, kein Tracking, keine Werbung.

## 4. Entwicklungsumgebung und Projekt-Setup (in Phase 0 klären)

Das ist mein erstes JavaScript-Projekt. Der folgende Vorschlag ist ein Ausgangspunkt: Claude Code soll ihn prüfen, Alternativen nennen und mit mir entscheiden, **bevor** die App gebaut wird.

### 4.1 Werkzeuge (Vorschlag)

- **VS Code** mit den Erweiterungen:
  - Claude Code
  - Live Server (startet einen lokalen Server und lädt die Seite bei jeder Änderung automatisch neu); Alternative: `python -m http.server`
  - optional ESLint (findet Fehler beim Tippen) und Prettier (formatiert Code)
- **Git** und ein **GitHub-Account** (für Versionskontrolle und GitHub Pages).
- **Chrome oder Safari** am Rechner (Entwicklertools).
- **Node.js (LTS):** für die App selbst **nicht** nötig. Nur für Unit-Tests mit dem eingebauten Test-Runner `node --test` (kein npm-Paket nötig).
- **Python:** bereits vorhanden (lokaler Server, `tools/validate.py`).

### 4.2 Spickzettel Python → JavaScript

| Python | JavaScript in diesem Projekt |
|---|---|
| `print()` | `console.log()` (Ausgabe in der Browser-Konsole) |
| `breakpoint()` / pdb | `debugger;` im Code oder Breakpoint in DevTools / VS Code |
| `pytest` | `node --test` mit `node:test` und `node:assert` |
| `import` / Module | `import` / `export` (ES-Module) |
| `requirements.txt` / pip | `package.json` / npm (hier ohne Abhängigkeiten) |
| venv | nicht nötig |
| `dict` / `list` | Objekt `{}` / Array `[]` |
| `json.loads()` | `JSON.parse()` |
| `requests.get()` | `fetch()` mit `async` / `await` |
| f-String `f"{x}"` | Template-String `` `${x}` `` |

### 4.3 Code-Aufteilung für Testbarkeit

- `js/logic.js`: **reine Funktionen ohne DOM**, z. B. `normalize()`, `isCorrect()`, `buildCards()`, Warteschlangen-Operationen, Berechnung von „sicher“. In Node testbar.
- `js/storage.js`: Zugriff auf `localStorage` (gekapselt, mit `try/catch`).
- `js/app.js`: DOM, Events, Bildschirmwechsel; ruft `logic.js` und `storage.js` auf.
- `tests/logic.test.js`: Unit-Tests für `logic.js`.
- `package.json` minimal, etwa: `{ "type": "module", "scripts": { "test": "node --test" } }`.
- Wichtig: ES-Module laufen im Browser **nur über einen HTTP-Server**, nicht per Doppelklick auf `index.html`.

### 4.4 Ausführen, Testen, Debuggen

- **Starten:** Live Server oder `python -m http.server` im Projektordner, dann `http://localhost:8000` (Port je nach Server).
- **Unit-Tests:** `npm test` (bzw. `node --test`).
- **Debuggen am Rechner:**
  - DevTools: Konsole, Breakpoints im Tab „Sources“, Tab „Application“ → Local Storage ansehen und löschen.
  - Gerätesimulation (iPhone-Ansicht) in den DevTools.
  - Optional: VS Code-Debugger mit `.vscode/launch.json` („Chrome gegen localhost starten“), um Breakpoints direkt im Editor zu setzen.
- **Testen auf dem iPhone:** Rechner und iPhone im selben WLAN, dann `http://<IP-des-Rechners>:<Port>` in Safari öffnen.
- **Debuggen auf dem iPhone:**
  - Mit Mac: Web-Inspektor auf dem iPhone aktivieren (Safari-Einstellungen → Erweitert), iPhone per Kabel verbinden, am Mac in Safari über das Menü „Entwickler“ verbinden.
  - Ohne Mac: ein kleines **Fehler-Overlay** im Entwicklungsmodus, das `window.onerror` und nicht behandelte Promise-Fehler direkt auf der Seite anzeigt.

### 4.5 Fragen, die Claude Code in Phase 0 mit mir klären soll

- Live Server oder `python -m http.server`?
- Node.js für Unit-Tests: ja oder nein?
- ESLint / Prettier: ja oder nein, und mit welcher minimalen Konfiguration?
- VS Code-Debugger einrichten?
- Habe ich einen Mac für den Web-Inspektor? (Antwort: _____)
- Git-Workflow: direkt auf `main` oder mit Branches?
- Wie sieht ein „Hallo Welt“ aus, an dem ich Server, Konsole, Breakpoint und Unit-Test einmal ausprobiere?

## 5. Ordnerstruktur

```
lerntrainer/
├── index.html            Oberfläche: drei „Bildschirme“ als <section>s
├── style.css             Aussehen, mobil-optimiert
├── js/
│   ├── app.js            DOM, Events, Bildschirmwechsel
│   ├── logic.js          reine Funktionen (normalisieren, prüfen, Karten, Warteschlange)
│   └── storage.js        Zugriff auf localStorage
├── tests/
│   └── logic.test.js     Unit-Tests für logic.js (node --test)
├── lists/
│   ├── index.json        Verzeichnis aller Listen
│   └── en-pick-up-a.json
├── tools/
│   └── validate.py       prüft alle JSON-Listen vor dem Commit
├── manifest.json         Web-App-Manifest (Name, Icon, standalone)
├── icon-180.png          Apple-Touch-Icon (180×180)
├── icon-512.png          Icon fürs Manifest
├── package.json          nur "type": "module" und Test-Skript, keine Abhängigkeiten
├── .vscode/
│   ├── extensions.json   empfohlene Erweiterungen
│   └── launch.json       optional: Debugging in VS Code
├── .gitignore
├── CLAUDE.md             Arbeitsregeln aus Abschnitt 0
├── PLAN.md               dieses Dokument
└── README.md             Anleitung: starten, testen, Liste hinzufügen, deployen
```

`lists/index.json` ist nötig, weil GitHub Pages keinen Ordnerinhalt auflisten kann.

## 6. Datenformate

### 6.1 `lists/index.json`

```json
[
  { "id": "en-pick-up-a", "titel": "Pick-up A – We're from Greenwich", "fach": "Englisch" }
]
```

Die `id` entspricht dem Dateinamen ohne `.json`.

### 6.2 Vokabelliste (`typ: "vokabel"`)

```json
{
  "id": "en-pick-up-a",
  "titel": "Pick-up A – We're from Greenwich",
  "fach": "Englisch",
  "typ": "vokabel",
  "strikt": false,
  "items": [
    { "en": "What's your name?", "de": ["Wie heißt du?", "Wie heißen Sie?"] },
    { "en": "boy", "de": ["Junge"] }
  ]
}
```

- `en` ist ein String, `de` ist **immer ein Array** mit allen erlaubten Antworten.
- Ellipsen („We're from …“) dürfen im Text stehen. Die Normalisierung entfernt sie beim Vergleich.

### 6.3 Allgemeine Aufgabenliste (`typ: "luecke"`, `"textaufgabe"`, `"diktat"`)

```json
{
  "id": "de-das-dass-1",
  "titel": "das oder dass",
  "fach": "Deutsch",
  "typ": "luecke",
  "strikt": true,
  "items": [
    { "frage": "Ich glaube, ___ er heute kommt.", "antworten": ["dass"] }
  ]
}
```

- `luecke`: `frage` ist ein Satz mit `___`, `antworten` füllt die Lücke.
- `textaufgabe` (Mathe): `frage` ist die Aufgabe, `antworten` z. B. `["42"]`. Optional `"zahl": true` (Zahlentastatur, numerischer Vergleich) und `"ausdruck": "6*7"` zur automatischen Gegenprüfung durch `validate.py`.
- `diktat`: `frage` ist der Text, der **vorgelesen und nicht angezeigt** wird. `antworten` ist `[frage]`.

### 6.4 Generierte Aufgaben (`typ: "kopfrechnen"`)

Kopfrechnen braucht keine Items, die Aufgaben erzeugt die App per Zufall:

```json
{
  "id": "ma-einmaleins",
  "titel": "Kleines Einmaleins",
  "fach": "Mathe",
  "typ": "kopfrechnen",
  "config": { "operationen": ["*"], "min": 1, "max": 10, "anzahl": 20 }
}
```

## 7. Bildschirme

Alle drei Bildschirme liegen in `index.html`. Es ist immer nur einer sichtbar.

### 7.1 Start / Listenauswahl
- Listen nach Fach gruppiert, je Liste ein großer Knopf.
- Pro Liste ein Hinweis auf den Fortschritt (z. B. „18 von 24 sicher“).
- Oben: „Heute geschafft: N“ und Serie („3 Tage am Stück“).
- Bei Vokabellisten: Umschalter für die Richtung (Deutsch → Englisch / Englisch → Deutsch).

### 7.2 Abfrage
- Oben: Fortschrittsbalken der Runde („7 / 24“) und ein Knopf zum Abbrechen.
- Die Frage groß in der Mitte. Bei Diktat stattdessen ein Knopf „Nochmal vorlesen“.
- **Eingabefeld im oberen Bildschirmbereich**, damit die Tastatur es nicht verdeckt.
- Prüfen per Knopf und per Return-Taste der Tastatur.
- Feedback:
  - Richtig: grün, kurz „Richtig!“, dann automatisch oder per Tipp weiter.
  - Falsch: rot, die richtige Lösung (alle Varianten) anzeigen, Knopf „Weiter“.

### 7.3 Ergebnis
- „X von Y beim ersten Versuch richtig“.
- Liste der schwierigen Wörter dieser Runde.
- Knöpfe: „Nochmal“, „Nur Fehler üben“, „Zur Übersicht“.

## 8. Logik (`js/logic.js` und `js/app.js`)

Alles, was ohne DOM geht (Karten bilden, Normalisieren, Prüfen, Warteschlange, Statistik berechnen), gehört in `logic.js` und bekommt Unit-Tests. `app.js` verbindet das nur mit der Oberfläche.

### 8.1 Ablauf
1. **Start:** `lists/index.json` laden und die Listenauswahl rendern.
2. **Liste gewählt:** die Listendatei laden, Items in **Karten** umwandeln (je nach Typ und Richtung, siehe 8.2), mischen, als Warteschlange ablegen.
3. **Abfrage:** die erste Karte der Warteschlange anzeigen.
4. **Prüfen:** Eingabe und alle erlaubten Antworten normalisieren (8.3) und vergleichen.
5. **Richtig:** Karte aus der Warteschlange entfernen. Merken, ob es der erste Versuch war.
6. **Falsch:** Karte **nicht ans Ende, sondern ca. 3 Positionen später** wieder einreihen (bzw. ans Ende, wenn weniger übrig sind), damit sie bald wiederkommt.
7. **Zählen:** Bei jeder Antwort die Statistik in `localStorage` aktualisieren (8.4).
8. **Warteschlange leer:** Ergebnisbildschirm.

### 8.2 Karten bilden
Eine Karte hat die Form `{ key, frage, antworten, vorlesen?, zahl? }`.

- **Vokabel, Englisch → Deutsch:** `frage = en`, `antworten = de`.
- **Vokabel, Deutsch → Englisch:** `frage = de.join(" / ")`, `antworten = [en]`.
  - **Mehrdeutigkeit:** Mehrere englische Einträge können dieselbe deutsche Bedeutung haben (z. B. „I'm …“ und „My name is …“ → beide „Ich heiße …“). Deshalb in dieser Richtung **jedes `en` akzeptieren, dessen `de`-Liste eine der angezeigten deutschen Varianten enthält.**
  - **Standardrichtung: Deutsch → Englisch**, weil Vokabeltests in der Schule meist so abfragen.
- **luecke / textaufgabe:** `frage` und `antworten` direkt übernehmen.
- **diktat:** `frage` wird nicht angezeigt, sondern vorgelesen.
- **kopfrechnen:** Karten aus `config` erzeugen (z. B. `7 · 8`, Antwort `"56"`).
- `key` ist eine stabile ID für die Statistik: `listId + "|" + (en oder frage)`.

### 8.3 Normalisierung beim Vergleich
Eine Funktion `normalize(text, strikt)`:

Immer:
- Leerzeichen am Anfang/Ende entfernen, mehrfache Leerzeichen zu einem zusammenfassen.
- **Typografische Apostrophe und Anführungszeichen vereinheitlichen:** `’ ‘ ʼ` → `'`, `„ “ ”` → `"`. Wichtig, weil das iPhone `'` automatisch in `’` umwandelt („I’m“).
- Ellipsen `…` und `...` entfernen.

Nur wenn `strikt: false`:
- Alles in Kleinbuchstaben.
- Satzzeichen `. , ! ? ; :` entfernen.

Wenn `strikt: true` (Deutsch-Rechtschreibung): Groß-/Kleinschreibung und Satzzeichen **zählen**.

Umlaute und ß werden nie ersetzt („ae“ ist nicht „ä“).

Bei `zahl: true`: Komma und Punkt als Dezimaltrenner gleich behandeln und numerisch vergleichen. Brüche (z. B. „1/2“) optional später.

### 8.4 Statistik in `localStorage`
- Schlüssel mit Präfix und Version, z. B. `lerntrainer:v1:stats` und `lerntrainer:v1:tage`.
- `stats`: `{ "<key>": { "richtig": 3, "falsch": 1, "zuletzt": "2026-10-06", "letzteRichtig": true } }`
- `tage`: Liste der Datumswerte, an denen geübt wurde, für „heute geschafft“ und die Serie.
- **„Sicher“** (Vorschlag, in der Planung festlegen): mindestens 3× richtig und die letzte Antwort war richtig.
- Jeder Zugriff in `try/catch`. Wenn der Speicher leer oder nicht verfügbar ist, läuft die App trotzdem.

### 8.5 Laden der Listen
- `fetch(url, { cache: "no-cache" })`, damit neue oder geänderte Listen nach dem Deploy sofort ankommen (Safari und der Home-Bildschirm-Modus cachen sonst hartnäckig).
- Bei einem Ladefehler eine verständliche Meldung anzeigen.

## 9. iPhone-spezifische Anforderungen

- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
- Safe-Area beachten (`env(safe-area-inset-top)` usw.), weil im Standalone-Modus die Statusleiste über der Seite liegt.
- `<meta name="apple-mobile-web-app-capable" content="yes">`, `apple-mobile-web-app-title`, `<link rel="apple-touch-icon" href="icon-180.png">`, `<link rel="manifest" href="manifest.json">`, `theme-color`.
- `manifest.json` mit `"display": "standalone"`, Name, Kurzname, Icons.
- **Eingabefeld:**
  - `autocorrect="off" autocapitalize="off" autocomplete="off" spellcheck="false"` (sonst „korrigiert“ das iPhone die Vokabeln).
  - Schriftgröße **mindestens 16px**, sonst zoomt Safari beim Antippen.
  - `enterkeyhint="go"` bzw. `"next"`, Prüfen über ein `<form>`-Submit, damit die Return-Taste funktioniert.
  - `inputmode="decimal"` bei Mathe-Aufgaben für die Zahlentastatur.
- **Tastatur offen halten:** iOS öffnet die Tastatur nur, wenn `focus()` **synchron in einem Tipp-/Submit-Handler** aufgerufen wird. Beim Wechsel zur nächsten Karte das Feld daher direkt im Handler leeren und fokussieren, nicht in einem `setTimeout`.
- **Vorlesen (Diktat):** `speechSynthesis` mit `lang = "de-DE"`. Auf iOS muss das erste Vorlesen durch einen Tipp ausgelöst werden. Die Stimmen laden asynchron (`voiceschanged`).
- Touch-Ziele mindestens 44×44 px, große Schrift, guter Kontrast. Dark Mode über `prefers-color-scheme` ist nett, aber optional.

## 10. Motivation (bewusst einfach)

- Fortschrittsbalken in jeder Runde.
- Sofortiges, klares Feedback (grün/rot).
- „Heute geschafft: N Wörter“ und Tage-Serie auf dem Startbildschirm.
- Kleine Belohnung am Rundenende (z. B. kurze CSS-Animation), ohne externe Bibliothek.
- Runden kurz halten (Option: maximal 10–15 Karten pro Runde).

## 11. Inhalte erstellen (Workflow)

1. Buchseite fotografieren.
2. Foto mit dem passenden Prompt (siehe unten) an Claude im Chat schicken.
3. Ergebnis kurz gegenlesen. Claude kann sich bei Lösungen oder Regeln vertun, und ein falscher „richtiger“ Lösungsvorschlag frustriert ein Kind.
4. Als `lists/<id>.json` speichern und in `lists/index.json` eintragen.
5. `python tools/validate.py` ausführen.
6. Lokal testen: `python -m http.server`, dann `http://localhost:8000`. Auf dem iPhone im selben WLAN: `http://<IP-des-Rechners>:8000`.
7. `git commit` und `git push`. GitHub Pages aktualisiert die Seite.

### Prompt: Vokabeln aus Foto
```
Extrahiere alle Vokabeln aus dem Foto als JSON-Objekt in diesem Format:
{"id": "<id>", "titel": "<Titel der Lektion>", "fach": "Englisch",
 "typ": "vokabel", "strikt": false,
 "items": [{"en": "...", "de": ["...", "..."]}]}
Regeln: Übernimm alles wörtlich, kürze nichts und lass keine Wörter weg.
Lautschrift, Beispielsätze und Hinweise weglassen. Mehrere deutsche
Übersetzungen (durch Semikolon getrennt) als einzelne Einträge in "de".
Gib nur das JSON aus.
```

### Prompt: Lückentext Deutsch
```
Erstelle 15 Lückensätze zum Thema <Thema, z. B. das/dass> für ein Kind
der <Klasse>. Klasse. Format:
{"id": "<id>", "titel": "<Titel>", "fach": "Deutsch", "typ": "luecke",
 "strikt": true, "items": [{"frage": "Satz mit ___", "antworten": ["..."]}]}
Jede Lücke hat genau eine richtige Lösung. Gib nur das JSON aus.
```

### Prompt: Mathe-Textaufgaben
```
Erstelle 10 Textaufgaben zum Thema <Thema> für die <Klasse>. Klasse.
Format:
{"id": "<id>", "titel": "<Titel>", "fach": "Mathe", "typ": "textaufgabe",
 "strikt": false, "items": [{"frage": "...", "antworten": ["<Zahl>"],
 "zahl": true, "ausdruck": "<Rechnung, z. B. 3*4+2>"}]}
Das Ergebnis muss eine eindeutige Zahl sein. Gib nur das JSON aus.
```

## 12. `tools/validate.py`

Prüft vor jedem Commit:
- Alle Dateien in `lists/` sind gültiges JSON.
- Jeder Eintrag in `index.json` hat eine Datei, und jede Datei steht in `index.json`. Die `id` passt zum Dateinamen und ist eindeutig.
- Pflichtfelder je `typ` sind vorhanden, keine leeren Antworten, `de`/`antworten` sind Arrays.
- Keine doppelten Items innerhalb einer Liste.
- Bei `textaufgabe` mit `ausdruck`: den Ausdruck **sicher** auswerten (über `ast`, kein `eval`) und mit `antworten[0]` vergleichen.
- Bei `kopfrechnen`: `config` ist plausibel (min ≤ max, erlaubte Operationen).
- Ausgabe: klare Fehlermeldungen mit Datei und Item-Nummer, Exit-Code ≠ 0 bei Fehlern.

## 13. Umsetzung in Etappen

Jeder Schritt endet lauffähig, mit Commit und mit einem kurzen Test (Unit-Test und/oder im Browser). Wo sinnvoll, zusätzlich auf dem echten iPhone testen. Die Phasen 2 bis 7 werden beim Erreichen nach demselben Muster in Teilschritte zerlegt wie Phase 1.

| Schritt | Inhalt | Fertig, wenn … |
|---|---|---|
| 0a | Setup klären (Abschnitt 4.5), Werkzeuge installieren | Entscheidungen sind festgehalten (z. B. im README) |
| 0b | Repo anlegen, Ordnergerüst, `CLAUDE.md`, `.gitignore`, `package.json`, `.vscode/` | Erster Commit, Repo auf GitHub |
| 0c | „Hallo Welt“: `index.html` lädt `js/app.js` als Modul und schreibt etwas in die Seite und in die Konsole | Seite läuft lokal und auf dem iPhone, Konsolenausgabe sichtbar |
| 0d | Erste Funktion in `logic.js` mit einem Unit-Test; einmal einen Breakpoint setzen | `npm test` grün, Breakpoint wurde getroffen |
| 1a | Eine fest eingebaute Vokabel wird als Karte angezeigt | Sichtbar am Rechner und am iPhone |
| 1b | Eingabefeld und Prüfen-Knopf; Eingabe vorerst nur in die Konsole schreiben | Return-Taste löst aus, Autokorrektur ist aus, kein Zoom beim Antippen |
| 1c | `normalize()` in `logic.js` mit Unit-Tests (Apostroph `’`, Satzzeichen, Groß/klein, Ellipse, Leerzeichen) | Alle Tests grün |
| 1d | `isCorrect()` mit Tests; Prüfen und Feedback grün/rot in der Oberfläche | „I’m …“ wird am iPhone als richtig erkannt |
| 1e | Warteschlange mit Wiederholung falscher Karten (Logik + Tests), fest eingebaute Mini-Liste durchspielen | Runde lässt sich komplett durchspielen |
| 1f | Fokus/Tastatur: nach jeder Karte bleibt die Tastatur am iPhone offen | Flüssiges Tippen ohne erneutes Antippen |
| 2 | `lists/index.json`, Listen per `fetch` laden, Listenauswahl, Richtungs-Umschalter inkl. Mehrdeutigkeits-Regel, Ergebnisbildschirm | Zwei Listen auswählbar, beide Richtungen funktionieren |
| 3 | `storage.js`, Statistik, „Nur Fehler üben“, Fortschrittsbalken, „heute geschafft“, Serie | Fortschritt bleibt nach Neuladen erhalten |
| 4 | iPhone-Feinschliff: Manifest, Icons, Standalone, Safe-Area; Deploy auf GitHub Pages | App liegt auf dem Home-Bildschirm und startet ohne Safari-Leisten |
| 5 | `tools/validate.py` und Inhalte-Workflow im README | Eine fehlerhafte Testdatei wird erkannt |
| 6 | Typ-System: `kopfrechnen`, `luecke`, `textaufgabe`, `diktat` mit `strikt` | Je Typ funktioniert eine Beispielliste |
| 7 (optional) | Erweiterungen aus Abschnitt 14 | – |

## 14. Ideen für später

- **Karteikasten (Leitner):** Fächer 1–5 mit wachsenden Abständen, Wörter aus höheren Fächern seltener abfragen.
- **„Fast richtig“:** Bei genau einem Tippfehler (Levenshtein-Distanz 1) einen Hinweis zeigen, aber trotzdem als falsch werten.
- **Nach falscher Antwort einmal richtig abtippen** lassen, bevor es weitergeht.
- **Papier-Modus:** App zeigt das Wort, das Kind schreibt auf Papier und tippt danach „gewusst“ / „nicht gewusst“. Gut als Generalprobe vor dem Test, weil der Test handschriftlich ist.
- **Diktat-Auswertung auf Wortebene:** falsche Wörter im Satz markieren.
- **Mathe:** Brüche und gemischte Zahlen als Antwort akzeptieren.
- **Export/Import der Statistik** als JSON (falls das Gerät gewechselt wird).

## 15. Offene Fragen für die Planung

- Name der App?
- Standardrichtung bei Vokabeln: Deutsch → Englisch (Vorschlag) – passt das?
- Genaue Definition von „sicher“.
- Nach Richtig automatisch weiter (z. B. nach 0,8 s) oder per Tipp?
- Maximale Rundenlänge?
- Soll ein Lehrer-/Eltern-Bereich die Statistik übersichtlich zeigen?
