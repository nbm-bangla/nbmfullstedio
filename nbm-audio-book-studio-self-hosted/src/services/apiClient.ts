/**
 * Client adapter for NBM Studio server API routes.
 * Securely calls backend endpoints without exposing API keys to browser.
 */

export interface ApiStatusResponse {
  hasApiKey: boolean;
  provider: string;
  supportedFeatures: string[];
}

export async function checkBackendStatus(): Promise<ApiStatusResponse> {
  try {
    const res = await fetch("/api/status");
    if (!res.ok) throw new Error("Status check failed");
    return await res.json();
  } catch {
    return {
      hasApiKey: false,
      provider: "Offline / Local Only Mode",
      supportedFeatures: ["Local Audio DSP", "Local Canvas Video & Cover", "Local File Parsing"],
    };
  }
}

export async function callGeminiOCR(
  imageBase64: string,
  scriptHint: string = "Auto-Detect (Urdu, Bengali, Arabic, English...)",
  readingOrder: string = "standard"
) {
  const res = await fetch("/api/gemini/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, scriptHint, readingOrder }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `OCR failed with status ${res.status}`);
  }
  return await res.json();
}

export async function callGeminiPdfDirectOCR(
  pdfBase64: string,
  scriptHint: string = "Auto-Detect (Urdu, Bengali, Arabic, English...)",
  readingOrder: string = "standard"
) {
  const res = await fetch("/api/gemini/ocr-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pdfBase64, scriptHint, readingOrder }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Direct PDF OCR failed with status ${res.status}`);
  }
  return await res.json();
}

export async function callGeminiTranslate(
  text: string,
  sourceLang: string,
  targetLang: string,
  mode: string,
  glossary: Record<string, string> = {},
  chapterTitle = ""
) {
  const res = await fetch("/api/gemini/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      sourceLang,
      targetLang,
      mode,
      glossary,
      chapterTitle,
    }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Translation failed with status ${res.status}`);
  }
  return await res.json();
}

export interface TtsResponse {
  audioBase64: string;
  mimeType: string;
  voiceUsed: string;
  modelUsed?: string;
  language?: string;
  durationSeconds: number;
  byteLength: number;
  inputChars: number;
  estimatedCostUsd: number;
  cached?: boolean;
  costSavedUsd?: number;
  source?: string;
}

export async function callGeminiTTS(
  text: string,
  voiceName: string = "Kore",
  style: string = "Clear, resonant literary narration",
  speed: number = 1.0,
  model: string = "gemini-3.8-flash-lite-tts",
  language: string = "Bengali",
  signal?: AbortSignal
): Promise<TtsResponse> {
  const res = await fetch("/api/gemini/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voiceName, style, speed, model, language }),
    signal,
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const error: any = new Error(errData.error || `TTS failed with status ${res.status}`);
    error.status = res.status;
    error.code = errData.code;
    throw error;
  }
  return await res.json();
}

export async function callGeminiTranscribe(audioBase64: string, mimeType: string) {
  const res = await fetch("/api/gemini/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audioBase64, mimeType }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Transcription failed with status ${res.status}`);
  }
  return await res.json();
}

export async function callGeminiReview(bookTitle: string, author: string, genre: string, synopsis: string, language: string) {
  const res = await fetch("/api/gemini/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookTitle, author, genre, synopsis, language }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Review generation failed with status ${res.status}`);
  }
  return await res.json();
}
