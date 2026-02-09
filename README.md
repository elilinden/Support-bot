# Support Bot Copilot 🤖

A browser extension + local AI server that helps draft replies in live chat widgets (Intercom, Zendesk, etc.).

## Features
- **Smart Drafting:** Reads chat context and suggests replies using Google Gemini.
- **Privacy First:** Masks passwords/OTPs locally; sensitive info never leaves the browser.
- **Loop Protection:** Detects if it's "my turn" or "their turn" to prevent spamming.
- **Autopilot:** Can auto-insert and auto-send replies (optional).

## Setup

### 1. Server
1. Navigate to `/server`.
2. Run `npm install`.
3. Create `.env` with your `GEMINI_API_KEY`.
4. Start: `npm run dev`.

### 2. Extension
1. Open Chrome -> `chrome://extensions`.
2. Enable "Developer Mode" (top right).
3. Click "Load Unpacked" and select the `/extension` folder.

## Usage
1. Open a chat window (e.g., Intercom).
2. Open the Extension Popup.
3. Add context (e.g., "My order # is 12345").
4. Click **Refresh** to see a draft, or toggle **Autopilot** to let it drive.