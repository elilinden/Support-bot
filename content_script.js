// content_script.js
// 1. Capture Mode (Fixes Intercom blindness)
// 2. Text Insertion (Restores "Insert Draft" capability)
// 3. Visual Feedback (Restores the "Drafting..." ghost text)

const DEBOUNCE_MS = 1000;

// --- Helper: Debounce ---
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// --- Helper: Detect Provider ---
function detectProvider() {
  const url = window.location.href;
  if (url.includes("zendesk") || document.querySelector('[data-test-id="chat-widget"]')) return "zendesk";
  if (url.includes("intercom") || document.querySelector(".intercom-conversation")) return "intercom";
  return "generic";
}

// --- Helper: Ghost Text (Visual Feedback) ---
function showGhostText(text) {
  const existing = document.getElementById("bot-ghost");
  if (existing) existing.remove();
  if (!text) return;

  const active = document.activeElement;
  const rect = active ? active.getBoundingClientRect() : { left: 100, top: 100 };

  const div = document.createElement("div");
  div.id = "bot-ghost";
  div.innerText = "🤖 " + text;
  Object.assign(div.style, {
    position: 'fixed', left: rect.left + 'px', top: (rect.top - 35) + 'px',
    background: '#333', color: '#fff', padding: '6px 10px',
    borderRadius: '6px', fontSize: '12px', zIndex: '9999999', pointerEvents: 'none',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
  });
  document.body.appendChild(div);
  setTimeout(() => { if(div) div.remove(); }, 3500);
}

// --- Helper: Get Transcript ---
function captureTranscript() {
  const intercomBody = document.querySelector(".intercom-conversation-body");
  if (intercomBody) return intercomBody.innerText; // Intercom
  const zendeskLog = document.querySelector('[data-test-id="chat-log"]');
  if (zendeskLog) return zendeskLog.innerText; // Zendesk
  return document.body.innerText.slice(-3000); // Fallback
}

// --- Main Logic: Handle Input (THE FIX) ---
const handleInput = debounce((e) => {
  const target = e.target;
  if (!target.matches("input, textarea") && !target.isContentEditable) return;

  const transcript = captureTranscript();
  if (!transcript) return;

  try {
    chrome.runtime.sendMessage({
      type: "CHAT_EVENT",
      transcript: transcript,
      provider: detectProvider(),
      pageUrl: window.location.href
    }, () => chrome.runtime.lastError);
  } catch (err) { }
}, DEBOUNCE_MS);

// --- Logic: Insert Text ---
function setText(text) {
  const el = document.activeElement;
  if (!el) return;
  el.focus();
  const success = document.execCommand("insertText", false, text);
  if (!success) {
    el.value = text;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

function trySend() {
  const el = document.activeElement;
  if (!el) return;
  // Try Enter key
  el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true }));
  el.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", keyCode: 13, bubbles: true }));
  // Try Send Button
  const container = el.closest('form') || el.parentElement;
  if (container) {
    const btn = container.querySelector('button[type="submit"], button[aria-label*="Send"]');
    if (btn) btn.click();
  }
}

// --- Listeners ---
document.addEventListener("input", handleInput, { capture: true }); // <--- CRITICAL FIX
document.addEventListener("focus", handleInput, { capture: true });

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "INSERT_TEXT" || msg.type === "INSERT_AND_SEND") {
    showGhostText("Drafting...");
    setTimeout(() => {
      setText(msg.text);
      if (msg.type === "INSERT_AND_SEND") setTimeout(() => trySend(), 300);
    }, 500);
  }
});

console.log("Support Bot: Full Hybrid Script Loaded 🚀");