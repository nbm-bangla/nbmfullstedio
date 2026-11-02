import express, { Request, Response } from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

function resolvePort(): number {
  const portArgIndex = process.argv.indexOf("--port");
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    return parseInt(process.argv[portArgIndex + 1], 10);
  }
  const configuredPort = Number.parseInt(process.env.PORT || "3000", 10);
  return Number.isInteger(configuredPort) && configuredPort > 0 && configuredPort <= 65535 ? configuredPort : 3000;
}

const PORT = resolvePort();
const isProduction = process.env.NODE_ENV === "production" || process.argv.includes("--production");

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Per-process guard for accidental loops and basic anonymous API abuse.
const apiRequestBuckets = new Map<string, { count: number; resetAt: number }>();
const apiRequestsPerMinute = Math.max(1, Number.parseInt(process.env.AI_API_RATE_LIMIT_PER_MINUTE || "30", 10) || 30);
app.use(["/api/gemini", "/api/tts"], (req: Request, res: Response, next) => {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const bucket = apiRequestBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    apiRequestBuckets.set(key, { count: 1, resetAt: now + 60_000 });
    next();
    return;
  }
  if (bucket.count >= apiRequestsPerMinute) {
    res.status(429).json({ error: "AI request limit reached. Wait a minute and try again." });
    return;
  }
  bucket.count += 1;
  next();
});

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") return null;
  return new GoogleGenAI({
    apiKey,
  });
};

// Check backend status & configured API keys
app.get("/api/status", (_req: Request, res: Response) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  res.json({
    hasApiKey: Boolean(apiKey && apiKey !== "MY_GEMINI_API_KEY"),
    provider: "Google Gemini API (optional server configuration)",
    supportedFeatures: [
      "Multimodal Scanned & Native PDF OCR (gemini-3.8-flash)",
      "Literary Multilingual Translation (gemini-3.8-flash)",
      "High-fidelity Text to Speech (gemini-3.8-flash-lite-tts)",
      "Audio Transcription (gemini-3.5-transcribe)",
      "Editorial Book Review Generation (gemini-3.8-flash)",
      "Local Web Audio DSP & Waveform Generation",
      "Local Canvas Video & Thumbnail Synthesizer",
    ],
  });
});

// PDF / Scanned Image Page OCR with Special Support for Urdu Nastaliq, Bengali & World Languages
app.post("/api/gemini/ocr", async (req: Request, res: Response): Promise<void> => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: "GEMINI_API_KEY is not configured in environment secrets. Please configure it in Settings.",
      });
      return;
    }

    const {
      imageBase64,
      mimeType = "image/png",
      scriptHint = "Auto-Detect (Urdu, Bengali, Arabic, English...)",
      readingOrder = "standard",
    } = req.body;

    if (!imageBase64) {
      res.status(400).json({ error: "Missing imageBase64 in request body." });
      return;
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

    const isUrduRequested =
      typeof scriptHint === "string" &&
      (scriptHint.toLowerCase().includes("urdu") ||
        scriptHint.includes("اردو") ||
        scriptHint.toLowerCase().includes("arabic") ||
        scriptHint.toLowerCase().includes("auto"));

    const systemPrompt = `You are a world-class literary archivist, paleographer, and high-precision OCR specialist for historical books, manuscripts, and modern publications.
Specified Script Hint: ${scriptHint}.
Specified Reading Order: ${readingOrder}.

CORE DIRECTIVES FOR HIGH-PRECISION OCR:
1. SPECIALIZED URDU & NASTALIQ SCRIPT RECOGNITION:
   - Deeply recognize Urdu (اردو), Nastaliq calligraphy (خطِ نستعلیق), Naskh (نسخ), Arabic, and Persian (فارسی).
   - Recognize ALL Urdu-specific characters with 100% precision: ٹ, ڈ, ڑ, ں, ے, ہ, ھ, ژ, چ, پ, ۂ, ء, etc.
   - Accurately preserve Nuqtas (dots/نقطے), Tashdeed (تشدید), Tanween, Hamza, Zer, Zabar, Pesh, and punctuation (۔ ، ؟ !).
   - For Urdu poetry (Ghazal / غزل, Nazm / نظم, Marsiya / مرثیہ, Rubai / رباعی, Sher / شعر), maintain two-hemistich couplet formatting (مصرعِ اولیٰ ও مصرعِ ثانی) and stanza breaks.
   - When Urdu, Persian, or Arabic is present, read naturally from right-to-left and set readingDirection to "rtl".

2. BENGALI & DEVANAGARI RECOGNITION:
   - Accurately transcribe all Bengali conjuncts (যুক্তাক্ষর যেমন: ক্ষ, জ্ঞ, ঞ্চ, ঞ্জ, হ্ম, ণ্ড, ষ্ণ), Matras, Hasanta, and classical punctuation (দাঁড়ি ।).

3. ZERO-FABRICATION & ANTI-HALLUCINATION:
   - Extract ALL visible text verbatim without altering spellings, vocabulary, or archaisms.
   - Do NOT extrapolate, imagine, or fabricate text that is not visible on the page.
   - If a word is torn, faded, blotted, or illegible, represent it with [?] at that exact word position.

4. OUTPUT JSON SCHEMA (Must be valid JSON):
{
  "extractedText": "full verbatim extracted text in the original language/script (Urdu, Bengali, English, etc.)",
  "detectedLanguage": "Urdu / Bengali / English / Arabic / etc.",
  "scriptType": "Nastaliq / Bengali Unicode / Latin / etc.",
  "readingDirection": "rtl" or "ltr",
  "confidenceScore": 0.95,
  "hasUnreadableRegions": false,
  "unreadableNotes": "explanation if any torn or faded area",
  "suspiciousWords": ["unclear[?]"],
  "paragraphCount": 4,
  "layoutType": "prose / poetry / multi-column"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType,
            },
          },
          {
            text: systemPrompt,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
      },
    });

    const raw = response.text || "{}";
    try {
      const parsed = JSON.parse(raw);
      // Auto-detect RTL if Urdu / Arabic characters dominate
      const isUrduChars = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(parsed.extractedText || "");
      if (isUrduChars && (!parsed.readingDirection || parsed.readingDirection !== "rtl")) {
        parsed.readingDirection = "rtl";
      }
      res.json(parsed);
    } catch {
      const isUrduChars = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(raw);
      res.json({
        extractedText: raw,
        detectedLanguage: isUrduChars ? "Urdu" : scriptHint,
        readingDirection: isUrduChars ? "rtl" : "ltr",
        confidenceScore: 0.9,
        hasUnreadableRegions: false,
        paragraphCount: 1,
        layoutType: "prose",
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("OCR API error:", message);
    res.status(500).json({ error: message });
  }
});

// Direct PDF Document OCR (accepts raw PDF base64 directly using Gemini 3.8 Flash native PDF vision)
app.post("/api/gemini/ocr-pdf", async (req: Request, res: Response): Promise<void> => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: "GEMINI_API_KEY is not configured in environment secrets.",
      });
      return;
    }

    const {
      pdfBase64,
      scriptHint = "Auto-Detect (Urdu, Bengali, Arabic, English...)",
      readingOrder = "standard",
    } = req.body;

    if (!pdfBase64) {
      res.status(400).json({ error: "Missing pdfBase64 in request body." });
      return;
    }

    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");

    const prompt = `You are a high-fidelity literary archivist and document extraction specialist.
Target Script / Language Context: ${scriptHint}.
Reading order directive: ${readingOrder}.

Carefully extract the complete manuscript text from this PDF document.
- Fully recognize Urdu (اردو), Nastaliq calligraphy, Bengali, Arabic, and English.
- Transcribe poetry couplets (اشعار / غزل) and dialogue with authentic lineation.
- Return strictly valid JSON:
{
  "extractedText": "full verbatim extracted text of the document",
  "detectedLanguage": "Urdu / Bengali / English / etc.",
  "readingDirection": "rtl" or "ltr",
  "pageBreakMarks": ["Page 1 text...", "Page 2 text..."],
  "confidenceScore": 0.95
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: "application/pdf",
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
      },
    });

    const raw = response.text || "{}";
    try {
      const parsed = JSON.parse(raw);
      res.json(parsed);
    } catch {
      res.json({
        extractedText: raw,
        detectedLanguage: /[\u0600-\u06FF]/.test(raw) ? "Urdu" : scriptHint,
        readingDirection: /[\u0600-\u06FF]/.test(raw) ? "rtl" : "ltr",
        confidenceScore: 0.9,
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("PDF Direct OCR API error:", message);
    res.status(500).json({ error: message });
  }
});

// Server-side in-memory translation cache to avoid redundant API charges ($0 cost for repeat chunks)
const translationServerCache = new Map<string, any>();

// Translation Endpoint with caching & token estimation
app.post("/api/gemini/translate", async (req: Request, res: Response): Promise<void> => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: "GEMINI_API_KEY is not configured in environment secrets.",
      });
      return;
    }

    const {
      text,
      sourceLang = "auto",
      targetLang = "Bengali",
      mode = "Natural Literary",
      glossary = {},
      chapterTitle = "",
    } = req.body;

    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Missing text string for translation." });
      return;
    }

    // Cache lookup key
    const cacheKey = `${sourceLang.trim().toLowerCase()}::${targetLang.trim().toLowerCase()}::${mode}::${JSON.stringify(glossary)}::${text.trim()}`;
    if (translationServerCache.has(cacheKey)) {
      const cachedResult = translationServerCache.get(cacheKey);
      res.json({
        ...cachedResult,
        cached: true,
        costSavedUsd: cachedResult.estimatedCostUsd || 0.0001,
        source: "server_cache",
      });
      return;
    }

    const glossaryInstruction = Object.keys(glossary).length > 0
      ? `Glossary of terms & character names to strictly adhere to: ${JSON.stringify(glossary)}.`
      : "";

    const systemPrompt = `You are a master literary translator specializing in world literature.
Source Language: ${sourceLang}
Target Language: ${targetLang}
Translation Mode: ${mode} (Options: Faithful/Literal, Natural Literary, Natural Standard, Easy-to-Read, Side-by-Side).
Chapter Context: ${chapterTitle || "General manuscript text"}
${glossaryInstruction}

Directives:
1. Preserve every paragraph, dialogue, heading, quotation, and nuance.
2. CRITICAL ANTI-OMISSION: Do NOT condense, omit, or abbreviate any text. The user forbids shortening literature without explicit permission.
3. Match the literary cadence, emotional weight, and period tone of the original masterpiece.
4. Count the number of source paragraphs and target paragraphs to ensure no paragraph was dropped.
5. Provide the output in JSON format conforming strictly to this schema:
{
  "translatedText": "the complete translated literary text",
  "sourceParagraphCount": 3,
  "targetParagraphCount": 3,
  "terminologyUsed": ["notable translations of names or idioms"],
  "notes": "any relevant translator remark"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `${systemPrompt}\n\n==============================\nMANUSCRIPT TO TRANSLATE:\n${text}`,
      config: {
        responseMimeType: "application/json",
      },
    });

    const raw = response.text || "{}";
    let resultPayload: any;
    try {
      resultPayload = JSON.parse(raw);
    } catch {
      resultPayload = {
        translatedText: raw,
        sourceParagraphCount: text.split("\n\n").filter(Boolean).length,
        targetParagraphCount: raw.split("\n\n").filter(Boolean).length,
        notes: "Parsed text output",
      };
    }

    const inputTokens = Math.ceil(text.length / 3.8);
    const outputTokens = Math.ceil((resultPayload.translatedText?.length || text.length) / 3.8);
    // Gemini 3.8 Flash pricing: ~$0.075 / 1M input tokens, ~$0.30 / 1M output tokens
    const estimatedCostUsd = Number(((inputTokens * 0.075 + outputTokens * 0.30) / 1000000).toFixed(6));

    const finalResult = {
      ...resultPayload,
      cached: false,
      inputTokens,
      outputTokens,
      estimatedCostUsd,
    };

    // Store in cache (limit to 1000 entries)
    if (translationServerCache.size > 1000) {
      const firstKey = translationServerCache.keys().next().value;
      if (firstKey) translationServerCache.delete(firstKey);
    }
    translationServerCache.set(cacheKey, finalResult);

    res.json(finalResult);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Translate API error:", message);
    res.status(500).json({ error: message });
  }
});

// Server-side in-memory TTS cache to eliminate repeat API charges ($0 cost for identical chunks)
const ttsServerCache = new Map<string, any>();

// Text-to-Speech Endpoint (gemini-3.8-flash-tts & gemini-3.8-flash-lite-tts unary returns complete WAV)
const handleTtsRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: "GEMINI_API_KEY is not configured in backend environment.",
        code: "AUTH_CONFIG_MISSING",
      });
      return;
    }

    const {
      text,
      voiceName = "Fenrir",
      style = "Clear, resonant literary narration",
      speed = 1.0,
      model = "gemini-3.8-flash-tts",
      language = "Bengali",
    } = req.body;

    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Missing text for speech generation.", code: "INVALID_REQUEST" });
      return;
    }

    // Supported voices: 'Fenrir', 'Kore', 'Zephyr', 'Puck', 'Charon'
    const allowedVoices = ["Fenrir", "Kore", "Zephyr", "Puck", "Charon"];
    const selectedVoice = allowedVoices.includes(voiceName) ? voiceName : "Fenrir";

    // Supported TTS models: 'gemini-3.8-flash-tts' and 'gemini-3.8-flash-lite-tts'
    const allowedModels = ["gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts"];
    const selectedModel = allowedModels.includes(model) ? model : "gemini-3.8-flash-tts";
    const selectedLang = typeof language === "string" && language.trim() ? language.trim() : "Bengali";

    // Check server cache
    const cacheKey = `${selectedModel}::${selectedVoice}::${selectedLang.toLowerCase()}::${style.trim()}::${Number(speed).toFixed(2)}::${text.trim()}`;
    if (ttsServerCache.has(cacheKey)) {
      const cached = ttsServerCache.get(cacheKey);
      res.json({
        ...cached,
        cached: true,
        costSavedUsd: cached.estimatedCostUsd || 0.0002,
        source: "server_cache",
      });
      return;
    }

    // Clean text of bracketed stage/soundscape cues (e.g. [বাঁশির সুর]) so narrator reads pure verbatim text
    const cleanSpeechText = text
      .replace(/\[.*?\]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanSpeechText) {
      // Chunk only had stage direction brackets - return 0.3s clean silent WAV so audio decoders never crash
      const sampleRate = 24000;
      const numSamples = Math.floor(sampleRate * 0.3);
      const dataSize = numSamples * 2;
      const buffer = Buffer.alloc(44 + dataSize);
      buffer.write("RIFF", 0);
      buffer.writeUInt32LE(36 + dataSize, 4);
      buffer.write("WAVE", 8);
      buffer.write("fmt ", 12);
      buffer.writeUInt32LE(16, 16);
      buffer.writeUInt16LE(1, 20); // PCM
      buffer.writeUInt16LE(1, 22); // mono
      buffer.writeUInt32LE(sampleRate, 24);
      buffer.writeUInt32LE(sampleRate * 2, 28);
      buffer.writeUInt16LE(2, 32);
      buffer.writeUInt16LE(16, 34);
      buffer.write("data", 36);
      buffer.writeUInt32LE(dataSize, 40);
      const silentBase64 = buffer.toString("base64");
      res.json({
        audioBase64: silentBase64,
        mimeType: "audio/wav",
        voiceUsed: selectedVoice,
        modelUsed: selectedModel,
        language: selectedLang,
        durationSeconds: 0.3,
        byteLength: buffer.length,
        inputChars: 0,
        estimatedCostUsd: 0,
        cached: false,
        isSkippedCue: true,
      });
      return;
    }

    // Condition speech style with language authentic pronunciation instructions
    const promptStyle = selectedLang && selectedLang !== "Auto"
      ? `${style}. Authentic literary pronunciation in ${selectedLang}. Speak verbatim word for word.`
      : `${style}. Speak verbatim word for word.`;

    const modelsToTry = [selectedModel];
    if (selectedModel !== "gemini-3.8-flash-lite-tts") {
      modelsToTry.push("gemini-3.8-flash-lite-tts");
    }

    let base64Audio: string | null = null;
    let usedModel = selectedModel;
    let lastError: any = null;

    for (const currentModel of modelsToTry) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": process.env.GEMINI_API_KEY!,
            },
            body: JSON.stringify({
              model: currentModel,
              input: [{
                type: "user_input",
                content: [{
                  type: "text",
                  text: cleanSpeechText,
                  annotations: [{ type: "speech_metadata", style: promptStyle }],
                }],
              }],
              response_format: { type: "audio" },
              generation_config: { speech_config: [{ voice: selectedVoice }] },
            }),
          });
          const responseBody = await response.json() as any;
          if (!response.ok) throw new Error(responseBody?.error?.message || `TTS API returned HTTP ${response.status}`);
          base64Audio = responseBody?.output_audio?.data
            || responseBody?.steps?.flatMap((step: any) => step?.content || []).find((part: any) => part?.type === "audio")?.data
            || null;
          if (base64Audio) {
            usedModel = currentModel;
            break;
          }
        } catch (err: any) {
          lastError = err;
          const status = err?.status || err?.code;
          const isRateLimit =
            status === 429 ||
            status === "RATE_LIMIT_EXCEEDED" ||
            (err?.message && (err.message.includes("429") || err.message.includes("quota")));
          if (isRateLimit && attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
            continue;
          }
          break; // break retry loop to try fallback model
        }
      }
      if (base64Audio) break;
    }

    if (!base64Audio) {
      const errMsg = lastError?.message || "No audio data was returned by the voice model.";
      const isQuota = lastError?.status === 429 || (errMsg && errMsg.includes("quota"));
      res.status(isQuota ? 429 : 500).json({
        error: isQuota
          ? "Google Gemini API সাময়িক রেট লিমিট বা কোটা সীমা ছুঁয়েছে। অনুগ্রহ করে কিছুক্ষণ পর চেষ্টা করুন।"
          : errMsg,
        code: isQuota ? "RATE_LIMIT_EXCEEDED" : "TTS_FAILED",
      });
      return;
    }

    const buffer = Buffer.from(base64Audio, "base64");
    const byteLength = buffer.length;
    // Unary WAV: 24kHz, 16-bit mono = 48,000 bytes/sec
    const durationSeconds = Math.max(0.5, Number(((byteLength - 44) / 48000).toFixed(2)));
    const inputChars = cleanSpeechText.length;

    // Pricing estimation:
    const costPer1k = usedModel === "gemini-3.8-flash-tts" ? 0.0015 : 0.0005;
    const estimatedCostUsd = Number(((inputChars / 1000) * costPer1k).toFixed(6));

    const resultPayload = {
      audioBase64: base64Audio,
      mimeType: "audio/wav",
      voiceUsed: selectedVoice,
      modelUsed: usedModel,
      language: selectedLang,
      durationSeconds,
      byteLength,
      inputChars,
      cached: false,
    };

    if (ttsServerCache.size > 500) {
      const firstKey = ttsServerCache.keys().next().value;
      if (firstKey) ttsServerCache.delete(firstKey);
    }
    ttsServerCache.set(cacheKey, resultPayload);

    res.json(resultPayload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("TTS API error:", message);

    if (message.includes("RESOURCE_EXHAUSTED") || message.includes("429") || message.toLowerCase().includes("quota")) {
      res.status(429).json({
        error: "Google Gemini API rate limit or quota exceeded. Please wait a moment before trying again.",
        code: "RATE_LIMIT_EXCEEDED",
      });
      return;
    }
    if (message.includes("PERMISSION_DENIED") || message.includes("401") || message.includes("403") || message.includes("API_KEY_INVALID")) {
      res.status(403).json({
        error: "Invalid API key or authentication error. Please verify GEMINI_API_KEY in environment secrets.",
        code: "AUTH_ERROR",
      });
      return;
    }
    if (message.includes("503") || message.includes("UNAVAILABLE") || message.includes("DEADLINE_EXCEEDED")) {
      res.status(503).json({
        error: "Gemini TTS service is temporarily unavailable. Transient network error.",
        code: "SERVICE_UNAVAILABLE",
      });
      return;
    }

    res.status(500).json({ error: message, code: "INTERNAL_ERROR" });
  }
};

app.post("/api/gemini/tts", handleTtsRequest);
app.post("/api/tts", handleTtsRequest);

// Server-side in-memory transcription cache
const transcribeServerCache = new Map<string, any>();

// Audio Transcription Endpoint
app.post("/api/gemini/transcribe", async (req: Request, res: Response): Promise<void> => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({ error: "GEMINI_API_KEY is not configured." });
      return;
    }

    const { audioBase64, mimeType = "audio/mp3", languageHint = "Bengali & English" } = req.body;
    if (!audioBase64) {
      res.status(400).json({ error: "Missing audioBase64." });
      return;
    }

    const cleanBase64 = audioBase64.replace(/^data:audio\/[a-z0-9]+;base64,/, "");
    if (typeof cleanBase64 !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)) {
      res.status(400).json({ error: "Audio must be valid base64 data." });
      return;
    }
    if (!/^audio\/(mpeg|mp3|wav|webm|ogg|mp4|aac|flac|m4a|x-wav)$/.test(mimeType)) {
      res.status(415).json({ error: `Unsupported audio type: ${mimeType}` });
      return;
    }
    const audioBuffer = Buffer.from(cleanBase64, "base64");
    if (!audioBuffer.length || audioBuffer.length > 35 * 1024 * 1024) {
      res.status(413).json({ error: "Audio must be between 1 byte and 35 MB." });
      return;
    }

    // Check server cache
    const cacheKey = `${languageHint}::${cleanBase64.length}::${cleanBase64.slice(0, 300)}`;
    if (transcribeServerCache.has(cacheKey)) {
      const cached = transcribeServerCache.get(cacheKey);
      res.json({
        ...cached,
        cached: true,
        costSavedUsd: 0.003,
        source: "server_cache",
      });
      return;
    }

    const genai = ai as any;
    const extension = mimeType.split("/")[1]?.replace("x-", "") || "audio";
    const uploaded = await genai.files.upload({
      file: new File([audioBuffer], `recording.${extension}`, { type: mimeType }),
      config: { mime_type: mimeType },
    });
    const interaction = await genai.interactions.create({
      model: "gemini-3.5-transcribe",
      input: [{ type: "audio", uri: uploaded.uri, mime_type: uploaded.mimeType || mimeType }],
      generation_config: { transcription_config: { mode: "verbatim" } },
    });
    const raw = interaction.output_text || "";
    const parsedResult = { transcript: raw, detectedLanguage: languageHint };

    const resultPayload = {
      ...parsedResult,
      cached: false,
    };

    if (transcribeServerCache.size > 500) {
      const firstKey = transcribeServerCache.keys().next().value;
      if (firstKey) transcribeServerCache.delete(firstKey);
    }
    transcribeServerCache.set(cacheKey, resultPayload);

    res.json(resultPayload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Transcribe API error:", message);
    res.status(500).json({ error: message });
  }
});

// Editorial Book Review Generator (draft status enforced)
app.post("/api/gemini/review", async (req: Request, res: Response): Promise<void> => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({ error: "GEMINI_API_KEY is not configured." });
      return;
    }

    const { bookTitle, author, genre, synopsis, language = "bn" } = req.body;
    if (!bookTitle) {
      res.status(400).json({ error: "Missing bookTitle." });
      return;
    }

    const isBengali = language === "bn" || language === "Bengali";

    const prompt = `You are a distinguished literary critic and scholarly editor writing for a prestigious publication like The Paris Review or আনন্দবাজার পত্রিকা / দেশ পত্রিকা.
Produce a thorough, discerning editorial book review for:
Title: "${bookTitle}"
Author: "${author || "Unknown"}"
Genre: "${genre || "World Literature"}"
Synopsis / Context: "${synopsis || "Classic / Masterpiece"}"
Output Language: ${isBengali ? "Bengali (বাংলা সাহিত্যিক মান)" : "English"}

Return a JSON object conforming strictly to this structure:
{
  "bookTitle": "${bookTitle}",
  "author": "${author || "Unknown"}",
  "genre": "${genre || "World Literature"}",
  "spoilerFreeOverview": "concise, engaging preview suitable for readers deciding whether to begin",
  "literaryAnalysis": "deep analysis of style, thematic underpinnings, pacing, and philosophical questions",
  "strengths": ["point 1", "point 2", "point 3"],
  "weaknessesOrCaveats": ["point 1", "point 2"],
  "audienceSuitability": "who will most appreciate this book",
  "discussionQuestions": ["thought-provoking question 1", "question 2", "question 3"],
  "socialMediaPost": "Punchy 280-char engaging blurb with hashtags",
  "shortReview": "1-paragraph recommendation",
  "isDraft": true,
  "requiresUserApproval": true
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Review API error:", message);
    res.status(500).json({ error: message });
  }
});

// Mount Vite middleware in development or serve static in production
async function startServer() {
  if (!isProduction) {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NBM Audio & Book Studio server active at http://0.0.0.0:${PORT}`);
  });
}

startServer();
