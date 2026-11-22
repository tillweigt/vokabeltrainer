"""E2E-Tests: spielen die App im (simulierten) iPhone-Browser durch."""

import json
import re
from datetime import date

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
    # Weiter hat geklappt: neue Karte zur Eingabe, „Liste geschafft“ oder Ergebnis der Portion
    expect(
        page.locator("#submit:text('Prüfen'), #done:visible, #mix-done:visible, #test-done:visible")
    ).to_have_count(1)


def open_list(page: Page, title: str) -> None:
    page.goto("/")
    page.locator(".list-button", has_text=title).click()
    expect(page.locator("#quiz")).to_be_visible()


def open_mix(page: Page) -> None:
    page.goto("/")
    page.locator(".mix-button").click()
    expect(page.locator("#quiz")).to_be_visible()


def open_test(page: Page, list_id: str) -> None:
    page.goto("/")
    page.locator(f".test-button[data-list='{list_id}']").click()
    expect(page.locator("#quiz")).to_be_visible()


def history(page: Page, list_id: str) -> dict:
    return page.evaluate(
        "(id) => JSON.parse(localStorage.getItem(`vokabeltrainer:v1:${id}:verlauf`) || '{}')",
        list_id,
    )


def set_stars(page: Page, earned: int, redemptions: tuple = ()) -> None:
    """Setzt das Sternekonto direkt im Speicher und lädt die Startseite neu."""
    page.goto("/")
    page.evaluate(
        "(ledger) => localStorage.setItem('vokabeltrainer:v1:sterne', JSON.stringify(ledger))",
        {"earned": earned, "redemptions": list(redemptions)},
    )
    page.reload()


def real_lists() -> dict:
    """Alle echten Englisch-Listen zusammen, für solution_for in der Super-Liste."""
    ids = json.loads((ROOT / "lists" / "index.json").read_text(encoding="utf-8"))
    items = []
    for list_id in ids:
        data = json.loads((ROOT / "lists" / f"{list_id}.json").read_text(encoding="utf-8"))
        if data["fach"] == "Englisch":
            items += data["items"]
    return {"items": items}


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
    expect(page.locator("#quiz-status")).to_have_text("0 von 4 geschafft")
    expect(page.locator("#card-stars")).to_have_text("⭐ 8")
    expect(page.locator("#quiz-balance")).to_have_text("⭐ 0")
    answer(page, solution_for(page, mini_list))
    expect(page.locator("#feedback strong")).to_have_text("Richtig! +8 ⭐")
    expect(page.locator("#quiz-balance")).to_have_text("⭐ 8")
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


def test_auch_richtig_nach_richtiger_antwort(page: Page, mini_list):
    open_list(page, "Testliste")
    advance_to(page, mini_list, "I'm …")
    answer(page, "I'm")
    expect(page.locator("#feedback strong")).to_contain_text("Richtig!")
    # nur die übrigen Lösungen, nicht die getippte
    expect(page.locator("#feedback .also")).to_have_text("Auch richtig: My name is …")


def test_ohne_weitere_loesung_kein_auch_richtig(page: Page, mini_list):
    open_list(page, "Testliste")
    advance_to(page, mini_list, "boy")
    answer(page, "boy")
    expect(page.locator("#feedback strong")).to_contain_text("Richtig!")
    expect(page.locator("#feedback .also")).to_have_count(0)


# ---------- Mehrdeutigkeit über Listen und Varianten aus „auch“ ----------


@pytest.mark.parametrize(
    ("title", "list_id", "asked", "typed", "other"),
    [
        ("Liste eins", "test-eins", "boy", "lad", "test-zwei"),
        ("Liste zwei", "test-zwei", "lad", "boy", "test-eins"),
    ],
)
def test_loesung_aus_anderer_liste_desselben_fachs(page: Page, two_lists, title, list_id, asked, typed, other):
    open_list(page, title)
    advance_to(page, two_lists[list_id], asked)
    answer(page, typed)
    expect(page.locator("#feedback strong")).to_contain_text("Richtig!")
    expect(page.locator("#feedback .also")).to_have_text(f"Auch richtig: {asked}")
    expect(page.locator("#dots")).to_have_text("●○○")
    # Verlauf zählt für die gefragte Vokabel, nicht für die getippte
    assert history(page, list_id)[asked] == "R"
    assert history(page, other) == {}


def test_falsche_antwort_zeigt_loesungen_aus_anderen_listen(page: Page, two_lists):
    open_list(page, "Liste eins")
    advance_to(page, two_lists["test-eins"], "boy")
    answer(page, "falsch")
    expect(page.locator("#feedback .solution")).to_have_text("boy")
    expect(page.locator("#feedback .also")).to_have_text("Auch richtig: lad")


def test_andere_faecher_zaehlen_nicht(page: Page, two_lists):
    open_list(page, "Liste eins")
    advance_to(page, two_lists["test-eins"], "small")
    answer(page, "petit")  # gleiche Bedeutung „klein“, aber Fach Französisch
    expect(page.locator("#feedback")).to_contain_text("Leider falsch")
    expect(page.locator("#feedback .solution")).to_have_text("small")
    expect(page.locator("#feedback .also")).to_have_count(0)


def test_variante_aus_auch_wird_akzeptiert(page: Page, two_lists, spoken):
    open_list(page, "Liste zwei")
    advance_to(page, two_lists["test-zwei"], "there's")
    answer(page, "there is")
    expect(page.locator("#feedback strong")).to_contain_text("Richtig!")
    expect(page.locator("#feedback .also")).to_have_text("Auch richtig: there's")
    page.click(".speak-button")
    assert spoken()[-1] == {"text": "there's", "lang": "en-GB"}  # vorgelesen wird die eigene Lösung
    expect(page.locator("#answer")).to_be_focused()


def test_super_liste_ueber_listen(page: Page, two_lists):
    page.goto("/")
    expect(page.locator(".mix-button .list-progress")).to_have_text(
        "4 Vokabeln aus 2 Listen · immer 5 Karten"  # das andere Fach ist nicht dabei
    )
    open_mix(page)
    expect(page.locator("#quiz-status")).to_have_text("Karte 1 von 4")
    # solution_for nimmt bei „Junge“ beide Male die erste Lösung („boy“), auch für „lad“
    both = {"items": two_lists["test-eins"]["items"] + two_lists["test-zwei"]["items"]}
    for _ in range(4):
        answer_correctly_and_continue(page, both)
    expect(page.locator("#mix-result")).to_have_text("4 von 4 richtig")
    assert history(page, "test-zwei")["lad"] == "R"
    assert history(page, "test-eins")["boy"] == "R"


def test_falsche_karte_kommt_erst_im_naechsten_durchgang(page: Page, mini_list):
    open_list(page, "Testliste")
    first = question(page)
    answer(page, "falsch")
    page.press("#answer", "Enter")

    # Rest des Durchgangs: die drei anderen Karten, jede genau einmal
    rest = []
    for _ in range(3):
        rest.append(question(page))
        answer_correctly_and_continue(page, mini_list)
    assert first not in rest
    assert len(set(rest)) == 3

    # Nächster Durchgang: wieder alle vier, die falsche noch ohne Punkt
    second_round = {}
    for _ in range(4):
        second_round[question(page)] = page.locator("#dots").inner_text()
        answer_correctly_and_continue(page, mini_list)
    assert len(second_round) == 4
    assert second_round[first] == "○○○"


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


# ---------- Super-Liste ----------


def test_super_liste_ganz_oben(page: Page):
    page.goto("/")
    first = page.locator("#lists > :first-child")
    expect(first).to_have_class("list-button mix-button")
    expect(first.locator(".list-title")).to_have_text("🔀 Alle Englisch-Vokabeln")
    expect(first.locator(".list-progress")).to_have_text(
        "168 Vokabeln aus 4 Listen · immer 5 Karten"
    )


def test_super_liste_mit_echten_listen(page: Page):
    data = real_lists()
    open_mix(page)
    expect(page.locator("#quiz-status")).to_have_text("Karte 1 von 5")
    expect(page.locator("#dots")).to_be_hidden()
    expect(page.locator("#answer")).to_be_focused()

    # Keine Vokabel doppelt. Nicht über den Fragetext: „klein“ oder „sie“ fragt nach zwei Vokabeln.
    portion = page.evaluate("JSON.parse(localStorage.getItem('vokabeltrainer:v1:portion')).refs")
    assert len({(ref["listId"], ref["key"]) for ref in portion}) == 5
    for _ in range(5):
        answer_correctly_and_continue(page, data)
    expect(page.locator("#mix-result")).to_have_text("5 von 5 richtig")
    expect(page.locator("#mix-stars")).to_have_text("+40 ⭐")  # 5 neue Vokabeln à 8
    expect(page.locator("#error-overlay")).to_be_hidden()

    # „Weiter üben“: nächste Portion, Tastatur bleibt offen
    page.click("#mix-again")
    expect(page.locator("#quiz-status")).to_have_text("Karte 1 von 5")
    expect(page.locator("#answer")).to_be_focused()


def test_super_liste_zaehlt_karten(page: Page, mini_list):
    open_mix(page)  # nur 4 Vokabeln → Portion mit allen 4
    status = page.locator("#quiz-status")
    expect(status).to_have_text("Karte 1 von 4")
    answer(page, solution_for(page, mini_list))
    expect(status).to_have_text("Karte 1 von 4")  # während der Rückmeldung unverändert
    page.press("#answer", "Enter")
    expect(status).to_have_text("Karte 2 von 4")

    page.click("#back")
    expect(page.locator("#start")).to_be_visible()


def test_super_liste_nur_im_verlauf(page: Page, mini_list):
    button = page.locator(".list-button", has_text="Testliste")

    # In der Liste: erste Karte falsch
    open_list(page, "Testliste")
    first_en = solution_for(page, mini_list)
    answer(page, "falsch")
    page.click("#back")

    # In der Super-Liste: erste Karte falsch, die anderen drei richtig
    open_mix(page)
    answer(page, "falsch")
    page.press("#answer", "Enter")
    for _ in range(3):
        answer_correctly_and_continue(page, mini_list)
    expect(page.locator("#mix-result")).to_have_text("3 von 4 richtig")

    # Verlauf: 1 Antwort aus der Liste + 4 aus der Super-Liste
    log = history(page, "test-mini")
    assert sum(len(entries) for entries in log.values()) == 5
    assert log[first_en].startswith("F")

    # Die Zähler der Liste bleiben unberührt
    page.click("#mix-back")
    expect(button.locator(".list-progress")).to_have_text("0 von 4 geschafft")
    expect(button.locator(".level")).to_have_text(["○○○ 4", "●○○ 0", "●●○ 0", "●●● 0"])


def test_verlauf_bleibt_bei_durchlauf(page: Page, mini_list):
    open_list(page, "Testliste")
    first_en = solution_for(page, mini_list)
    answer_correctly_and_continue(page, mini_list)
    assert history(page, "test-mini") == {first_en: "R"}

    mini_list["durchlauf"] = 2
    page.goto("/")
    button = page.locator(".list-button", has_text="Testliste")
    expect(button.locator(".level")).to_have_text(["○○○ 4", "●○○ 0", "●●○ 0", "●●● 0"])
    assert history(page, "test-mini") == {first_en: "R"}


def test_portion_wird_nach_pause_fortgesetzt(page: Page, mini_list):
    open_mix(page)
    for _ in range(2):
        answer_correctly_and_continue(page, mini_list)

    page.reload()  # wie App schließen und später wieder öffnen
    mix = page.locator(".mix-button")
    expect(mix.locator(".list-progress")).to_have_text("weiter bei Karte 3 von 4")
    mix.click()
    expect(page.locator("#quiz-status")).to_have_text("Karte 3 von 4")
    for _ in range(2):
        answer_correctly_and_continue(page, mini_list)
    expect(page.locator("#mix-result")).to_have_text("4 von 4 richtig")
    expect(page.locator("#mix-stars")).to_have_text("+32 ⭐")  # auch die Sterne vor der Pause

    # Fertige Portion ist weg: nächstes Mal neu ziehen
    page.click("#mix-back")
    expect(mix.locator(".list-progress")).to_have_text("4 Vokabeln aus 1 Liste · immer 5 Karten")


def test_portion_bleibt_beim_blossen_oeffnen_einer_liste(page: Page, mini_list):
    open_mix(page)
    answer_correctly_and_continue(page, mini_list)
    page.click("#back")
    page.locator(".list-button", has_text="Testliste").click()
    page.click("#back")  # Liste nur geöffnet, nicht geantwortet
    expect(page.locator(".mix-button .list-progress")).to_have_text("weiter bei Karte 2 von 4")


def test_portion_verworfen_nach_antwort_in_liste(page: Page, mini_list):
    open_mix(page)
    answer_correctly_and_continue(page, mini_list)
    page.click("#back")
    page.locator(".list-button", has_text="Testliste").click()
    answer(page, "falsch")  # in der normalen Liste geantwortet
    page.click("#back")
    expect(page.locator(".mix-button .list-progress")).to_have_text(
        "4 Vokabeln aus 1 Liste · immer 5 Karten"
    )
    page.locator(".mix-button").click()
    expect(page.locator("#quiz-status")).to_have_text("Karte 1 von 4")


# ---------- Test: alle Vokabeln einer Liste einmal ----------


def play_test(page: Page, data: dict, wrong: tuple = ()) -> list:
    """Beantwortet alle restlichen Karten, die in `wrong` falsch. Ergebnis: gefragte Vokabeln."""
    asked = []
    while page.locator("#quiz").is_visible():
        en = solution_for(page, data)
        asked.append(en)
        if en in wrong:
            answer(page, "falsch")
            expect(page.locator("#feedback")).to_contain_text("Leider falsch")
            page.press("#answer", "Enter")
        else:
            answer_correctly_and_continue(page, data)
    return asked


def test_testknopf_unter_jeder_liste(page: Page, two_lists):
    page.goto("/")
    expect(page.locator(".test-button")).to_have_text(
        ["📝 Alle 2 testen", "📝 Alle 2 testen", "📝 Alle 1 testen"]  # keiner für die Super-Liste
    )


def test_test_fragt_jede_vokabel_einmal_auch_geschaffte(page: Page, mini_list):
    page.goto("/")
    page.evaluate("localStorage.setItem('vokabeltrainer:v1:test-mini:1', JSON.stringify({ boy: 3 }))")
    open_test(page, "test-mini")
    expect(page.locator("#quiz-status")).to_have_text("Karte 1 von 4")
    expect(page.locator("#dots")).to_be_hidden()
    expect(page.locator("#answer")).to_be_focused()  # Tastatur ist offen

    asked = play_test(page, mini_list, wrong=("boy",))
    assert sorted(asked) == sorted(item["en"] for item in mini_list["items"])
    expect(page.locator("#test-result")).to_have_text("3 von 4 richtig")
    expect(page.locator("#test-stars")).to_have_text("+24 ⭐")
    expect(page.locator("#test-again")).to_be_visible()
    expect(page.locator("#error-overlay")).to_be_hidden()

    # Zählt für Verlauf, Sterne und Protokoll, aber nicht für Punkte und Runden der Liste
    log = history(page, "test-mini")
    assert log.pop("boy") == "F"
    assert set(log.values()) == {"R"} and len(log) == 3
    entries = protocol(page)
    assert [entry["modus"] for entry in entries] == ["test"] * 4
    assert sum(entry["sterne"] for entry in entries) == 24
    page.click("#test-back")
    expect(page.locator("#stars-balance")).to_have_text("⭐ 24 Sterne")
    button = page.locator(".list-button", has_text="Testliste")
    expect(button.locator(".level")).to_have_text(["○○○ 3", "●○○ 0", "●●○ 0", "●●● 1"])
    expect(button.locator(".list-rounds")).to_have_text("🏆 0× komplett geschafft")


def test_test_zeigt_rueckmeldung_nach_jeder_antwort(page: Page, mini_list):
    open_test(page, "test-mini")
    answer(page, "falsch")
    expect(page.locator("#feedback")).to_contain_text("Leider falsch")
    expect(page.locator("#quiz-status")).to_have_text("Karte 1 von 4")  # während der Rückmeldung
    page.press("#answer", "Enter")
    expect(page.locator("#quiz-status")).to_have_text("Karte 2 von 4")
    expect(page.locator("#answer")).to_be_focused()


def test_test_fehler_nochmal(page: Page, mini_list):
    open_test(page, "test-mini")
    play_test(page, mini_list, wrong=("boy", "What's your name?"))
    expect(page.locator("#test-result")).to_have_text("2 von 4 richtig")

    page.click("#test-again")
    expect(page.locator("#quiz-status")).to_have_text("Karte 1 von 2")
    expect(page.locator("#answer")).to_be_focused()
    assert sorted(play_test(page, mini_list, wrong=("boy",))) == ["What's your name?", "boy"]
    expect(page.locator("#test-result")).to_have_text("1 von 2 richtig")

    page.click("#test-again")
    assert play_test(page, mini_list) == ["boy"]
    expect(page.locator("#test-result")).to_have_text("1 von 1 richtig")
    expect(page.locator("#test-again")).to_be_hidden()  # keine Fehler mehr

    # Das gemerkte Ergebnis ist das des ganzen Tests
    page.click("#test-back")
    today = date.today()
    expect(page.locator(".test-last")).to_have_text(
        f"Letzter Test: 2 von 4 richtig am {today.day}.{today.month}."
    )
    expect(page.locator(".test-title")).to_have_text("📝 Alle 4 testen")


def test_test_wird_nach_pause_fortgesetzt(page: Page, mini_list):
    open_test(page, "test-mini")
    answer(page, "falsch")
    page.press("#answer", "Enter")
    answer_correctly_and_continue(page, mini_list)

    page.reload()  # wie App schließen und später wieder öffnen
    title = page.locator(".test-title")
    expect(title).to_have_text("📝 Test fortsetzen (3 von 4)")
    expect(page.locator(".test-last")).to_have_count(0)  # noch kein fertiger Test
    open_test(page, "test-mini")
    expect(page.locator("#quiz-status")).to_have_text("Karte 3 von 4")
    play_test(page, mini_list)
    expect(page.locator("#test-result")).to_have_text("3 von 4 richtig")  # mit den Antworten vor der Pause

    page.click("#test-again")  # auch „Fehler nochmal“ lässt sich unterbrechen
    page.reload()
    expect(title).to_have_text("📝 Fehler fortsetzen (1 von 1)")


def test_test_ergebnis_steht_sofort_nach_der_letzten_antwort(page: Page, mini_list):
    open_test(page, "test-mini")
    for _ in range(3):
        answer_correctly_and_continue(page, mini_list)
    answer(page, solution_for(page, mini_list))
    page.reload()  # geschlossen, ohne „Weiter“ zu tippen
    expect(page.locator(".test-title")).to_have_text("📝 Alle 4 testen")
    expect(page.locator(".test-last")).to_contain_text("Letzter Test: 4 von 4 richtig")


def test_test_pro_liste_getrennt(page: Page, two_lists):
    open_test(page, "test-eins")
    answer_correctly_and_continue(page, two_lists["test-eins"])
    page.click("#back")
    expect(page.locator(".test-title")).to_have_text(
        ["📝 Test fortsetzen (2 von 2)", "📝 Alle 2 testen", "📝 Alle 1 testen"]
    )


def test_test_laesst_die_portion_der_super_liste_stehen(page: Page, mini_list):
    open_mix(page)
    answer_correctly_and_continue(page, mini_list)
    open_test(page, "test-mini")
    play_test(page, mini_list)
    page.click("#test-back")
    expect(page.locator(".mix-button .list-progress")).to_have_text("weiter bei Karte 2 von 4")


def test_test_mit_echten_listen(page: Page):
    page.goto("/")
    expect(page.locator(".test-title")).to_have_text(
        ["📝 Alle 24 testen", "📝 Alle 29 testen", "📝 Alle 58 testen", "📝 Alle 57 testen"]
    )
    data = json.loads((ROOT / "lists" / "en-unit-1-teil-3.json").read_text(encoding="utf-8"))
    open_test(page, "en-unit-1-teil-3")
    assert len(play_test(page, data)) == 57
    expect(page.locator("#test-result")).to_have_text("57 von 57 richtig")
    expect(page.locator("#error-overlay")).to_be_hidden()


# ---------- Ansehen: alle Vokabeln einer Liste mit Übersetzung ----------

COVERED = "rgba(0, 0, 0, 0)"  # durchsichtige Schrift


def open_view(page: Page, list_id: str) -> None:
    page.goto("/")
    page.locator(f".view-button[data-list='{list_id}']").click()
    expect(page.locator("#view")).to_be_visible()


def test_ansehen_zeigt_alle_vokabeln(page: Page, two_lists):
    open_view(page, "test-zwei")
    expect(page.locator("#start")).to_be_hidden()
    expect(page.locator("#view-title")).to_have_text("Liste zwei")
    expect(page.locator(".view-en")).to_have_text(["lad", "there's / there is"])
    expect(page.locator(".view-de")).to_have_text(["Junge", "es gibt"])
    expect(page.locator("#error-overlay")).to_be_hidden()


def test_ansehen_knopf_unter_jeder_liste(page: Page, two_lists):
    page.goto("/")
    expect(page.locator(".view-button")).to_have_text(["📖 Ansehen"] * 3)  # keiner für die Super-Liste


@pytest.mark.parametrize("width", [320, 375, 428])  # iPhone SE, 12 mini, 13 Pro Max
def test_ansehen_echte_listen_passen_in_die_breite(page: Page, width):
    page.set_viewport_size({"width": width, "height": 629})
    page.goto("/")
    ids = json.loads((ROOT / "lists" / "index.json").read_text(encoding="utf-8"))
    for list_id in ids:
        data = json.loads((ROOT / "lists" / f"{list_id}.json").read_text(encoding="utf-8"))
        open_view(page, list_id)
        assert page.locator(".view-en").all_inner_texts() == [
            " / ".join([item["en"], *item.get("auch", [])]) for item in data["items"]
        ]
        assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
        overflowing = page.evaluate(
            "[...document.querySelectorAll('.view-en, .view-de')]"
            ".filter((cell) => cell.scrollWidth > cell.clientWidth + 1).map((cell) => cell.textContent)"
        )
        assert overflowing == []


def test_ansehen_bricht_nach_dem_schraegstrich_um(page: Page):
    page.set_viewport_size({"width": 320, "height": 629})
    open_view(page, "en-unit-1-teil-3")
    cell = page.locator(".view-de", has_text="hundert/einhundert")
    assert cell.inner_html() == "hundert/<wbr>einhundert"
    # Ein Wort bricht nicht mitten durch: genau zwei Zeilen
    lines = cell.evaluate(
        "(cell) => { const r = document.createRange(); r.selectNodeContents(cell);"
        " return new Set([...r.getClientRects()].map((rect) => Math.round(rect.top))).size; }"
    )
    assert lines == 2


def test_ansehen_zurueck_ist_beim_scrollen_immer_da(page: Page):
    page.goto("/")
    button = page.locator(".view-button[data-list='en-unit-1-teil-2']")
    button.scroll_into_view_if_needed()
    before = page.evaluate("window.scrollY")
    assert before > 0
    button.click()
    assert page.evaluate("window.scrollY") == 0  # die Liste beginnt oben

    page.evaluate("window.scrollTo(0, 1000)")
    expect(page.locator("#view-back")).to_be_in_viewport(ratio=1)
    page.click("#view-back")
    expect(page.locator("#view")).to_be_hidden()
    expect(page.locator("#start")).to_be_visible()
    assert page.evaluate("window.scrollY") == before  # wieder bei derselben Unit
    expect(button).to_be_in_viewport()


def test_ansehen_zurueck_am_ende_der_liste(page: Page):
    open_view(page, "en-unit-1-teil-3")
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    expect(page.locator(".view-row").last).to_be_in_viewport()
    page.click("#view-end")
    expect(page.locator("#start")).to_be_visible()


def test_ansehen_tippen_liest_vor(page: Page, two_lists, spoken):
    open_view(page, "test-zwei")
    assert spoken() == []
    page.locator(".view-row").nth(1).click()
    assert spoken() == [{"text": "there's", "lang": "en-GB"}]  # die eigene Lösung, ohne Varianten


def test_ansehen_englisch_verdecken(page: Page, two_lists, spoken):
    open_view(page, "test-zwei")
    english = page.locator(".view-en")
    cover = page.locator("#view-cover")
    expect(cover).to_have_text("Englisch verdecken")
    cover.click()
    expect(cover).to_have_text("Englisch zeigen")
    expect(english.nth(0)).to_have_css("color", COVERED)
    expect(english.nth(1)).to_have_css("color", COVERED)
    expect(page.locator(".view-de").nth(0)).not_to_have_css("color", COVERED)

    # Erster Tipp deckt nur diese Zeile auf, der zweite liest vor
    row = page.locator(".view-row").nth(0)
    row.click()
    expect(english.nth(0)).not_to_have_css("color", COVERED)
    expect(english.nth(1)).to_have_css("color", COVERED)
    assert spoken() == []
    row.click()
    assert spoken() == [{"text": "lad", "lang": "en-GB"}]

    cover.click()  # alles zeigen
    expect(english.nth(1)).not_to_have_css("color", COVERED)
    cover.click()  # wieder verdecken: auch die vorher aufgedeckte Zeile
    expect(english.nth(0)).to_have_css("color", COVERED)


def test_ansehen_beginnt_immer_offen(page: Page, two_lists):
    open_view(page, "test-zwei")
    page.click("#view-cover")
    page.click("#view-back")
    page.locator(".view-button[data-list='test-eins']").click()
    expect(page.locator("#view-cover")).to_have_text("Englisch verdecken")
    expect(page.locator(".view-en")).to_have_text(["boy", "small"])  # nur die neue Liste
    expect(page.locator(".view-en").nth(0)).not_to_have_css("color", COVERED)


def test_ansehen_speichert_nichts(page: Page, mini_list, spoken):
    open_mix(page)  # angefangene Portion und angefangener Test sollen bleiben
    answer_correctly_and_continue(page, mini_list)
    open_test(page, "test-mini")
    answer_correctly_and_continue(page, mini_list)
    stored = "JSON.stringify(Object.entries(localStorage).sort())"
    before = page.evaluate(stored)
    open_view(page, "test-mini")
    page.locator(".view-row").nth(0).click()
    page.click("#view-cover")
    page.locator(".view-row").nth(1).click()
    page.click("#view-back")
    assert page.evaluate(stored) == before


# ---------- Sterne ----------


def test_falsch_bringt_keine_sterne(page: Page, mini_list):
    open_list(page, "Testliste")
    answer(page, "falsch")
    expect(page.locator("#feedback")).not_to_contain_text("⭐")
    expect(page.locator("#quiz-balance")).to_have_text("⭐ 0")


def test_sterne_sinken_mit_jeder_richtigen_antwort(page: Page, mini_list):
    open_list(page, "Testliste")
    for _ in range(len(mini_list["items"])):  # 1. Durchgang: jede Vokabel einmal richtig
        expect(page.locator("#card-stars")).to_have_text("⭐ 8")
        answer_correctly_and_continue(page, mini_list)
    expect(page.locator("#card-stars")).to_have_text("⭐ 7")  # 2. Durchgang


def test_sterne_fuer_eine_runde_mit_bonus(page: Page, mini_list):
    open_list(page, "Testliste")
    play_full_round(page, mini_list)
    expect(page.locator("#done-bonus")).to_have_text("+4 ⭐ Bonus")
    page.click("#done-back")
    # je Vokabel 8 + 7 + 6 = 21, mal 4 Vokabeln, plus 4 Bonus
    expect(page.locator("#stars-balance")).to_have_text("⭐ 88 Sterne")


def test_einloesen(page: Page):
    set_stars(page, 50)
    expect(page.locator("#stars-balance")).to_have_text("⭐ 50 Sterne")
    expect(page.locator("#redeem-amount")).to_have_attribute("inputmode", "numeric")

    page.fill("#redeem-amount", "20")
    page.press("#redeem-amount", "Enter")
    expect(page.locator("#redeem-question")).to_have_text("20 ⭐ wirklich einlösen?")
    expect(page.locator("#stars-balance")).to_have_text("⭐ 50 Sterne")  # noch nicht gebucht

    page.click("#redeem-yes")
    expect(page.locator("#stars-balance")).to_have_text("⭐ 30 Sterne")
    expect(page.locator("#redeem-confirm")).to_be_hidden()
    expect(page.locator("#redeem-amount")).to_have_value("")
    today = date.today()
    expect(page.locator("#redemptions li")).to_have_text(
        [f"20 ⭐ eingelöst am {today.day}.{today.month}."]
    )

    page.reload()  # bleibt gespeichert
    expect(page.locator("#stars-balance")).to_have_text("⭐ 30 Sterne")


def test_einloesen_abbrechen(page: Page):
    set_stars(page, 50)
    page.fill("#redeem-amount", "20")
    page.click("#redeem-submit")
    page.click("#redeem-no")
    expect(page.locator("#redeem-confirm")).to_be_hidden()
    expect(page.locator("#stars-balance")).to_have_text("⭐ 50 Sterne")
    expect(page.locator("#redemptions li")).to_have_count(0)


@pytest.mark.parametrize(
    ("typed", "message"),
    [
        ("51", "So viele Sterne hast du nicht (Kontostand: 50)."),
        ("0", "Bitte mindestens 1 Stern eingeben."),
        ("abc", "Bitte eine ganze Zahl eingeben."),
    ],
)
def test_einloesen_fehler(page: Page, typed, message):
    set_stars(page, 50)
    page.fill("#redeem-amount", typed)
    page.click("#redeem-submit")
    expect(page.locator("#redeem-error")).to_have_text(message)
    expect(page.locator("#redeem-confirm")).to_be_hidden()
    expect(page.locator("#stars-balance")).to_have_text("⭐ 50 Sterne")


def test_nur_die_letzten_drei_einloesungen(page: Page):
    set_stars(page, 100)
    for amount in ["1", "2", "3", "4"]:
        page.fill("#redeem-amount", amount)
        page.click("#redeem-submit")
        page.click("#redeem-yes")
    items = page.locator("#redemptions li")
    expect(items).to_have_count(3)
    expect(items.first).to_contain_text("4 ⭐ eingelöst")
    expect(page.locator("#stars-balance")).to_have_text("⭐ 90 Sterne")


# ---------- Vorlesen ----------


@pytest.fixture
def spoken(page: Page):
    """Ersetzt die Sprachausgabe durch eine Attrappe, die nur mitschreibt, was vorgelesen würde."""
    page.add_init_script(
        """
        window.__spoken = [];
        Object.defineProperty(window, "speechSynthesis", {
          configurable: true,
          value: {
            speak: (utterance) => window.__spoken.push({ text: utterance.text, lang: utterance.lang }),
            cancel: () => {},
          },
        });
        """
    )
    return lambda: page.evaluate("window.__spoken")


def test_vorlesen_erst_nach_dem_pruefen(page: Page, mini_list, spoken):
    open_list(page, "Testliste")
    expect(page.locator(".speak-button")).to_have_count(0)  # vorher würde es die Lösung verraten
    expected = solution_for(page, mini_list).replace(" …", "")
    answer(page, "falsch")

    page.click(".speak-button")
    assert spoken() == [{"text": expected, "lang": "en-GB"}]
    expect(page.locator("#answer")).to_be_focused()  # Tastatur bleibt offen

    page.press("#answer", "Enter")  # Return ist weiterhin „Weiter“
    expect(page.locator("#submit")).to_have_text("Prüfen")
    assert len(spoken()) == 1  # nur auf Knopfdruck, nicht automatisch


def test_vorlesen_liest_die_eigene_loesung(page: Page, mini_list, spoken):
    open_list(page, "Testliste")
    advance_to(page, mini_list, "I'm …")
    answer(page, "My name is")  # erlaubte Alternative
    expect(page.locator("#feedback")).to_contain_text("Richtig")
    page.click(".speak-button")
    assert spoken()[-1] == {"text": "I'm", "lang": "en-GB"}


@pytest.fixture
def safari_speech(page: Page):
    """Attrappe mit der Eigenheit von Safari (WebKit-Fehler 191745, behoben im März 2026).

    cancel() wirkt dort verzögert: Was direkt nach dem Abbrechen einer laufenden Ausgabe
    gestartet wird, geht verloren. Eine Ausgabe läuft hier, bis `__finish()` sie beendet.
    """
    page.add_init_script(
        """
        window.__spoken = [];
        window.__cancels = 0;
        window.__resumes = 0;
        let current = null;
        let cancelling = false;
        let paused = false;
        window.__finish = () => { current = null; };
        window.__pause = () => { paused = true; };
        Object.defineProperty(window, "speechSynthesis", {
          configurable: true,
          value: {
            get speaking() { return current !== null; },
            get pending() { return false; },
            get paused() { return paused; },
            speak: (utterance) => {
              if (cancelling) return; // geht verloren, wie in Safari
              current = utterance;
              window.__spoken.push(utterance.text);
            },
            cancel: () => {
              window.__cancels += 1;
              if (current === null) return;
              current = null;
              cancelling = true;
              setTimeout(() => { cancelling = false; }, 30);
            },
            resume: () => { window.__resumes += 1; paused = false; },
          },
        });
        """
    )


def test_vorlesen_startet_sofort_im_tipp(page: Page, mini_list, safari_speech):
    """iOS erlaubt Sprache nur direkt im Tipp, also ohne Umweg über setTimeout."""
    open_list(page, "Testliste")
    advance_to(page, mini_list, "boy")
    answer(page, "boy")
    spoken_in_handler = page.evaluate(
        "() => { document.querySelector('.speak-button').click(); return [...window.__spoken]; }"
    )
    assert spoken_in_handler == ["boy"]
    assert page.evaluate("window.__cancels") == 0  # läuft nichts, gibt es nichts abzubrechen


def test_vorlesen_nochmal_tippen_waehrend_es_laeuft(page: Page, mini_list, safari_speech):
    open_list(page, "Testliste")
    advance_to(page, mini_list, "boy")
    answer(page, "boy")
    page.click(".speak-button")
    page.click(".speak-button")  # die erste Ausgabe läuft noch
    page.wait_for_function("window.__spoken.length === 2", timeout=2000)
    expect(page.locator("#answer")).to_be_focused()  # Tastatur bleibt offen


def test_vorlesen_mehrfach_tippen_stapelt_nicht(page: Page, mini_list, safari_speech):
    open_list(page, "Testliste")
    advance_to(page, mini_list, "boy")
    answer(page, "boy")
    page.evaluate(
        "() => { const b = document.querySelector('.speak-button'); for (let i = 0; i < 4; i++) b.click(); }"
    )
    page.wait_for_function("window.__spoken.length === 2", timeout=2000)
    page.wait_for_timeout(500)
    assert page.evaluate("window.__spoken") == ["boy", "boy"]  # die erste und die letzte


def test_vorlesen_nach_pause_des_geraets(page: Page, mini_list, safari_speech):
    """Nach dem Wechsel in den Hintergrund kann die Sprachausgabe angehalten sein."""
    open_list(page, "Testliste")
    advance_to(page, mini_list, "boy")
    answer(page, "boy")
    page.evaluate("window.__pause()")
    page.click(".speak-button")
    assert page.evaluate("[window.__spoken, window.__resumes]") == [["boy"], 1]


# ---------- Eltern-Bereich: Sichern und Wiederherstellen ----------

BACKUP_NAME = re.compile(r"^vokabeltrainer-\d{4}-\d{2}-\d{2}-\d{4}\.json$")


def stub_share(page: Page, mode: str = "share") -> None:
    """Attrappe für das Teilen-Menü: "share" schreibt mit, "abort" bricht ab, "none" = gibt es nicht."""
    page.add_init_script(
        f"""
        window.__shared = [];
        const mode = {json.dumps(mode)};
        Object.defineProperty(navigator, "canShare", {{
          configurable: true,
          value: mode === "none" ? undefined : () => true,
        }});
        Object.defineProperty(navigator, "share", {{
          configurable: true,
          value: async ({{ files }}) => {{
            if (mode === "abort") throw new DOMException("abgebrochen", "AbortError");
            for (const file of files) window.__shared.push({{ name: file.name, text: await file.text() }});
          }},
        }});
        """
    )


def open_parent_area(page: Page) -> None:
    for _ in range(5):
        page.click("#app-title")
    expect(page.locator("#parent-area")).to_be_visible()


def backup_json(daten: dict, exportiert: str = "2026-10-24T18:00") -> str:
    return json.dumps({"app": "vokabeltrainer", "version": 1, "exportiert": exportiert, "daten": daten})


def upload_backup(page: Page, content: str) -> None:
    page.set_input_files(
        "#backup-file",
        files=[{"name": "sicherung.json", "mimeType": "application/json", "buffer": content.encode()}],
    )


def storage_item(page: Page, key: str):
    return page.evaluate("(key) => JSON.parse(localStorage.getItem(key))", key)


def test_eltern_bereich_ist_versteckt(page: Page):
    page.goto("/")
    area = page.locator("#parent-area")
    expect(area).to_be_hidden()
    for _ in range(4):
        page.click("#app-title")
    expect(area).to_be_hidden()  # 4× reicht nicht
    page.click("#app-title")
    expect(area).to_be_visible()
    expect(page.locator("#last-backup")).to_have_text("Letzte Sicherung: noch nie")
    expect(page.locator("#last-backup")).to_have_class("parent-info due")  # orange

    page.click("#parent-close")
    expect(area).to_be_hidden()
    page.reload()
    expect(area).to_be_hidden()


def test_sichern_ueber_teilen_menue(page: Page):
    stub_share(page)
    set_stars(page, 40)
    open_parent_area(page)
    page.click("#backup-save")
    expect(page.locator("#backup-message")).to_contain_text("Gesichert als vokabeltrainer-")
    expect(page.locator("#last-backup")).to_have_text("Letzte Sicherung: heute")
    expect(page.locator("#last-backup")).to_have_class("parent-info")  # nicht mehr orange

    page.click("#backup-save")  # zweite Sicherung: jetzt gibt es auch das Sicherungsdatum im Speicher
    page.wait_for_function("window.__shared.length === 2")
    shared = page.evaluate("window.__shared")
    assert BACKUP_NAME.match(shared[1]["name"])
    backup = json.loads(shared[1]["text"])
    assert backup["app"] == "vokabeltrainer"
    assert backup["version"] == 1
    assert backup["daten"]["vokabeltrainer:v1:sterne"]["earned"] == 40
    assert "vokabeltrainer:v1:letzte-sicherung" not in backup["daten"]  # gehört zum Gerät


def test_sichern_abbrechen_zaehlt_nicht(page: Page):
    stub_share(page, "abort")
    page.goto("/")
    open_parent_area(page)
    page.click("#backup-save")
    expect(page.locator("#last-backup")).to_have_text("Letzte Sicherung: noch nie")
    expect(page.locator("#backup-message")).to_be_hidden()


def test_sichern_ohne_teilen_menue_laedt_herunter(page: Page):
    stub_share(page, "none")
    set_stars(page, 12)
    open_parent_area(page)
    with page.expect_download() as download_info:
        page.click("#backup-save")
    download = download_info.value
    assert BACKUP_NAME.match(download.suggested_filename)
    backup = json.loads(open(download.path(), encoding="utf-8").read())
    assert backup["daten"]["vokabeltrainer:v1:sterne"]["earned"] == 12


def test_wiederherstellen(page: Page, mini_list):
    set_stars(page, 10)
    page.evaluate(
        """() => {
          localStorage.setItem("vokabeltrainer:v1:test-mini:1", JSON.stringify({ boy: 2 }));
          localStorage.setItem("vokabeltrainer:v1:letzte-sicherung", JSON.stringify("2026-10-30"));
        }"""
    )
    page.reload()
    open_parent_area(page)
    upload_backup(
        page,
        backup_json(
            {
                "vokabeltrainer:v1:sterne": {"earned": 40, "redemptions": []},
                "vokabeltrainer:v1:test-mini:verlauf": {"boy": "RRF"},
            }
        ),
    )
    expect(page.locator("#restore-question")).to_have_text("Sicherung vom 24.10. einspielen?")
    expect(page.locator("#restore-compare")).to_have_text(
        "In der Sicherung: 40 ⭐ · jetzt auf dem Gerät: 10 ⭐"
    )
    page.click("#restore-yes")

    expect(page.locator("#backup-message")).to_have_text("Sicherung vom 24.10. eingespielt.")
    expect(page.locator("#stars-balance")).to_have_text("⭐ 40 Sterne")
    # ersetzt, nicht zusammengeführt: was nicht in der Sicherung steht, ist weg
    assert storage_item(page, "vokabeltrainer:v1:test-mini:1") is None
    assert storage_item(page, "vokabeltrainer:v1:test-mini:verlauf") == {"boy": "RRF"}
    levels = page.locator(".list-button", has_text="Testliste").locator(".level")
    expect(levels).to_have_text(["○○○ 4", "●○○ 0", "●●○ 0", "●●● 0"])
    # das Sicherungsdatum gehört zum Gerät und bleibt
    assert storage_item(page, "vokabeltrainer:v1:letzte-sicherung") == "2026-10-30"


def test_wiederherstellen_abbrechen(page: Page):
    set_stars(page, 10)
    open_parent_area(page)
    upload_backup(page, backup_json({"vokabeltrainer:v1:sterne": {"earned": 40, "redemptions": []}}))
    page.click("#restore-no")
    expect(page.locator("#restore-confirm")).to_be_hidden()
    expect(page.locator("#stars-balance")).to_have_text("⭐ 10 Sterne")


def test_falsche_datei_wird_abgelehnt(page: Page):
    set_stars(page, 10)
    open_parent_area(page)
    upload_backup(page, json.dumps({"foo": 1}))
    message = page.locator("#backup-message")
    expect(message).to_have_text("Das ist keine Sicherung vom Vokabeltrainer.")
    expect(message).to_have_class("error")
    expect(page.locator("#restore-confirm")).to_be_hidden()
    expect(page.locator("#stars-balance")).to_have_text("⭐ 10 Sterne")


def test_sichern_und_auf_neuem_geraet_wiederherstellen(page: Page):
    stub_share(page)
    set_stars(page, 25)
    open_parent_area(page)
    page.click("#backup-save")
    expect(page.locator("#backup-message")).to_contain_text("Gesichert als")
    saved = page.evaluate("window.__shared[0].text")

    page.evaluate("localStorage.clear()")  # wie ein neues Handy
    page.reload()
    expect(page.locator("#stars-balance")).to_have_text("⭐ 0 Sterne")
    open_parent_area(page)
    upload_backup(page, saved)
    expect(page.locator("#restore-compare")).to_have_text(
        "In der Sicherung: 25 ⭐ · jetzt auf dem Gerät: 0 ⭐"
    )
    page.click("#restore-yes")
    expect(page.locator("#stars-balance")).to_have_text("⭐ 25 Sterne")


# ---------- Antwortprotokoll ----------

ZEIT = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$")


def protocol(page: Page) -> list:
    return storage_item(page, "vokabeltrainer:v1:protokoll") or []


def test_protokoll_antworten_aus_der_liste(page: Page, mini_list):
    open_list(page, "Testliste")
    asked = question(page)
    expected = solution_for(page, mini_list)
    answer(page, " falsch ")
    page.press("#answer", "Enter")
    answer_correctly_and_continue(page, mini_list)

    entries = protocol(page)
    assert len(entries) == 2
    wrong = entries[0]
    assert ZEIT.match(wrong["zeit"])
    assert {key: value for key, value in wrong.items() if key != "zeit"} == {
        "art": "antwort",
        "liste": "test-mini",
        "vokabel": expected,
        "frage": asked,
        "getippt": " falsch ",  # genau so, wie getippt
        "richtig": False,
        "modus": "liste",
        "sterne": 0,
        "nachgetragen": False,
    }
    assert entries[1]["richtig"] is True
    assert entries[1]["sterne"] == 8


def test_protokoll_super_liste(page: Page, mini_list):
    open_mix(page)
    answer_correctly_and_continue(page, mini_list)
    assert protocol(page)[0]["modus"] == "super"


def test_protokoll_runde_und_einloesung(page: Page, mini_list):
    open_list(page, "Testliste")
    play_full_round(page, mini_list)
    round_entry = protocol(page)[-1]
    assert round_entry["art"] == "runde"
    assert round_entry["liste"] == "test-mini"
    assert round_entry["vokabel"] is None
    assert round_entry["sterne"] == 4  # Bonus

    page.click("#done-back")
    page.fill("#redeem-amount", "20")
    page.click("#redeem-submit")
    page.click("#redeem-yes")
    entries = protocol(page)
    assert entries[-1]["art"] == "einloesung"
    assert entries[-1]["sterne"] == -20
    assert entries[-1]["liste"] is None
    # Summe der Sterne-Spalte = Kontostand
    assert sum(entry["sterne"] for entry in entries) == 68
    expect(page.locator("#stars-balance")).to_have_text("⭐ 68 Sterne")


def test_protokoll_sichern_und_loeschen_mit_ueberlappung(page: Page, mini_list):
    stub_share(page)
    count = page.locator("#protocol-count")

    def answer_one():
        page.locator(".list-button", has_text="Testliste").click()
        answer(page, "falsch")
        page.click("#back")

    def backup(n):
        page.click("#backup-save")
        page.wait_for_function(f"window.__shared.length === {n}")
        return json.loads(page.evaluate(f"window.__shared[{n - 1}].text"))["daten"]

    page.goto("/")
    answer_one()
    answer_one()
    open_parent_area(page)
    expect(count).to_have_text("Im Protokoll: 2 Einträge")

    # 1. Sicherung: 2 Einträge, gelöscht wird noch nichts
    assert len(backup(1)["vokabeltrainer:v1:protokoll"]) == 2
    expect(count).to_have_text("Im Protokoll: 2 Einträge")

    # 2. Sicherung mit einem neuen Eintrag: die 2 alten standen schon in der 1. und fallen weg
    answer_one()
    assert len(backup(2)["vokabeltrainer:v1:protokoll"]) == 3
    expect(count).to_have_text("Im Protokoll: 1 Eintrag")

    # 3. Sicherung: enthält noch den einen, danach ist das Protokoll leer
    assert len(backup(3)["vokabeltrainer:v1:protokoll"]) == 1
    expect(count).to_have_text("Im Protokoll: 0 Einträge")


def test_altdaten_werden_einmal_nachgetragen(page: Page, mini_list):
    page.goto("/")
    page.evaluate(
        """() => {
          localStorage.setItem("vokabeltrainer:v1:test-mini:verlauf", JSON.stringify({ boy: "RF", "I'm …": "R" }));
          localStorage.removeItem("vokabeltrainer:v1:protokoll-nachgetragen");
          localStorage.removeItem("vokabeltrainer:v1:protokoll");
        }"""
    )
    page.reload()  # wie der erste Start nach dem Update
    expect(page.locator(".list-button", has_text="Testliste")).to_be_visible()

    entries = protocol(page)
    assert [(e["zeit"], e["vokabel"], e["richtig"], e["frage"]) for e in entries] == [
        ("2026-10-31T10:00:00+01:00", "boy", True, "Junge"),
        ("2026-10-31T10:00:01+01:00", "boy", False, "Junge"),
        ("2026-10-31T10:00:02+01:00", "I'm …", True, "Ich heiße … / Ich bin …"),
    ]
    for entry in entries:
        assert entry["nachgetragen"] is True
        assert entry["getippt"] is None and entry["modus"] is None and entry["sterne"] is None

    page.reload()  # nur einmal
    expect(page.locator(".list-button", has_text="Testliste")).to_be_visible()
    assert len(protocol(page)) == 3


# ---------- Sonstiges ----------


def test_zurueck_zur_uebersicht(page: Page, mini_list):
    open_list(page, "Testliste")
    page.click("#back")
    expect(page.locator("#start")).to_be_visible()
    expect(page.locator("#quiz")).to_be_hidden()


def test_ladefehler_wird_angezeigt(page: Page):
    page.route("**/lists/index.json", lambda route: route.fulfill(status=404, body="nicht da"))
    page.goto("/")
    expect(page.locator("#load-error")).to_contain_text("konnten nicht geladen werden")
