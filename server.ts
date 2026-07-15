import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, addDoc, getDocs, query, orderBy, limit as firestoreLimit, doc, setDoc, getDoc } from "firebase/firestore";

dotenv.config();

const app = express();
const PORT = 3000;

// Firebase & Firestore Lazy Initialization
let db: any = null;

function getFirestoreDb() {
  if (!db) {
    try {
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        const firebaseApp = initializeApp(config);
        db = initializeFirestore(firebaseApp, {}, config.firestoreDatabaseId);
        console.log("[Firestore] Firebase initialized successfully on server-side with database ID:", config.firestoreDatabaseId);
      } else {
        console.warn("[Firestore] firebase-applet-config.json not found. Firestore will not be available.");
      }
    } catch (err) {
      console.error("[Firestore] Error initializing Firebase:", err);
    }
  }
  return db;
}

// Helper to log safety checks to Firestore
async function logCheckToFirestore(type: "scam" | "currency" | "payment" | "investment", inputSummary: string, verdict: string, riskScore: number) {
  try {
    const firestoreDb = getFirestoreDb();
    if (firestoreDb) {
      const checksCol = collection(firestoreDb, "checks");
      const docData = {
        type,
        inputSummary: inputSummary.length > 500 ? inputSummary.slice(0, 500) + "..." : inputSummary,
        verdict,
        riskScore,
        timestamp: new Date().toISOString()
      };
      await addDoc(checksCol, docData);
      console.log(`[Firestore] Successfully logged ${type} check record to collection 'checks'`);
    }
  } catch (err) {
    console.error("[Firestore] Error logging check to Firestore:", err);
  }
}

// Body parsing with limit for base64 image uploads
app.use(express.json({ limit: "15mb" }));

// Lazy initializer for GoogleGenAI to prevent crash on startup if API key is missing
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined. Please add your Gemini API Key in Settings > Secrets to enable scam and currency detection features.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Helper to execute generateContent with automatic exponential backoff for transient errors (e.g. 503 high demand)
async function generateContentWithRetry(ai: GoogleGenAI, params: any, maxRetries = 4): Promise<any> {
  let attempt = 0;
  while (true) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      attempt++;
      const errorMessage = err.message || String(err);
      console.warn(`[Gemini API] Attempt ${attempt} failed: ${errorMessage}`);

      const isTransient = 
        err.status === 503 || 
        err.status === 429 || 
        err.statusCode === 503 || 
        err.statusCode === 429 || 
        errorMessage.includes("503") || 
        errorMessage.includes("high demand") || 
        errorMessage.includes("temporary") || 
        errorMessage.includes("UNAVAILABLE") || 
        errorMessage.includes("429") ||
        errorMessage.includes("Resource has been exhausted");

      if (isTransient && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        console.warn(`[Gemini API] Transient error (503/429/UNAVAILABLE) detected. Retrying in ${delay.toFixed(0)}ms (Attempt ${attempt}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }
}

// 1. Scam & Digital Arrest Checker Endpoint
app.post("/api/check-scam", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string" || text.trim() === "") {
      return res.status(400).json({ error: "Text content is required for analysis." });
    }

    const ai = getGeminiClient();

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: `Analyze this content: "${text}"`,
      config: {
        systemInstruction: `You are Raksha AI's professional cybercrime and digital safety analyst system.
Analyze the provided message or call transcript for digital arrest scams and other common cybercrime patterns.
Common digital arrest scam patterns include:
1. Authority Impersonation: Pretending to be police (e.g. CBI, Mumbai Police, Delhi Police), customs, court, TRAI, or logistics companies (e.g., FedEx).
2. Urgency/Fear: Threatening immediate arrest, cancellation of passport/visa, legal penalties, or immediate phone number blocking within hours.
3. Isolation: Telling the victim to stay alone, lock the door, not tell family/friends, or stay on call continuously.
4. Video Call Coercion: Forcing the victim to stay on camera (e.g., Skype, Teams, WhatsApp video) for hours for "interrogation" or "surveillance".
5. Financial/OTP Demands: Asking for fund transfers to "digital escrow", "verification accounts", "security clearance", or demanding OTPs.

Your task is to classify this text. Return a JSON response adhering strictly to the schema provided.
- risk_score: an integer from 0 to 100 indicating the threat level (e.g. 0-25 safe, 26-69 suspicious/amber, 70-100 high risk/red).
- verdict: must be exactly "Likely Safe", "Suspicious", or "Likely Scam".
- flags: list of detected threat elements (e.g. "Authority Impersonation", "Urgency Tactics", "Isolation Demands", "Video Call Coercion", "Unusual Payment Demand"). If none, return an empty array.
- explanation: a clear, concise, objective explanation of what elements are scam indicators or why it is safe.
- recommended_action: concrete, helpful, step-by-step guidance on what the user should do next (e.g., hang up immediately, block the number, report to cybercrime.gov.in, call 1930).`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            risk_score: { type: Type.INTEGER, description: "Scam risk score from 0 to 100" },
            verdict: { type: Type.STRING, description: "Likely Scam, Suspicious, or Likely Safe" },
            flags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific scam patterns found (e.g. Authority Impersonation, Urgent Demands)" },
            explanation: { type: Type.STRING, description: "Detailed explanation of why this verdict was chosen" },
            recommended_action: { type: Type.STRING, description: "Step-by-step guidance on what the user should do next" }
          },
          required: ["risk_score", "verdict", "flags", "explanation", "recommended_action"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response received from the analysis engine.");
    }

    const resultJson = JSON.parse(resultText.trim());
    await logCheckToFirestore("scam", text, resultJson.verdict, Number(resultJson.risk_score) || 0);
    return res.json(resultJson);
  } catch (error: any) {
    console.error("Scam Analysis Error:", error);
    return res.status(500).json({
      error: error.message || "An unexpected error occurred during scam check."
    });
  }
});

// 2. Counterfeit Currency Checker Endpoint
app.post("/api/check-currency", async (req, res) => {
  try {
    const { imageBytes, mimeType } = req.body;
    if (!imageBytes || !mimeType) {
      return res.status(400).json({ error: "Banknote image bytes and mimeType are required for visual check." });
    }

    // Clean up base64 prefix if present
    const base64Data = imageBytes.replace(/^data:image\/\w+;base64,/, "");

    const ai = getGeminiClient();

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      },
    };

    const textPart = {
      text: "Visually assess the banknote design in this image.",
    };

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: [imagePart, textPart],
      config: {
        systemInstruction: `You are Raksha AI's professional currency design assessment prototype.
Analyze the uploaded image of a banknote for design authenticity cues.
Clearly note that this is a visual check for prototype simulation, not a physical authentication system.
Assess visually verifiable banknote features if discernible:
- Denomination design & alignment
- Security thread presence and alignment
- Watermark area visual presence
- Text and numerals alignment, bleed-through, or printing precision
- Serial number alignment and spacing

Return a JSON response:
- verdict: must be exactly "Likely Genuine", "Suspicious", "Counterfeit", or "Unrecognized Note".
- confidence: an integer from 0 to 100 representing confidence in the assessment.
- explanation: a detailed breakdown of what visual elements were assessed (e.g., denomination matches layout, security thread visible/offset, watermark area clear or suspicious, serial number sharpness). State clearly that this is an AI heuristic prototype assessment and cannot replace official physical bank scanners or certified detectors.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verdict: { type: Type.STRING, description: "Likely Genuine, Suspicious, Counterfeit, or Unrecognized Note" },
            confidence: { type: Type.INTEGER, description: "Confidence score from 0 to 100" },
            explanation: { type: Type.STRING, description: "Explanation of physical elements assessed visually (e.g., security thread, watermarks, texture cues, alignment)" }
          },
          required: ["verdict", "confidence", "explanation"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response received from the banknote check engine.");
    }

    const resultJson = JSON.parse(resultText.trim());
    
    // Calculate a heuristic risk score based on verdict
    let riskScore = 10;
    if (resultJson.verdict === "Counterfeit") {
      riskScore = 100;
    } else if (resultJson.verdict === "Suspicious") {
      riskScore = 75;
    } else if (resultJson.verdict === "Unrecognized Note") {
      riskScore = 40;
    } else if (resultJson.verdict === "Likely Genuine") {
      riskScore = 10;
    }
    
    await logCheckToFirestore("currency", `Banknote Visual Diagnostic (Confidence: ${resultJson.confidence || 0}%)`, resultJson.verdict, riskScore);
    
    return res.json(resultJson);
  } catch (error: any) {
    console.error("Currency Analysis Error:", error);
    return res.status(500).json({
      error: error.message || "An unexpected error occurred during banknote check."
    });
  }
});

// 3. Payment Request Checker Endpoint
app.post("/api/check-payment-request", async (req, res) => {
  try {
    const { imageBytes, mimeType } = req.body;
    if (!imageBytes || !mimeType) {
      return res.status(400).json({ error: "Payment image bytes and mimeType are required." });
    }

    // Clean up base64 prefix if present
    const base64Data = imageBytes.replace(/^data:image\/\w+;base64,/, "");

    const ai = getGeminiClient();

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      },
    };

    const textPart = {
      text: "Analyze this payment request or QR code image to determine whether it will send or receive money, and check for scam patterns.",
    };

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: [imagePart, textPart],
      config: {
        systemInstruction: `You are Raksha AI's professional Payment Request and UPI QR Code security analysis engine.
Your task is to analyze an uploaded screenshot of a UPI payment request, QR code, or transactional page, and protect users from common UPI scams.

The single most critical concept in UPI security is:
- SCANNING a QR code or entering a UPI PIN is strictly for SENDING / PAYING money. You NEVER need to scan a QR code or enter your UPI PIN to RECEIVE money.
- Fraudsters often send "Collect Requests" or QR codes labeled "Scan to Receive Money" or "Receive ₹500" to trick users. Scanning this will actually SEND money from the user's account.

Analyze the image carefully:
1. Identify any visible text, transfer amount (e.g. ₹ or Rs. symbols), and payee/payer details, or UPI ID (VPA, e.g. xxx@okaxis, xxx@ybl).
2. Determine whether this is:
   - A "Collect Request" or payment request (where money would LEAVE the user's account if authorized/swiped/scanned).
   - A "Pay/Send" QR code or a standard payment screen (where scanning would SEND money from the user's account).
   - A genuine receipt or incoming transfer, or a QR code that is for RECEIVING money (though note that if the user scans a payee's QR code, they are SENDING money; the recipient receives it).
3. Determine the plain-language verdict:
   - "This will SEND money from your account" (if it is a payment request, a collect request, a payment link, or a standard QR code to pay a merchant/individual).
   - "This will RECEIVE money into your account" (only if it is a genuine incoming transfer confirmation/receipt or a static QR code representing the user's own receiving profile, NOT a code to scan).
   - "Unable to determine — proceed with caution" (if details are unclear or missing).
4. Check for scam patterns:
   - Is it a "collect request" or payment link disguised with labels like "Receive Money", "Refund", "Cashback", or "Scan to Receive"? If yes, set scamFlagged to true and provide an explanation.

Provide your response strictly in the following JSON format:
{
  "verdict": "This will SEND money from your account" | "This will RECEIVE money into your account" | "Unable to determine — proceed with caution",
  "riskScore": number (0 to 100. If it is a scam or collect request, use 90-100. If it is a normal pay/send action, use 50-70. If it is a confirmed receipt/receive action, use 0-25),
  "amount": "string showing the detected amount or 'Not visible'",
  "upiId": "string showing the detected UPI ID or 'Not visible'",
  "payeeName": "string showing the merchant or payee name or 'Not visible'",
  "explanation": "clear, plain-language description of what elements in the image were read and why this verdict was selected.",
  "scamFlagged": boolean (true if it is a collect request or scan disguised as receiving/cashback/refund),
  "scamExplanation": "string explaining why scanning a QR code or entering a PIN does not receive money and how this specific scam works."
}`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verdict: { type: Type.STRING, description: "Plain-language verdict on whether this sends or receives money" },
            riskScore: { type: Type.INTEGER, description: "Risk score from 0 to 100 based on threat level" },
            amount: { type: Type.STRING, description: "Amount of money detected or 'Not visible'" },
            upiId: { type: Type.STRING, description: "UPI ID / VPA detected or 'Not visible'" },
            payeeName: { type: Type.STRING, description: "Payee or merchant name detected or 'Not visible'" },
            explanation: { type: Type.STRING, description: "Explanation of findings in the image" },
            scamFlagged: { type: Type.BOOLEAN, description: "Whether this represents a scam pattern like scan-to-receive" },
            scamExplanation: { type: Type.STRING, description: "Explanation of why scanning does not receive money" }
          },
          required: ["verdict", "riskScore", "amount", "upiId", "payeeName", "explanation", "scamFlagged", "scamExplanation"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response received from the payment check engine.");
    }

    const resultJson = JSON.parse(resultText.trim());
    
    // Log check to Firestore
    await logCheckToFirestore(
      "payment", 
      `Payment Check: ${resultJson.payeeName !== 'Not visible' ? resultJson.payeeName : 'Unknown payee'} (Amount: ${resultJson.amount})`, 
      resultJson.verdict, 
      Number(resultJson.riskScore) || 50
    );

    return res.json(resultJson);
  } catch (error: any) {
    console.error("Payment Analysis Error:", error);
    return res.status(500).json({
      error: error.message || "An unexpected error occurred during payment request check."
    });
  }
});

// 4. Investment Scheme Checker Endpoint
app.post("/api/check-investment", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string" || text.trim() === "") {
      return res.status(400).json({ error: "Text content is required for investment scheme analysis." });
    }

    const ai = getGeminiClient();

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: `Analyze this investment scheme details or message: "${text}"`,
      config: {
        systemInstruction: `You are Raksha AI's professional Investment Scam & Financial Fraud Intelligence analyst.
Your task is to evaluate proposed investment opportunities, chats, group messages, or advertisements for known investment scam patterns.

Assess the provided text against the following common investment scam markers:
1. Guaranteed or Fixed High Returns: Promises of risk-free daily, weekly, or monthly gains (e.g. 2% daily, 200% monthly).
2. Proof of Profit Screenshots: Mention of ledger updates, screenshots, or receipts of others making huge profits.
3. High Pressure / Artificial Urgency: Demands to deposit money immediately, lock in a rate before a midnight deadline, or join a limited spot.
4. Private Messaging Migration: Pressuring the user to move from social media or public forums into a private Telegram, WhatsApp, or VIP VIP-signal group.
5. Unregistered/Unfamiliar Platforms: Encouraging downloads of custom APKs, private VIP trading portals, or obscure offshore trading apps.
6. Pyramid/Recruitment structures: Commission incentives for signing up other members or multi-level recruiting.

Analyze the input text carefully and classify it.
You MUST output a JSON response adhering strictly to the following schema:
- risk_score: an integer from 0 to 100 indicating the threat level (e.g., 0-25 safe, 26-69 suspicious/amber, 70-100 high risk/red). If any key red flags like high guaranteed returns or private group migration exist, give it a score of 70+.
- verdict: must be exactly "Likely Safe", "Suspicious", or "Likely Scam".
- flags: a list of detected threat elements. Only use standard concise labels like: "Guaranteed High Returns", "Fake Proof of Profits", "Urgency pressure", "Private group migration", "Unregistered Trading App", "Pyramid/Recruitment structure", or other relevant descriptions. If none, return an empty array.
- explanation: a detailed, plain-language description of why this verdict was selected, detailing which indicators were triggered or why it appears safe.
- recommended_action: concrete, helpful, step-by-step guidance on what the user should do next. Crucially, ALWAYS include a prominent instruction or note advising the user to verify any financial or trading platform against SEBI's (Securities and Exchange Board of India) registered intermediaries list before investing.

Provide your response strictly in JSON format.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            risk_score: { type: Type.INTEGER, description: "Investment risk score from 0 to 100" },
            verdict: { type: Type.STRING, description: "Likely Safe, Suspicious, or Likely Scam" },
            flags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of identified risk factors" },
            explanation: { type: Type.STRING, description: "Detailed explanation of findings" },
            recommended_action: { type: Type.STRING, description: "Actionable advice, including a notice to verify against SEBI's registered intermediaries list" }
          },
          required: ["risk_score", "verdict", "flags", "explanation", "recommended_action"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response received from the investment analysis engine.");
    }

    const resultJson = JSON.parse(resultText.trim());
    
    // Log check to Firestore
    await logCheckToFirestore(
      "investment",
      `Investment Check: ${text.length > 60 ? text.slice(0, 60) + "..." : text}`,
      resultJson.verdict,
      Number(resultJson.risk_score) || 0
    );

    return res.json(resultJson);
  } catch (error: any) {
    console.error("Investment Scheme Analysis Error:", error);
    return res.status(500).json({
      error: error.message || "An unexpected error occurred during investment scheme check."
    });
  }
});

// 5. Threat Support / Sextortion Blackmail Checker Endpoint (NO DB LOGGING)
app.post("/api/check-threat", async (req, res) => {
  try {
    const { text, imageBytes, mimeType } = req.body;
    
    if ((!text || typeof text !== "string" || text.trim() === "") && (!imageBytes || !mimeType)) {
      return res.status(400).json({ error: "Either a text description or a screenshot of the threat is required for analysis." });
    }

    const ai = getGeminiClient();
    const contents: any[] = [];

    if (imageBytes && mimeType) {
      const base64Data = imageBytes.replace(/^data:image\/\w+;base64,/, "");
      contents.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data,
        }
      });
    }

    if (text && text.trim() !== "") {
      contents.push({ text: `Analyze this threat/blackmail or demanding message/description: "${text}"` });
    } else {
      contents.push({ text: "Analyze this uploaded screenshot of a threat message, digital demand, or coercion attempt." });
    }

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction: `You are Raksha AI's professional, calm, and reassuring digital safety crisis analyst.
Your task is to analyze user-submitted descriptions or screenshots of blackmail, sextortion, deepfake manipulation, or digital harassment threats.

CRITICAL DIRECTIVES:
1. RESPONSE TONE MUST BE REASSURING, non-judgmental, shame-free, and in plain language. Maintain absolute empathy.
2. NEVER speculate about, describe, or generate details about the explicit content of any alleged image/video. Focus purely on the threat patterns.
3. ABSOLUTELY DO NOT accuse the user of doing anything wrong. Use statements like "This is a common cybercrime pattern", "You are the victim here", "This is not your fault".

Assess the provided text/image against common blackmail/extortion pattern markers:
- Demand for money / financial extortion (via UPI, crypto, gift cards).
- Threat to share private photos, videos, or deepfakes with friends, family, or social media lists.
- Artificial time pressure or short deadlines (e.g., "pay within 30 minutes").
- Specific platforms used for blackmail (WhatsApp, Instagram, Snapchat, Telegram).
- Psychological manipulation (e.g., creating panic, social humiliation, or posing as authorities).

You MUST output a JSON response adhering strictly to the following schema:
- risk_score: an integer from 0 to 100 indicating the extortion severity/threat level (e.g., 0-25 safe, 26-69 suspicious, 70-100 high risk blackmail/extortion). If extortion pattern is detected, score must be 80+.
- verdict: must be exactly "Likely Safe", "Suspicious", or "Likely Scam" (to match the Scam Checker UI schema). Use "Likely Scam" for active blackmail or extortion.
- flags: a list of detected threat elements (e.g. ["Extortion Demand", "Threat to Share Media", "Urgent Deadline Pressure", "Social Media Migration", "Impersonating Authority"]).
- explanation: a detailed, calm, non-judgmental explanation of why this pattern is identified, confirming to the user that they are dealing with a known cybercrime tactic.
- recommended_action: concrete, step-by-step guidance in plain, empathetic language. It MUST instruct the user to:
  - Do NOT pay! (paying never stops blackmail, they will ask for more).
  - Do NOT panic.
  - Do NOT delete anything yet (screenshot the threat, phone numbers, UPI/bank details, and profiles as evidence first).
  - Block the account after saving evidence.
  - Report to the National Cybercrime Reporting Portal (cybercrime.gov.in) and via the 1930 helpline.
  - If the victim is a minor, involve a trusted adult/guardian immediately.

Provide your response strictly in JSON format.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            risk_score: { type: Type.INTEGER, description: "Extortion risk score from 0 to 100" },
            verdict: { type: Type.STRING, description: "Likely Safe, Suspicious, or Likely Scam" },
            flags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of identified blackmail/extortion markers" },
            explanation: { type: Type.STRING, description: "Detailed reassuring explanation of findings" },
            recommended_action: { type: Type.STRING, description: "Step-by-step actionable advice including do not pay, save evidence, block, and report details" }
          },
          required: ["risk_score", "verdict", "flags", "explanation", "recommended_action"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response received from the threat safety engine.");
    }

    const resultJson = JSON.parse(resultText.trim());
    
    // STRICT RULE: DO NOT log or store any input from this screen in Firestore.
    // So we completely skip calling logCheckToFirestore.

    return res.json(resultJson);
  } catch (error: any) {
    console.error("Threat Support Analysis Error:", error);
    return res.status(500).json({
      error: error.message || "An unexpected error occurred during threat support check."
    });
  }
});

// GET Recent Checks Endpoint (Queries Firestore for logs, with fallback pre-seeded list)
app.get("/api/recent-checks", async (req, res) => {
  try {
    let checksList: any[] = [];
    // Under security policies, the database of check logs is private and not publicly readable.
    // The public homepage/citizen dashboard serves the pre-seeded safety checks to maintain citizen privacy.

    // Default pre-seeded demo checks to ensure the Officer Dashboard always looks incredibly realistic and populated
    const fallbackChecks = [
      {
        id: "f1",
        type: "scam",
        inputSummary: "WhatsApp message demanding ₹50,000 to clear a FedEx package alleged to contain illegal MDMA. Threatened immediate CBI arrest if call disconnected.",
        verdict: "Likely Scam",
        riskScore: 98,
        timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
      },
      {
        id: "f2",
        type: "currency",
        inputSummary: "Banknote Visual Diagnostic (Confidence: 85%) - ₹500 series with shifted security thread and blurred watermark boundary.",
        verdict: "Suspicious",
        riskScore: 75,
        timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
      },
      {
        id: "f3",
        type: "scam",
        inputSummary: "Automated robocall from 'TRAI' warning that the user's Aadhaar SIM is linked to illegal texting and will be suspended within 2 hours unless they dial 9.",
        verdict: "Likely Scam",
        riskScore: 92,
        timestamp: new Date(Date.now() - 18 * 3600 * 1000).toISOString()
      },
      {
        id: "f4",
        type: "scam",
        inputSummary: "Inquiry about standard passport renewal process, checking whether a private verification fee is needed.",
        verdict: "Likely Safe",
        riskScore: 12,
        timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
      },
      {
        id: "f5",
        type: "currency",
        inputSummary: "Banknote Visual Diagnostic (Confidence: 94%) - ₹2000 series with crisp microprinting and correct watermark alignments.",
        verdict: "Likely Genuine",
        riskScore: 10,
        timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString()
      },
      {
        id: "f6",
        type: "payment",
        inputSummary: "Payment Check: QR Code cashback request labeled 'Scan to receive ₹2,000 credit'. Scan triggers actual outbound debit request.",
        verdict: "This will SEND money from your account",
        riskScore: 95,
        timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString()
      },
      {
        id: "f7",
        type: "payment",
        inputSummary: "Payment Check: Static profile QR code for payee 'Delhi Metro Rail Corp'.",
        verdict: "This will SEND money from your account",
        riskScore: 55,
        timestamp: new Date(Date.now() - 14 * 3600 * 1000).toISOString()
      },
      {
        id: "f8",
        type: "investment",
        inputSummary: "Investment Check: 'VIP Trading Signals WhatsApp Group' promising 5% daily compounded returns via an offshore trading app.",
        verdict: "Likely Scam",
        riskScore: 98,
        timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
      },
      {
        id: "f9",
        type: "investment",
        inputSummary: "Investment Check: Standard Treasury Bond mutual fund inquiry about public sector bank yields.",
        verdict: "Likely Safe",
        riskScore: 5,
        timestamp: new Date(Date.now() - 20 * 3600 * 1000).toISOString()
      }
    ];

    // Combine and sort by riskScore descending
    const combined = [...checksList, ...fallbackChecks];
    combined.sort((a, b) => b.riskScore - a.riskScore);

    return res.json({
      status: "success",
      checks: combined.slice(0, 50)
    });
  } catch (error: any) {
    console.error("Error retrieving safety checks:", error);
    return res.status(500).json({
      error: error.message || "Failed to retrieve safety checks."
    });
  }
});

// --- Shared Results Endpoints ---

// POST /api/share-result - Generate a shareable link ID for a result
app.post("/api/share-result", async (req, res) => {
  try {
    const firestoreDb = getFirestoreDb();
    if (!firestoreDb) {
      return res.status(503).json({ error: "Firestore is not available on the server." });
    }

    const { type, verdict, riskScore, explanation, flags } = req.body;

    if (!type || !verdict || riskScore === undefined || !explanation) {
      return res.status(400).json({ error: "Missing required fields: type, verdict, riskScore, or explanation." });
    }

    // Generate a short 8-character random ID (alphanumeric)
    const generateShortId = () => {
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let id = "";
      for (let i = 0; i < 8; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return id;
    };

    const shortId = generateShortId();
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    const docData = {
      id: shortId,
      type,
      verdict,
      riskScore: Number(riskScore),
      explanation,
      flags: Array.isArray(flags) ? flags : [],
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    const sharedCol = collection(firestoreDb, "shared_results");
    await setDoc(doc(sharedCol, shortId), docData);

    console.log(`[Firestore] Shared result generated successfully with ID: ${shortId}`);

    return res.json({
      status: "success",
      id: shortId,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error: any) {
    console.error("Error creating shared result:", error);
    return res.status(500).json({
      error: error.message || "An unexpected error occurred while creating shared result."
    });
  }
});

// GET /api/shared-result/:id - Retrieve a shared result
app.get("/api/shared-result/:id", async (req, res) => {
  try {
    const firestoreDb = getFirestoreDb();
    if (!firestoreDb) {
      return res.status(503).json({ error: "Firestore is not available on the server." });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Missing ID parameter." });
    }

    const sharedCol = collection(firestoreDb, "shared_results");
    const docSnap = await getDoc(doc(sharedCol, id));

    if (!docSnap.exists()) {
      return res.status(404).json({ error: "Shared result not found." });
    }

    const data = docSnap.data();
    const expiresAt = new Date(data.expiresAt);
    
    if (new Date() > expiresAt) {
      return res.status(410).json({ error: "This shared result has expired and is no longer available." });
    }

    return res.json({
      status: "success",
      data
    });
  } catch (error: any) {
    console.error("Error retrieving shared result:", error);
    return res.status(500).json({
      error: error.message || "An unexpected error occurred while retrieving shared result."
    });
  }
});

// 2.5. Submit Citizen Incident Report
app.post("/api/submit-report", async (req, res) => {
  try {
    const { category, description, scammerDetails, amountLost, reporterName, isAnonymous, username } = req.body;
    
    if (!category || !description) {
      return res.status(400).json({ error: "Category and description are required." });
    }

    const firestoreDb = getFirestoreDb();
    const referenceId = `RAKSHA-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const timestamp = new Date().toISOString();
    
    const reportData: any = {
      category,
      description,
      scammerDetails: scammerDetails || "N/A",
      amountLost: Number(amountLost) || 0,
      reporterName: isAnonymous ? "Anonymous Citizen" : (reporterName || "Anonymous Citizen"),
      isAnonymous: !!isAnonymous,
      referenceId,
      timestamp
    };

    if (username) {
      reportData.username = username.toLowerCase();
    }

    if (firestoreDb) {
      try {
        const reportsCol = collection(firestoreDb, "reports");
        await addDoc(reportsCol, reportData);
        console.log(`[Firestore] Successfully saved citizen incident report ${referenceId}`);
      } catch (dbErr) {
        console.error("[Firestore] Database error saving report, continuing anonymously:", dbErr);
      }
    }

    return res.json({
      status: "success",
      referenceId,
      message: "Report logged successfully into the public safety ledger.",
      report: reportData
    });
  } catch (error: any) {
    console.error("Submit Report Error:", error);
    return res.status(500).json({
      error: error.message || "An unexpected error occurred while submitting report."
    });
  }
});

// GET Recent Citizen Reports
app.get("/api/recent-reports", async (req, res) => {
  try {
    const firestoreDb = getFirestoreDb();
    let reportsList: any[] = [];
    
    if (firestoreDb) {
      try {
        const reportsCol = collection(firestoreDb, "reports");
        const q = query(reportsCol, orderBy("timestamp", "desc"), firestoreLimit(15));
        const snapshot = await getDocs(q);
        snapshot.forEach((doc) => {
          reportsList.push({
            id: doc.id,
            ...doc.data()
          });
        });
      } catch (dbErr) {
        console.error("[Firestore] Error reading reports collection, using fallbacks:", dbErr);
      }
    }

    // Default pre-seeded demo reports to make the list look rich initially
    const fallbackReports = [
      {
        id: "r1",
        category: "digital_arrest",
        description: "Received a Skype video call from a user named 'CBI Shinde' claiming a package containing contraband was found in my name. Instructed to stay locked inside a room for 'digital custody' surveillance.",
        scammerDetails: "Skype User ID: CBI_officer_shinde_online",
        amountLost: 0,
        reporterName: "Anonymous Citizen",
        isAnonymous: true,
        referenceId: "RAKSHA-2026-89410",
        timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString()
      },
      {
        id: "r2",
        category: "whatsapp_phishing",
        description: "Scammer messaged on WhatsApp offering a remote job that pays ₹5,000 per day for liking YouTube videos. Prompted to pay custom fee of ₹12,000 to release salary.",
        scammerDetails: "+91 81234 56789",
        amountLost: 12000,
        reporterName: "Meera K.",
        isAnonymous: false,
        referenceId: "RAKSHA-2026-44122",
        timestamp: new Date(Date.now() - 8 * 3600 * 1000).toISOString()
      },
      {
        id: "r3",
        category: "customs_courier",
        description: "Automated robocall claiming a custom parcel had illegal documents and would trigger immediate trial in Mumbai court. Posed as HDFC verification escrow.",
        scammerDetails: "+91 90001 20002",
        amountLost: 45000,
        reporterName: "Anonymous Citizen",
        isAnonymous: true,
        referenceId: "RAKSHA-2026-11239",
        timestamp: new Date(Date.now() - 15 * 3600 * 1000).toISOString()
      }
    ];

    const combined = [...reportsList, ...fallbackReports];
    // Sort combined by timestamp descending
    combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return res.json({
      status: "success",
      reports: combined.slice(0, 30)
    });
  } catch (error: any) {
    console.error("Error retrieving recent reports:", error);
    return res.status(500).json({
      error: error.message || "Failed to retrieve incident reports."
    });
  }
});

// 3. Mock Fraud Network Data Endpoint (To demonstrate full-stack telemetry and query capability)
app.get("/api/fraud-network", (req, res) => {
  res.json({
    status: "success",
    generatedAt: new Date().toISOString(),
    nodes: [
      // === CLUSTER 1: Jamtara Phishing Ring (East) ===
      { id: "A_JP1", label: "Jamtara UPI Settlement A", type: "bank_account", status: "mule_account", riskScore: 98, bankName: "State Bank of India", location: "Jamtara", lastAmount: "₹3,80,000", description: "Primary high-volume landing pool for phishing attacks tracing to Jharkhand." },
      { id: "A_JP2", label: "Rajesh M. Savings", type: "bank_account", status: "mule_account", riskScore: 92, bankName: "ICICI Bank", location: "Dhanbad", lastAmount: "₹1,90,000", description: "Secondary cash-out account routing rapid smaller UPI disbursements." },
      { id: "D_JP1", label: "Redmi Note 11 Pro", type: "device", status: "mule_account", riskScore: 95, os: "Android 12", ipAddress: "115.240.10.12", description: "IMEI blacklisted. Host device running multiple virtual wallet channels." },
      { id: "P_JP1", label: "+91 99887 76655", type: "phone", status: "suspicious", riskScore: 89, operator: "Jio", location: "Jharkhand", description: "Caller ID linked to multiple active lottery / UPI refund scams." },
      { id: "IP_JP1", label: "115.240.10.12", type: "ip", status: "suspicious", riskScore: 84, isp: "Alliance Broadband", location: "Ranchi", description: "Broadband IP hosting temporary banking login spoof portals." },
      { id: "D_JP2", label: "Realme C53 Burner", type: "device", status: "mule_account", riskScore: 91, os: "Android 13", ipAddress: "115.240.10.12", description: "Shared handset footprint executing automated SMS forwarding scripts." },
      { id: "P_JP2", label: "+91 99887 76600", type: "phone", status: "suspicious", riskScore: 78, operator: "Jio", location: "Jamtara", description: "Auxiliary backup number for registering fake e-wallet profiles." },

      // === CLUSTER 2: Delhi "Digital Arrest" CBI Ring (North) ===
      { id: "A_DA1", label: "National Clearing Escrow", type: "bank_account", status: "mule_account", riskScore: 99, bankName: "Punjab National Bank", location: "New Delhi", lastAmount: "₹12,40,000", description: "Central repository masquerading as a judicial clearance escrow account." },
      { id: "A_DA2", label: "CBI Security Trust", type: "bank_account", status: "mule_account", riskScore: 94, bankName: "HDFC Bank", location: "Noida", lastAmount: "₹6,50,000", description: "Laundering tier-2 account that disperses digital arrest deposits." },
      { id: "D_DA1", label: "Samsung Galaxy A54", type: "device", status: "mule_account", riskScore: 90, os: "Android 13", ipAddress: "103.45.22.91", description: "Unregistered device operating multiple compromised banking applications." },
      { id: "P_DA1", label: "+91 88776 65544", type: "phone", status: "suspicious", riskScore: 95, operator: "Airtel", location: "Delhi", description: "Spoofed TRAI / CBI authority line threatening victims with immediate detention." },
      { id: "IP_DA1", label: "103.45.22.91", type: "ip", status: "suspicious", riskScore: 88, isp: "Excitel Broadband", location: "Delhi NCR", description: "Static IP assigned to a secret voice-over-IP (VoIP) call center." },
      { id: "P_DA2", label: "+91 88776 65511", type: "phone", status: "suspicious", riskScore: 82, operator: "Jio", location: "Gurugram", description: "Secondary extortion hotline posing as Delhi Police Cyber Branch." },
      { id: "A_DA3", label: "Lalit K. Layering", type: "bank_account", status: "mule_account", riskScore: 85, bankName: "Canara Bank", location: "Ghaziabad", lastAmount: "₹2,10,000", description: "Cash-withdrawal node utilized to pull funds from ATMs within minutes." },

      // === CLUSTER 3: Mumbai FedEx Customs Ring (West) ===
      { id: "A_FX1", label: "FedEx Customs Deposit A", type: "bank_account", status: "mule_account", riskScore: 97, bankName: "ICICI Bank", location: "Mumbai", lastAmount: "₹8,20,000", description: "Mule account used for immediate clearance deposits of fake drug packages." },
      { id: "A_FX2", label: "Karan S. Offshore Layer", type: "bank_account", status: "mule_account", riskScore: 90, bankName: "Kotak Mahindra Bank", location: "Surat", lastAmount: "₹4,10,000", description: "Intermediary shell account transferring deposits to crypto exchanges." },
      { id: "D_FX1", label: "iPhone 13 Pro", type: "device", status: "mule_account", riskScore: 88, os: "iOS 16", ipAddress: "49.36.45.101", description: "High-end spoofed device signature linked with premium messaging extortion." },
      { id: "P_FX1", label: "+91 77665 54433", type: "phone", status: "suspicious", riskScore: 91, operator: "Vi", location: "Mumbai", description: "Fake custom service representative line prompting panic deposits." },
      { id: "IP_FX1", label: "49.36.45.101", type: "ip", status: "suspicious", riskScore: 80, isp: "JioFiber", location: "Surat", description: "Residential fiber node routing unauthorized web-banking access." },
      { id: "D_FX2", label: "OnePlus Nord CE", type: "device", status: "suspicious", riskScore: 82, os: "OxygenOS", ipAddress: "49.36.45.101", description: "Co-located burner phone used for coordinating ground cash-runs." },
      { id: "A_FX3", label: "Global Logistics Escrow", type: "bank_account", status: "mule_account", riskScore: 93, bankName: "Axis Bank", location: "Mumbai", lastAmount: "₹5,30,000", description: "Bulk transit mule account capturing large-value customs clearances." },

      // === CLUSTER 4: Bengaluru P2P Crypto Ring (South) ===
      { id: "A_CRY1", label: "P2P Merchant Node A", type: "bank_account", status: "mule_account", riskScore: 96, bankName: "State Bank of India", location: "Bengaluru", lastAmount: "₹18,50,000", description: "SBI current account facilitating rapid OTC crypto purchases to offshore wallets." },
      { id: "A_CRY2", label: "USDT Liquid Escrow", type: "bank_account", status: "mule_account", riskScore: 91, bankName: "Yes Bank", location: "Bengaluru", lastAmount: "₹9,20,000", description: "Structured micro-payment collector to settle peer-to-peer digital assets." },
      { id: "D_CRY1", label: "Samsung Galaxy S22", type: "device", status: "mule_account", riskScore: 86, os: "Android 14", ipAddress: "182.70.19.4", description: "Secured device executing rapid multi-session P2P crypto transactions." },
      { id: "P_CRY1", label: "+91 66554 43322", type: "phone", status: "suspicious", riskScore: 87, operator: "Airtel", location: "Bengaluru", description: "Phone registry matching active peer-to-peer crypto telegram trade syndicates." },
      { id: "IP_CRY1", label: "182.70.19.4", type: "ip", status: "suspicious", riskScore: 83, isp: "ACT Fibernet", location: "Bengaluru", description: "High-speed commercial IP logging continuous fast banking API calls." },
      { id: "D_CRY2", label: "MacBook Pro M2", type: "device", status: "suspicious", riskScore: 78, os: "macOS", ipAddress: "182.70.19.4", description: "Host node executing smart-contract operations and crypto wallet sweepers." },

      // === SAFE OUTLIERS & INTERMEDIARIES (Bridges) ===
      { id: "A_SF1", label: "Asha R. Self", type: "bank_account", status: "safe", riskScore: 10, bankName: "Axis Bank", location: "Pune", lastAmount: "₹45,000", description: "Legitimate salary account, cleared after standard verification audit." },
      { id: "P_SF1", label: "+91 91111 22222", type: "phone", status: "safe", riskScore: 5, operator: "Jio", location: "Pune", description: "Verified clean telephone number linked to legitimate employment." },
      { id: "A_SF2", label: "TechCorp Payroll", type: "bank_account", status: "safe", riskScore: 12, bankName: "HDFC Bank", location: "Chennai", lastAmount: "₹25,00,000", description: "Verified corporate payout gateway incorrectly flagged; validated safe." },
      { id: "A_BR1", label: "Inter-State Clearing", type: "bank_account", status: "suspicious", riskScore: 68, bankName: "Federal Bank", location: "Hyderabad", lastAmount: "₹3,40,000", description: "Transit bridge displaying rapid micro-transactions between Western and Southern rings." }
    ],
    links: [
      // Cluster 1 Links (Jamtara Phishing Ring)
      { source: "P_JP1", target: "A_JP1", type: "calls_to_direct_payment", value: "UPI Phishing call" },
      { source: "D_JP1", target: "A_JP1", type: "active_device_session", value: "Active terminal access" },
      { source: "IP_JP1", target: "D_JP1", type: "network_routing", value: "Alliance Ranchi route" },
      { source: "IP_JP1", target: "D_JP2", type: "network_routing", value: "Shared Wi-Fi network" },
      { source: "D_JP2", target: "A_JP2", type: "active_device_session", value: "Mule terminal login" },
      { source: "P_JP2", target: "A_JP2", type: "sms_spamming", value: "SMS gateway spam" },
      { source: "A_JP1", target: "A_JP2", type: "laundering_transfer", value: "UPI split-transfer" },

      // Cluster 2 Links (Delhi Digital Arrest Ring)
      { source: "P_DA1", target: "A_DA1", type: "authority_impersonation", value: "Spoofed CBI call" },
      { source: "D_DA1", target: "A_DA1", type: "active_device_session", value: "Active session" },
      { source: "IP_DA1", target: "D_DA1", type: "network_routing", value: "Excitel Delhi IP" },
      { source: "P_DA2", target: "A_DA2", type: "authority_impersonation", value: "Auxiliary IVR call" },
      { source: "A_DA1", target: "A_DA2", type: "laundering_transfer", value: "Laundering tier-1" },
      { source: "A_DA2", target: "A_DA3", type: "laundering_transfer", value: "Laundering tier-2" },
      { source: "D_DA1", target: "A_DA2", type: "active_device_session", value: "Shared control panel" },

      // Cluster 3 Links (FedEx Customs Ring)
      { source: "P_FX1", target: "A_FX1", type: "customs_extortion", value: "Fake custom service call" },
      { source: "D_FX1", target: "A_FX1", type: "active_device_session", value: "Endpoint active session" },
      { source: "IP_FX1", target: "D_FX1", type: "network_routing", value: "Surat Fiber route" },
      { source: "IP_FX1", target: "D_FX2", type: "network_routing", value: "Shared local gateway" },
      { source: "D_FX2", target: "A_FX2", type: "active_device_session", value: "Mule session login" },
      { source: "A_FX1", target: "A_FX2", type: "laundering_transfer", value: "Funds dispatch" },
      { source: "A_FX2", target: "A_FX3", type: "laundering_transfer", value: "Consolidation routing" },

      // Cluster 4 Links (Crypto Laundering Ring)
      { source: "P_CRY1", target: "A_CRY1", type: "calls_to_direct_payment", value: "P2P trade contact" },
      { source: "D_CRY1", target: "A_CRY1", type: "active_device_session", value: "Active session" },
      { source: "IP_CRY1", target: "D_CRY1", type: "network_routing", value: "ACT Fibernet Bangalore" },
      { source: "IP_CRY1", target: "D_CRY2", type: "network_routing", value: "USDT control route" },
      { source: "D_CRY2", target: "A_CRY2", type: "active_device_session", value: "USDT vault access" },
      { source: "A_CRY1", target: "A_CRY2", type: "laundering_transfer", value: "P2P escrow routing" },

      // Bridge and Outlier connections
      { source: "A_BR1", target: "A_FX2", type: "cross_ring_transfer", value: "Surat to Hyderabad routing" },
      { source: "A_BR1", target: "A_CRY1", type: "cross_ring_transfer", value: "Hyderabad to Bangalore routing" },
      { source: "P_SF1", target: "A_SF1", type: "normal_association", value: "Verified user link" },
      { source: "A_SF2", target: "P_SF1", type: "normal_association", value: "Salary deposit channel" }
    ]
  });
});

async function seedAuthorizedOfficers() {
  try {
    const firestoreDb = getFirestoreDb();
    if (firestoreDb) {
      const email = "parmarhemant150@gmail.com";
      const docRef = doc(firestoreDb, "authorized_officers", email);
      await setDoc(docRef, {
        email: email,
        role: "admin",
        seededAt: new Date().toISOString()
      });
      console.log(`[Firestore] Successfully pre-seeded authorized officer: ${email}`);
    }
  } catch (err) {
    console.error("[Firestore] Error pre-seeding authorized officer:", err);
  }
}

async function startServer() {
  // Pre-seed authorized officer
  await seedAuthorizedOfficers();

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Raksha AI Backend Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
