import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Languages,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Download,
  BookOpen,
  ArrowRight,
  BookMarked,
  Mic2,
  ShieldAlert,
  FileCheck2,
  SlidersHorizontal,
  Plus,
  Trash2,
  ArrowLeftRight,
  Zap,
  Coins,
  Copy,
  Check,
  RotateCcw,
  LayoutGrid,
  FileText,
  AlertCircle,
  HelpCircle,
  Clock,
  BookPlus,
  Layers,
} from "lucide-react";
import { TranslationMode, TranslationChunk, QCCheckResult, Book } from "../../types";
import { callGeminiTranslate } from "../../services/apiClient";
import { downloadTextFile } from "../../services/subtitleService";
import { generateDocxBlob } from "../../services/pdfService";

interface TranslationStudioProps {
  initialText?: string;
  initialTitle?: string;
  initialSourceLang?: string;
  onSendToVoice: (text: string, title: string) => void;
  onAddToLibrary?: (book: Partial<Book>) => void;
}

interface VerificationSample {
  id: string;
  label: string;
  sourceLang: string;
  targetLang: string;
  title: string;
  mode: TranslationMode;
  text: string;
  glossary: Record<string, string>;
}

// Pre-configured test sample presets
const VERIFICATION_SAMPLES: VerificationSample[] = [
  {
    id: "en-to-bn",
    label: "১. English → বাংলা (Dostoevsky: Crime and Punishment)",
    sourceLang: "English",
    targetLang: "Bengali",
    title: "Crime and Punishment — Excerpt",
    mode: "Natural Literary" as TranslationMode,
    text: `On an exceptionally hot evening early in July, a young man came out of the garret in which he lodged in S. Place and walked slowly, as though in hesitation, towards K. Bridge.

He had successfully avoided meeting his landlady on the stairs. His garret was under the roof of a high, five-storied house and was more like a cupboard than a room. The landlady who provided him with this room lived on the floor below.

He was crushingly poor, so much so that he had become unaccustomed to meeting people. But coming out into the street today, even he was struck by his sudden fear of facing his creditor.`,
    glossary: {
      "S. Place": "এস. প্লেস",
      "K. Bridge": "কে. সেতু",
      "Raskolnikov": "রাসকোলনিকভ",
    },
  },
  {
    id: "bn-to-en",
    label: "২. বাংলা → English (রবীন্দ্রনাথ ঠাকুর: গীতাঞ্জলি ও কথাসাহিত্য)",
    sourceLang: "Bengali",
    targetLang: "English",
    title: "Gitanjali — Devotional Offering",
    mode: "Natural Literary" as TranslationMode,
    text: `আমার মাথা নত করে দাও হে তোমার চরণধূলার তলে।
সকল অহংকার হে আমার ডুবাও চোখের জলে।

নিজেরে করিতে গৌরব দান নিজেরে কেবলি করি অপমান,
আপনারে শুধু ঘেরিয়া ঘেরিয়া ঘুরে মরি পলে পলে।
সকল অহংকার হে আমার ডুবাও চোখের জলে।

আমারে না যেন করি প্রচার আমার আপন কাজে,
তোমারি ইচ্ছা করো হে পূর্ণ আমার জীবন-মাঝে।`,
    glossary: {
      "চরণধূলা": "sacred dust of feet",
      "অহংকার": "vanity and pride",
    },
  },
  {
    id: "ar-to-bn",
    label: "৩. Arabic → বাংলা (Naguib Mahfouz: Palace Walk)",
    sourceLang: "Arabic",
    targetLang: "Bengali",
    title: "Palace Walk — Cairo Trilogy",
    mode: "Natural Literary" as TranslationMode,
    text: `استيقظت أمينة في منتصف الليل. وكانت تستيقظ دائماً في هذه الساعة، لا تتقدم دقيقة ولا تتأخر، كأنما ينبهها منبه غيবি مودع في أعماق روحها.

كان البيت الحجري القديم غارقاً في صمت مهيب، إلا من صدى بعيد لعجلات عربة حنطور تتهادى فوق بلاط شارع النحاسين المبلل بالندى.

نظرت نحو الفراش الخالي في انتظار عودة السيد، والقلب يرتجف رهبة من وقع خطواته القادمة في هدوء السحر.`,
    glossary: {
      "أمينة": "আমিনা",
      "السيد": "আল-সাইয়্যিদ আহমদ",
      "شارع النحاسين": "আল-নাহাসিন সড়ক",
    },
  },
  {
    id: "hi-to-bn",
    label: "৪. Hindi → বাংলা (Munshi Premchand: Godaan)",
    sourceLang: "Hindi",
    targetLang: "Bengali",
    title: "Godaan — Chapter Opening",
    mode: "Natural Literary" as TranslationMode,
    text: `होरी ने दोनों बैलों को सानी-पानी देकर अपनी पत्नी धनिया से कहा—गोबर को ज़रा चिलम भरने के लिए कह दो। वह लाठी टेकता हुआ द्वार पर आकर बैठ गया।

धनिया ने घर से निकलकर डाँटते हुए कहा—तुम तो हर बात में हुकुम चलाने लगते हो। लड़का खेत में खाद फेंकने गया है, अभी लौटकर नहीं आया। तुम्हारा बुढ़ापा आ गया पर अक्ल न आई।

होरी ने मंद स्वर में उत्तर दिया—तू तो हर बात पर बिगड़ने लगती है। मुझे खेत पर जल्दी पहुँचना है, ज़मींदार साहब आज गाँव का दौरा करने वाले हैं।`,
    glossary: {
      "होरी": "হোড়ি",
      "धनिया": "ধনিয়া",
      "गोबर": "গোবর",
    },
  },
  {
    id: "ur-to-bn",
    label: "৫. Urdu → বাংলা (Saadat Hasan Manto: Toba Tek Singh)",
    sourceLang: "Urdu",
    targetLang: "Bengali",
    title: "Toba Tek Singh — Partition Allegory",
    mode: "Natural Literary" as TranslationMode,
    text: `بٹوارے کے دو تین سال بعد پاکستان اور ہندوستان کی حکومتوں کو خیال آیا کہ اخلاقی قیدیوں کی طرح پاگلوں کا بھی تبادلہ ہونا چاہیے، یعنی جو مسلمان پاگل ہندوستان کے پاگل خانوں میں ہیں انہیں پاکستان پہنچا دیا جائے اور جو ہندو اور سکھ پاکستان کے پاگل خانوں میں ہیں، انہیں ہندوستان کے حوالے کر دیا جائے۔

وہاں باغ میں ایک درخت پر چڑھا ہوا ایک پاگل نیچے بیٹھے بشن سنگھ سے بولا: "اوپڑی گڑ گڑ دی انیکس دی بے دھیانا دی منگ دی دال آف دی پاکستان اینڈ ہندوستان آف دی در فٹے منہ!"

بشن سنگھ پندرہ برسوں سے اس پاگل خانے میں ایک ہی جگہ کھڑا رہتا تھا اور اس نے کبھی سونے کی کوشش نہیں کی تھی۔`,
    glossary: {
      "بشن سنگھ": "বিশেন সিং",
      "ٹوبہ ٹیک سنگھ": "টোবা টেক সিং",
      "لاہور": "লাহোর",
    },
  },
];

const GLOSSARY_PRESETS: Record<string, Record<string, string>> = {
  "Dostoevsky (Crime & Punishment)": {
    Raskolnikov: "রাসকোলনিকভ",
    "Alyona Ivanovna": "অ্যালিয়োনা ইভানোভনা",
    Svidrigailov: "সভেদ্রিগাইলোভ",
    "Saint Petersburg": "সেন্ট পিটার্সবার্গ",
    "Marmeladov": "মারমেলাদোভ",
  },
  "Premchand (Godaan)": {
    Hori: "হোড়ি",
    Dhaniya: "ধনিয়া",
    Gobar: "গোবর",
    Zamindar: "জমিদার",
    Mahato: "মাহাতো",
  },
  "Naguib Mahfouz (Cairo Trilogy)": {
    Amina: "আমিনা",
    "al-Sayyid Ahmad": "আল-সাইয়্যিদ আহমদ",
    "Bayn al-Qasrayn": "বায়ন আল-কাসরায়িন",
    Yasin: "ইয়াসিন",
    Fahmy: "ফাহমি",
  },
  "Manto (Toba Tek Singh)": {
    "Bishan Singh": "বিশেন সিং",
    "Toba Tek Singh": "টোবা টেক সিং",
    Lahore: "লাহোর",
    Asylum: "পাগলাগারদ",
  },
};

export const TranslationStudio: React.FC<TranslationStudioProps> = ({
  initialText = "",
  initialTitle = "Manuscript Untitled",
  initialSourceLang = "English",
  onSendToVoice,
  onAddToLibrary,
}) => {
  const [sourceLang, setSourceLang] = useState<string>(initialSourceLang);
  const [targetLang, setTargetLang] = useState<string>("Bengali");
  const [mode, setMode] = useState<TranslationMode>("Natural Literary");
  const [manuscriptTitle, setManuscriptTitle] = useState<string>(initialTitle);
  const [viewLayout, setViewLayout] = useState<"dual_editor" | "chunk_aligner">("dual_editor");

  // Core Text State
  const [sourceText, setSourceText] = useState<string>(initialText || "");
  const [translatedText, setTranslatedText] = useState<string>("");

  // Processing & Lock State
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [processingChunkId, setProcessingChunkId] = useState<string | null>(null);
  const [progressRatio, setProgressRatio] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Cost, Tokens & Caching Metrics
  const [cacheHits, setCacheHits] = useState<number>(0);
  const [totalTokensUsed, setTotalTokensUsed] = useState<number>(0);
  const [estimatedCostSavedUsd, setEstimatedCostSavedUsd] = useState<number>(0);
  const [showCostConfirmModal, setShowCostConfirmModal] = useState<boolean>(false);

  // Glossary State (persisted to localStorage)
  const [glossary, setGlossary] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("nbm_studio_glossary");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [newGlossaryKey, setNewGlossaryKey] = useState("");
  const [newGlossaryVal, setNewGlossaryVal] = useState("");
  const [showGlossary, setShowGlossary] = useState(false);

  // Chunks State
  const [chunks, setChunks] = useState<TranslationChunk[]>([]);

  // Update chunks when sourceText changes and no translation has occurred
  useEffect(() => {
    const rawParas = sourceText.split(/\n\s*\n/).filter((p) => p.trim());
    const transParas = translatedText.split(/\n\s*\n/).filter((p) => p.trim());

    setChunks(
      rawParas.map((p, idx) => ({
        id: `chunk-${idx + 1}`,
        chunkIndex: idx + 1,
        sourceText: p,
        translatedText: transParas[idx] || "",
        status: transParas[idx] ? "completed" : "pending",
        sourceParagraphCount: 1,
        targetParagraphCount: transParas[idx] ? 1 : 0,
        wordCount: p.split(/\s+/).filter(Boolean).length,
      }))
    );
  }, [sourceText]);

  // Keep translatedText in sync with chunks when chunks are modified
  const syncTranslatedTextFromChunks = (updatedChunks: TranslationChunk[]) => {
    const combined = updatedChunks
      .map((c) => c.translatedText)
      .filter((t) => t.trim())
      .join("\n\n");
    setTranslatedText(combined);
  };

  // Save glossary to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("nbm_studio_glossary", JSON.stringify(glossary));
    } catch (e) {
      console.warn("Could not save glossary to localStorage:", e);
    }
  }, [glossary]);

  // Local Cache Helper
  const getCacheKey = (text: string, src: string, tgt: string, m: string) => {
    return `nbm_cache_${src.toLowerCase()}_${tgt.toLowerCase()}_${m}_${text.trim().slice(0, 120)}_${text.length}`;
  };

  const checkLocalCache = (text: string): string | null => {
    try {
      const key = getCacheKey(text, sourceLang, targetLang, mode);
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const storeLocalCache = (text: string, translated: string) => {
    try {
      const key = getCacheKey(text, sourceLang, targetLang, mode);
      localStorage.setItem(key, translated);
    } catch (e) {
      console.warn("Cache write failed:", e);
    }
  };

  // Token and Cost Estimator
  const estimatedInputTokens = useMemo(() => {
    return Math.ceil(sourceText.length / 3.8);
  }, [sourceText]);

  const estimatedOutputTokens = useMemo(() => {
    return Math.ceil(estimatedInputTokens * 1.15);
  }, [estimatedInputTokens]);

  const estimatedCostUsd = useMemo(() => {
    // Gemini 3.8 Flash pricing: ~$0.075 / 1M input tokens, ~$0.30 / 1M output tokens
    const cost = (estimatedInputTokens * 0.075 + estimatedOutputTokens * 0.30) / 1000000;
    return Number(cost.toFixed(5));
  }, [estimatedInputTokens, estimatedOutputTokens]);

  // Quality Control Checks
  const qcReport: QCCheckResult = useMemo(() => {
    const sourceParas = sourceText.split(/\n\s*\n/).filter((p) => p.trim());
    const targetParas = translatedText.split(/\n\s*\n/).filter((p) => p.trim());

    const countMatches = sourceParas.length > 0 && sourceParas.length === targetParas.length;
    const suspiciousOmissions: string[] = [];

    if (sourceParas.length > targetParas.length && targetParas.length > 0) {
      suspiciousOmissions.push(
        `${sourceParas.length - targetParas.length} paragraph(s) appear missing in the translated output.`
      );
    }

    // Check character consistency from glossary
    const characterConsistency = Object.entries(glossary).map(([term, trans]) => {
      const srcFound = sourceText.toLowerCase().includes(term.toLowerCase());
      const tgtFound = translatedText.includes(trans);
      return {
        term: `${term} → ${trans}`,
        count: srcFound ? 1 : 0,
        valid: !srcFound || tgtFound,
      };
    });

    const passed = countMatches && characterConsistency.every((c) => c.valid);

    let score = 100;
    if (!countMatches && targetParas.length > 0) score -= 25;
    const invalidGlossary = characterConsistency.filter((c) => !c.valid).length;
    score -= invalidGlossary * 10;
    if (suspiciousOmissions.length > 0) score -= 20;

    return {
      sourceParagraphCount: sourceParas.length,
      targetParagraphCount: targetParas.length,
      countMatches,
      suspiciousOmissions,
      characterConsistency,
      missingHeadings: false,
      score: Math.max(20, Math.min(100, score)),
      passed: passed && targetParas.length > 0,
    };
  }, [sourceText, translatedText, glossary]);

  // Swap Source and Target Languages
  const handleSwapLanguages = () => {
    if (sourceLang === "auto") return;
    const oldSrc = sourceLang;
    const oldTgt = targetLang;
    setSourceLang(oldTgt);
    setTargetLang(oldSrc);

    // Swap text if both exist
    if (translatedText.trim()) {
      const oldSrcText = sourceText;
      const oldTgtText = translatedText;
      setSourceText(oldTgtText);
      setTranslatedText(oldSrcText);
    }
  };

  // Load a verification sample
  const handleLoadSample = (sampleId: string) => {
    const sample = VERIFICATION_SAMPLES.find((s) => s.id === sampleId);
    if (!sample) return;

    setSourceLang(sample.sourceLang);
    setTargetLang(sample.targetLang);
    setSourceText(sample.text);
    setTranslatedText("");
    setManuscriptTitle(sample.title);
    setMode(sample.mode);
    setGlossary(sample.glossary);
    setErrorMsg(null);
  };

  // Load a glossary preset
  const handleApplyGlossaryPreset = (presetName: string) => {
    const preset = GLOSSARY_PRESETS[presetName];
    if (preset) {
      setGlossary({ ...glossary, ...preset });
    }
  };

  const handleAddGlossaryTerm = () => {
    if (!newGlossaryKey.trim() || !newGlossaryVal.trim()) return;
    setGlossary({ ...glossary, [newGlossaryKey.trim()]: newGlossaryVal.trim() });
    setNewGlossaryKey("");
    setNewGlossaryVal("");
  };

  const handleRemoveGlossaryTerm = (key: string) => {
    const copy = { ...glossary };
    delete copy[key];
    setGlossary(copy);
  };

  // TRANSLATE A SINGLE CHUNK
  const handleTranslateChunk = async (chunkIndex: number) => {
    const chunk = chunks[chunkIndex];
    if (!chunk || !chunk.sourceText.trim() || isTranslating) return;

    // Check local cache first ($0 cost!)
    const cached = checkLocalCache(chunk.sourceText);
    if (cached) {
      const updated = [...chunks];
      updated[chunkIndex] = {
        ...chunk,
        translatedText: cached,
        status: "completed",
        cached: true,
        targetParagraphCount: 1,
      };
      setChunks(updated);
      syncTranslatedTextFromChunks(updated);
      setCacheHits((prev) => prev + 1);
      setEstimatedCostSavedUsd((prev) => prev + 0.0001);
      return;
    }

    setIsTranslating(true);
    setProcessingChunkId(chunk.id);
    setErrorMsg(null);

    const updated = [...chunks];
    updated[chunkIndex] = { ...chunk, status: "processing" };
    setChunks(updated);

    try {
      const res = await callGeminiTranslate(
        chunk.sourceText,
        sourceLang,
        targetLang,
        mode,
        glossary,
        manuscriptTitle
      );

      const trans = res.translatedText || "";
      storeLocalCache(chunk.sourceText, trans);

      updated[chunkIndex] = {
        ...chunk,
        translatedText: trans,
        status: "completed",
        cached: res.cached || false,
        targetParagraphCount: 1,
      };

      if (res.cached) {
        setCacheHits((prev) => prev + 1);
        setEstimatedCostSavedUsd((prev) => prev + (res.costSavedUsd || 0.0001));
      } else {
        setTotalTokensUsed((prev) => prev + (res.inputTokens || 0) + (res.outputTokens || 0));
      }

      setChunks(updated);
      syncTranslatedTextFromChunks(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      updated[chunkIndex] = { ...chunk, status: "failed", error: msg };
      setChunks(updated);
      setErrorMsg(`Chunk ${chunkIndex + 1} translation failed: ${msg}`);
    } finally {
      setIsTranslating(false);
      setProcessingChunkId(null);
    }
  };

  // TRANSLATE ALL CHUNKS SEQUENTIALLY (WITH IN-FLIGHT LOCK)
  const handleExecuteAllChunks = async () => {
    if (!sourceText.trim() || isTranslating) return;

    // If text is very long, prompt confirmation for safety
    if (sourceText.split(/\s+/).length > 2500 && !showCostConfirmModal) {
      setShowCostConfirmModal(true);
      return;
    }

    setShowCostConfirmModal(false);
    setIsTranslating(true);
    setErrorMsg(null);

    const workingChunks = [...chunks];
    setProgressRatio({ current: 0, total: workingChunks.length });

    for (let i = 0; i < workingChunks.length; i++) {
      const chunk = workingChunks[i];
      if (!chunk.sourceText.trim()) continue;

      setProgressRatio({ current: i + 1, total: workingChunks.length });
      setProcessingChunkId(chunk.id);

      // Check cache first for $0 cost
      const cached = checkLocalCache(chunk.sourceText);
      if (cached) {
        workingChunks[i] = {
          ...chunk,
          translatedText: cached,
          status: "completed",
          cached: true,
          targetParagraphCount: 1,
        };
        setChunks([...workingChunks]);
        setCacheHits((prev) => prev + 1);
        setEstimatedCostSavedUsd((prev) => prev + 0.0001);
        continue;
      }

      // Mark processing
      workingChunks[i] = { ...chunk, status: "processing" };
      setChunks([...workingChunks]);

      try {
        const res = await callGeminiTranslate(
          chunk.sourceText,
          sourceLang,
          targetLang,
          mode,
          glossary,
          manuscriptTitle
        );

        const trans = res.translatedText || "";
        storeLocalCache(chunk.sourceText, trans);

        workingChunks[i] = {
          ...chunk,
          translatedText: trans,
          status: "completed",
          cached: res.cached || false,
          targetParagraphCount: 1,
        };

        if (res.cached) {
          setCacheHits((prev) => prev + 1);
          setEstimatedCostSavedUsd((prev) => prev + (res.costSavedUsd || 0.0001));
        } else {
          setTotalTokensUsed((prev) => prev + (res.inputTokens || 0) + (res.outputTokens || 0));
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        workingChunks[i] = { ...chunk, status: "failed", error: msg };
        setErrorMsg(`Paragraph ${i + 1} translation failed. You can click 'Retry' on this chunk.`);
        // Continue to other chunks rather than breaking entire workflow
      }

      setChunks([...workingChunks]);
    }

    syncTranslatedTextFromChunks(workingChunks);
    setIsTranslating(false);
    setProcessingChunkId(null);
  };

  // RETRY ALL FAILED CHUNKS
  const handleRetryFailedChunks = async () => {
    if (isTranslating) return;
    const failedIndices = chunks
      .map((c, idx) => (c.status === "failed" ? idx : -1))
      .filter((i) => i >= 0);

    for (const idx of failedIndices) {
      await handleTranslateChunk(idx);
    }
  };

  // Copy target text
  const handleCopyTarget = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // EXPORT HANDLERS
  const exportTxt = () => {
    const content = `======================================================================
NBM AUDIO & BOOK STUDIO — LITERARY TRANSLATION WORKSPACE
Title: ${manuscriptTitle}
Source: ${sourceLang} ➔ Target: ${targetLang}
Mode: ${mode}
Integrity Score: ${qcReport.score}%
Generated: ${new Date().toLocaleString()}
======================================================================

--- ORIGINAL MANUSCRIPT (${sourceLang}) ---

${sourceText}

======================================================================

--- UNABRIDGED TRANSLATION (${targetLang}) ---

${translatedText}
`;
    downloadTextFile(content, `${manuscriptTitle.replace(/\s+/g, "_")}_translation.txt`);
  };

  const exportDocx = () => {
    const docBlob = generateDocxBlob(manuscriptTitle, [
      {
        pageNumber: 1,
        text: `মূল পাণ্ডুলিপি (${sourceLang}):\n\n${sourceText}\n\n========================================\nঅনূদিত পাঠ (${targetLang} - ${mode}):\n\n${translatedText}`,
      },
    ]);
    const url = URL.createObjectURL(docBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${manuscriptTitle.replace(/\s+/g, "_")}_manuscript.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    const payload = {
      archive: "NBM Audio & Book Studio Translation Project",
      title: manuscriptTitle,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      translationMode: mode,
      glossary,
      qcReport,
      metrics: {
        totalChunks: chunks.length,
        completedChunks: chunks.filter((c) => c.status === "completed").length,
        cacheHits,
        estimatedCostSavedUsd,
        totalTokensUsed,
      },
      chunks,
      timestamp: new Date().toISOString(),
    };
    downloadTextFile(JSON.stringify(payload, null, 2), `${manuscriptTitle}_project.json`, "application/json");
  };

  const exportEpubHtml = () => {
    const isBengaliTarget = targetLang.toLowerCase().includes("bengali") || targetLang === "বাংলা";
    const html = `<!DOCTYPE html>
<html lang="${isBengaliTarget ? "bn" : "en"}">
<head>
  <meta charset="utf-8">
  <title>${manuscriptTitle} — Literary Translation</title>
  <style>
    body {
      font-family: ${isBengaliTarget ? "'Noto Serif Bengali', 'Kalpurush', Georgia, serif" : "Georgia, serif"};
      line-height: 1.85;
      margin: 48px auto;
      max-width: 800px;
      padding: 0 20px;
      color: #1A1A1A;
      background-color: #FAFAF7;
    }
    h1 {
      text-align: center;
      color: #7A5524;
      font-size: 24pt;
      margin-bottom: 8pt;
    }
    .subtitle {
      text-align: center;
      font-size: 11pt;
      color: #666;
      margin-bottom: 36pt;
    }
    p {
      text-indent: 2em;
      margin-bottom: 1.1em;
      text-align: justify;
    }
    .footer-note {
      margin-top: 48pt;
      border-top: 1pt solid #DDD;
      padding-top: 12pt;
      font-size: 9pt;
      color: #888;
      text-align: center;
    }
  </style>
</head>
<body>
  <h1>${manuscriptTitle}</h1>
  <div class="subtitle">${sourceLang} থেকে ${targetLang} সাহিত্যিক অনুবাদ — NBM Audio & Book Studio</div>
  ${translatedText
    .split(/\n\s*\n/)
    .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
    .join("\n")}
  <div class="footer-note">অখণ্ড পাণ্ডুলিপি সংস্করণ · কোনো অংশ সংক্ষিপ্ত বা বর্জন করা হয়নি।</div>
</body>
</html>`;
    downloadTextFile(html, `${manuscriptTitle}_book.html`, "text/html");
  };

  // Add translated text to library as a book
  const handleAddToLibrary = () => {
    if (!onAddToLibrary || !translatedText.trim()) return;
    onAddToLibrary({
      id: `trans-book-${Date.now()}`,
      title: `${manuscriptTitle} (${targetLang})`,
      originalTitle: manuscriptTitle,
      author: "Translated Manuscript",
      country: "Global",
      originalLanguage: sourceLang,
      targetLanguage: targetLang,
      genre: "Literary Translation",
      tags: ["Translation Studio", sourceLang, targetLang, mode],
      description: `Unabridged translation from ${sourceLang} to ${targetLang} using ${mode} mode.`,
      coverUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
      copyrightStatus: "licensed",
      status: "draft",
      chaptersCount: 1,
      hasAudio: false,
      hasVideo: false,
      hasSubtitles: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chapters: [
        {
          id: `ch-1-${Date.now()}`,
          bookId: `trans-book-${Date.now()}`,
          chapterNumber: 1,
          title: manuscriptTitle,
          originalText: sourceText,
          translatedText: translatedText,
          translationStatus: "approved",
          wordCount: translatedText.split(/\s+/).filter(Boolean).length,
        },
      ],
    });
  };

  const completedChunksCount = chunks.filter((c) => c.status === "completed").length;
  const failedChunksCount = chunks.filter((c) => c.status === "failed").length;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Studio Header & Purpose */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#B88746]">
            <Languages className="w-4 h-4" />
            <span className="font-semibold uppercase tracking-wider">Universal Translation Studio</span>
            <span aria-hidden="true">·</span>
            <span>Unabridged Multilingual Engine with Cost-Control & Caching</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-[#F4EFE6]">
            Universal Translation & Literary Workstation
          </h1>
          <p className="text-xs text-[#8F9AA9] mt-0.5 font-editorial text-sm">
            Bidirectional and multidirectional translation across world literature. Anti-omission paragraph integrity, character translation memory, and intelligent zero-cost caching.
          </p>
        </div>

        {/* Quick Verification Sample Buttons */}
        <div className="flex flex-col items-start sm:items-end gap-1.5">
          <span className="text-[11px] font-mono text-[#7E8B9E]">দ্রুত যাচাই ও পরীক্ষার জন্য নমুনা নির্বাচন:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {VERIFICATION_SAMPLES.map((s) => (
              <button
                key={s.id}
                onClick={() => handleLoadSample(s.id)}
                className="px-2.5 py-1 bg-[#151A24] hover:bg-[#202736] border border-[#263145] text-[#C9BFAD] hover:text-[#EDE8DE] text-[11px] rounded transition-colors"
                title={s.label}
              >
                {s.label.split(" (")[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Language, Mode & Configuration Bar */}
      <div className="bg-[#12151C] border border-[#202735] p-4 rounded-md space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Source and Target Language Selector with Swap Button */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[#7F8D9E]">From:</span>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="bg-[#0D0F14] border border-[#232B3B] rounded px-3 py-1.5 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
              >
                <option value="auto">Auto-Detect</option>
                <option value="English">English</option>
                <option value="Bengali">বাংলা (Bengali)</option>
                <option value="Arabic">Arabic (العربية)</option>
                <option value="Hindi">Hindi (हिन्दी)</option>
                <option value="Urdu">Urdu (اردو)</option>
                <option value="French">French (Français)</option>
                <option value="German">German (Deutsch)</option>
                <option value="Russian">Russian (Русский)</option>
                <option value="Spanish">Spanish (Español)</option>
                <option value="Persian">Persian (فارسی)</option>
                <option value="Japanese">Japanese (日本語)</option>
                <option value="Chinese">Chinese (中文)</option>
                <option value="Portuguese">Portuguese</option>
                <option value="Italian">Italian</option>
              </select>
            </div>

            <button
              onClick={handleSwapLanguages}
              disabled={sourceLang === "auto"}
              className="p-1.5 bg-[#181E29] hover:bg-[#232B3B] disabled:opacity-30 border border-[#2A3446] rounded text-[#B88746] transition-colors"
              title="Swap Languages ⇄"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[#7F8D9E]">To:</span>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="bg-[#0D0F14] border border-[#232B3B] rounded px-3 py-1.5 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none font-medium"
              >
                <option value="Bengali">বাংলা (Bengali)</option>
                <option value="English">English</option>
                <option value="Arabic">Arabic (العربية)</option>
                <option value="Hindi">Hindi (हिन्दी)</option>
                <option value="Urdu">Urdu (اردو)</option>
                <option value="French">French (Français)</option>
                <option value="German">German (Deutsch)</option>
                <option value="Russian">Russian (Русский)</option>
                <option value="Spanish">Spanish (Español)</option>
                <option value="Persian">Persian (فارسی)</option>
                <option value="Japanese">Japanese (日本語)</option>
                <option value="Chinese">Chinese (中文)</option>
              </select>
            </div>
          </div>

          {/* Translation Mode Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#7F8D9E]">Mode:</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as TranslationMode)}
              className="bg-[#0D0F14] border border-[#232B3B] rounded px-3 py-1.5 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none font-medium"
            >
              <option value="Natural Literary">Natural Literary (কাব্যিক ও প্রাঞ্জল সাহিত্যিক অনুবাদ)</option>
              <option value="Natural Standard">Natural Standard (সাধারণ ও প্রমিত অনুবাদ)</option>
              <option value="Faithful/Literal">Faithful / Literal (আক্ষরিক ও বিশ্বস্ত অনুবাদ)</option>
              <option value="Easy-to-Read">Easy-to-Read (সহজপাঠ্য অনুবাদ)</option>
              <option value="Side-by-Side">Side-by-Side Annotated (মূলানুগ ও শব্দার্থ টীকা)</option>
            </select>
          </div>

          {/* Right Controls: Glossary Drawer & View Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGlossary(!showGlossary)}
              className={`px-3 py-1.5 rounded text-xs border transition-colors flex items-center gap-1.5 ${
                showGlossary
                  ? "bg-[#B88746]/20 border-[#B88746] text-[#E5D7B7]"
                  : "bg-[#141822] border-[#252E3E] text-[#8C98AC] hover:text-[#EDE8DE]"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Glossary & TM ({Object.keys(glossary).length})</span>
            </button>

            {/* View Mode Toggle */}
            <div className="flex bg-[#0E1117] p-0.5 rounded border border-[#222938]">
              <button
                onClick={() => setViewLayout("dual_editor")}
                className={`px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                  viewLayout === "dual_editor"
                    ? "bg-[#B88746] text-[#0D0F12] font-semibold"
                    : "text-[#8E9BAC] hover:text-[#EDE8DE]"
                }`}
                title="Dual Editor View"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Dual Editor</span>
              </button>

              <button
                onClick={() => setViewLayout("chunk_aligner")}
                className={`px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                  viewLayout === "chunk_aligner"
                    ? "bg-[#B88746] text-[#0D0F12] font-semibold"
                    : "text-[#8E9BAC] hover:text-[#EDE8DE]"
                }`}
                title="Paragraph Chunks Aligner"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Paragraph Chunks ({chunks.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Cost, Token Estimation & Caching Status Ribbon */}
        <div className="pt-2 border-t border-[#1C2330] flex flex-wrap items-center justify-between text-xs text-[#8F9AA9] gap-3">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-[#EDE8DE] font-mono">
              <Coins className="w-3.5 h-3.5 text-[#B88746]" />
              <span>Estimated Cost: ~${estimatedCostUsd} USD</span>
            </span>
            <span className="text-[#647187]">|</span>
            <span className="font-mono text-[11px]">
              Tokens: ~{estimatedInputTokens} in / ~{estimatedOutputTokens} out
            </span>
            <span className="text-[#647187]">|</span>
            <span className="text-[#50B876] font-mono flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>Cache Hits: {cacheHits} (Saved: ${estimatedCostSavedUsd.toFixed(4)})</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-[#A6B2C4]">
              Chunks: {completedChunksCount}/{chunks.length} Completed
              {failedChunksCount > 0 && (
                <span className="text-[#E66262] ml-1.5 font-bold">({failedChunksCount} Failed)</span>
              )}
            </span>
            {failedChunksCount > 0 && (
              <button
                onClick={handleRetryFailedChunks}
                disabled={isTranslating}
                className="px-2 py-0.5 bg-[#401818] hover:bg-[#5C2323] text-[#F3A5A5] border border-[#7A2A2A] rounded text-[11px] transition-colors"
              >
                Retry Failed Chunks
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Message Box */}
      {errorMsg && (
        <div className="p-4 bg-[#2C1818] border border-[#682424] text-[#F3A5A5] text-xs rounded-md flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#E66262] shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-[#F3A5A5] hover:text-white text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Glossary & Character-Name Memory Drawer */}
      {showGlossary && (
        <div className="p-4 bg-[#12151C] border border-[#202735] rounded-md space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-semibold text-[#EDE8DE]">
                Translation Memory (TM) & Character Glossary
              </span>
              <p className="text-[11px] text-[#7F8D9E]">
                বিশেষ নাম, চরিত্র ও পারিভাষিক শব্দের অনুবাদ সব অধ্যায়ে কঠোরভাবে একই রকম রাখার ব্যবস্থা।
              </p>
            </div>

            {/* Presets loader */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#7E8B9E]">Presets:</span>
              <select
                onChange={(e) => {
                  if (e.target.value) handleApplyGlossaryPreset(e.target.value);
                }}
                defaultValue=""
                className="bg-[#0D0F14] border border-[#232B3B] rounded px-2 py-1 text-[11px] text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
              >
                <option value="" disabled>
                  Load Famous Literature Preset...
                </option>
                {Object.keys(GLOSSARY_PRESETS).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Source term (e.g. Raskolnikov)"
              value={newGlossaryKey}
              onChange={(e) => setNewGlossaryKey(e.target.value)}
              className="bg-[#0D0F14] border border-[#232B3B] rounded px-3 py-1.5 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none w-52"
            />
            <input
              type="text"
              placeholder="Target translation (e.g. রাসকোলনিকভ)"
              value={newGlossaryVal}
              onChange={(e) => setNewGlossaryVal(e.target.value)}
              className="bg-[#0D0F14] border border-[#232B3B] rounded px-3 py-1.5 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none w-52 font-editorial"
            />
            <button
              onClick={handleAddGlossaryTerm}
              className="px-3 py-1.5 bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12] text-xs font-semibold rounded transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add to Memory</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {Object.entries(glossary).map(([k, v]) => (
              <div
                key={k}
                className="flex items-center gap-2 px-2.5 py-1 bg-[#181D28] border border-[#293447] rounded text-xs text-[#EDE8DE]"
              >
                <span>{k}</span>
                <span className="text-[#B88746]">→</span>
                <span className="font-editorial text-[#D8CFBF] font-medium">{v}</span>
                <button
                  onClick={() => handleRemoveGlossaryTerm(k)}
                  className="text-[#647187] hover:text-[#E66262] ml-1"
                  title="Remove term"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW MODE 1: DUAL EDITOR (SIDE-BY-SIDE SYNCHRONIZED) */}
      {viewLayout === "dual_editor" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Source Panel */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#8F9AA9] px-1">
              <span className="font-semibold text-[#EDE8DE] flex items-center gap-1.5">
                <span>মূল পাণ্ডুলিপি ({sourceLang})</span>
                <span className="text-[11px] font-mono text-[#B88746]">
                  [{sourceText.split(/\s+/).filter(Boolean).length} শব্দ]
                </span>
              </span>
              <span className="font-mono text-[11px] text-[#697486]">
                {qcReport.sourceParagraphCount} টি অনুচ্ছেদ
              </span>
            </div>

            <div className="relative">
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="এখানে মূল সাহিত্যের অনুচ্ছেদ বা অধ্যায় পেস্ট করুন..."
                className="w-full h-[480px] bg-[#0E1117] border border-[#222938] rounded-md p-4 text-xs font-editorial text-[14px] leading-relaxed text-[#EDE8DE] focus:border-[#B88746] focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Target Panel */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#8F9AA9] px-1">
              <span className="font-semibold text-[#EDE8DE] flex items-center gap-1.5">
                <span>অনূদিত পাণ্ডুলিপি ({targetLang} - {mode})</span>
                <span className="text-[11px] font-mono text-[#50B876]">
                  [{translatedText.split(/\s+/).filter(Boolean).length} শব্দ]
                </span>
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-[#697486]">
                  {qcReport.targetParagraphCount} টি অনুচ্ছেদ
                </span>
                <button
                  onClick={handleCopyTarget}
                  disabled={!translatedText}
                  className="text-[#7F8D9E] hover:text-[#EDE8DE] flex items-center gap-1 text-[11px]"
                  title="Copy Translated Text"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#50B876]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                value={translatedText}
                onChange={(e) => setTranslatedText(e.target.value)}
                placeholder="অনূদিত সাহিত্যিক টেক্সট এখানে প্রদর্শিত হবে। আপনি সরাসরি ভাষা, ভাব ও ছন্দ পরিমার্জন করতে পারেন..."
                className="w-full h-[480px] bg-[#0E1117] border border-[#222938] rounded-md p-4 text-xs font-editorial text-[14px] leading-relaxed text-[#EDE8DE] focus:border-[#B88746] focus:outline-none resize-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: CHUNK ALIGNER (PARAGRAPH-BY-PARAGRAPH GRID) */}
      {viewLayout === "chunk_aligner" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#8F9AA9] bg-[#12151C] p-3 rounded border border-[#202735]">
            <span className="font-semibold text-[#EDE8DE]">
              অনুচ্ছেদভিত্তিক বিন্যাস ও চঙ্কিং নিয়ন্ত্রণ (Paragraph Chunk Aligner)
            </span>
            <span className="font-mono text-[11px]">
              মোট {chunks.length} টি চঙ্ক · সম্পন্ন: {completedChunksCount}
            </span>
          </div>

          <div className="space-y-3">
            {chunks.map((chunk, idx) => (
              <div
                key={chunk.id}
                className={`p-4 rounded-md border transition-all ${
                  chunk.status === "processing"
                    ? "bg-[#182133] border-[#3B82F6]"
                    : chunk.status === "failed"
                    ? "bg-[#241717] border-[#7F2626]"
                    : chunk.status === "completed"
                    ? "bg-[#12171E] border-[#223024]"
                    : "bg-[#10131A] border-[#1F2636]"
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#1E2535] mb-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#B88746]">¶ {chunk.chunkIndex}</span>
                    <span className="text-[#7F8D9E]">({chunk.wordCount || 0} words)</span>
                    {chunk.cached && (
                      <span className="px-2 py-0.5 bg-[#50B876]/15 border border-[#50B876]/30 text-[#71E69C] rounded text-[10px] font-mono flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5" />
                        Cached ($0.00)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {chunk.status === "pending" && (
                      <span className="text-[#8F9AA9] text-[11px] font-mono">Pending</span>
                    )}
                    {chunk.status === "processing" && (
                      <span className="text-[#60A5FA] text-[11px] font-mono flex items-center gap-1 animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Translating...
                      </span>
                    )}
                    {chunk.status === "completed" && (
                      <span className="text-[#50B876] text-[11px] font-mono flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Completed
                      </span>
                    )}
                    {chunk.status === "failed" && (
                      <span className="text-[#E66262] text-[11px] font-mono flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Failed
                      </span>
                    )}

                    <button
                      onClick={() => handleTranslateChunk(idx)}
                      disabled={isTranslating}
                      className="px-2.5 py-1 bg-[#1A2230] hover:bg-[#253044] disabled:opacity-30 border border-[#2D394E] text-[#D8CFBF] rounded text-[11px] transition-colors"
                    >
                      {chunk.status === "completed" ? "Re-translate" : "Translate ¶"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs font-editorial">
                  {/* Left: Source Text */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-[#7F8D9E] font-sans font-medium">Source ({sourceLang}):</span>
                    <div className="p-3 bg-[#0A0D12] border border-[#1E2536] rounded text-[#EDE8DE] leading-relaxed text-[13px] whitespace-pre-wrap">
                      {chunk.sourceText}
                    </div>
                  </div>

                  {/* Right: Target Text */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-[#7F8D9E] font-sans font-medium">Target ({targetLang}):</span>
                    <textarea
                      value={chunk.translatedText}
                      onChange={(e) => {
                        const updated = [...chunks];
                        updated[idx] = { ...chunk, translatedText: e.target.value };
                        setChunks(updated);
                        syncTranslatedTextFromChunks(updated);
                      }}
                      placeholder="এই অনুচ্ছেদের অনুবাদ এখানে তৈরি হবে..."
                      rows={4}
                      className="w-full p-3 bg-[#0A0D12] border border-[#1E2536] rounded text-[#EDE8DE] leading-relaxed text-[13px] focus:border-[#B88746] focus:outline-none resize-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Execution and Dispatch Bar */}
      <div className="bg-[#12151C] border border-[#202735] p-4 rounded-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Primary Translation Execution Button with Single In-Flight Lock */}
            <button
              onClick={handleExecuteAllChunks}
              disabled={isTranslating || !sourceText.trim()}
              className="px-5 py-2.5 bg-[#B88746] hover:bg-[#C99654] disabled:opacity-40 text-[#0D0F12] text-xs font-semibold rounded transition-colors flex items-center gap-2 shadow-sm"
            >
              {isTranslating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>
                    Translating Paragraph {progressRatio.current}/{progressRatio.total}...
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Execute Unabridged Literary Translation</span>
                </>
              )}
            </button>

            {/* Handshake actions to AI Voice & Library */}
            <button
              onClick={() => onSendToVoice(translatedText, `${manuscriptTitle} (${targetLang} Narration)`)}
              disabled={!translatedText.trim()}
              className="px-3.5 py-2.5 bg-[#1A202C] hover:bg-[#252E3E] disabled:opacity-30 text-[#EDE8DE] border border-[#2D374A] text-xs font-medium rounded transition-colors flex items-center gap-1.5"
            >
              <Mic2 className="w-3.5 h-3.5 text-[#B88746]" />
              <span>টেক্সট টু স্পিচ (TTS)-এ পাঠান</span>
            </button>

            {onAddToLibrary && (
              <button
                onClick={handleAddToLibrary}
                disabled={!translatedText.trim()}
                className="px-3.5 py-2.5 bg-[#141822] hover:bg-[#1C2230] disabled:opacity-30 text-[#D0C5B2] border border-[#263143] text-xs font-medium rounded transition-colors flex items-center gap-1.5"
              >
                <BookPlus className="w-3.5 h-3.5 text-[#B88746]" />
                <span>Save to Library</span>
              </button>
            )}
          </div>

          {/* Export Formats Engine: TXT, DOCX, JSON, EPUB/HTML */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#7F8D9E] font-medium">Export:</span>
            <button
              onClick={exportTxt}
              disabled={!translatedText}
              className="px-2.5 py-1.5 bg-[#181D26] hover:bg-[#222A38] disabled:opacity-30 text-[#D8CFBF] rounded border border-[#2B3547] text-xs font-mono transition-colors"
              title="Plain Text Manuscript with Header"
            >
              .TXT
            </button>
            <button
              onClick={exportDocx}
              disabled={!translatedText}
              className="px-2.5 py-1.5 bg-[#181D26] hover:bg-[#222A38] disabled:opacity-30 text-[#D8CFBF] rounded border border-[#2B3547] text-xs font-mono transition-colors"
              title="Word Document (.docx) Format"
            >
              .DOCX
            </button>
            <button
              onClick={exportJson}
              disabled={!translatedText}
              className="px-2.5 py-1.5 bg-[#181D26] hover:bg-[#222A38] disabled:opacity-30 text-[#D8CFBF] rounded border border-[#2B3547] text-xs font-mono transition-colors"
              title="Structured Translation Archive JSON"
            >
              .JSON
            </button>
            <button
              onClick={exportEpubHtml}
              disabled={!translatedText}
              className="px-2.5 py-1.5 bg-[#181D26] hover:bg-[#222A38] disabled:opacity-30 text-[#D8CFBF] rounded border border-[#2B3547] text-xs font-mono transition-colors"
              title="Formatted eBook (HTML / EPUB style)"
            >
              .EPUB / HTML
            </button>
          </div>
        </div>

        {/* Quality Control & Anti-Omission Verification Box */}
        <div className="pt-3 border-t border-[#1F2635] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-[#B88746]" />
              <span className="font-semibold text-[#EDE8DE]">
                Translation Quality & Validation (QC Inspector)
              </span>
            </div>
            <span
              className={`font-mono text-xs font-semibold ${
                qcReport.score >= 80 ? "text-[#50B876]" : "text-[#D49842]"
              }`}
            >
              Integrity Score: {qcReport.score}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-[#0E1015] p-3 rounded border border-[#1E2535]">
            <div className="space-y-1">
              <div className="text-[#7F8D9E]">Paragraph Counts:</div>
              <div className="text-[#EDE8DE] font-mono flex items-center gap-1.5">
                {qcReport.countMatches ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#50B876]" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-[#D49842]" />
                )}
                <span>
                  Source: {qcReport.sourceParagraphCount} | Target: {qcReport.targetParagraphCount}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[#7F8D9E]">Glossary & Character Fidelity:</div>
              <div className="text-[#EDE8DE] font-mono flex items-center gap-1.5">
                {qcReport.characterConsistency.every((c) => c.valid) ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#50B876]" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-[#D49842]" />
                )}
                <span>
                  {qcReport.characterConsistency.filter((c) => c.valid).length}/
                  {qcReport.characterConsistency.length} terms locked
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[#7F8D9E]">Anti-Omission Integrity:</div>
              <div className="text-[#EDE8DE] font-mono flex items-center gap-1.5">
                {qcReport.suspiciousOmissions.length === 0 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#50B876]" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-[#E66262]" />
                )}
                <span>
                  {qcReport.suspiciousOmissions.length === 0
                    ? "কোনো অংশ বাদ পড়েনি (No omissions)"
                    : "সম্ভাব্য বাদ পড়ার সংকেত"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Confirmation Modal for Long Manuscripts */}
      {showCostConfirmModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#12151D] border border-[#263145] rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-xs text-[#B88746]">
              <Coins className="w-4 h-4" />
              <span className="font-semibold uppercase tracking-wider">Budget Safety Confirmation</span>
            </div>

            <h2 className="text-lg font-bold text-[#F4EFE6]">বড় পাণ্ডুলিপি অনুবাদ অনুমোদন</h2>
            <p className="text-xs text-[#8F9AA9]">
              আপনি একটি দীর্ঘ সাহিত্যিক পাঠ্য অনুবাদের অনুরোধ করেছেন। আপনার অনুমোদন ব্যতিরেকে কোনো কল শুরু করা হবে না।
            </p>

            <div className="bg-[#0E1117] p-3 rounded border border-[#20283A] text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-[#7E8B9E]">আনুমানিক ইনপুট টোকেন:</span>
                <span className="text-[#EDE8DE]">~{estimatedInputTokens}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7E8B9E]">আনুমানিক আউটপুট টোকেন:</span>
                <span className="text-[#EDE8DE]">~{estimatedOutputTokens}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#1F2636] font-bold">
                <span className="text-[#B88746]">আনুমানিক ব্যয় (Gemini 3.8 Flash):</span>
                <span className="text-[#50B876]">~${estimatedCostUsd} USD</span>
              </div>
              <div className="text-[10px] text-[#697486] pt-1">
                * পূর্বে অনুবাদ করা অনুচ্ছেদগুলো ক্যাশ থেকে $0.00 মূল্যে সরাসরি লোড হবে।
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCostConfirmModal(false)}
                className="px-3 py-1.5 bg-[#161B24] hover:bg-[#202735] text-[#8E9BAC] rounded text-xs transition-colors"
              >
                বাতিল করুন
              </button>
              <button
                onClick={handleExecuteAllChunks}
                className="px-4 py-1.5 bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12] font-semibold rounded text-xs transition-colors"
              >
                অনুমোদন ও শুরু করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
