// Oberfläche: verbindet die Seite (DOM) mit der Logik aus logic.js.
import {
  MASTERY_TARGET,
  PORTION_SIZE,
  appendHistory,
  buildCards,
  countByHits,
  countMastered,
  drawPortion,
  isCorrect,
  recordAnswer,
  startRound,
  weight,
} from "./logic.js";
import {
  loadHistory,
  loadProgress,
  loadRounds,
  saveHistory,
  saveProgress,
  saveRounds,
} from "./storage.js";

const MIX_SUBJECT = "Englisch"; // die Super-Liste mischt alle Listen dieses Fachs

const $ = (selector) => document.querySelector(selector);

const screens = {
  start: $("#start"),
  quiz: $("#quiz"),
  done: $("#done"),
  mixDone: $("#mix-done"),
};
const form = $("#answer-form");
const input = $("#answer");
const submitButton = $("#submit");
const feedback = $("#feedback");

let lists = []; // alle Vokabellisten aus lists/

// Die laufende Abfrage. Zwei Arten:
// - mode "list": eine einzelne Liste, siehe startList()
// - mode "mix":  eine 10er-Portion der Super-Liste, siehe startMix()
let session = null;

// ---------- Hilfsfunktionen ----------

function showScreen(name) {
  for (const [key, screen] of Object.entries(screens)) {
    screen.hidden = key !== name;
  }
}

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

/** z. B. 2 Treffer → "●●○" */
function dotsFor(hits) {
  return "●".repeat(hits) + "○".repeat(MASTERY_TARGET - hits);
}

function roundsText(rounds) {
  return `🏆 ${rounds}× komplett geschafft`;
}

/** 1 → "1 Liste", 2 → "2 Listen" */
function plural(count, singular, pluralForm) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

async function loadJson(path) {
  // no-cache: nach einem Update sofort die neuen Listen holen
  const response = await fetch(path, { cache: "no-cache" });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

function mixLists() {
  return lists.filter((list) => list.fach === MIX_SUBJECT);
}

/** Jede Antwort landet im Verlauf der Vokabel, egal ob aus Liste oder Super-Liste. */
function rememberAnswer(card, correct) {
  saveHistory(card.listId, appendHistory(loadHistory(card.listId), card.key, correct));
}

// ---------- Startseite ----------

function renderStart() {
  const container = $("#lists");
  container.replaceChildren();
  if (mixLists().length > 0) container.append(renderMixButton());
  const subjects = [...new Set(lists.map((list) => list.fach))];
  for (const subject of subjects) {
    container.append(element("h2", "", subject));
    for (const list of lists.filter((l) => l.fach === subject)) {
      container.append(renderListButton(list));
    }
  }
}

function renderMixButton() {
  const sources = mixLists();
  const count = sources.reduce((sum, list) => sum + list.items.length, 0);
  const button = element("button", "list-button mix-button");
  button.type = "button";
  button.append(
    element("span", "list-title", `🔀 Alle ${MIX_SUBJECT}-Vokabeln`),
    element(
      "span",
      "list-progress",
      `${plural(count, "Vokabel", "Vokabeln")} aus ${plural(sources.length, "Liste", "Listen")}` +
        ` · immer ${PORTION_SIZE} Karten`,
    ),
  );
  button.addEventListener("click", startMix);
  return button;
}

function renderListButton(list) {
  const cards = buildCards(list);
  const progress = loadProgress(list);
  const mastered = countMastered(cards, progress);
  const button = element("button", "list-button");
  button.type = "button";
  button.append(
    element("span", "list-title", list.titel),
    element("span", "list-rounds", roundsText(loadRounds(list))),
    element("span", "list-progress", `${mastered} von ${cards.length} geschafft`),
    renderLevels(cards, progress),
  );
  if (mastered === cards.length) button.classList.add("complete");
  button.addEventListener("click", () => startList(list));
  return button;
}

/** Zeile „○○○ 9   ●○○ 8   ●●○ 5   ●●● 2“: wie viele Karten auf welchem Stand sind */
function renderLevels(cards, progress) {
  const levels = element("span", "list-levels");
  countByHits(cards, progress).forEach((count, hits) => {
    const level = element("span", "level");
    level.append(element("span", "level-dots", dotsFor(hits)), ` ${count}`);
    levels.append(level);
  });
  return levels;
}

// ---------- Abfrage starten ----------

function startList(list) {
  const cards = buildCards(list);
  const progress = loadProgress(list);
  session = { mode: "list", list, cards, progress, queue: startRound(cards, progress) };
  if (session.queue.length === 0) {
    // Nur möglich, wenn die Liste noch aus der Zeit vor dem Runden-Zähler komplett geschafft ist
    finishRound();
    showDone();
    return;
  }
  beginQuiz();
}

function startMix() {
  const cards = mixLists().flatMap(buildCards);
  const histories = Object.fromEntries(
    mixLists().map((list) => [list.id, loadHistory(list.id)]),
  );
  const portion = drawPortion(cards, (card) => weight(histories[card.listId][card.key]));
  if (portion.length === 0) return;
  session = { mode: "mix", queue: portion, total: portion.length, answered: 0, correct: 0 };
  beginQuiz();
}

function beginQuiz() {
  showScreen("quiz");
  showCard();
  // Synchron im Tipp-Handler fokussieren, nur dann öffnet iOS die Tastatur.
  input.focus();
}

// ---------- Abfrage ----------

function showCard() {
  const card = session.queue[0];
  session.showingFeedback = false;
  $("#question").textContent = card.frage;
  input.value = "";
  input.className = "";
  feedback.hidden = true;
  submitButton.textContent = "Prüfen";
  updateStatus(card);
}

function updateStatus(card) {
  const status = $("#quiz-status");
  const dots = $("#dots");
  if (session.mode === "mix") {
    status.textContent = `Karte ${session.answered + (session.showingFeedback ? 0 : 1)} von ${session.total}`;
    dots.hidden = true;
    return;
  }
  const mastered = countMastered(session.cards, session.progress);
  status.textContent = `${mastered} von ${session.cards.length} geschafft`;
  const hits = Math.min(session.progress[card.key] ?? 0, MASTERY_TARGET);
  dots.textContent = dotsFor(hits);
  dots.setAttribute("aria-label", `${hits} von ${MASTERY_TARGET} Mal richtig`);
  dots.hidden = false;
}

function checkAnswer() {
  if (input.value.trim() === "") return; // leere Eingabe zählt nicht als Fehler
  const card = session.queue[0];
  const correct = isCorrect(input.value, card.antworten);
  rememberAnswer(card, correct);
  if (session.mode === "list") {
    session.progress = recordAnswer(session.progress, card, correct);
    saveProgress(session.list, session.progress);
  } else {
    session.answered += 1;
    if (correct) session.correct += 1;
  }
  session.queue = session.queue.slice(1); // jede Karte nur einmal pro Durchgang
  session.showingFeedback = true;
  showFeedback(card, correct);
  updateStatus(card);
  submitButton.textContent = "Weiter";
}

function showFeedback(card, correct) {
  feedback.replaceChildren();
  feedback.className = correct ? "correct" : "wrong";
  input.classList.add(correct ? "correct" : "wrong");
  if (correct) {
    const justMastered =
      session.mode === "list" && (session.progress[card.key] ?? 0) >= MASTERY_TARGET;
    feedback.append(
      element("strong", "", justMastered ? "Richtig! Diese Vokabel hast du geschafft. ⭐" : "Richtig!"),
    );
  } else {
    const [solution, ...others] = card.antworten;
    feedback.append(
      element("strong", "", "Leider falsch. Richtig wäre:"),
      element("span", "solution", solution),
    );
    if (others.length > 0) {
      feedback.append(element("span", "also", `Auch richtig: ${others.join(" / ")}`));
    }
  }
  feedback.hidden = false;
}

function nextCard() {
  if (session.queue.length === 0) {
    if (session.mode === "mix") {
      showMixDone();
      return;
    }
    // Durchgang zu Ende: neuer Durchgang mit allen noch offenen Karten
    session.queue = startRound(session.cards, session.progress);
    if (session.queue.length === 0) {
      finishRound();
      showDone();
      return;
    }
  }
  showCard();
  input.focus();
}

// ---------- Ende ----------

/** Alle Vokabeln geschafft: Runde zählen und den Fortschritt für die nächste Runde leeren. */
function finishRound() {
  session.rounds = loadRounds(session.list) + 1;
  saveRounds(session.list, session.rounds);
  session.progress = {};
  saveProgress(session.list, session.progress);
}

function showDone() {
  input.blur();
  $("#done-text").textContent =
    `Alle ${session.cards.length} Vokabeln ${MASTERY_TARGET}× richtig. Super!`;
  $("#done-rounds").textContent = roundsText(session.rounds);
  showScreen("done");
}

function showMixDone() {
  input.blur();
  $("#mix-result").textContent = `${session.correct} von ${session.total} richtig`;
  showScreen("mixDone");
}

function backToStart() {
  input.blur();
  session = null;
  renderStart();
  showScreen("start");
}

// ---------- Ereignisse ----------

form.addEventListener("submit", (event) => {
  event.preventDefault(); // sonst würde der Browser die Seite neu laden
  if (session.showingFeedback) nextCard();
  else checkAnswer();
});

// Während die Rückmeldung zu sehen ist, soll man nichts mehr eintippen können.
// Bewusst nicht `disabled`: Das nimmt dem Feld den Fokus und iOS schließt die Tastatur.
// Return (insertLineBreak) muss durch, sonst wird das Formular nicht abgeschickt.
input.addEventListener("beforeinput", (event) => {
  if (session?.showingFeedback && event.inputType !== "insertLineBreak") {
    event.preventDefault();
  }
});

// Antippen des Knopfs soll dem Eingabefeld nicht den Fokus nehmen (Tastatur bleibt offen).
submitButton.addEventListener("mousedown", (event) => event.preventDefault());

$("#back").addEventListener("click", backToStart);
$("#done-back").addEventListener("click", backToStart);
$("#mix-again").addEventListener("click", startMix);
$("#mix-back").addEventListener("click", backToStart);

// ---------- Start ----------

async function init() {
  try {
    const ids = await loadJson("lists/index.json");
    lists = await Promise.all(ids.map((id) => loadJson(`lists/${id}.json`)));
    renderStart();
  } catch (error) {
    console.error(error);
    const message = $("#load-error");
    message.textContent = `Die Vokabellisten konnten nicht geladen werden. (${error.message})`;
    message.hidden = false;
  }
}

init();
