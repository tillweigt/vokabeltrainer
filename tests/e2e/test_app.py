"""E2E-Tests: spielen die App im (simulierten) iPhone-Browser durch."""

import json

import pytest
from conftest import ROOT
from playwright.sync_api import Page, expect

MASTERY_TARGET = 3


# ---------- Hilfsfunktionen ----------


def question(page: Page) -> str:
    return page.locator("#question").inner_text()


def solution_for(page: Page, data: dict) -> str:
    """Sucht zur angezeigten Frage die eigene englische Lösung aus der Liste."""
    shown = question(page)
    for item in data["items"]:
        if " / ".join(item["de"]) == shown:
            return item["en"]
    raise AssertionError(f"Unbekannte Frage: {shown!r}")


def answer(page: Page, text: str) -> None:
    page.fill("#answer", text)
    page.press("#answer", "Enter")


def answer_correctly_and_continue(page: Page, data: dict) -> None:
    answer(page, solution_for(page, data))
    expect(page.locator("#feedback")).to_contain_text("Richtig")
    page.press("#answer", "Enter")
    # Weiter hat geklappt: entweder neue Karte zur Eingabe oder „Liste geschafft“
    expect(page.locator("#submit:text('Prüfen'), #done:visible")).to_have_count(1)


def open_list(page: Page, title: str) -> None:
    page.goto("/")
    page.locator(".list-button", has_text=title).click()
    expect(page.locator("#quiz")).to_be_visible()


def advance_to(page: Page, data: dict, en: str) -> None:
    """Beantwortet andere Karten richtig, bis die Karte mit diesem Englisch dran ist."""
    item = next(i for i in data["items"] if i["en"] == en)
    target = " / ".join(item["de"])
    for _ in range(3 * len(data["items"])):
        if question(page) == target:
            return
        answer_correctly_and_continue(page, data)
    raise AssertionError(f"Karte {en!r} kam nicht dran")


# ---------- Tests ----------


def test_startseite_zeigt_echte_liste(page: Page):
    page.goto("/")
    expect(page.locator("h2")).to_have_text("Englisch")
    button = page.locator(".list-button", has_text="Pick-up A")
    expect(button.locator(".list-rounds")).to_have_text("🏆 0× komplett geschafft")
    expect(button.locator(".list-progress")).to_have_text("0 von 24 geschafft")
    expect(button.locator(".level")).to_have_text(["○○○ 24", "●○○ 0", "●●○ 0", "●●● 0"])
    expect(page.locator("#error-overlay")).to_be_hidden()


def test_startseite_zeigt_stufen(page: Page, mini_list):
    open_list(page, "Testliste")
    for _ in range(len(mini_list["items"]) + 1):  # ein Durchgang (alle 1×) plus eine Karte (2×)
        answer_correctly_and_continue(page, mini_list)
    page.click("#back")
    levels = page.locator(".list-button", has_text="Testliste").locator(".level")
    expect(levels).to_have_text(["○○○ 0", "●○○ 3", "●●○ 1", "●●● 0"])


def test_echte_liste_laesst_sich_spielen(page: Page):
    data = json.loads((ROOT / "lists" / "en-pick-up-a.json").read_text(encoding="utf-8"))
    open_list(page, "Pick-up A")
    expect(page.locator("#answer")).to_be_focused()
    for _ in range(5):
        answer_correctly_and_continue(page, data)
    expect(page.locator("#error-overlay")).to_be_hidden()


def test_richtige_antwort(page: Page, mini_list):
    open_list(page, "Testliste")
    expect(page.locator("#dots")).to_have_text("○○○")
    expect(page.locator("#mastered-count")).to_have_text("0 von 4 geschafft")
    answer(page, solution_for(page, mini_list))
    expect(page.locator("#feedback")).to_have_text("Richtig!")
    expect(page.locator("#dots")).to_have_text("●○○")
    expect(page.locator("#submit")).to_have_text("Weiter")


def test_falsche_antwort_zeigt_loesung_und_wartet(page: Page, mini_list):
    open_list(page, "Testliste")
    asked = question(page)
    expected = solution_for(page, mini_list)
    answer(page, "falsch")

    feedback = page.locator("#feedback")
    expect(feedback).to_contain_text("Leider falsch")
    expect(feedback.locator(".solution")).to_have_text(expected)
    expect(page.locator("#dots")).to_have_text("○○○")

    # Es geht nicht automatisch weiter, und Tippen ist gesperrt
    page.wait_for_timeout(1500)
    expect(page.locator("#question")).to_have_text(asked)
    page.keyboard.type("abc")
    expect(page.locator("#answer")).to_have_value("falsch")

    # Return = Weiter: nächste Karte, Feld leer und weiter fokussiert (Tastatur bleibt offen)
    page.press("#answer", "Enter")
    expect(feedback).to_be_hidden()
    expect(page.locator("#answer")).to_have_value("")
    expect(page.locator("#answer")).to_be_focused()
    expect(page.locator("#submit")).to_have_text("Prüfen")


def test_leere_eingabe_zaehlt_nicht(page: Page, mini_list):
    open_list(page, "Testliste")
    answer(page, "   ")
    expect(page.locator("#feedback")).to_be_hidden()
    expect(page.locator("#submit")).to_have_text("Prüfen")


def test_weiter_per_knopf(page: Page, mini_list):
    open_list(page, "Testliste")
    asked = question(page)
    page.fill("#answer", solution_for(page, mini_list))
    page.click("#submit")
    expect(page.locator("#feedback")).to_contain_text("Richtig")
    page.click("#submit")
    expect(page.locator("#question")).not_to_have_text(asked)
    expect(page.locator("#answer")).to_be_focused()


@pytest.mark.parametrize(
    ("en", "typed", "correct"),
    [
        ("What's your name?", "What’s your name?", True),  # iPhone-Apostroph
        ("What's your name?", "  What's  your name?  ", True),  # Leerzeichen
        ("I'm …", "I'm", True),  # Platzhalter weglassen
        ("I'm …", "I'm ...", True),  # Platzhalter mit drei Punkten
        ("I'm …", "My name is", True),  # Mehrdeutigkeit
        ("My name is …", "I'm", True),  # Mehrdeutigkeit, andere Richtung
        ("What's your name?", "what's your name?", False),  # Groß/klein zählt
        ("What's your name?", "What's your name", False),  # Satzzeichen zählen
        ("boy", "Boy", False),
        ("boy", "boys", False),
    ],
)
def test_bewertung(page: Page, mini_list, en, typed, correct):
    open_list(page, "Testliste")
    advance_to(page, mini_list, en)
    answer(page, typed)
    expect(page.locator("#feedback")).to_contain_text("Richtig" if correct else "Leider falsch")


def test_mehrdeutigkeit_zeigt_alternativen(page: Page, mini_list):
    open_list(page, "Testliste")
    advance_to(page, mini_list, "I'm …")
    answer(page, "falsch")
    expect(page.locator("#feedback .solution")).to_have_text("I'm …")
    expect(page.locator("#feedback .also")).to_have_text("Auch richtig: My name is …")


def test_falsche_karte_kommt_wieder_und_zaehlt_nicht(page: Page, mini_list):
    open_list(page, "Testliste")
    first = question(page)
    answer(page, "falsch")
    page.press("#answer", "Enter")

    # Die drei anderen Karten kommen dazwischen …
    between = []
    for _ in range(3):
        between.append(question(page))
        answer_correctly_and_continue(page, mini_list)
    assert first not in between

    # … dann die falsche Karte wieder. Richtig, aber ohne Punkt, weil es kein erster Versuch war.
    expect(page.locator("#question")).to_have_text(first)
    answer(page, solution_for(page, mini_list))
    expect(page.locator("#feedback")).to_contain_text("Richtig")
    expect(page.locator("#dots")).to_have_text("○○○")


def test_fehler_setzt_nicht_zurueck(page: Page, mini_list):
    open_list(page, "Testliste")
    advance_to(page, mini_list, "boy")
    answer_correctly_and_continue(page, mini_list)  # boy: 1
    advance_to(page, mini_list, "boy")
    answer(page, "falsch")
    expect(page.locator("#dots")).to_have_text("●○○")


def test_fortschritt_bleibt_nach_neuladen(page: Page, mini_list):
    open_list(page, "Testliste")
    advance_to(page, mini_list, "boy")
    answer_correctly_and_continue(page, mini_list)

    page.reload()
    open_list(page, "Testliste")
    advance_to(page, mini_list, "boy")
    expect(page.locator("#dots")).to_have_text("●○○")


def play_full_round(page: Page, data: dict) -> None:
    for _ in range(MASTERY_TARGET * len(data["items"])):
        answer_correctly_and_continue(page, data)
    expect(page.locator("#done")).to_be_visible()


def test_runden_zaehlen_und_neu_starten(page: Page, mini_list):
    button = page.locator(".list-button", has_text="Testliste")
    open_list(page, "Testliste")
    play_full_round(page, mini_list)
    expect(page.locator("#done-text")).to_have_text("Alle 4 Vokabeln 3× richtig. Super!")
    expect(page.locator("#done-rounds")).to_have_text("🏆 1× komplett geschafft")

    # Zurück: Runde gezählt, Fortschritt für die nächste Runde geleert
    page.click("#done-back")
    expect(button.locator(".list-rounds")).to_have_text("🏆 1× komplett geschafft")
    expect(button.locator(".list-progress")).to_have_text("0 von 4 geschafft")

    # Nächstes Antippen startet die nächste Runde
    button.click()
    expect(page.locator("#quiz")).to_be_visible()
    expect(page.locator("#dots")).to_have_text("○○○")
    play_full_round(page, mini_list)
    expect(page.locator("#done-rounds")).to_have_text("🏆 2× komplett geschafft")

    # Der Zähler bleibt nach dem Neuladen
    page.goto("/")
    expect(button.locator(".list-rounds")).to_have_text("🏆 2× komplett geschafft")

    # „durchlauf“ erhöhen → Fortschritt und Runden beginnen neu
    mini_list["durchlauf"] = 2
    page.goto("/")
    expect(button.locator(".list-rounds")).to_have_text("🏆 0× komplett geschafft")
    expect(button.locator(".list-progress")).to_have_text("0 von 4 geschafft")


def test_frueher_komplett_geschaffte_liste_zaehlt_als_runde(page: Page, mini_list):
    """Stand aus der Zeit vor dem Runden-Zähler: alle Vokabeln ●●●, aber 0 Runden."""
    page.goto("/")
    page.evaluate(
        """(items) => localStorage.setItem("vokabeltrainer:v1:test-mini:1",
            JSON.stringify(Object.fromEntries(items.map((item) => [item.en, 3]))))""",
        mini_list["items"],
    )
    page.reload()
    button = page.locator(".list-button", has_text="Testliste")
    expect(button.locator(".list-progress")).to_have_text("4 von 4 geschafft")
    expect(button.locator(".list-rounds")).to_have_text("🏆 0× komplett geschafft")

    button.click()
    expect(page.locator("#done-rounds")).to_have_text("🏆 1× komplett geschafft")
    page.click("#done-back")
    expect(button.locator(".list-progress")).to_have_text("0 von 4 geschafft")


def test_zurueck_zur_uebersicht(page: Page, mini_list):
    open_list(page, "Testliste")
    page.click("#back")
    expect(page.locator("#start")).to_be_visible()
    expect(page.locator("#quiz")).to_be_hidden()


def test_ladefehler_wird_angezeigt(page: Page):
    page.route("**/lists/index.json", lambda route: route.fulfill(status=404, body="nicht da"))
    page.goto("/")
    expect(page.locator("#load-error")).to_contain_text("konnten nicht geladen werden")
