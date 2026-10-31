const $ = (id) => document.getElementById(id);
const KEY = "lockInState";
const todayKey = () => new Date().toLocaleDateString("en-CA");
let state;
let selectedMinutes = 25;
let toastTimer;

function freshState() {
  return { date: todayKey(), tasks: [], focusMinutes: 0, completedTasks: 0, timerEnd: null, timerDuration: 1500, selectedMinutes: 25, theme: "default", customAccent: "#c5f36a" };
}
async function loadState() {
  const data = await chrome.storage.local.get(KEY);
  state = data[KEY] || freshState();
  if (state.date !== todayKey()) state = { ...freshState() };
  selectedMinutes = Number.isInteger(Number(state.selectedMinutes)) && Number(state.selectedMinutes) >= 1 && Number(state.selectedMinutes) <= 720 ? Number(state.selectedMinutes) : 25;
  if (!state.timerEnd && !Number.isFinite(state.timerDuration)) state.timerDuration = selectedMinutes * 60;
  await saveState();
}
function saveState() { return chrome.storage.local.set({ [KEY]: state }); }
function applyTheme() {
  const allowed = ["default", "yourname", "demonslayer", "naruto", "aot", "onepiece", "custom"];
  const theme = allowed.includes(state.theme) ? state.theme : "default";
  document.body.dataset.theme = theme;
  $("themeSelect").value = theme;
  const scene = $("animeScene");
  if (scene) {
    const sceneThemes = {
      yourname: { image: "art/yourname-duo.webp", eyebrow: "YOUR NAME · TWILIGHT", title: "Find each other. Find your focus.", caption: "Two paths. One beautiful sky.", alt: "Two anime characters together beneath a twilight sky" },
      demonslayer: { image: "art/demonslayer-scene.webp", eyebrow: "DEMON SLAYER · HINOKAMI", title: "Breathe. Then strike.", caption: "Stay sharp. Finish what you start.", alt: "Demon Slayer-inspired swordsman in a fiery scene" },
      naruto: { image: "art/naruto.webp", eyebrow: "NARUTO · WILL OF FIRE", title: "Believe in your work.", caption: "Train hard. Keep moving forward.", alt: "Ninja anime character at sunset" },
      aot: { image: "art/aot.webp", eyebrow: "ATTACK ON TITAN · BEYOND THE WALLS", title: "Keep moving forward.", caption: "Courage is built one step at a time.", alt: "Anime soldier facing a dramatic city skyline" },
      onepiece: { image: "art/onepiece.webp", eyebrow: "ONE PIECE · SET SAIL", title: "Chase the next horizon.", caption: "Big dreams. Steady progress.", alt: "Anime pirate looking toward the sea" }
    };
    const config = sceneThemes[theme];
    scene.hidden = !config;
    if (config) {
      $("sceneCharacter").src = config.image;
      $("sceneCharacter").alt = config.alt;
      $("sceneEyebrow").textContent = config.eyebrow;
      $("sceneTitle").textContent = config.title;
      $("sceneCaption").textContent = config.caption;
      scene.dataset.scene = theme;
    }
  }
  $("customColorWrap").hidden = theme !== "custom";
  const accent = /^#[0-9a-f]{6}$/i.test(state.customAccent || "") ? state.customAccent : "#c5f36a";
  $("customAccent").value = accent;
  if (theme === "custom") {
    document.documentElement.style.setProperty("--accent", accent);
    document.documentElement.style.setProperty("--accent-dark", accent + "33");
    const hex = accent.slice(1);
    const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    document.documentElement.style.setProperty("--accent-rgb", `${r},${g},${b}`);
  } else {
    document.documentElement.style.removeProperty("--accent");
    document.documentElement.style.removeProperty("--accent-dark");
    document.documentElement.style.removeProperty("--accent-rgb");
  }
}
function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 1800);
}
function remainingSeconds() {
  return state.timerEnd ? Math.max(0, Math.ceil((state.timerEnd - Date.now()) / 1000)) : Math.max(0, Number(state.timerDuration) || selectedMinutes * 60);
}
function renderTasks() {
  const list = $("taskList"); list.replaceChildren();
  if (!state.tasks.length) {
    const empty = document.createElement("div"); empty.className = "empty";
    empty.textContent = "Nothing in the queue. Add one task to get moving."; list.append(empty);
  }
  for (const task of state.tasks) {
    const row = document.createElement("div"); row.className = "task" + (task.done ? " done" : "");
    const check = document.createElement("input"); check.type = "checkbox"; check.checked = task.done; check.setAttribute("aria-label", "Complete " + task.text);
    check.addEventListener("change", () => toggleTask(task.id));
    const label = document.createElement("span"); label.className = "task-label"; label.textContent = task.text;
    const badge = document.createElement("span"); badge.className = "task-badge"; badge.textContent = task.done ? "DONE" : "TODO";
    const del = document.createElement("button"); del.className = "delete"; del.type = "button"; del.textContent = "×"; del.setAttribute("aria-label", "Delete " + task.text);
    del.addEventListener("click", async () => { state.tasks = state.tasks.filter(t => t.id !== task.id); await saveState(); render(); toast("Task removed"); });
    row.append(check, label, badge, del); list.append(row);
  }
  const done = state.tasks.filter(t => t.done).length;
  $("taskCount").textContent = `${done} / ${state.tasks.length} COMPLETE`;
  $("remainingText").textContent = state.tasks.length ? `${state.tasks.length - done} task${state.tasks.length - done === 1 ? "" : "s"} remaining` : "No tasks queued";
  $("completedNum").textContent = state.completedTasks || done;
}
function renderTimer() {
  const secs = remainingSeconds();
  $("timer").textContent = `${String(Math.floor(secs / 60)).padStart(2,"0")}:${String(secs % 60).padStart(2,"0")}`;
  $("startTimer").innerHTML = state.timerEnd ? 'Pause focus <span>Ⅱ</span>' : 'Start focus <span>↗</span>';
  $("timerStatus").textContent = state.timerEnd ? "SESSION IN PROGRESS" : (secs < selectedMinutes * 60 ? "SESSION PAUSED" : "READY WHEN YOU ARE");
  const total = Math.max(1, state.timerEnd ? Number(state.timerDuration) || selectedMinutes * 60 : selectedMinutes * 60);
  $("timerProgress").style.width = `${Math.min(100, Math.max(0, (1 - secs / total) * 100))}%`;
  document.querySelectorAll("[data-min]").forEach(b => b.classList.toggle("active", Number(b.dataset.min) === selectedMinutes));
  document.title = `${state.timerEnd ? $("timer").textContent + " · " : ""}LOCK IN`;
}
function render() { applyTheme(); renderTasks(); renderTimer(); $("focusNum").innerHTML = `${state.focusMinutes || 0}<span class="unit">m</span>`; }
async function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id); if (!task) return;
  task.done = !task.done;
  if (task.done) { state.completedTasks = (state.completedTasks || 0) + 1; toast("Task complete. Keep the momentum."); }
  else { state.completedTasks = Math.max(0, (state.completedTasks || 0) - 1); }
  await saveState(); render();
}
async function finishFocusSession() {
  if (!state.timerEnd) return;
  state.timerEnd = null;
  state.focusMinutes = (state.focusMinutes || 0) + (Number(state.selectedMinutes) || selectedMinutes);
  state.timerDuration = (Number(state.selectedMinutes) || selectedMinutes) * 60;
  await chrome.alarms.clear("lockInFocusEnd");
  await saveState(); render(); toast("Session complete. Take a short break.");
}
$("taskForm").addEventListener("submit", async e => {
  e.preventDefault(); const text = $("taskInput").value.trim(); if (!text) return;
  state.tasks.push({ id: crypto.randomUUID(), text, done: false }); $("taskInput").value = "";
  await saveState(); render(); toast("Added to your queue"); $("taskInput").focus();
});
$("clearDone").addEventListener("click", async () => {
  const before = state.tasks.length; state.tasks = state.tasks.filter(t => !t.done);
  if (before === state.tasks.length) return toast("No completed tasks to clear");
  await saveState(); render(); toast("Completed tasks cleared");
});
$("startTimer").addEventListener("click", async () => {
  if (state.timerEnd) {
    state.timerDuration = remainingSeconds(); state.timerEnd = null; await chrome.alarms.clear("lockInFocusEnd");
    await saveState(); render(); toast("Focus paused");
  } else {
    state.timerEnd = Date.now() + (state.timerDuration || selectedMinutes * 60) * 1000;
    await chrome.alarms.create("lockInFocusEnd", { when: state.timerEnd });
    await saveState(); render(); toast("Focus session started");
  }
});
$("resetTimer").addEventListener("click", async () => {
  await chrome.alarms.clear("lockInFocusEnd"); state.timerEnd = null; state.timerDuration = selectedMinutes * 60;
  await saveState(); render(); toast("Timer reset");
});
async function chooseDuration(minutes) {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 720) return toast("Choose between 1 minute and 12 hours");
  if (state.timerEnd) { state.timerEnd = null; await chrome.alarms.clear("lockInFocusEnd"); }
  selectedMinutes = minutes;
  state.selectedMinutes = minutes;
  state.timerDuration = minutes * 60;
  await saveState(); render();
  const label = minutes >= 60 ? `${Math.floor(minutes / 60)}h${minutes % 60 ? " " + (minutes % 60) + "m" : ""}` : `${minutes} min` ;
  toast(`Focus set to ${label}`);
}
document.querySelectorAll("[data-min]").forEach(button => button.addEventListener("click", () => chooseDuration(Number(button.dataset.min))));
$("customTimeForm").addEventListener("submit", async e => {
  e.preventDefault();
  const hours = Number($("customHours").value);
  const minutes = Number($("customMinutes").value);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 12 || minutes < 0 || minutes > 59) return toast("Enter valid hours and minutes");
  const total = hours * 60 + minutes;
  if (total < 1 || total > 720) return toast("Choose between 1 minute and 12 hours");
  await chooseDuration(total);
});
$("themeSelect").addEventListener("change", async () => {
  state.theme = $("themeSelect").value;
  await saveState(); applyTheme();
  const labels = { default: "Default theme applied", yourname: "Your Name mode on ✨", demonslayer: "Demon Slayer mode on ⚔️", naruto: "Believe it. Naruto mode on 🍥", aot: "Attack on Titan mode on ⚔️", onepiece: "One Piece mode on ☠️", custom: "Pick your accent color" };
  toast(labels[state.theme] || "Theme updated");
});
$("customAccent").addEventListener("input", async () => {
  state.customAccent = $("customAccent").value;
  state.theme = "custom";
  await saveState(); applyTheme();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[KEY] && changes[KEY].newValue) { state = changes[KEY].newValue; selectedMinutes = Number(state.selectedMinutes) || 25; render(); }
});
chrome.runtime.onMessage.addListener(message => {
  if (message.type === "LOCK_IN_FOCUS_COMPLETE") loadState().then(() => { render(); toast("Session complete. Take a short break."); });
});
(async function init() {
  await loadState(); render();
  if (state.timerEnd) await chrome.alarms.create("lockInFocusEnd", { when: Math.max(Date.now() + 1000, state.timerEnd) });
  setInterval(() => { if (state.timerEnd) renderTimer(); }, 500);
})();
