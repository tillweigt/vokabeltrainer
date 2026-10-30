// Oberfläche: verbindet die Seite (DOM) mit der Logik aus logic.js.
import {
  MASTERY_TARGET,
  PORTION_SIZE,
  addStars,
  appendHistory,
  balance,
  buildCards,
  cardRef,
  countByHits,
  countMastered,
  drawPortion,
  formatShortDate,
  isCorrect,
  lastRedemptions,
  localIsoDate,
  parseRedemption,
  recordAnswer,
  redeem,
  restoreQueue,
  roundBonus,
  speechText,
  starsFor,
  startRound,
  weight,
} from "./logic.js";
import {
  clearPortion,
  loadHistory,
  loadPortion,
  loadProgress,
  loadRounds,
  loadStars,
  saveHistory,
  savePortion,
  saveProgress,
  saveRounds,
  saveStars,
} from "./storage.js";

const MIX_SUBJECT = "Englisch"; // die Super-Liste mischt alle Listen dieses Fachs
const SPEECH_LANG = "en-GB"; // britisches Englisch, passend zum Schulbuch

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
const redeemInput = $("#redeem-amount");

let lists = []; // alle Vokabellisten aus lists/

// Die laufende Abfrage. Zwei Arten:
// - mode "list": eine einzelne Liste, siehe startList()
// - mode "mix":  eine Portion der Super-Liste, siehe startMix()
let session = null;

let pendingRedemption = null; // Anzahl Sterne, die auf „Ja“ zum Einlösen wartet

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

function mixCards() {
  return mixLists().flatMap(buildCards);
}

/** Jede Antwort landet im Verlauf der Vokabel, egal ob aus Liste oder Super-Liste. */
function rememberAnswer(card, correct) {
  saveHistory(card.listId, appendHistory(loadHistory(card.listId), card.key, correct));
}

/** Sterne, die die nächste richtige Antwort auf diese Karte bringt */
function starsForCard(card) {
  return starsFor(loadHistory(card.listId)[card.key]);
}

function earnStars(stars) {
  if (stars > 0) saveStars(addStars(loadStars(), stars));
}

/** Liest einen englischen Text mit der eingebauten Sprachausgabe des Geräts vor. */
function speak(text) {
  speechSynthesis.cancel(); // eine noch laufende Ausgabe abbrechen, damit sich nichts stapelt
  const utterance = new SpeechSynthesisUtterance(speechText(text));
  utterance.lang = SPEECH_LANG;
  speechSynthesis.speak(utterance);
}

/** Knopf „🔊 Anhören“, oder null, wenn das Gerät keine Sprachausgabe hat */
function speakButton(text) {
  if (!("speechSynthesis" in window)) return null;
  const button = element("button", "speak-button", "🔊 Anhören");
  button.type = "button";
  button.setAttribute("aria-label", "Aussprache anhören");
  // Antippen soll dem Eingabefeld nicht den Fokus nehmen (Tastatur bleibt offen).
  button.addEventListener("mousedown", (event) => event.preventDefault());
  button.addEventListener("click", () => speak(text));
  return button;
}

/** Gespeicherte, angefangene Portion der Super-Liste, oder null */
function savedPortion() {
  const saved = loadPortion();
  const valid =
    saved &&
    Array.isArray(saved.refs) &&
    [saved.answered, saved.correct, saved.stars].every(Number.isInteger);
  if (!valid) return null;
  const queue = restoreQueue(saved.refs, mixCards());
  return queue.length > 0 ? { ...saved, queue } : null;
}

// ---------- Startseite ----------

function renderStart() {
  renderStars();
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

/** Kontostand, Einlöse-Feld (zurückgesetzt) und die letzten 3 Einlösungen */
function renderStars() {
  const ledger = loadStars();
  $("#stars-balance").textContent = `⭐ ${plural(balance(ledger), "Stern", "Sterne")}`;
  pendingRedemption = null;
  $("#redeem-confirm").hidden = true;
  $("#redeem-error").hidden = true;
  const items = lastRedemptions(ledger).map((r) =>
    element("li", "", `${r.amount} ⭐ eingelöst am ${formatShortDate(r.date)}`),
  );
  $("#redemptions").replaceChildren(...items);
}

function renderMixButton() {
  const sources = mixLists();
  const count = sources.reduce((sum, list) => sum + list.items.length, 0);
  const saved = savedPortion();
  const subtitle = saved
    ? `weiter bei Karte ${saved.answered + 1} von ${saved.answered + saved.queue.length}`
    : `${plural(count, "Vokabel", "Vokabeln")} aus ${plural(sources.length, "Liste", "Listen")}` +
      ` · immer ${PORTION_SIZE} Karten`;
  const button = element("button", "list-button mix-button");
  button.type = "button";
  button.append(
    element("span", "list-title", `🔀 Alle ${MIX_SUBJECT}-Vokabeln`),
    element("span", "list-progress", subtitle),
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

/** Setzt eine angefangene Portion fort oder zieht eine neue. */
function startMix() {
  const saved = savedPortion();
  if (saved) {
    const { queue, answered, correct, stars } = saved;
    session = { mode: "mix", queue, answered, correct, stars, total: answered + queue.length };
  } else {
    const histories = Object.fromEntries(
      mixLists().map((list) => [list.id, loadHistory(list.id)]),
    );
    const portion = drawPortion(mixCards(), (card) => weight(histories[card.listId][card.key]));
    if (portion.length === 0) return;
    session = { mode: "mix", queue: portion, answered: 0, correct: 0, stars: 0, total: portion.length };
    saveMixPortion();
  }
  beginQuiz();
}

function startNewMix() {
  clearPortion();
  startMix();
}

/** Speichert, was von der Portion noch übrig ist (damit es nach einer Pause weitergeht). */
function saveMixPortion() {
  if (session.queue.length === 0) {
    clearPortion();
    return;
  }
  const { answered, correct, stars } = session;
  savePortion({ refs: session.queue.map(cardRef), answered, correct, stars });
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
  session.cardStars = starsForCard(card);
  $("#question").textContent = card.frage;
  $("#card-stars").textContent = `⭐ ${session.cardStars}`;
  input.value = "";
  input.className = "";
  feedback.hidden = true;
  submitButton.textContent = "Prüfen";
  updateStatus(card);
}

function updateStatus(card) {
  $("#quiz-balance").textContent = `⭐ ${balance(loadStars())}`;
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
  const earned = correct ? session.cardStars : 0;
  earnStars(earned);
  rememberAnswer(card, correct);
  session.queue = session.queue.slice(1); // jede Karte nur einmal pro Durchgang
  if (session.mode === "list") {
    clearPortion(); // in einer normalen Liste geantwortet: angefangene Portion verwerfen
    session.progress = recordAnswer(session.progress, card, correct);
    saveProgress(session.list, session.progress);
  } else {
    session.answered += 1;
    if (correct) session.correct += 1;
    session.stars += earned;
    saveMixPortion();
  }
  session.showingFeedback = true;
  showFeedback(card, correct, earned);
  updateStatus(card);
  submitButton.textContent = "Weiter";
}

function showFeedback(card, correct, earned) {
  feedback.replaceChildren();
  feedback.className = correct ? "correct" : "wrong";
  input.classList.add(correct ? "correct" : "wrong");
  if (correct) {
    feedback.append(element("strong", "", `Richtig! +${earned} ⭐`));
    const justMastered =
      session.mode === "list" && (session.progress[card.key] ?? 0) >= MASTERY_TARGET;
    if (justMastered) {
      feedback.append(element("span", "also", "Diese Vokabel hast du geschafft! 🎉"));
    }
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
  // Vorgelesen wird immer die eigentliche Lösung der Karte, auch wenn eine Alternative getippt wurde.
  const button = speakButton(card.antworten[0]);
  if (button) feedback.append(button);
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

/** Alle Vokabeln geschafft: Runde zählen, 🏆-Bonus gutschreiben, Fortschritt leeren. */
function finishRound() {
  session.rounds = loadRounds(session.list) + 1;
  saveRounds(session.list, session.rounds);
  session.bonus = roundBonus(session.cards.length);
  earnStars(session.bonus);
  session.progress = {};
  saveProgress(session.list, session.progress);
}

function showDone() {
  input.blur();
  $("#done-text").textContent =
    `Alle ${session.cards.length} Vokabeln ${MASTERY_TARGET}× richtig. Super!`;
  $("#done-rounds").textContent = roundsText(session.rounds);
  $("#done-bonus").textContent = `+${session.bonus} ⭐ Bonus`;
  showScreen("done");
}

function showMixDone() {
  input.blur();
  $("#mix-result").textContent = `${session.correct} von ${session.total} richtig`;
  $("#mix-stars").textContent = `+${session.stars} ⭐`;
  showScreen("mixDone");
}

function backToStart() {
  input.blur();
  session = null;
  renderStart();
  showScreen("start");
}

// ---------- Ereignisse: Abfrage ----------

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
$("#mix-again").addEventListener("click", startNewMix);
$("#mix-back").addEventListener("click", backToStart);

// ---------- Ereignisse: Sterne einlösen ----------

$("#redeem-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const result = parseRedemption(redeemInput.value, balance(loadStars()));
  const error = $("#redeem-error");
  if (result.error) {
    error.textContent = result.error;
    error.hidden = false;
    return;
  }
  error.hidden = true;
  pendingRedemption = result.amount;
  $("#redeem-question").textContent = `${result.amount} ⭐ wirklich einlösen?`;
  $("#redeem-confirm").hidden = false;
  redeemInput.blur(); // Tastatur schließen, damit die Rückfrage zu sehen ist
});

$("#redeem-yes").addEventListener("click", () => {
  saveStars(redeem(loadStars(), pendingRedemption, localIsoDate(new Date())));
  redeemInput.value = "";
  renderStars();
});

$("#redeem-no").addEventListener("click", renderStars);

// ---------- Start ----------

async function init() {
  renderStars(); // der Kontostand ist auch zu sehen, wenn die Listen nicht laden
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
