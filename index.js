import express from "express";
import cors from "cors";
import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai"; 
import rateLimit from "express-rate-limit"; 
import helmet from "helmet";
import winston from "winston";
import crypto from "crypto";

// --- Logger Config ---
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

const app = express();
app.use(helmet()); 

// --- FIX 1: Allow Extension to Connect (CORS) ---
app.use(cors()); 

// --- CONSTANTS ---
const THROTTLE_MS = 3000;
const MAX_TRANSCRIPT_LINES = 80;
const CACHE_TTL_MS = 60000; 
const RETRY_ATTEMPTS = 3;
const BACKOFF_BASE_MS = 1000;
const RATE_LIMIT_MAX = 60;

// --- FIX 2: Rate Limit Increased ---
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: RATE_LIMIT_MAX,
  message: { action: "ERROR", error: "Too many requests. Please wait a minute." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/analyze", limiter);

app.use(express.json({ limit: "2mb" }));

// --- Configuration ---
// --- Configuration ---
const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const apiKey = process.env.GEMINI_API_KEY;
const hasGeminiKey = Boolean(apiKey);

const genAI = hasGeminiKey ? new GoogleGenerativeAI(apiKey) : null;

// --- FIX 3: Startup Warning ---
if (!hasGeminiKey) {
  console.warn("\n⚠️  WARNING: Missing GEMINI_API_KEY in .env file.");
  console.warn("   The server will run, but AI features will fail.\n");
}
// --- Cache ---
const draftCache = new Map(); 

// --- Deduplication & Similarity Tracking ---
const conversationHistory = new Map(); // tabIdHash -> { questions: [], lastAnswers: [] }

function calculateSimilarity(str1, str2) {
  // Simple similarity check: compare lowercase, remove punctuation
  const clean = (s) => s.toLowerCase().replace(/[^\w\s]/g, "").trim();
  const s1 = clean(str1);
  const s2 = clean(str2);
  
  if (s1 === s2) return 1; // Identical
  
  // Check if one contains the other (for partial matches)
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;
  
  // Levenshtein-like simple check: count matching words
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const matching = words1.filter(w => words2.includes(w)).length;
  const similarity = matching / Math.max(words1.length, words2.length);
  
  return similarity;
}

function hasAskedBefore(draft, tabIdHash) {
  // Check if this draft is too similar to questions already asked
  const history = conversationHistory.get(tabIdHash) || { questions: [], lastAnswers: [] };
  
  const similarity = history.questions.some(q => calculateSimilarity(draft, q) > 0.8);
  return similarity;
}

function wasAnsweredSimilarly(transcript, tabIdHash) {
  // Check if we got a similar answer recently (last 2 user answers)
  const lines = transcript.split("\n").map(s => s.trim()).filter(Boolean);
  const userLines = lines.filter(l => l.startsWith("Me:") || l.startsWith("You:"));
  
  if (userLines.length < 2) return false;
  
  const lastAnswer = userLines[userLines.length - 1];
  const secondLastAnswer = userLines[userLines.length - 2];
  
  const similarity = calculateSimilarity(lastAnswer, secondLastAnswer);
  return similarity > 0.7; // If last 2 answers are very similar
}

function recordQuestion(tabIdHash, draft) {
  if (!conversationHistory.has(tabIdHash)) {
    conversationHistory.set(tabIdHash, { questions: [], lastAnswers: [] });
  }
  
  const history = conversationHistory.get(tabIdHash);
  history.questions.push(draft);
  
  // Keep only last 10 questions to avoid memory issues
  if (history.questions.length > 10) {
    history.questions.shift();
  }
}

function recordAnswer(tabIdHash, transcript) {
  if (!conversationHistory.has(tabIdHash)) {
    conversationHistory.set(tabIdHash, { questions: [], lastAnswers: [] });
  }
  
  const lines = transcript.split("\n").map(s => s.trim()).filter(Boolean);
  const userLines = lines.filter(l => l.startsWith("Me:") || l.startsWith("You:"));
  
  if (userLines.length > 0) {
    const lastAnswer = userLines[userLines.length - 1];
    const history = conversationHistory.get(tabIdHash);
    history.lastAnswers.push(lastAnswer);
    
    // Keep only last 5 answers
    if (history.lastAnswers.length > 5) {
      history.lastAnswers.shift();
    }
  }
}

// --- Helpers ---
function getLastLine(transcript) {
  if (!transcript) return "";
  return transcript.split("\n").map(s => s.trim()).filter(Boolean).slice(-1)[0] || "";
}

function looksSensitive(text) {
  if (!text) return false;
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

function isUserTurn(transcript) {
  if (!transcript) return false;
  const lines = transcript.split("\n").map(s => s.trim()).filter(Boolean);
  if (lines.length === 0) return false;
  
  const lastLine = lines[lines.length - 1];
  
  // It's your turn ONLY if the agent spoke last
  const isAgentLast = lastLine.startsWith("Rep:") || lastLine.startsWith("Agent:");
  
  // Don't reply to your own messages
  const isUserLast = lastLine.startsWith("Me:") || lastLine.startsWith("You:");
  
  if (isUserLast) return false; // You just spoke, wait for agent
  if (isAgentLast) return true; // Agent spoke, it's your turn
  
  // Fallback: check if we're balanced or if agent has more messages
  const meCount = lines.filter(l => l.startsWith("Me:") || l.startsWith("You:")).length;
  const repCount = lines.filter(l => l.startsWith("Rep:") || l.startsWith("Agent:")).length;
  
  return repCount > meCount; // Only reply if agent has spoken more recently
}

// --- Routes ---
app.get("/health", (req, res) => res.json({ ok: true }));

// --- QUESTIONNAIRE ENDPOINT ---
app.post("/questionnaire", async (req, res) => {
  // Returns a structured questionnaire that the extension can present to the user
  const questionnaire = {
    title: "What can we help you with?",
    fields: [
      {
        name: "issueType",
        label: "What do you need?",
        type: "select",
        required: true,
        options: [
          { value: "return", label: "I want to return an item" },
          { value: "exchange", label: "I want to exchange an item" },
          { value: "refund", label: "I want a refund" },
          { value: "help", label: "I need help with my order" },
          { value: "damage", label: "Item arrived damaged" },
          { value: "missing", label: "Item missing from order" },
          { value: "other", label: "Something else" }
        ]
      },
      {
        name: "orderNumber",
        label: "Order number (if you have it)",
        type: "text",
        required: false,
        placeholder: "#12345"
      },
      {
        name: "productDetails",
        label: "What product/item is this about?",
        type: "text",
        required: false,
        placeholder: "e.g., Blue jacket, size M"
      },
      {
        name: "additionalInfo",
        label: "Any other details?",
        type: "textarea",
        required: false,
        placeholder: "e.g., Defective after 2 days, purchased on Jan 1"
      }
    ]
  };
  
  res.json(questionnaire);
});

app.get("/health", (req, res) => res.json({ ok: true }));

// --- GENERATE PERSONALIZED FOLLOW-UP QUESTIONS ---
app.post("/generateFollowUpQuestions", async (req, res) => {
  const { issueType, orderNumber, productDetails, additionalInfo } = req.body ?? {};
  const useMock = process.env.MOCK_LLM === "1";

  if (!issueType) {
    return res.status(400).json({ error: "issueType is required" });
  }

  if (useMock) {
    return res.json({
      followUpQuestions: [
        "What condition is the item in?",
        "How long have you had it?"
      ],
      finalQuestion: "What would you prefer if we can't process the return?"
    });
  }

  if (!hasGeminiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    const aiModel = genAI.getGenerativeModel({ model: modelName });
    
    const prompt = `You are helping a customer who wants to ${issueType}. Based on their details, generate 2-3 personalized follow-up questions that would help diagnose their situation and get more information.

Customer Details:
- Issue: ${issueType}
- Order #: ${orderNumber || "Not provided"}
- Product: ${productDetails || "Not specified"}
- Details: ${additionalInfo || "None provided"}

Generate ONLY 2-3 specific, natural follow-up questions (not a list). Format as JSON:
{
  "followUpQuestions": ["Question 1?", "Question 2?"]
}

Example for a return:
{
  "followUpQuestions": ["Is the item still in original packaging?", "When did you receive it?"]
}`;

    const result = await aiModel.generateContent(prompt);
    const response = await result.response;
    let responseText = response.text().trim();

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response");
    }

    const followUpData = JSON.parse(jsonMatch[0]);

    // Now generate the final personalized question
    const finalPrompt = `A customer is trying to ${issueType}. They've provided these details:
- Order: ${orderNumber || "Not provided"}
- Product: ${productDetails || "Not specified"}
- Context: ${additionalInfo || "None"}

Generate ONE personalized, empathetic question asking what they would prefer if their desired option (${issueType}) isn't available. 
Make it natural and conversational, showing you understand their situation.
Be concise (under 15 words).

Respond ONLY with the question, no quotes or formatting.`;

    const finalResult = await aiModel.generateContent(finalPrompt);
    const finalResponse = await finalResult.response;
    const finalQuestion = finalResponse.text().trim();

    return res.json({
      followUpQuestions: followUpData.followUpQuestions || [],
      finalQuestion: finalQuestion
    });

  } catch (err) {
    logger.error("Error generating follow-up questions:", err);
    return res.status(500).json({ 
      error: "Could not generate questions",
      details: err.message 
    });
  }
});

app.post("/analyze", async (req, res) => {
  const { provider, pageUrl, transcript, userContext } = req.body ?? {};
  const useMock = process.env.MOCK_LLM === "1";

  if (!genAI && !useMock) {
    return res.status(500).json({ 
      action: "ERROR", 
      error: "Missing GEMINI_API_KEY in .env. Add it, then restart." 
    });
  }

  const lastLine = getLastLine(transcript);

  // Safety Check
  if (looksSensitive(lastLine)) {
    return res.json({
      action: "NEEDS_USER",
      question: `Sensitive info requested: "${lastLine}". Please reply manually.`
    });
  }

  if (looksSensitive(userContext)) {
    return res.status(400).json({
      action: "ERROR",
      error: "User context contains sensitive information. Please remove passwords, OTPs, etc."
    });
  }

  if (useMock) {
    return res.json({
      action: "DRAFT",
      draft: "MOCK: This is a short, plain English test reply."
    });
  }

  // Loop Prevention & Deduplication
  if (!isUserTurn(transcript)) {
    return res.json({ action: "WAITING" }); 
  }

  // Create a tab identifier hash from provider + pageUrl
  const tabIdHash = crypto.createHash('md5').update((provider || '') + (pageUrl || '')).digest('hex');

  const trimmedTranscript = (transcript || "").split("\n").slice(-MAX_TRANSCRIPT_LINES).join("\n");
  const transcriptHash = crypto.createHash('md5').update(trimmedTranscript + (userContext || "")).digest('hex');
  
  const cached = draftCache.get(transcriptHash);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return res.json({ action: "DRAFT", draft: cached.draft });
  }
  
  // Prompt Engineering - STRATEGIC WITH QUESTIONNAIRE AWARENESS
  let prompt = 
    `You are a strategic customer support assistant helping resolve an issue in a live chat.\n` +
    `YOUR JOB: Work toward resolving the customer's problem WITHOUT committing them to unwanted actions.\n\n` +
    
    `CORE RULES:\n` +
    `1. UNDERSTAND THE ISSUE: What does the customer actually need? (from context if available)\n` +
    `2. VERIFY FEASIBILITY: Ask what happens if your preferred solution isn't available.\n` +
    `3. GET CONSENT: Never commit to a solution without clear agreement.\n` +
    `4. OFFER A PAUSE: If the store can't meet their needs, say "Let me pause here—I want to make sure we explore all options. Can I check something?"\n` +
    `5. ESCALATE WHEN NEEDED: If stuck or unhelpful agent, ask for a manager.\n` +
    `6. BE BRIEF: 1-2 sentences max. Be conversational, not robotic.\n\n` +
    
    `STRATEGIC APPROACH:\n` +
    `- Start by confirming what they need (return/exchange/refund/help).\n` +
    `- For EXCHANGE: "Do you want to exchange for the same item or something else? What if we don't have your size?"\n` +
    `- For RETURN: "Are you looking for a refund or store credit?"\n` +
    `- Always ask: "What if we can't [their preferred option]? What's your backup?"\n` +
    `- If the agent says something isn't available: "I'd like to pause here. Let me see what other options we have before you decide."\n` +
    `- If agent is evasive or unhelpful: Suggest escalation.\n` +
    `- If you have all info and agent can't help: "Let me check if there's anything else. Can I put you on hold while I look into this?"\n\n` +
    
    `CUSTOMER SETUP INFO:\n${userContext || "User hasn't filled out questionnaire yet"}\n\n` +
    
    `CHAT TRANSCRIPT:\n${trimmedTranscript}\n\n` +
    
    `INSTRUCTIONS:\n` +
    `- Help resolve their issue, but ALWAYS verify they agree before committing.\n` +
    `- If you sense the agent can't help OR their request isn't available, PAUSE and offer to check other options.\n` +
    `- Your job is to protect the customer from accidentally accepting something they don't want.\n` +
    `- Keep it SHORT. Output 1-2 sentences only.\n` +
    `- If nothing new to add, output: (waiting)\n\n` +
    `Reply:`;

  if (provider === "zendesk") {
    prompt = prompt.replace("be conversational, not robotic", "be professional and courteous");
  }

  try {
    const aiModel = genAI.getGenerativeModel({ model: modelName });
    
    let result;
    for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
      try {
        result = await aiModel.generateContent(prompt);
        if (attempt > 0) {
          logger.info(`Gemini API succeeded on attempt ${attempt + 1}`);
        }
        break; 
      } catch (err) {
        if (attempt === RETRY_ATTEMPTS - 1) throw err;
        logger.warn(`Gemini API attempt ${attempt + 1} failed, retrying...`, { error: err.message });
        await new Promise(r => setTimeout(r, BACKOFF_BASE_MS * (attempt + 1)));
      }
    }

    const response = await result.response;
    let draft = response.text().trim();

    if (!draft || draft.toUpperCase() === "WAITING" || draft.toUpperCase() === "EMPTY") {
      return res.json({ action: "WAITING" });
    }

    // --- Check if we've asked this before ---
    if (hasAskedBefore(draft, tabIdHash)) {
      logger.warn("Duplicate question detected, skipping", { draft: draft.substring(0, 50) });
      recordAnswer(tabIdHash, trimmedTranscript);
      return res.json({ action: "WAITING" });
    }

    // --- Check if customer gave similar answer twice ---
    if (wasAnsweredSimilarly(trimmedTranscript, tabIdHash)) {
      logger.warn("Similar answer detected twice, moving on", { draft: draft.substring(0, 50) });
      recordQuestion(tabIdHash, draft);
      recordAnswer(tabIdHash, trimmedTranscript);
      return res.json({ action: "WAITING" });
    }

    // Record this question and answer
    recordQuestion(tabIdHash, draft);
    recordAnswer(tabIdHash, trimmedTranscript);

    draftCache.set(transcriptHash, { draft, timestamp: Date.now() });

    logger.info("Draft generated successfully", { 
      provider, 
      draftLength: draft.length, 
      cached: false,
      isDuplicate: false
    });

    return res.json({ action: "DRAFT", draft });

  } catch (err) {
    logger.error("Gemini API Error:", err);
    let msg = err.message || String(err);
    if (msg.includes("429") || msg.includes("quota")) {
        msg = "Gemini Quota Exceeded. Try again later.";
    }
    return res.status(500).json({ action: "ERROR", error: msg });
  }
});

const port = Number(process.env.PORT || 8787);

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`\n✅ Server running at http://localhost:${port}`);
    console.log(`   Model: ${modelName}`);
    console.log(`   Rate Limit: ${RATE_LIMIT_MAX} requests/min`);
    console.log(`   Mode: ${process.env.MOCK_LLM === "1" ? "⚠️ MOCK" : "⚡ REAL AI"}\n`);
    logger.info(`Server started on port ${port} with model ${modelName}`);
  });
}

export { getLastLine, looksSensitive, isUserTurn };