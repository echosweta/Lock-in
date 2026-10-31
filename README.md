# LOCK IN — Focus Companion

A minimal Chrome side-panel extension for focus sessions and task tracking.

## Install locally
1. Unzip `lock-in-chrome-extension.zip`.
2. Open `chrome://extensions` in Chrome.
3. Turn on Developer mode.
4. Click **Load unpacked** and select the `lock-in` folder (the folder containing `manifest.json`).
5. Click the extension's toolbar icon to open the LOCK IN side panel.

Requires Chrome 114 or newer for the Side Panel API. Tasks and focus statistics are stored locally with `chrome.storage.local`. The timer uses an absolute end timestamp and a Chrome alarm, so it continues when the side panel is closed or you switch tabs.
