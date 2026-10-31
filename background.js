const KEY = "lockInState";

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
chrome.runtime.onStartup.addListener(async () => {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name !== "lockInFocusEnd") return;
  const data = await chrome.storage.local.get(KEY);
  const state = data[KEY];
  if (!state || !state.timerEnd) return;
  if (state.timerEnd > Date.now()) {
    await chrome.alarms.create("lockInFocusEnd", { when: state.timerEnd });
    return;
  }
  state.focusMinutes = (state.focusMinutes || 0) + (Number(state.selectedMinutes) || 25);
  state.timerEnd = null;
  state.timerDuration = (Number(state.selectedMinutes) || 25) * 60;
  await chrome.storage.local.set({ [KEY]: state });
  try {
    await chrome.notifications.create("lock-in-focus-complete-" + Date.now(), {
      type: "basic", iconUrl: "icons/icon128.png", title: "LOCK IN — session complete",
      message: "You put in the work. Take a short break.", priority: 1
    });
  } catch (_) {}
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id == null) continue;
    try { await chrome.tabs.sendMessage(tab.id, { type: "LOCK_IN_FOCUS_COMPLETE" }); } catch (_) {}
  }
});
