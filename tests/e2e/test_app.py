"""E2E-Tests: spielen die App im (simulierten) iPhone-Browser durch."""

import json
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
    expect(page.locator("#submit:text('Prüfen'), #done:visible, #mix-done:visible")).to_have_count(1)


def open_list(page: Page, title: str) -> None:
    page.goto("/")
    page.locator(".list-button", has_text=title).click()
    expect(page.locator("#quiz")).to_be_visible()


def open_mix(page: Page) -> None:
    page.goto("/")
    page.locator(".mix-button").click()
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
        "53 Vokabeln aus 2 Listen · immer 5 Karten"
    )


def test_super_liste_mit_echten_listen(page: Page):
    data = real_lists()
    open_mix(page)
    expect(page.locator("#quiz-status")).to_have_text("Karte 1 von 5")
    expect(page.locator("#dots")).to_be_hidden()
    expect(page.locator("#answer")).to_be_focused()

    asked = []
    for _ in range(5):
        asked.append(question(page))
        answer_correctly_and_continue(page, data)
    assert len(set(asked)) == 5  # keine Vokabel doppelt
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
