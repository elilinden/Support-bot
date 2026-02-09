// service_worker.js
// - Receives CHAT_EVENT from content_script.js
// - Calls your local server (AI) to get DRAFT / NEEDS_USER / WAITING
// - Stores result so popup can show it
// - If Autopilot is ON: sends INSERT_AND_SEND to the tab

const SERVER = "http://localhost:8787";

// State maps to track last analysis time and content hash per tab
const lastAnalyze = new Map();      // tabId -> timestamp
const lastHash = new Map();         // tabId -> string hash of transcript
const draftCache = new Map();       // hash -> {draft, timestamp}

// Robust hashing using Native Web Crypto API
async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function callServerWithRetry(msg, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      // Create a timeout signal (5 seconds max for server response)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const resp = await fetch(`${SERVER}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!resp.ok) throw new Error(`Server status ${resp.status}`);
      
      const data = await resp.json();
      return data;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Backoff
    }
  }
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || msg.type !== "CHAT_EVENT") return;

  (async () => {
    const tabId = sender?.tab?.id;
    if (!tabId) return;

    const now = Date.now();
    
    // --- 1. Throttle: Only analyze every 3 seconds per tab ---
    // This prevents the bot from panicking if multiple DOM changes happen quickly
    if (now - (lastAnalyze.get(tabId) || 0) < 3000) return;
    lastAnalyze.set(tabId, now);

    // --- 2. Hash check: If transcript hasn't changed, ignore ---
    const currentHash = await sha256(msg.transcript || "");
    if (lastHash.get(tabId) === currentHash) return;
    lastHash.set(tabId, currentHash);

    // Check cache
    const cached = draftCache.get(currentHash);
    if (cached && (now - cached.timestamp < 60000)) { // 1min cache
      await chrome.storage.local.set({
        lastResult: {
          action: "DRAFT",
          draft: cached.draft,
          meta: { capturedAt: new Date().toISOString() }
        }
      });
      await chrome.action.setBadgeText({ text: "" });
      return;
    }

    // --- 3. Get User Settings ---
    const { autopilotEnabled, userContext } = await chrome.storage.local.get([
      "autopilotEnabled",
      "userContext"
    ]);

    // --- 4. Call API ---
    try {
      const data = await callServerWithRetry({ ...msg, userContext: userContext || "" });

      // --- 5. Handle Server Actions ---

      // CASE A: LOOP PREVENTION (Waiting)
      if (data.action === "WAITING") {
        await chrome.action.setBadgeText({ text: "..." });
        await chrome.action.setBadgeBackgroundColor({ color: "#9E9E9E" }); // Grey
        await chrome.storage.local.set({ lastResult: data });
        return; 
      }
      
      // CASE B: SENSITIVE INFO (Needs User)
      if (data.action === "NEEDS_USER") {
        await chrome.action.setBadgeText({ text: "!" });
        await chrome.action.setBadgeBackgroundColor({ color: "#ff9800" }); // Orange
        await chrome.storage.local.set({ lastResult: data });
        return;
      }

      // CASE C: SUCCESS (Draft)
      await chrome.storage.local.set({
        lastResult: { ...data, meta: { capturedAt: new Date().toISOString() } }
      });
      await chrome.action.setBadgeText({ text: "" });

      // Cache the draft
      if (data.action === "DRAFT" && data.draft) {
        draftCache.set(currentHash, { draft: data.draft, timestamp: now });
      }

      // Autopilot Logic (Only if enabled)
      if (autopilotEnabled && data.action === "DRAFT" && data.draft) {
        try {
          chrome.tabs.sendMessage(tabId, {
            type: "INSERT_AND_SEND",
            text: data.draft
          });
        } catch (insertErr) {
          console.warn("⚠️ Autopilot: Could not send draft to content script.", insertErr);
        }
      }

    } catch (e) {
      // --- FIX: Smart Error Handling (From Option 1) ---
      const isNetworkError = e.name === "AbortError" || e instanceof TypeError;
      
      if (isNetworkError) {
         console.warn("⚠️ Support Bot Server is offline. Check 'npm run dev'.");
         await chrome.action.setBadgeText({ text: "OFF" });
         await chrome.action.setBadgeBackgroundColor({ color: "#999" }); 
      } else {
         console.error("Support Bot Error:", e);
         await chrome.action.setBadgeText({ text: "ERR" });
         await chrome.action.setBadgeBackgroundColor({ color: "#F44336" }); 
      }

      // Save error to storage
      await chrome.storage.local.set({
        lastResult: { action: "ERROR", error: String(e.message || e) }
      });
    }
  })();
});