"""E2E-Test für die Auswertung (auswertung/): lädt erfundene Sicherungen in die gebaute Seite.

Braucht den Build in auswertung/dist (`make auswertung-build`; `make e2e` baut ihn vorher).
"""

import json
import math

import pytest
from conftest import ROOT
from playwright.sync_api import Browser, Page, expect

DIST = ROOT / "auswertung" / "dist" / "index.html"


def stars_for(history: str) -> int:
    """Sternformel der App: ⌈8 · 2^(−k/3)⌉, k = bisher richtige Antworten."""
    return max(1, math.ceil(8 * 2 ** (-history.count("R") / 3)))


def entry(zeit: str, liste: str, vokabel: str, richtig: bool, getippt, sterne, nachgetragen=False) -> dict:
    return {
        "art": "antwort",
        "zeit": zeit,
        "liste": liste,
        "vokabel": vokabel,
        "frage": None,
        "getippt": getippt,
        "richtig": richtig,
        "modus": None if nachgetragen else "super",
        "sterne": sterne,
        "nachgetragen": nachgetragen,
    }


@pytest.fixture
def backups(tmp_path):
    """Zwei überlappende Sicherungen mit Vokabeln aus der ersten echten Liste."""
    list_id = json.loads((ROOT / "lists" / "index.json").read_text(encoding="utf-8"))[0]
    items = json.loads((ROOT / "lists" / f"{list_id}.json").read_text(encoding="utf-8"))["items"]
    first, second = items[0]["en"], items[1]["en"]

    old = entry("2026-10-31T10:00:00+01:00", list_id, first, True, None, None, nachgetragen=True)
    right = entry("2026-11-01T11:00:00+01:00", list_id, first, True, first, stars_for("R"))
    # Nur ein Satzzeichen zu viel: falsch, aber eine „Kleinigkeit“
    wrong = entry("2026-11-01T11:00:20+01:00", list_id, second, False, second + "!", 0)
    earned = stars_for("") + stars_for("R")

    def write(name, exportiert, protocol, history):
        data = {
            "vokabeltrainer:v1:protokoll": protocol,
            f"vokabeltrainer:v1:{list_id}:verlauf": history,
            "vokabeltrainer:v1:sterne": {"earned": earned, "redemptions": []},
        }
        path = tmp_path / name
        backup = {"app": "vokabeltrainer", "version": 1, "exportiert": exportiert, "daten": data}
        path.write_text(json.dumps(backup, ensure_ascii=False), encoding="utf-8")
        return path

    return {
        "files": [
            write("vokabeltrainer-2026-11-01-1130.json", "2026-11-01T11:30", [old, right], {first: "RR"}),
            write("vokabeltrainer-2026-11-02-1639.json", "2026-11-02T16:39", [old, right, wrong], {first: "RR", second: "F"}),
        ],
        "balance": earned,
    }


@pytest.fixture
def dashboard(browser: Browser, base_url: str):
    """Die Auswertung im Desktop-Browser (nicht im simulierten iPhone der App-Tests)."""
    if not DIST.exists():
        pytest.fail("auswertung/dist fehlt: erst `make auswertung-build` ausführen")
    context = browser.new_context(viewport={"width": 1280, "height": 900}, locale="de-DE")
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(f"{base_url}/auswertung/dist/index.html")
    yield page
    context.close()
    assert errors == [], f"JavaScript-Fehler: {errors}"


def test_auswertung_mit_zwei_sicherungen(dashboard: Page, backups):
    dashboard.set_input_files("#files", [str(path) for path in backups["files"]])
    expect(dashboard.locator(".overview")).to_contain_text("2 Dateien geladen")
    expect(dashboard.locator(".overview")).to_contain_text("3 Einträge im Protokoll")  # ohne Doppelte
    expect(dashboard.locator("#pruefung .ok")).to_contain_text("Alles stimmig")
    expect(dashboard.locator("#nutzung")).to_contain_text("Länge einer Einheit")
    expect(dashboard.locator("#fehler .lead")).to_contain_text("Von 1 Fehler wäre 1 bei lockerer Bewertung richtig")
    expect(dashboard.locator("#sterne .tile-value").first).to_have_text(str(backups["balance"]))
    expect(dashboard.locator("#koennen .js-plotly-plot")).to_have_count(2)


def test_keine_sicherung_wird_gemeldet(dashboard: Page, tmp_path):
    other = tmp_path / "irgendwas.json"
    other.write_text('{"hallo": 1}', encoding="utf-8")
    dashboard.set_input_files("#files", str(other))
    expect(dashboard.locator(".file-errors")).to_contain_text("irgendwas.json: Das ist keine Sicherung vom Vokabeltrainer.")
    expect(dashboard.locator(".intro")).to_be_visible()
