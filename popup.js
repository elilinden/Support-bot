// popup.js — full drop-in
// - Saves setup text
// - Toggles Autopilot flag
// - Shows lastResult (pretty JSON) or draft editor
// - Inserts the latest draft into the *real* chat input by injecting into ALL FRAMES (fixes iframe issues)

function $(id) {
  return document.getElementById(id);
}

/**
 * Check if text contains sensitive information.
 * @param {string} text - Text to check.
 * @returns {boolean} True if sensitive.
 */
function looksSensitive(text) {
  const patterns = [
    /otp|one[- ]time|verification code|2fa/i,
    /password|passcode|pin\b/i,
    /\bssn\b|social security/i,
    /last\s*4|last four/i,
    /cvv|cvc|security code/i,
    /routing number|bank account/i
  ];
  return patterns.some((re) => re.test(text));
}

const elAutopilot = $("autopilot");
const elAutopilotStatus = $("autopilotStatus");

const elContext = $("context");
const elSaveContext = $("saveContext");

const elStatusMessage = $("statusMessage");
const elDraftEditor = $("draftEditor");

const elRefresh = $("refresh");
const elClear = $("clear");
const elInsert = $("insert");

// Questionnaire elements
const elOpenQuestionnaire = $("openQuestionnaire");
const elQuestionnaireContainer = $("questionnaireContainer");
const elIssueType = $("issueType");
const elOrderNumber = $("orderNumber");
const elProductDetails = $("productDetails");
const elAdditionalInfo = $("additionalInfo");
const elCustomKnowledge = $("customKnowledge");
const elGenerateFollowUps = $("generateFollowUps");
const elSkipToCustom = $("skipToCustom");
const elFollowUpSection = $("followUpSection");
const elFollowUpQuestionsContainer = $("followUpQuestionsContainer");
const elFinalQuestionContainer = $("finalQuestionContainer");
const elBackupPlan = $("backupPlan");
const elSubmitFollowUps = $("submitFollowUps");
const elEditQuestionnaire = $("editQuestionnaire");
const elInitialQuestionnaireBtns = $("initialQuestionnaireBtns");
const elSubmitQuestionnaire = $("submitQuestionnaire");
const elSkipQuestionnaire = $("skipQuestionnaire");

function setPill(enabled) {
  if (!elAutopilotStatus) return;
  elAutopilotStatus.textContent = enabled ? "ON" : "OFF";
  // The CSS class handles the color change if you used the CSS I provided earlier,
  // otherwise, we can force style it here:
  elAutopilotStatus.style.background = enabled ? "rgba(110, 231, 183, 0.22)" : "rgba(255, 255, 255, 0.06)";
  elAutopilotStatus.style.color = enabled ? "#6ee7b7" : "rgba(255, 255, 255, 0.68)";
  elAutopilotStatus.style.borderColor = enabled ? "rgba(110, 231, 183, 0.45)" : "rgba(255, 255, 255, 0.12)";
}

function showStatus(text, isError = false) {
  if (!elStatusMessage) return;
  elStatusMessage.style.display = "block";
  elDraftEditor.style.display = "none";
  elStatusMessage.textContent = text || "No events yet.";
  elStatusMessage.style.borderColor = isError ? "rgba(251, 113, 133, 0.40)" : "rgba(255, 255, 255, 0.14)";
  elStatusMessage.style.color = isError ? "#fb7185" : "rgba(255, 255, 255, 0.92)";
}

function showDraft(draft) {
  elStatusMessage.style.display = "none";
  elDraftEditor.style.display = "block";
  elDraftEditor.value = draft || "";
}

function pretty(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id || null;
}

/**
 * Inject into ALL FRAMES and insert into the first visible editable input
 * (fixes: chat widgets inside iframes + wrong frame like RetailMeNot)
 */
async function insertIntoActiveTabAllFrames(text) {
  const tabId = await getActiveTabId();
  if (!tabId) return { ok: false, reason: "NO_ACTIVE_TAB" };

  function injectInsertText(t) {
    function isEditable(el) {
      if (!el) return false;
      const tag = (el.tagName || "").toLowerCase();
      return (
        tag === "textarea" ||
        (tag === "input" && (el.type === "text" || el.type === "search")) ||
        el.isContentEditable
      );
    }

    function isVisible(el) {
      if (!el || !el.getBoundingClientRect) return false;
      const r = el.getBoundingClientRect();
      return r.width > 5 && r.height > 5;
    }

    function findBestInput() {
      const active = document.activeElement;
      if (isEditable(active) && isVisible(active)) return active;

      const candidates = Array.from(
        document.querySelectorAll(
          'textarea, input[type="text"], input[type="search"], [contenteditable="true"]'
        )
      );

      for (let i = candidates.length - 1; i >= 0; i--) {
        const el = candidates[i];
        if (isEditable(el) && isVisible(el)) return el;
      }
      return null;
    }

    function setNativeValue(el, value) {
      const proto = Object.getPrototypeOf(el);
      const desc = Object.getOwnPropertyDescriptor(proto, "value");
      if (desc?.set) desc.set.call(el, value);
      else el.value = value;
    }

    const el = findBestInput();
    if (!el) return { ok: false, reason: "NO_INPUT_IN_THIS_FRAME", href: location.href };

    try {
      el.focus();

      if (el.isContentEditable) {
        el.textContent = t;
        el.dispatchEvent(new InputEvent("input", { bubbles: true }));
      } else {
        setNativeValue(el, t);
        el.dispatchEvent(new InputEvent("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }

      return {
        ok: true,
        href: location.href,
        tag: el.tagName,
        id: el.id || null,
        className: el.className || null
      };
    } catch (e) {
      return { ok: false, reason: String(e?.message || e), href: location.href };
    }
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: injectInsertText,
      args: [text]
    });

    const okFrame = (results || []).find((r) => r?.result?.ok);
    if (okFrame) return { ok: true, insertedInto: okFrame.result };

    return { ok: false, reason: "NO_VISIBLE_INPUT_ANY_FRAME", results: results?.map(r => r.result) };
  } catch (e) {
    return { ok: false, reason: String(e?.message || e) };
  }
}

async function load() {
  const { autopilotEnabled, userContext, lastResult } = await chrome.storage.local.get([
    "autopilotEnabled",
    "userContext",
    "lastResult"
  ]);

  if (elAutopilot) elAutopilot.checked = Boolean(autopilotEnabled);
  setPill(Boolean(autopilotEnabled));

  if (elContext) elContext.value = userContext || "";

  // Render last result
  if (!lastResult) {
    showStatus("No events yet.");
    return;
  }

  if (lastResult?.action === "DRAFT" && lastResult?.draft) {
    // Show draft editor for easy editing
    showDraft(lastResult.draft);
  } else if (lastResult?.action === "WAITING") {
    // NEW: Loop Prevention UI
    showStatus("⏳ Waiting for agent reply...");
  } else if (lastResult?.action === "ERROR") {
     showStatus("Error: " + lastResult.error, true);
  } else if (lastResult?.action === "NEEDS_USER") {
     showStatus("⚠️ AI Stopped: " + lastResult.question, true);
  } else {
    showStatus(pretty(lastResult));
  }
}

async function saveContext() {
  const userContext = (elContext?.value || "").trim();
  if (looksSensitive(userContext)) {
    alert("Sensitive info detected! Remove passwords, OTPs, etc.");
    return;
  }
  await chrome.storage.local.set({ userContext });
  
  const originalText = elSaveContext.textContent;
  elSaveContext.textContent = "Saved!";
  setTimeout(() => elSaveContext.textContent = originalText, 1500);
}

async function toggleAutopilot(enabled) {
  await chrome.storage.local.set({ autopilotEnabled: Boolean(enabled) });
  setPill(Boolean(enabled));
}

async function refresh() {
  const { lastResult } = await chrome.storage.local.get(["lastResult"]);
  if (!lastResult) return showStatus("No events yet.");

  if (lastResult?.action === "DRAFT" && lastResult?.draft) {
    showDraft(lastResult.draft);
  } else if (lastResult?.action === "WAITING") {
    showStatus("⏳ Waiting for agent reply...");
  } else if (lastResult?.action === "ERROR") {
     showStatus("Error: " + lastResult.error, true);
  } else {
    showStatus(pretty(lastResult));
  }
}

async function clearAll() {
  await chrome.storage.local.set({ lastResult: null });
  // Also clear the editor so old text doesn't persist
  elDraftEditor.value = "";
  showStatus("No events yet.");
}

async function insertDraft() {
  // Prefer what's in the editor (user may have edited)
  let textToInsert = (elDraftEditor?.style.display !== "none" ? elDraftEditor.value : "")?.trim();

  if (!textToInsert) {
    const { lastResult } = await chrome.storage.local.get(["lastResult"]);
    textToInsert = (lastResult?.draft || "").trim();
  }

  if (!textToInsert) {
    alert("No draft available yet. Generate a draft first (wait for chat activity, then Refresh).");
    return;
  }

  const originalText = elInsert.textContent;
  elInsert.textContent = "Inserting...";
  elInsert.disabled = true;

  const res = await insertIntoActiveTabAllFrames(textToInsert);

  elInsert.textContent = originalText;
  elInsert.disabled = false;

  if (!res.ok) {
    console.log("Insert failed:", res);
    alert(`Insert failed: ${res.reason}`);
  } else {
    console.log("Inserted into:", res.insertedInto);
  }
}

// --- QUESTIONNAIRE FUNCTIONS ---
async function generateFollowUpQuestions() {
  const issueType = elIssueType?.value || "";
  const orderNumber = elOrderNumber?.value || "";
  const productDetails = elProductDetails?.value || "";
  const additionalInfo = elAdditionalInfo?.value || "";

  if (!issueType) {
    alert("Please select what you need first.");
    return;
  }

  elGenerateFollowUps.disabled = true;
  elGenerateFollowUps.textContent = "Generating...";

  try {
    const response = await fetch("http://localhost:8787/generateFollowUpQuestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issueType,
        orderNumber,
        productDetails,
        additionalInfo
      })
    });

    if (!response.ok) throw new Error("Failed to generate questions");
    
    const data = await response.json();
    
    // Display follow-up questions
    elFollowUpQuestionsContainer.innerHTML = "";
    data.followUpQuestions?.forEach((question, idx) => {
      const div = document.createElement("div");
      div.style.marginBottom = "10px";
      div.innerHTML = `
        <label class="label" for="followup${idx}">Q${idx + 1}: ${question}</label>
        <input type="text" id="followup${idx}" class="setup-box" style="width: 100%; padding: 8px; margin-top: 4px;" placeholder="Your answer..." />
      `;
      elFollowUpQuestionsContainer.appendChild(div);
    });

    // Display final question
    elFinalQuestionContainer.textContent = data.finalQuestion || "What would you prefer if your desired option isn't available?";

    // Show follow-up section, hide initial buttons
    elInitialQuestionnaireBtns.style.display = "none";
    elFollowUpSection.style.display = "block";

  } catch (err) {
    console.error("Error generating questions:", err);
    alert("Could not generate questions. You can skip to custom notes.");
  } finally {
    elGenerateFollowUps.disabled = false;
    elGenerateFollowUps.textContent = "Next: Generate Questions";
  }
}

async function submitFollowUpAnswers() {
  const issueType = elIssueType?.value || "";
  const orderNumber = elOrderNumber?.value || "";
  const productDetails = elProductDetails?.value || "";
  const additionalInfo = elAdditionalInfo?.value || "";
  const backupPlan = elBackupPlan?.value || "";

  // Collect follow-up answers
  const followUpAnswers = [];
  const questions = elFollowUpQuestionsContainer.querySelectorAll("input");
  questions.forEach((input, idx) => {
    if (input.value) {
      followUpAnswers.push(`Q${idx + 1}: ${input.value}`);
    }
  });

  // Build context
  const questionnaireContext = `
CUSTOMER REQUEST:
- Issue Type: ${issueType}
- Order Number: ${orderNumber || "Not provided"}
- Product/Item: ${productDetails || "Not specified"}
- Additional Details: ${additionalInfo || "None"}

FOLLOW-UP ANSWERS:
${followUpAnswers.length > 0 ? followUpAnswers.join("\n") : "None provided"}

IF PREFERRED OPTION UNAVAILABLE:
${backupPlan || "No backup plan specified"}

IMPORTANT: Before the agent proceeds, confirm the customer agrees with any proposed solution.
If the desired option (${issueType}) isn't available, refer to their backup plan above.
Always get clear consent before committing to any action.
Use all the context above to personalize your responses and understand the customer's needs.
`.trim();

  // Merge with existing context
  const existingContext = elContext?.value || "";
  const mergedContext = existingContext ? `${questionnaireContext}\n\n${existingContext}` : questionnaireContext;

  elContext.value = mergedContext;
  await saveContext();

  // Hide questionnaire, show status
  elQuestionnaireContainer.style.display = "none";
  elOpenQuestionnaire.style.display = "block";
  
  showStatus("✅ Setup complete! AI is aware of your needs and backup plan.");
}

function editQuestionnaire() {
  elFollowUpSection.style.display = "none";
  elInitialQuestionnaireBtns.style.display = "flex";
}

function skipFollowUps() {
  elQuestionnaireContainer.style.display = "none";
  elOpenQuestionnaire.style.display = "block";
  showStatus("✅ Setup skipped. You can fill in custom notes instead.");
}

async function submitQuestionnaire() {
  const issueType = elIssueType?.value || "";
  const orderNumber = elOrderNumber?.value || "";
  const productDetails = elProductDetails?.value || "";
  const additionalInfo = elAdditionalInfo?.value || "";

  if (!issueType) {
    alert("Please select what you need.");
    return;
  }

  // Build context from questionnaire
  const questionnaireContext = `
CUSTOMER REQUEST:
- Issue Type: ${issueType}
- Order Number: ${orderNumber || "Not provided"}
- Product/Item: ${productDetails || "Not specified"}
- Additional Details: ${additionalInfo || "None"}

IMPORTANT: Before the agent proceeds, confirm the customer agrees with any proposed solution.
If the desired option (${issueType}) isn't available, ask what alternatives they'd accept.
Always get clear consent before committing to any action.
`.trim();

  // Merge with existing context
  const existingContext = elContext?.value || "";
  const mergedContext = existingContext ? `${questionnaireContext}\n\n${existingContext}` : questionnaireContext;

  elContext.value = mergedContext;
  await saveContext();

  // Hide questionnaire, show status
  elQuestionnaireContainer.style.display = "none";
  elOpenQuestionnaire.style.display = "block";
  
  showStatus("✅ Setup complete! AI is now aware of your needs.");
}

function toggleQuestionnaire() {
  const isVisible = elQuestionnaireContainer.style.display !== "none";
  elQuestionnaireContainer.style.display = isVisible ? "none" : "block";
}

document.addEventListener("DOMContentLoaded", () => {
  load().catch(console.error);

  elSaveContext?.addEventListener("click", () => saveContext().catch(console.error));
  elAutopilot?.addEventListener("change", (e) =>
    toggleAutopilot(e.target.checked).catch(console.error)
  );

  elRefresh?.addEventListener("click", () => refresh().catch(console.error));
  elClear?.addEventListener("click", () => clearAll().catch(console.error));
  elInsert?.addEventListener("click", () => insertDraft().catch(console.error));

  // Questionnaire listeners
  elOpenQuestionnaire?.addEventListener("click", () => toggleQuestionnaire());
  elGenerateFollowUps?.addEventListener("click", () => generateFollowUpQuestions().catch(console.error));
  elSkipToCustom?.addEventListener("click", () => skipFollowUps());
  elSubmitFollowUps?.addEventListener("click", () => submitFollowUpAnswers().catch(console.error));
  elEditQuestionnaire?.addEventListener("click", () => editQuestionnaire());
  elSubmitQuestionnaire?.addEventListener("click", () => submitQuestionnaire().catch(console.error));
  elSkipQuestionnaire?.addEventListener("click", () => toggleQuestionnaire());
});

// --- AUTO-REFRESH ON STORAGE CHANGE ---
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.lastResult) {
    const newResult = changes.lastResult.newValue;
    
    if (!newResult) {
      showStatus("No events yet.");
      return;
    }

    if (newResult?.action === "DRAFT" && newResult?.draft) {
      showDraft(newResult.draft);
    } else if (newResult?.action === "WAITING") {
      showStatus("⏳ Waiting for agent reply...");
    } else if (newResult?.action === "ERROR") {
      showStatus("Error: " + newResult.error, true);
    } else if (newResult?.action === "NEEDS_USER") {
      showStatus("⚠️ AI Stopped: " + newResult.question, true);
    } else {
      showStatus(pretty(newResult));
    }
  }
});