# Epoch Converter — Chrome Extension - Made with Claude

A lightweight Chrome extension to convert between Unix epoch timestamps, IST, and UTC — directly in your browser.

---

## Features

### Popup converter
- **IST → Epoch** — enter a date and time in Indian Standard Time, get epoch in seconds and milliseconds
- **GMT/UTC → Epoch** — same for UTC input
- **Epoch → Date** — paste any epoch (seconds or milliseconds, auto-detected) and get IST + UTC back
- One-click copy for all output values
- "Use current time" button to pre-fill the fields

### Page selection converter (toggle-able)
Enable the **Selection converter** toggle in the popup, then select any time/date text on a webpage to instantly see:
- IST and UTC equivalents
- Relative time (e.g. *3 days 2 hr ago*, *In 5 minutes*)
- Epoch in seconds

Supported selection formats:

| Format | Example |
|--------|---------|
| Epoch number (10 or 13 digits) | `1712345678` / `1712345678000` |
| ISO datetime with timezone | `2026-04-07 09:08:31 UTC` |
| Natural date + time (UTC) | `09:09:01 UTC` + `Tuesday, 7 April 2026` |
| Natural date + time (IST) | `2:38 pm` + `Tuesday, 7 April 2026` + `Indian Standard Time (IST)` |
| Sentence form | `UTC current time is 09:08:31` + `UTC current date is 7th April 2026` |

Click anywhere on the page to dismiss the tooltip.

---

## Installation

This extension is not yet on the Chrome Web Store. Load it manually:

1. Clone or download this repository
   ```bash
   git clone https://github.com/<your-username>/epoch-converter.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right)
4. Click **Load unpacked** and select the `epoch-converter` folder
5. The extension icon appears in your toolbar

---

## Usage

### Popup
Click the extension icon in the toolbar.

- Pick the **IST** or **GMT / UTC** tab, enter a date and time, click **Convert to Epoch**
- Pick the **Epoch → Date** tab, paste an epoch value, click **Convert to Date**

### Selection converter
1. Click the extension icon → turn on the **Selection converter** toggle
2. On any webpage, highlight a timestamp or datetime text
3. A tooltip appears with IST, UTC, relative time, and copy buttons

---

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension manifest (MV3) |
| `popup.html` | Popup UI markup |
| `popup.js` | Popup logic and event listeners |
| `content.js` | Page selection detection and tooltip |

---

## Publishing to Chrome Web Store

1. Zip the folder: `zip -r epoch-converter.zip epoch-converter/`
2. Go to the [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole)
3. Pay the one-time $5 developer fee (if not already done)
4. Click **New Item**, upload the zip, fill in details, and publish

---

## License

MIT
