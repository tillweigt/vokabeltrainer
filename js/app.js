// Oberfläche: verbindet die Seite (DOM) mit der Logik aus logic.js.
import {
  MASTERY_TARGET,
  advanceQueue,
  buildCards,
  countByHits,
  countMastered,
  isCorrect,
  recordAnswer,
  startRound,
} from "./logic.js";
import { loadProgress, saveProgress } from "./storage.js";

const $ = (selector) => document.querySelector(selector);

const screens = { start: $("#start"), quiz: $("#quiz"), done: $("#done") };
const form = $("#answer-form");
const input = $("#answer");
const submitButton = $("#submit");
const feedback = $("#feedback");

let lists = []; // alle Vokabellisten aus lists/
let session = null; // die gerade geübte Liste, siehe startList()

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

async function loadJson(path) {
  // no-cache: nach einem Update sofort die neuen Listen holen
  const response = await fetch(path, { cache: "no-cache" });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

// ---------- Startseite ----------

function renderStart() {
  const container = $("#lists");
  container.replaceChildren();
  const subjects = [...new Set(lists.map((list) => list.fach))];
  for (const subject of subjects) {
    container.append(element("h2", "", subject));
    for (const list of lists.filter((l) => l.fach === subject)) {
      const cards = buildCards(list);
      const progress = loadProgress(list);
      const mastered = countMastered(cards, progress);
      const button = element("button", "list-button");
      button.type = "button";
      button.append(
        element("span", "list-title", list.titel),
        element("span", "list-progress", `${mastered} von ${cards.length} geschafft`),
        renderLevels(cards, progress),
      );
      if (mastered === cards.length) button.classList.add("complete");
      button.addEventListener("click", () => startList(list));
      container.append(button);
    }
  }
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

// ---------- Abfrage ----------

function startList(list) {
  const cards = buildCards(list);
  const progress = loadProgress(list);
  session = { list, cards, progress, queue: startRound(cards, progress), showingFeedback: false };
  if (session.queue.length === 0) {
    showDone();
    return;
  }
  showScreen("quiz");
  showCard();
  // Synchron im Tipp-Handler fokussieren, nur dann öffnet iOS die Tastatur.
  input.focus();
}

function showCard() {
  const { card } = session.queue[0];
  session.showingFeedback = false;
  $("#question").textContent = card.frage;
  input.value = "";
  input.className = "";
  feedback.hidden = true;
  submitButton.textContent = "Prüfen";
  updateStatus(card);
}

function updateStatus(card) {
  const mastered = countMastered(session.cards, session.progress);
  $("#mastered-count").textContent = `${mastered} von ${session.cards.length} geschafft`;
  const hits = Math.min(session.progress[card.key] ?? 0, MASTERY_TARGET);
  const dots = $("#dots");
  dots.textContent = dotsFor(hits);
  dots.setAttribute("aria-label", `${hits} von ${MASTERY_TARGET} Mal richtig`);
}

function checkAnswer() {
  if (input.value.trim() === "") return; // leere Eingabe zählt nicht als Fehler
  const entry = session.queue[0];
  const correct = isCorrect(input.value, entry.card.antworten);
  session.progress = recordAnswer(session.progress, entry, correct);
  saveProgress(session.list, session.progress);
  session.queue = advanceQueue(session.queue, correct);
  session.showingFeedback = true;
  showFeedback(entry.card, correct);
  updateStatus(entry.card);
  submitButton.textContent = "Weiter";
}

function showFeedback(card, correct) {
  feedback.replaceChildren();
  feedback.className = correct ? "correct" : "wrong";
  input.classList.add(correct ? "correct" : "wrong");
  if (correct) {
    const justMastered = (session.progress[card.key] ?? 0) >= MASTERY_TARGET;
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
    // Durchgang zu Ende: neuer Durchgang mit allen noch offenen Karten
    session.queue = startRound(session.cards, session.progress);
    if (session.queue.length === 0) {
      showDone();
      return;
    }
  }
  showCard();
  input.focus();
}

function showDone() {
  input.blur();
  $("#done-text").textContent =
    `Alle ${session.cards.length} Vokabeln ${MASTERY_TARGET}× richtig. Super!`;
  showScreen("done");
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
