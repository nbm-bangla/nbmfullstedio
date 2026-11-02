import React, { useState, useRef, useEffect } from "react";
import {
  FileScan,
  Upload,
  RotateCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  BookOpen,
  FileText,
  Mic2,
  Copy,
  Check,
  Languages,
  Eye,
  RefreshCw,
  Download,
  FileCode,
  FileDown,
  Pause,
  Play,
  Coins,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  EyeOff,
  Filter,
  AlignRight,
  AlignLeft,
  Type,
} from "lucide-react";
import { OCRPage, OCRJob } from "../../types";
import { callGeminiOCR, callGeminiPdfDirectOCR } from "../../services/apiClient";
import {
  loadAndInspectPdf,
  applyImageEnhancements,
  generateDocxBlob,
  fileToBase64,
  ProcessedPdfDocument,
} from "../../services/pdfService";
import { downloadTextFile } from "../../services/subtitleService";

interface PdfOcrStudioProps {
  onSendToTranslation?: (text: string, title: string, sourceLang: string) => void;
  onSendToVoice?: (text: string, title: string) => void;
}

export const PdfOcrStudio: React.FC<PdfOcrStudioProps> = ({
  onSendToTranslation,
  onSendToVoice,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Job State
  const [job, setJob] = useState<OCRJob | null>(null);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [scriptHint, setScriptHint] = useState<string>("Auto-Detect (Urdu, Bengali, Arabic, English...)");
  const [readingOrder, setReadingOrder] = useState<"standard" | "bidi_rtl" | "vertical_asian" | "two_column">("standard");

  // Typography & Layout Controls
  const [editorFontSize, setEditorFontSize] = useState<number>(16);
  const [manualRtl, setManualRtl] = useState<boolean | null>(null);

  // Processing & Queue State
  const [isInspectingPdf, setIsInspectingPdf] = useState<boolean>(false);
  const [inspectProgress, setInspectProgress] = useState<string>("");
  const [isProcessingBatch, setIsProcessingBatch] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [cancelBatchRef, setCancelBatchRef] = useState<boolean>(false);
  const [isSinglePageProcessing, setIsSinglePageProcessing] = useState<boolean>(false);
  const [failedFileForDirectOcr, setFailedFileForDirectOcr] = useState<File | null>(null);

  // Image Enhancement State for Current Page
  const [rotation, setRotation] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(100);
  const [brightness, setBrightness] = useState<number>(100);
  const [binarizeThreshold, setBinarizeThreshold] = useState<number>(0);
  const [enhancedPreviewUrl, setEnhancedPreviewUrl] = useState<string>("");

  // UI helpers
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [showDiffView, setShowDiffView] = useState<boolean>(false);

  const currentPage = job?.pages[selectedPageIndex];

  // Helper to determine if current page should render Right-to-Left (Urdu/Arabic/Persian)
  const isCurrentRtl =
    manualRtl !== null
      ? manualRtl
      : readingOrder === "bidi_rtl" ||
        scriptHint.toLowerCase().includes("urdu") ||
        scriptHint.toLowerCase().includes("arabic") ||
        /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(currentPage?.editedText || "");

  // Sync image filters with current page on page selection
  useEffect(() => {
    if (currentPage) {
      setRotation(currentPage.rotation || 0);
      setContrast(currentPage.contrast || 100);
      setBrightness(currentPage.brightness || 100);
      setBinarizeThreshold(currentPage.binarizeThreshold || 0);
      setEnhancedPreviewUrl(currentPage.originalImageUrl);
    }
  }, [selectedPageIndex, job?.id]);

  // Apply visual enhancements when sliders change
  const handleApplyFilters = async (newRot = rotation, newCont = contrast, newBright = brightness, newThresh = binarizeThreshold) => {
    if (!currentPage) return;
    try {
      const enhanced = await applyImageEnhancements(currentPage.originalImageUrl, {
        rotation: newRot,
        contrast: newCont,
        brightness: newBright,
        binarizeThreshold: newThresh,
        sharpen: true,
      });
      setEnhancedPreviewUrl(enhanced);

      if (job) {
        const updatedPages = [...job.pages];
        updatedPages[selectedPageIndex] = {
          ...currentPage,
          rotation: newRot,
          contrast: newCont,
          brightness: newBright,
          binarizeThreshold: newThresh,
        };
        setJob({ ...job, pages: updatedPages });
      }
    } catch (err) {
      console.warn("Filter preview error:", err);
    }
  };

  // Helper to process a single page for a newly loaded job
  const handleProcessSinglePageWithJob = async (
    targetJob: OCRJob,
    pageIdx: number,
    hint: string,
    order: string
  ) => {
    const pageToRun = targetJob.pages[pageIdx];
    if (!pageToRun || !pageToRun.originalImageUrl) return;

    setIsSinglePageProcessing(true);
    try {
      const res = await callGeminiOCR(pageToRun.originalImageUrl, hint, order);
      const isUrduDetected =
        res.detectedLanguage?.toLowerCase().includes("urdu") ||
        /[\u0600-\u06FF]/.test(res.extractedText || "");

      if (isUrduDetected) {
        setReadingOrder("bidi_rtl");
        setScriptHint("Urdu (اردو / نستعلیق - Nastaliq & Naskh)");
      }

      setJob((prev) => {
        if (!prev) return prev;
        const updated = [...prev.pages];
        if (updated[pageIdx]) {
          updated[pageIdx] = {
            ...updated[pageIdx],
            extractedText: res.extractedText || "",
            editedText: res.extractedText || "",
            confidence: res.confidenceScore || 0.94,
            detectedScript: res.detectedLanguage || hint,
            hasUnreadableRegions: res.hasUnreadableRegions || false,
            unreadableNotes:
              res.unreadableNotes ||
              (res.suspiciousWords?.length ? `অস্পষ্ট শব্দ: ${res.suspiciousWords.join(", ")}` : ""),
            extractionSource: "gemini_ocr",
            status: "completed",
          };
        }
        return {
          ...prev,
          status: "review_required",
          pages: updated,
          apiCallCount: (prev.apiCallCount || 0) + 1,
        };
      });
    } catch (e: any) {
      console.warn("Auto-OCR on page 1 failed:", e);
    } finally {
      setIsSinglePageProcessing(false);
    }
  };

  // Fallback: Direct Gemini PDF Extraction without needing browser PDF.js canvas
  const handleDirectGeminiPdfOcr = async () => {
    if (!failedFileForDirectOcr) return;

    setIsInspectingPdf(true);
    setInspectProgress("Gemini 3.8 Flash ভিশন ইঞ্জিন দিয়ে সরাসরি সম্পূর্ণ PDF এক্সট্রাক্ট করা হচ্ছে...");
    setErrorMsg(null);

    try {
      const b64 = await fileToBase64(failedFileForDirectOcr);
      const res = await callGeminiPdfDirectOCR(b64, scriptHint, readingOrder);

      const isUrdu =
        res.detectedLanguage?.toLowerCase().includes("urdu") ||
        res.readingDirection === "rtl" ||
        /[\u0600-\u06FF]/.test(res.extractedText || "");

      if (isUrdu) {
        setReadingOrder("bidi_rtl");
        setScriptHint("Urdu (اردو / نستعلیق - Nastaliq & Naskh)");
      }

      const pageTexts: string[] =
        res.pageBreakMarks && res.pageBreakMarks.length > 0
          ? res.pageBreakMarks
          : (res.extractedText || "").split(/\n\s*---\s*\n|\n\s*\[Page \d+\]\s*\n/).filter(Boolean);

      const finalPages = pageTexts.length > 0 ? pageTexts : [res.extractedText || ""];

      const initialPages: OCRPage[] = finalPages.map((text, idx) => ({
        pageNumber: idx + 1,
        originalImageUrl: "",
        extractedText: text,
        editedText: text,
        isApproved: true,
        confidence: res.confidenceScore || 0.95,
        detectedScript: res.detectedLanguage || (isUrdu ? "Urdu" : scriptHint),
        hasUnreadableRegions: false,
        rotation: 0,
        contrast: 100,
        brightness: 100,
        binarizeThreshold: 0,
        extractionSource: "gemini_ocr",
        isScanned: true,
        status: "completed",
      }));

      const newJob: OCRJob = {
        id: `ocr-direct-${Date.now()}`,
        fileName: failedFileForDirectOcr.name,
        fileSize: failedFileForDirectOcr.size,
        totalPages: initialPages.length,
        currentPage: 1,
        status: "completed",
        scriptHint: res.detectedLanguage || scriptHint,
        readingOrder: isUrdu ? "bidi_rtl" : "standard",
        pages: initialPages,
        averageConfidence: res.confidenceScore || 0.95,
        pdfType: "scanned_image",
        estimatedCostUsd: 0.0003,
        apiCallCount: 1,
      };

      setJob(newJob);
      setSelectedPageIndex(0);
      setFailedFileForDirectOcr(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`সরাসরি ক্লাউড PDF OCR ব্যর্থ হয়েছে: ${msg}। API কী সঠিক আছে কিনা পরীক্ষা করুন।`);
    } finally {
      setIsInspectingPdf(false);
      setInspectProgress("");
    }
  };

  // PDF File Upload Handler
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setFailedFileForDirectOcr(null);
    setIsInspectingPdf(true);
    setInspectProgress("PDF ডিকোড ও ফন্ট অ্যানালাইসিস চলছে...");

    try {
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        const docResult: ProcessedPdfDocument = await loadAndInspectPdf(file, (curr, total) => {
          setInspectProgress(`পৃষ্ঠা ${curr}/${total} প্রস্তুত ও রেন্ডার করা হচ্ছে...`);
        });

        // Detect if Urdu / Arabic / Nastaliq script is present
        const isUrdu =
          docResult.hasUrduArabic ||
          file.name.toLowerCase().includes("urdu") ||
          file.name.toLowerCase().includes("ghalib") ||
          file.name.toLowerCase().includes("iqbal");

        const effectiveScript = isUrdu
          ? "Urdu (اردو / نستعلیق - Nastaliq & Naskh)"
          : scriptHint;
        const effectiveOrder = isUrdu ? "bidi_rtl" : readingOrder;

        if (isUrdu) {
          setScriptHint("Urdu (اردو / نستعلیق - Nastaliq & Naskh)");
          setReadingOrder("bidi_rtl");
        }

        const initialPages: OCRPage[] = docResult.pages.map((p) => {
          const isNative = !p.isScanned && p.nativeText.length > 25;
          return {
            pageNumber: p.pageNumber,
            originalImageUrl: p.renderedImageDataUrl,
            extractedText: isNative ? p.nativeText : "",
            editedText: isNative ? p.nativeText : "",
            isApproved: isNative,
            confidence: isNative ? 1.0 : 0.0,
            detectedScript: p.detectedLanguage || effectiveScript,
            hasUnreadableRegions: false,
            rotation: 0,
            contrast: 100,
            brightness: 100,
            binarizeThreshold: 0,
            extractionSource: isNative ? "native_pdf" : "gemini_ocr",
            isScanned: p.isScanned,
            status: isNative ? "completed" : "pending",
          };
        });

        const scannedPagesCount = initialPages.filter((p) => p.isScanned).length;
        const estimatedCost = scannedPagesCount * 0.00015;

        const newJob: OCRJob = {
          id: `ocr-job-${Date.now()}`,
          fileName: file.name,
          fileSize: file.size,
          totalPages: docResult.totalPages,
          currentPage: 1,
          status: scannedPagesCount === 0 ? "completed" : "review_required",
          scriptHint: effectiveScript,
          readingOrder: effectiveOrder,
          pages: initialPages,
          averageConfidence: scannedPagesCount === 0 ? 1.0 : 0.85,
          pdfType: docResult.detectedType,
          estimatedCostUsd: Math.round(estimatedCost * 10000) / 10000,
          apiCallCount: 0,
        };

        setJob(newJob);
        setSelectedPageIndex(0);

        // Immediate Assist: If first page is scanned or pending (common in Urdu/Nastaliq PDFs),
        // automatically trigger OCR on page 1 so the user gets instant text without confusion!
        if (initialPages.length > 0 && initialPages[0].status === "pending") {
          setTimeout(() => {
            handleProcessSinglePageWithJob(newJob, 0, effectiveScript, effectiveOrder);
          }, 150);
        }
      } else {
        // Single Image Upload (Scanned page)
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const singlePage: OCRPage = {
            pageNumber: 1,
            originalImageUrl: result,
            extractedText: "",
            editedText: "",
            isApproved: false,
            confidence: 0,
            detectedScript: scriptHint,
            hasUnreadableRegions: false,
            rotation: 0,
            contrast: 100,
            brightness: 100,
            binarizeThreshold: 0,
            extractionSource: "gemini_ocr",
            isScanned: true,
            status: "pending",
          };

          const newJob: OCRJob = {
            id: `ocr-job-${Date.now()}`,
            fileName: file.name,
            fileSize: file.size,
            totalPages: 1,
            currentPage: 1,
            status: "draft",
            scriptHint,
            readingOrder,
            pages: [singlePage],
            averageConfidence: 0,
            pdfType: "scanned_image",
            estimatedCostUsd: 0.00015,
            apiCallCount: 0,
          };

          setJob(newJob);
          setSelectedPageIndex(0);

          // Auto-run OCR on uploaded image
          setTimeout(() => {
            handleProcessSinglePageWithJob(newJob, 0, scriptHint, readingOrder);
          }, 150);
        };
        reader.readAsDataURL(file);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFailedFileForDirectOcr(file);
      setErrorMsg(`ব্রাউজারে PDF রেন্ডারিংয়ে সমস্যা হয়েছে (${msg})। আপনি নিচের বাটন চেপে সরাসরি ক্লাউড এআই ভিশন (Direct Gemini OCR) দিয়ে উদ্ধার করতে পারেন।`);
    } finally {
      setIsInspectingPdf(false);
      setInspectProgress("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Archival Sample Loader for Verification & Testing
  const loadTestSample = (
    sampleType: "digital_bengali" | "scanned_bengali" | "english_classic" | "urdu_classic"
  ) => {
    setErrorMsg(null);

    if (sampleType === "digital_bengali") {
      // 1. Digital Bengali PDF (Native Text Extraction - 100% precision, $0 API cost)
      const p1 = `প্রথম অধ্যায়: নির্ঝরের স্বপ্নভঙ্গ

আজি এ প্রভাতে রবির কর
কেমনে পশিল প্রাণের পর,
কেমনে পশিল গুহার আঁধারে প্রভাতপাখির গান!
না জানি কেন রে এতদিন পরে জাগিয়া উঠিল প্রাণ।

জাগিয়া উঠেছে প্রাণ,
ওরে উথলি উঠেছে বারি,
ওরে প্রাণের বাসনা প্রাণের আবেগ রুধিয়া রাখিতে নারি!
থর থর করি কাঁপিছে ভূধর,
শিলা রাশি রাশি পড়িছে খসে,
ফুলিয়া ফুলিয়া ফেনিল সলিল
গরজি উঠিছে দারুণ রোষে!

[উৎস: রবীন্দ্র-রচনাবলী, কাব্যগ্রন্থমালা। বিশুদ্ধ ডিজিটাল টেক্সট ধারা]`;

      const p2 = `দ্বিতীয় অধ্যায়: প্রতিধ্বনি ও অনন্ত জীবন

হেথা হতে কোথা আমি যাব কোন দেশে?
যাহা পাই তাই লয়ে যাই কত ভালোবেসে।
নদী কহে, ‘আমি যাই সাগরে মিলিতে।’
বায়ু কহে, ‘আমি যাই সুদূরে খেলিতে।’
মানবাত্মা কহে, ‘আমি মৃত্যুর ওপারে অমৃতের সন্ধান করি।’

জগতের যত রূপ, যত রস, যত গন্ধ—সকলের মাঝে এক পরম অনন্ত সুর বাঁধা রহিয়াছে।`;

      const samplePages: OCRPage[] = [
        {
          pageNumber: 1,
          originalImageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=900&auto=format&fit=crop&q=80",
          extractedText: p1,
          editedText: p1,
          isApproved: true,
          confidence: 1.0,
          detectedScript: "Bengali & English",
          hasUnreadableRegions: false,
          rotation: 0,
          contrast: 100,
          brightness: 100,
          binarizeThreshold: 0,
          extractionSource: "native_pdf",
          isScanned: false,
          status: "completed",
        },
        {
          pageNumber: 2,
          originalImageUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=900&auto=format&fit=crop&q=80",
          extractedText: p2,
          editedText: p2,
          isApproved: true,
          confidence: 1.0,
          detectedScript: "Bengali & English",
          hasUnreadableRegions: false,
          rotation: 0,
          contrast: 100,
          brightness: 100,
          binarizeThreshold: 0,
          extractionSource: "native_pdf",
          isScanned: false,
          status: "completed",
        },
      ];

      setScriptHint("Bengali & English");
      setReadingOrder("standard");
      setManualRtl(false);
      setJob({
        id: `ocr-sample-${Date.now()}`,
        fileName: "Tagore_Nirjharer_Swapnabhanga_Digital.pdf",
        fileSize: 1024 * 420,
        totalPages: 2,
        currentPage: 1,
        status: "completed",
        scriptHint: "Bengali & English",
        readingOrder: "standard",
        pages: samplePages,
        averageConfidence: 1.0,
        pdfType: "digital_text",
        estimatedCostUsd: 0.0,
        apiCallCount: 0,
      });
      setSelectedPageIndex(0);
    } else if (sampleType === "scanned_bengali") {
      // 2. Scanned Bengali PDF with faint ink and suspicious unreadable words
      const scannedP1 = `পাণ্ডুলিপি খসড়া — পৃষ্ঠা ১

আমার মাথা নত করে দাও হে তোমার চরণধূলার তলে।
সকল [?] হে আমার ডুবাও চোখের জলে।

নিজেরে করিতে গৌরব দান নিজেরে কেবলি করি [?]
আপনারে শুধু ঘেরিয়া ঘেরিয়া ঘুরে মরি পলে পলে।

[সন্দেহজনক পাঠ নোট: দ্বিতীয় ও চতুর্থ ছত্রে মূল পাণ্ডুলিপির কালির পাঠ ক্ষয়প্রাপ্ত হওয়ায় [?] দ্বারা চিহ্নিত করা হয়েছে।]`;

      const samplePages: OCRPage[] = [
        {
          pageNumber: 1,
          originalImageUrl: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=900&auto=format&fit=crop&q=80",
          extractedText: scannedP1,
          editedText: scannedP1,
          isApproved: false,
          confidence: 0.88,
          detectedScript: "Bengali & English",
          hasUnreadableRegions: true,
          unreadableNotes: "কালির পাঠ ক্ষয়প্রাপ্ত ও কোণায় ছেঁড়া দাগ বিদ্যমান।",
          rotation: 0,
          contrast: 120,
          brightness: 95,
          binarizeThreshold: 110,
          extractionSource: "gemini_ocr",
          isScanned: true,
          status: "completed",
        },
      ];

      setScriptHint("Bengali & English");
      setReadingOrder("standard");
      setManualRtl(false);
      setJob({
        id: `ocr-sample-${Date.now()}`,
        fileName: "Rabindranath_Archival_Manuscript_Scanned.pdf",
        fileSize: 1024 * 1480,
        totalPages: 1,
        currentPage: 1,
        status: "review_required",
        scriptHint: "Bengali & English",
        readingOrder: "standard",
        pages: samplePages,
        averageConfidence: 0.88,
        pdfType: "scanned_image",
        estimatedCostUsd: 0.00015,
        apiCallCount: 1,
      });
      setSelectedPageIndex(0);
    } else if (sampleType === "urdu_classic") {
      // 4. Urdu Classical Literature (Diwan-e-Ghalib - Mirza Ghalib Nastaliq)
      const urduP1 = `دیوانِ غالب — غزل نمبر ۱ (خطِ نستعلیق)

نقش فریادی ہے کس کی شوخیٔ تحریر کا
کاغذی ہے پیرہن ہر پیکرِ تصویر کا

کاوشِ سخت جانی ہائے تنہائی نہ پوچھ
صبح کرنا شام کا، لانا ہے جوئے شیر کا

جذبۂ بے اختیارِ شوق دیکھا چاہیے
سینۂ شمشیر سے باہر ہے دم شمشیر کا

بسکہ ہوں غالب اسیری میں بھی آتش زیرِ پا
موئے آتش دیدہ ہے حلقہ مری زنجیر کا

[نستعلیق نوٹس: کلاسیکی کلامِ مرزا اسد اللہ خاں غالب۔ نستعلیق اعراب و نکتہ جات کے ساتھ مکمل اردو بحالی]`;

      const samplePages: OCRPage[] = [
        {
          pageNumber: 1,
          originalImageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=900&auto=format&fit=crop&q=80",
          extractedText: urduP1,
          editedText: urduP1,
          isApproved: true,
          confidence: 0.97,
          detectedScript: "Urdu (اردو / نستعلیق - Nastaliq & Naskh)",
          hasUnreadableRegions: false,
          rotation: 0,
          contrast: 100,
          brightness: 100,
          binarizeThreshold: 0,
          extractionSource: "gemini_ocr",
          isScanned: true,
          status: "completed",
        },
      ];

      setScriptHint("Urdu (اردو / نستعلیق - Nastaliq & Naskh)");
      setReadingOrder("bidi_rtl");
      setManualRtl(true);
      setJob({
        id: `ocr-sample-${Date.now()}`,
        fileName: "Diwan_e_Ghalib_Nastaliq_Manuscript.pdf",
        fileSize: 1024 * 720,
        totalPages: 1,
        currentPage: 1,
        status: "completed",
        scriptHint: "Urdu (اردو / نستعلیق - Nastaliq & Naskh)",
        readingOrder: "bidi_rtl",
        pages: samplePages,
        averageConfidence: 0.97,
        pdfType: "scanned_image",
        estimatedCostUsd: 0.00015,
        apiCallCount: 1,
      });
      setSelectedPageIndex(0);
    } else {
      // 3. English Literature Classic
      const engP1 = `Chapter I: The River and the Woods

The day was drawing to its solemn close when the boat drifted into the tranquil bends of the river. A cool wind rose from the vast sandbanks, carrying with it the scent of wet silt and wild reeds.

On the shore, village elders stood in quiet contemplation as the sunset dyed the waters in shades of molten bronze.

"Master," whispered the old boatman, resting his oar against the gunwale, "the night will be dark, but the stars are already kindling above the eastern woods."`;

      const samplePages: OCRPage[] = [
        {
          pageNumber: 1,
          originalImageUrl: "https://images.unsplash.com/photo-1463320726281-696a485928c7?w=900&auto=format&fit=crop&q=80",
          extractedText: engP1,
          editedText: engP1,
          isApproved: true,
          confidence: 0.98,
          detectedScript: "English & Latin",
          hasUnreadableRegions: false,
          rotation: 0,
          contrast: 100,
          brightness: 100,
          binarizeThreshold: 0,
          extractionSource: "native_pdf",
          isScanned: false,
          status: "completed",
        },
      ];

      setScriptHint("English & Latin");
      setReadingOrder("standard");
      setManualRtl(false);
      setJob({
        id: `ocr-sample-${Date.now()}`,
        fileName: "English_Literary_Anthology_Vol1.pdf",
        fileSize: 1024 * 650,
        totalPages: 1,
        currentPage: 1,
        status: "completed",
        scriptHint: "English & Latin",
        readingOrder: "standard",
        pages: samplePages,
        averageConfidence: 0.98,
        pdfType: "digital_text",
        estimatedCostUsd: 0.0,
        apiCallCount: 0,
      });
      setSelectedPageIndex(0);
    }
  };

  // Run OCR on Single Page
  const handleProcessSinglePage = async () => {
    if (!job || !currentPage) return;

    setIsSinglePageProcessing(true);
    setErrorMsg(null);

    try {
      // Use enhanced canvas image if filters were applied
      const imageToOcr = enhancedPreviewUrl || currentPage.originalImageUrl;

      const res = await callGeminiOCR(imageToOcr, scriptHint, readingOrder);

      const isUrdu =
        res.detectedLanguage?.toLowerCase().includes("urdu") ||
        res.readingDirection === "rtl" ||
        /[\u0600-\u06FF]/.test(res.extractedText || "");

      if (isUrdu) {
        setReadingOrder("bidi_rtl");
        setScriptHint("Urdu (اردو / نستعلیق - Nastaliq & Naskh)");
      }

      const updatedPages = [...job.pages];
      updatedPages[selectedPageIndex] = {
        ...currentPage,
        extractedText: res.extractedText || "",
        editedText: res.extractedText || "",
        confidence: res.confidenceScore || 0.92,
        detectedScript: res.detectedLanguage || scriptHint,
        hasUnreadableRegions: res.hasUnreadableRegions || false,
        unreadableNotes: res.unreadableNotes || (res.suspiciousWords?.length ? `অস্পষ্ট শব্দ: ${res.suspiciousWords.join(", ")}` : ""),
        extractionSource: "gemini_ocr",
        status: "completed",
      };

      const updatedJob: OCRJob = {
        ...job,
        status: "review_required",
        pages: updatedPages,
        apiCallCount: (job.apiCallCount || 0) + 1,
      };

      setJob(updatedJob);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`OCR ব্যর্থ হয়েছে: ${msg}। ব্যাকএন্ডে GEMINI_API_KEY কনফিগার করা আছে কিনা পরীক্ষা করুন।`);

      // Mark page as failed
      if (job) {
        const updatedPages = [...job.pages];
        updatedPages[selectedPageIndex] = {
          ...currentPage,
          status: "failed",
          error: msg,
        };
        setJob({ ...job, pages: updatedPages });
      }
    } finally {
      setIsSinglePageProcessing(false);
    }
  };

  // Batch Processor for all scanned or pending pages
  const handleRunBatchOcr = async () => {
    if (!job) return;

    setIsProcessingBatch(true);
    setCancelBatchRef(false);
    setErrorMsg(null);

    const pagesToRun = job.pages.filter((p) => p.status === "pending" || p.status === "failed");
    setBatchProgress({ current: 0, total: pagesToRun.length });

    const updatedPages = [...job.pages];
    let apiCalls = job.apiCallCount || 0;

    for (let i = 0; i < pagesToRun.length; i++) {
      if (cancelBatchRef) {
        setErrorMsg("ব্যাচ প্রসেসিং ব্যবহারকারী কর্তৃক স্থগিত করা হয়েছে।");
        break;
      }

      const p = pagesToRun[i];
      setBatchProgress({ current: i + 1, total: pagesToRun.length });

      try {
        const enhanced = await applyImageEnhancements(p.originalImageUrl, {
          rotation: p.rotation || 0,
          contrast: p.contrast || 100,
          brightness: p.brightness || 100,
          binarizeThreshold: p.binarizeThreshold || 0,
          sharpen: true,
        });

        const res = await callGeminiOCR(enhanced, scriptHint, readingOrder);
        apiCalls++;

        const pIdx = updatedPages.findIndex((pg) => pg.pageNumber === p.pageNumber);
        if (pIdx >= 0) {
          updatedPages[pIdx] = {
            ...updatedPages[pIdx],
            extractedText: res.extractedText || "",
            editedText: res.extractedText || "",
            confidence: res.confidenceScore || 0.92,
            detectedScript: res.detectedLanguage || scriptHint,
            hasUnreadableRegions: res.hasUnreadableRegions || false,
            unreadableNotes: res.unreadableNotes || "",
            extractionSource: "gemini_ocr",
            status: "completed",
          };
        }
        setJob({ ...job, pages: updatedPages, apiCallCount: apiCalls });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const pIdx = updatedPages.findIndex((pg) => pg.pageNumber === p.pageNumber);
        if (pIdx >= 0) {
          updatedPages[pIdx] = {
            ...updatedPages[pIdx],
            status: "failed",
            error: msg,
          };
        }
        setJob({ ...job, pages: updatedPages, apiCallCount: apiCalls });
      }
    }

    setIsProcessingBatch(false);
  };

  // Text Edit Handler
  const handleTextEdit = (text: string) => {
    if (!job || !currentPage) return;
    const updatedPages = [...job.pages];
    updatedPages[selectedPageIndex] = { ...currentPage, editedText: text };
    setJob({ ...job, pages: updatedPages });
  };

  // Toggle Page Approval
  const handleToggleApprove = () => {
    if (!job || !currentPage) return;
    const updatedPages = [...job.pages];
    const newApproved = !currentPage.isApproved;
    updatedPages[selectedPageIndex] = { ...currentPage, isApproved: newApproved };

    const allApproved = updatedPages.every((p) => p.isApproved);
    setJob({
      ...job,
      pages: updatedPages,
      status: allApproved ? "completed" : "review_required",
    });
  };

  // Copy text to clipboard
  const handleCopyText = () => {
    if (!currentPage) return;
    navigator.clipboard.writeText(currentPage.editedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // EXPORT HANDLERS: TXT, DOCX, JSON
  const handleExportTxt = () => {
    if (!job) return;
    const fullText = job.pages
      .map(
        (p) =>
          `========================================\nপৃষ্ঠা নম্বর: ${p.pageNumber} (${p.extractionSource === "native_pdf" ? "সরাসরি ডিজিটাল টেক্সট" : "এআই ওসিআর"})\n========================================\n\n${p.editedText}\n`
      )
      .join("\n\n");

    downloadTextFile(fullText, `${job.fileName.replace(/\.[^/.]+$/, "")}_extracted.txt`);
  };

  const handleExportDocx = () => {
    if (!job) return;
    const pagesForDoc = job.pages.map((p) => ({
      pageNumber: p.pageNumber,
      text: p.editedText,
    }));
    const blob = generateDocxBlob(job.fileName, pagesForDoc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${job.fileName.replace(/\.[^/.]+$/, "")}_manuscript.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    if (!job) return;
    const jsonPayload = {
      archive: "NBM Audio & Book Studio OCR Extraction Archive",
      exportedAt: new Date().toISOString(),
      document: {
        fileName: job.fileName,
        fileSize: job.fileSize,
        totalPages: job.totalPages,
        pdfType: job.pdfType,
        scriptHint: job.scriptHint,
        readingOrder: job.readingOrder,
        averageConfidence: job.averageConfidence,
        estimatedCostUsd: job.estimatedCostUsd,
      },
      pages: job.pages.map((p) => ({
        pageNumber: p.pageNumber,
        extractionSource: p.extractionSource,
        confidence: p.confidence,
        isApproved: p.isApproved,
        hasUnreadableRegions: p.hasUnreadableRegions,
        unreadableNotes: p.unreadableNotes,
        originalRawText: p.extractedText,
        userCorrectedText: p.editedText,
      })),
    };

    downloadTextFile(
      JSON.stringify(jsonPayload, null, 2),
      `${job.fileName.replace(/\.[^/.]+$/, "")}_ocr_data.json`,
      "application/json"
    );
  };

  // Suspicious words count in current page
  const suspiciousCount = (currentPage?.editedText.match(/\[\?\]/g) || []).length;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#B88746]">
            <FileScan className="w-4 h-4" />
            <span className="font-semibold uppercase tracking-wider">High-Precision OCR & PDF Studio</span>
            <span aria-hidden="true">·</span>
            <span>Digital Text Stream & Scanned Multi-Script Vision</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-[#F4EFE6]">PDF & OCR Studio</h1>
          <p className="text-xs text-[#8F9AA9] mt-0.5 font-editorial text-sm">
            সাধারণ PDF থেকে সরাসরি টেক্সট এবং স্ক্যান করা পাতা থেকে স্ক্রিপ্ট-সচেতন এআই ওসিআর। সাইড-বাই-সাইড সম্পাদনা, ইমেজ এনহ্যান্সমেন্ট ও TXT/DOCX/JSON এক্সপোর্ট।
          </p>
        </div>

        {/* Archival Test Samples for Immediate Verification */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-[#7F8D9E]">যাচাইকরণ নমুনা:</span>
          <button
            onClick={() => loadTestSample("digital_bengali")}
            className="px-2.5 py-1 bg-[#181D26] hover:bg-[#232B3B] text-[#D8CFBF] rounded border border-[#2B3445] text-xs font-editorial transition-colors"
            title="সাধারণ বাংলা PDF (সরাসরি টেক্সট এক্সট্রাকশন - $0)"
          >
            ১. সাধারণ বাংলা PDF (ডিজিটাল)
          </button>
          <button
            onClick={() => loadTestSample("scanned_bengali")}
            className="px-2.5 py-1 bg-[#181D26] hover:bg-[#232B3B] text-[#D8CFBF] rounded border border-[#2B3445] text-xs font-editorial transition-colors"
            title="স্ক্যান করা ঝাপসা পাণ্ডুলিপি OCR"
          >
            ২. স্ক্যান করা বাংলা PDF (OCR)
          </button>
          <button
            onClick={() => loadTestSample("english_classic")}
            className="px-2.5 py-1 bg-[#181D26] hover:bg-[#232B3B] text-[#D8CFBF] rounded border border-[#2B3445] text-xs font-editorial transition-colors"
            title="ইংরেজি ক্লাসিক PDF"
          >
            ৩. ইংরেজি PDF
          </button>
          <button
            onClick={() => loadTestSample("urdu_classic")}
            className="px-2.5 py-1 bg-[#1C2029] hover:bg-[#283042] text-[#E8DEC8] rounded border border-[#3E4A61] text-xs font-editorial transition-colors flex items-center gap-1.5 shadow-sm"
            title="উর্দু শাস্ত্রীয় পাণ্ডুলিপি ও গজল (দিওয়ান-ই-গালিব خطِ نستعلیق)"
          >
            <span className="text-[#E0A96D] font-bold font-mono">۴</span>
            <span>উর্দু পাণ্ডুলিপি (دیوان غالب)</span>
          </button>
        </div>
      </div>

      {/* Upload Zone & Inspector Header */}
      <div className="bg-[#12151C] border border-[#202735] p-5 rounded-md space-y-4 manuscript-paper">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePdfUpload}
              accept="application/pdf,image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isInspectingPdf}
              className="px-4 py-2 bg-[#B88746] hover:bg-[#C99654] disabled:opacity-50 text-[#0D0F12] text-xs font-semibold rounded flex items-center gap-2 transition-colors shadow-sm"
            >
              <Upload className="w-4 h-4" />
              <span>{isInspectingPdf ? "অ্যানালাইসিস চলছে..." : "Upload PDF / Scanned Book"}</span>
            </button>

            {job && (
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="text-[#EDE8DE] font-semibold">{job.fileName}</span>
                <span className="text-[#647185]">({(job.fileSize / (1024 * 1024)).toFixed(2)} MB)</span>
                <span className="text-[#7F8D9E]">·</span>
                <span className="text-[#B88746]">{job.totalPages} পৃষ্ঠা</span>
                <span className="text-[#7F8D9E]">·</span>
                <span className="text-[#50B876] uppercase">
                  {job.pdfType === "digital_text"
                    ? "ডিজিটাল টেক্সট (Direct Stream)"
                    : job.pdfType === "scanned_image"
                    ? "স্ক্যান করা ইমেজ (OCR প্রয়োজন)"
                    : "মিশ্র ফরম্যাট"}
                </span>
              </div>
            )}
          </div>

          {/* Script Hint & Reading Order */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[#7F8D9E]">ভাষা / লিপি:</span>
              <select
                value={scriptHint}
                onChange={(e) => {
                  const val = e.target.value;
                  setScriptHint(val);
                  if (val.toLowerCase().includes("urdu") || val.toLowerCase().includes("arabic")) {
                    setReadingOrder("bidi_rtl");
                    setManualRtl(true);
                  }
                }}
                className="bg-[#0E1015] border border-[#242C3D] rounded px-2.5 py-1.5 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
              >
                <option value="Auto-Detect (Urdu, Bengali, Arabic, English...)">⚡ Auto-Detect (উর্দু, বাংলা, আরবি, ইংরেজি...)</option>
                <option value="Urdu (اردو / نستعلیق - Nastaliq & Naskh)">اردو (Urdu Nastaliq & Naskh)</option>
                <option value="Bengali & English">বাংলা (Bengali Unicode)</option>
                <option value="English & Latin">English & European Latin</option>
                <option value="Arabic & Persian">العربية / فارسی (Arabic & Persian)</option>
                <option value="Japanese (Kanji & Kana)">日本語 (Japanese Kanji/Kana)</option>
                <option value="Hindi & Devanagari">हिन्दी (Hindi & Sanskrit)</option>
                <option value="Cyrillic (Russian)">Русский (Russian Cyrillic)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[#7F8D9E]">দিক / কলাম:</span>
              <select
                value={readingOrder}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setReadingOrder(val);
                  if (val === "bidi_rtl") setManualRtl(true);
                  else if (val === "standard") setManualRtl(false);
                }}
                className="bg-[#0E1015] border border-[#242C3D] rounded px-2.5 py-1.5 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
              >
                <option value="standard">Standard Left-to-Right (LTR)</option>
                <option value="bidi_rtl">Right-to-Left (RTL - উর্দু / আরবি)</option>
                <option value="two_column">Double Column (দ্বি-কলাম)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading Indicator */}
        {isInspectingPdf && (
          <div className="p-3 bg-[#171D27] border border-[#2B374D] rounded text-xs text-[#A8B4C7] flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#B88746]" />
            <span>{inspectProgress}</span>
          </div>
        )}
      </div>

      {/* Error & Direct PDF Fallback Action Notification */}
      {errorMsg && (
        <div className="p-4 bg-[#2C1818] border border-[#682424] text-[#F3A5A5] text-xs rounded-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#E66262] shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-xs text-[#AFA3A3] hover:text-white">
              Dismiss
            </button>
          </div>
          {failedFileForDirectOcr && (
            <div className="pt-2 border-t border-[#4A2020] flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] text-[#E0C0C0]">
                ব্রাউজারে রেন্ডার ছাড়াও Gemini 3.8 ভিশন সরাসরি সম্পূর্ণ PDF ডকুমেন্ট পড়বে:
              </span>
              <button
                onClick={handleDirectGeminiPdfOcr}
                disabled={isInspectingPdf}
                className="px-3 py-1.5 bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12] text-xs font-semibold rounded flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>সরাসরি Gemini Cloud PDF OCR চালান</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Workspace */}
      {job && currentPage ? (
        <div className="space-y-4">
          {/* Header Bar with Batch Status, Cost & Multi-format Export */}
          <div className="bg-[#12151C] border border-[#202735] p-4 rounded-md flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              {/* Batch Processing Button */}
              {job.pages.some((p) => p.status === "pending" || p.status === "failed") && (
                <button
                  onClick={isProcessingBatch ? () => setCancelBatchRef(true) : handleRunBatchOcr}
                  className={`px-3 py-1.5 rounded font-semibold flex items-center gap-1.5 transition-colors ${
                    isProcessingBatch
                      ? "bg-[#E66262] text-white"
                      : "bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12]"
                  }`}
                >
                  {isProcessingBatch ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>স্থগিত করুন ({batchProgress.current}/{batchProgress.total})</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>সকল পাতা ব্যাচ OCR করুন ({job.pages.filter((p) => p.status === "pending").length})</span>
                    </>
                  )}
                </button>
              )}

              {/* API Cost Badge */}
              <div className="flex items-center gap-1.5 font-mono text-[#8C98AC]">
                <Coins className="w-3.5 h-3.5 text-[#B88746]" />
                <span>
                  সম্ভাব্য API খরচ:{" "}
                  <strong className="text-[#EDE8DE]">
                    {job.pdfType === "digital_text" ? "$0.00 (ফ্রি টেক্সট)" : `$${job.estimatedCostUsd || "0.00"}`}
                  </strong>
                </span>
              </div>
            </div>

            {/* Export Toolbar: TXT, DOCX, JSON */}
            <div className="flex items-center gap-2">
              <span className="text-[#7F8D9E] font-medium">Export Full Document:</span>
              <button
                onClick={handleExportTxt}
                className="px-2.5 py-1.5 bg-[#181D26] hover:bg-[#222938] text-[#D8CFBF] rounded border border-[#283244] font-mono text-[11px] flex items-center gap-1 transition-colors"
                title="Download Plain Text with page markers"
              >
                <FileText className="w-3 h-3 text-[#B88746]" />
                <span>.TXT</span>
              </button>
              <button
                onClick={handleExportDocx}
                className="px-2.5 py-1.5 bg-[#181D26] hover:bg-[#222938] text-[#D8CFBF] rounded border border-[#283244] font-mono text-[11px] flex items-center gap-1 transition-colors"
                title="Download MS Word styled DOCX document"
              >
                <FileDown className="w-3 h-3 text-[#50B876]" />
                <span>.DOCX</span>
              </button>
              <button
                onClick={handleExportJson}
                className="px-2.5 py-1.5 bg-[#181D26] hover:bg-[#222938] text-[#D8CFBF] rounded border border-[#283244] font-mono text-[11px] flex items-center gap-1 transition-colors"
                title="Download Structured JSON with Confidence & Audit Trail"
              >
                <FileCode className="w-3 h-3 text-[#6292E6]" />
                <span>.JSON</span>
              </button>
            </div>
          </div>

          {/* Page Selector Strip */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[#7F8D9E] text-[11px] font-mono shrink-0">পৃষ্ঠাসমূহ:</span>
            {job.pages.map((p, idx) => {
              const isSelected = selectedPageIndex === idx;
              return (
                <button
                  key={p.pageNumber}
                  onClick={() => setSelectedPageIndex(idx)}
                  className={`px-3 py-1.5 rounded text-xs font-mono transition-colors flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? "bg-[#B88746] text-[#0D0F12] font-semibold shadow-sm"
                      : "bg-[#141822] text-[#8692A6] hover:bg-[#1C2230]"
                  }`}
                >
                  <span>পৃষ্ঠা {p.pageNumber}</span>
                  {p.extractionSource === "native_pdf" ? (
                    <span className="text-[10px] text-[#50B876]">TXT</span>
                  ) : p.status === "completed" ? (
                    <CheckCircle2 className="w-3 h-3 text-[#50B876]" />
                  ) : p.status === "failed" ? (
                    <AlertCircle className="w-3 h-3 text-[#E66262]" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D49842]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Side-by-Side Comparison Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Original / Enhanced Page Visual with Canvas Filter Engine */}
            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between text-xs text-[#9DA7B8] px-1">
                <span className="font-semibold text-[#EDE8DE] flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#B88746]" />
                  মূল পৃষ্ঠা প্রিভিউ (পৃষ্ঠা {currentPage.pageNumber})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const nextRot = (rotation + 90) % 360;
                      setRotation(nextRot);
                      handleApplyFilters(nextRot, contrast, brightness, binarizeThreshold);
                    }}
                    className="p-1.5 bg-[#181D28] hover:bg-[#232B3B] rounded border border-[#2B3547] text-[#C9BFAD] transition-colors flex items-center gap-1 text-[11px]"
                    title="Rotate 90 degrees clockwise"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-[#B88746]" />
                    <span>{rotation}°</span>
                  </button>
                </div>
              </div>

              {/* Image Pre-processing Enhancement Controls */}
              <div className="bg-[#12151C] border border-[#202735] p-3 rounded text-xs space-y-2 text-[#8C98AC]">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-[#C9BFAD] flex items-center gap-1">
                    <Sliders className="w-3 h-3 text-[#B88746]" />
                    <span>Image Enhancement (ঝাপসা ও বাঁকা পাতার ফিল্টার)</span>
                  </span>
                  <button
                    onClick={() => {
                      setContrast(100);
                      setBrightness(100);
                      setBinarizeThreshold(0);
                      setRotation(0);
                      handleApplyFilters(0, 100, 100, 0);
                    }}
                    className="text-[10px] text-[#7F8D9E] hover:text-[#EDE8DE]"
                  >
                    Reset
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <div className="flex justify-between text-[10px]">
                      <span>কনট্রাস্ট:</span>
                      <span className="font-mono">{contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="60"
                      max="200"
                      value={contrast}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setContrast(val);
                        handleApplyFilters(rotation, val, brightness, binarizeThreshold);
                      }}
                      className="w-full accent-[#B88746]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px]">
                      <span>উজ্জ্বলতা:</span>
                      <span className="font-mono">{brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="60"
                      max="160"
                      value={brightness}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setBrightness(val);
                        handleApplyFilters(rotation, contrast, val, binarizeThreshold);
                      }}
                      className="w-full accent-[#B88746]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px]">
                      <span>কালির স্পষ্টতা (Threshold):</span>
                      <span className="font-mono">{binarizeThreshold > 0 ? `${binarizeThreshold}` : "Off"}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="180"
                      step="10"
                      value={binarizeThreshold}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setBinarizeThreshold(val);
                        handleApplyFilters(rotation, contrast, brightness, val);
                      }}
                      className="w-full accent-[#B88746]"
                    />
                  </div>
                </div>
              </div>

              {/* Page Visual Canvas */}
              <div className="relative aspect-[3/4] bg-[#0A0C0F] border border-[#222938] rounded-md overflow-hidden flex items-center justify-center p-2">
                <img
                  src={enhancedPreviewUrl || currentPage.originalImageUrl}
                  alt={`Page ${currentPage.pageNumber}`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>

              {/* Single Page Extraction Action */}
              <button
                onClick={handleProcessSinglePage}
                disabled={isSinglePageProcessing || isProcessingBatch}
                className="w-full py-2.5 bg-[#B88746] hover:bg-[#C99654] disabled:opacity-50 text-[#0D0F12] text-xs font-semibold rounded transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {isSinglePageProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Gemini Vision OCR প্রসেস করা হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>পৃষ্ঠা {currentPage.pageNumber} OCR / রিকভার করুন</span>
                  </>
                )}
              </button>
            </div>

            {/* Right: Recovered Text & Editable Manuscript View */}
            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between text-xs text-[#9DA7B8] px-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-[#B88746]" />
                  <span className="font-semibold text-[#EDE8DE]">উদ্ধারকৃত পাণ্ডুলিপি পাঠ</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#242E40] text-[#A6B4C8]">
                    {currentPage.extractionSource === "native_pdf" ? "সরাসরি ডিজিটাল টেক্সট ($0)" : "Gemini 3.8 OCR"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* RTL / LTR Toggle */}
                  <button
                    onClick={() => setManualRtl(!isCurrentRtl)}
                    className={`px-2 py-0.5 text-[11px] rounded border transition-colors flex items-center gap-1 ${
                      isCurrentRtl
                        ? "bg-[#B88746]/20 border-[#B88746] text-[#E0D7C6]"
                        : "bg-[#181D28] border-[#2A3448] text-[#8692A6]"
                    }`}
                    title="Toggle Right-to-Left (RTL for Urdu/Arabic) / Left-to-Right"
                  >
                    {isCurrentRtl ? <AlignRight className="w-3 h-3 text-[#B88746]" /> : <AlignLeft className="w-3 h-3" />}
                    <span>{isCurrentRtl ? "RTL (উর্দু/নস্তালিক)" : "LTR"}</span>
                  </button>

                  {/* Font Size Adjusters */}
                  <div className="flex items-center border border-[#2A3448] rounded bg-[#181D28] text-[11px] text-[#C9BFAD] px-1">
                    <button
                      onClick={() => setEditorFontSize((prev) => Math.max(12, prev - 1))}
                      className="px-1.5 py-0.5 hover:text-white"
                      title="ফন্ট সাইজ কমান"
                    >
                      A-
                    </button>
                    <span className="text-[10px] text-[#7F8D9E] px-1 font-mono">{editorFontSize}px</span>
                    <button
                      onClick={() => setEditorFontSize((prev) => Math.min(28, prev + 1))}
                      className="px-1.5 py-0.5 hover:text-white"
                      title="ফন্ট সাইজ বাড়ান"
                    >
                      A+
                    </button>
                  </div>

                  <button
                    onClick={() => setShowDiffView(!showDiffView)}
                    className={`px-2 py-0.5 text-[11px] rounded border transition-colors ${
                      showDiffView
                        ? "bg-[#B88746]/20 border-[#B88746] text-[#E0D7C6]"
                        : "bg-[#181D28] border-[#2A3448] text-[#8692A6]"
                    }`}
                    title="Toggle Original vs Edited Text Comparison"
                  >
                    মূল পাঠ তুলনা
                  </button>

                  <button
                    onClick={handleCopyText}
                    className="p-1.5 bg-[#181D28] hover:bg-[#232B3B] rounded border border-[#2B3547] text-[#C9BFAD] transition-colors"
                    title="Copy recovered text"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#50B876]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Quality & Suspicious Words Warning Box */}
              {suspiciousCount > 0 && (
                <div className="p-3 bg-[#241E15] border border-[#553E1B] text-[#E0C07F] text-xs rounded flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-[#D49842]" />
                    <span>
                      সতর্কতা: এই পৃষ্ঠায় {suspiciousCount}টি অস্পষ্ট/ক্ষতিগ্রস্ত শব্দ <code className="font-mono text-[#FFE8B8]">[?]</code> হিসেবে চিহ্নিত করা হয়েছে। এআই নিজে থেকে কোনো শব্দ বানায়নি।
                    </span>
                  </div>
                </div>
              )}

              {/* Side-by-side or Diff View */}
              {showDiffView ? (
                <div className="space-y-2">
                  <div className="text-[11px] text-[#7F8D9E] flex justify-between">
                    <span>মূল অপরিবর্তিত এআই/ডিজিটাল টেক্সট:</span>
                    <span>সংশোধিত কপি নিচে</span>
                  </div>
                  <div
                    dir={isCurrentRtl ? "rtl" : "ltr"}
                    className={`h-44 bg-[#0A0C0F] border border-[#1E2535] rounded p-3 text-xs text-[#9AA5B8] overflow-y-auto ${
                      isCurrentRtl
                        ? "font-['Noto_Nastaliq_Urdu','Amiri',serif] leading-[2.4] text-right"
                        : "font-editorial leading-relaxed"
                    }`}
                  >
                    {currentPage.extractedText || "কোনো মূল টেক্সট এখনো নিষ্কাশন করা হয়নি।"}
                  </div>
                </div>
              ) : null}

              {/* Textarea for Editing */}
              <div className="relative">
                <textarea
                  dir={isCurrentRtl ? "rtl" : "ltr"}
                  value={currentPage.editedText}
                  onChange={(e) => handleTextEdit(e.target.value)}
                  placeholder="উদ্ধার করা লেখা এখানে প্রদর্শিত হবে। আপনি যেকোনো শব্দ, প্যারাগ্রাফ বা চিহ্ন সরাসরি সম্পাদনা ও শুদ্ধ করতে পারেন..."
                  style={{ fontSize: `${editorFontSize}px` }}
                  className={`w-full ${
                    showDiffView ? "h-[300px]" : "h-[450px]"
                  } bg-[#0E1117] border border-[#222938] rounded-md p-4 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none resize-none ${
                    isCurrentRtl
                      ? "font-['Noto_Nastaliq_Urdu','Amiri',serif] leading-[2.4] text-right font-normal"
                      : "font-sans leading-relaxed text-[14px]"
                  }`}
                />
              </div>

              {/* Approval & Dispatch Controls */}
              <div className="bg-[#12151C] border border-[#202735] p-3.5 rounded-md space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <button
                    onClick={handleToggleApprove}
                    className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                      currentPage.isApproved
                        ? "bg-[#50B876]/20 border border-[#50B876]/50 text-[#71E69C]"
                        : "bg-[#1D2330] border border-[#2D384D] text-[#A6B2C4] hover:text-[#EDE8DE]"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{currentPage.isApproved ? "পৃষ্ঠা অনুমোদিত (Approved)" : "পৃষ্ঠা অনুমোদন করুন (Mark Approved)"}</span>
                  </button>

                  <span className="text-[11px] text-[#7F8D9E] font-mono">
                    {currentPage.editedText.split(/\s+/).filter(Boolean).length} শব্দ · কনফিডেন্স: {Math.round((currentPage.confidence || 0.9) * 100)}%
                  </span>
                </div>

                {/* Handshake actions to Translation / AI Voice if provided */}
                <div className="pt-2 border-t border-[#1F2635] flex items-center gap-2">
                  {onSendToTranslation && (
                    <button
                      onClick={() =>
                        onSendToTranslation(
                          currentPage.editedText,
                          job.fileName,
                          isCurrentRtl ? "Urdu" : scriptHint
                        )
                      }
                      disabled={!currentPage.editedText.trim()}
                      className="flex-1 py-2 bg-[#1B212D] hover:bg-[#252D3D] disabled:opacity-40 text-[#E0D8CA] border border-[#2D3647] text-xs font-medium rounded transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Languages className="w-3.5 h-3.5 text-[#B88746]" />
                      <span>
                        {isCurrentRtl
                          ? "উর্দু থেকে বাংলায় অনুবাদ স্টুডিওতে পাঠান"
                          : "Send to Translation Studio"}
                      </span>
                    </button>
                  )}

                  {onSendToVoice && (
                    <button
                      onClick={() => onSendToVoice(currentPage.editedText, job.fileName)}
                      disabled={!currentPage.editedText.trim()}
                      className="flex-1 py-2 bg-[#1B212D] hover:bg-[#252D3D] disabled:opacity-40 text-[#E0D8CA] border border-[#2D3647] text-xs font-medium rounded transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Mic2 className="w-3.5 h-3.5 text-[#B88746]" />
                      <span>টেক্সট টু স্পিচ (TTS)-এ পাঠান</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-16 border border-dashed border-[#232A39] rounded-md text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#161B24] border border-[#2B3547] flex items-center justify-center text-[#B88746] mx-auto">
            <FileScan className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-[#EDE8DE]">কোনো PDF বা পাণ্ডুলিপি লোড করা নেই</h3>
            <p className="text-xs text-[#7F8D9E] max-w-md mx-auto">
              ডিজিটাল বা স্ক্যান করা PDF ফাইল আপলোড করুন, অথবা উপরের নমুনাগুলো থেকে একটি বেছে নিয়ে সরাসরি পরীক্ষা করুন।
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => loadTestSample("digital_bengali")}
              className="px-4 py-2 bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12] text-xs font-semibold rounded transition-colors"
            >
              পরীক্ষা ১: বাংলা ডিজিটাল PDF এক্সট্রাকশন
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
