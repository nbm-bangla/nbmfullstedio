import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Mic2,
  Sparkles,
  Play,
  Pause,
  Download,
  RotateCcw,
  Volume2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  SendHorizontal,
  Headphones,
  Sliders,
  Layers,
  Database,
  Coins,
  ShieldCheck,
  Zap,
  Split,
  FileText,
  Trash2,
  Check,
  BookOpen,
  Plus,
  ArrowRight,
  Bookmark,
  Clock,
  HardDrive,
  Music,
  Copy,
  Info,
  X,
  SlidersHorizontal,
  BookMarked,
  VolumeX,
  History,
  Eraser,
  Search,
  CornerDownLeft,
  PlayCircle,
} from "lucide-react";
import { WaveformVisualizer } from "../common/WaveformVisualizer";
import { FloatingAudioPlayer } from "../common/FloatingAudioPlayer";
import { callGeminiTTS, checkBackendStatus, TtsResponse } from "../../services/apiClient";
import { splitTextIntoNarrationChunks } from "../../services/smartChunker";
import {
  ambienceSynthesizer,
  AMBIENCE_TRACKS,
  AmbienceType,
} from "../../services/ambienceSynthesizer";
import {
  saveAudioBlob,
  getAudioBlob,
  deleteAudioBlob,
  computeTtsChunkHash,
  getTtsCacheRecord,
  setTtsCacheRecord,
  getAllTtsCache,
  clearTtsCache,
  saveAudioProject,
  saveVoiceProject,
  loadVoiceProjects,
  deleteVoiceProject,
  saveNarrationHistory,
  loadNarrationHistory,
  deleteNarrationHistoryItem,
  clearNarrationHistory,
  saveActiveVoiceDraft,
  loadActiveVoiceDraft,
  clearActiveVoiceDraft,
  NarrationHistoryItem,
  TtsCacheRecord,
} from "../../services/audioStorage";
import {
  getAudioContext,
  concatenateAudioBuffers,
  audioBufferToWavBlob,
} from "../../services/audioEngine";
import {
  Book,
  AudioClip,
  AudiobookProject,
  VoiceChunk,
  VoiceNarrationProject,
} from "../../types";

interface AiVoiceStudioProps {
  initialText?: string;
  initialTitle?: string;
  books?: Book[];
  onSaveBooks?: (newBooks: Book[]) => void;
  onSendToAudioStudio?: (audioUrl?: string, name?: string) => void;
  onNavigate?: (tab: string) => void;
}

export const AiVoiceStudio: React.FC<AiVoiceStudioProps> = ({
  initialText = "",
  initialTitle = "ইউসুফ খান ও মেহের-নেগার",
  books = [],
  onSaveBooks,
  onSendToAudioStudio,
  onNavigate,
}) => {
  // Navigation Sub-Tabs: quick (Text to Speech) | reader | narration | history | cache-vault
  const [activeTab, setActiveTab] = useState<"narration" | "quick" | "reader" | "history" | "cache-vault">("quick");

  // Project & Manuscript Meta
  const [projectTitle, setProjectTitle] = useState<string>(initialTitle || "");
  const [authorName, setAuthorName] = useState<string>("");
  const [selectedBookId, setSelectedBookId] = useState<string>("");

  // Start empty; sample scripts can be loaded explicitly from the preset list.
  const [scriptText, setScriptText] = useState<string>(initialText || "");

  // Acoustic & Narrator Persona Controls (Default: Fenrir, gemini-3.8-flash-tts)
  const [voiceName, setVoiceName] = useState<string>("Fenrir");
  const [voiceStyle, setVoiceStyle] = useState<string>("গম্ভীর, গভীর ও কাব্যিক সাহিত্যিক কথন");
  const [speed, setSpeed] = useState<number>(1.0);
  const [silenceGap, setSilenceGap] = useState<number>(0.8); // Silence between concatenated chunks
  const [selectedModel, setSelectedModel] = useState<string>("gemini-3.8-flash-tts");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("Bengali");

  // Smart Chunking Options
  const [chunkMode, setChunkMode] = useState<"paragraph" | "sentence" | "wordLimit">("paragraph");
  const [wordLimit, setWordLimit] = useState<number>(40);

  // Budget & Guard Settings (High defaults so 5-min narrations are never blocked)
  const [maxBudgetUsd, setMaxBudgetUsd] = useState<number>(0.50);
  const [maxChunksLimit, setMaxChunksLimit] = useState<number>(100);

  // Chunk Pipeline State
  const [chunks, setChunks] = useState<VoiceChunk[]>([]);
  const [isQueueRunning, setIsQueueRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentProcessingChunkId, setCurrentProcessingChunkId] = useState<string | null>(null);

  // Audio Playback & Master State
  const [playingChunkId, setPlayingChunkId] = useState<string | null>(null);
  const [isSequentialPlaying, setIsSequentialPlaying] = useState<boolean>(false);
  const [chunkAudioUrls, setChunkAudioUrls] = useState<Record<string, string>>({});
  const [masterAudioUrl, setMasterAudioUrl] = useState<string | null>(null);
  const [isMergingMaster, setIsMergingMaster] = useState<boolean>(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // History State
  const [narrationHistory, setNarrationHistory] = useState<NarrationHistoryItem[]>([]);
  const [historySearchQuery, setHistorySearchQuery] = useState<string>("");
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState<boolean>(false);
  const [historyAudioUrls, setHistoryAudioUrls] = useState<Record<string, string>>({});

  // Reader Experience State
  const [readerTheme, setReaderTheme] = useState<"nocturne" | "parchment" | "oled" | "dawn">("nocturne");
  const [readerFont, setReaderFont] = useState<"noto" | "hind">("noto");
  const [readerFontSize, setReaderFontSize] = useState<number>(18);
  const [isTocOpen, setIsTocOpen] = useState<boolean>(false);
  const [isContextModalOpen, setIsContextModalOpen] = useState<boolean>(false);
  const [copiedQuote, setCopiedQuote] = useState<string | null>(null);
  const [showReaderEditor, setShowReaderEditor] = useState<boolean>(false);

  // Status & Safety Notifications
  const [statusMessage, setStatusMessage] = useState<{
    type: "info" | "success" | "warning" | "error";
    text: string;
  } | null>(null);
  const [backendHasKey, setBackendHasKey] = useState<boolean>(true);

  // Metrics
  const [cacheHitsCount, setCacheHitsCount] = useState<number>(0);
  const [apiCallsCount, setApiCallsCount] = useState<number>(0);
  const [costSavedUsd, setCostSavedUsd] = useState<number>(0);
  const [vaultRecords, setVaultRecords] = useState<Record<string, TtsCacheRecord>>({});
  const [savedVoiceProjects, setSavedVoiceProjects] = useState<VoiceNarrationProject[]>([]);

  // Active in-flight chunk IDs to prevent race conditions & cancellation ref
  const activeProcessingRef = useRef<Set<string>>(new Set());
  const abortQueueRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Supported Gemini TTS Models
  const MODELS = [
    {
      id: "gemini-3.8-flash-lite-tts",
      label: "Gemini 3.8 Flash-Lite TTS",
      desc: "দ্রুততম গতি, সাহিত্যিক কথন ও সর্বোচ্চ সাশ্রয়ী ($0.0005/1K)",
    },
    {
      id: "gemini-3.8-flash-tts",
      label: "Gemini 3.8 Flash TTS",
      desc: "উচ্চতর অভিব্যক্তি ও গতিশীল সাহিত্যিক স্বর ($0.0015/1K)",
    },
  ];

  // Supported Literary Languages
  const LANGUAGES = [
    { id: "Bengali", label: "বাংলা (Bengali)" },
    { id: "English", label: "English (ইংরেজি)" },
    { id: "Hindi", label: "हिन्दी (Hindi)" },
    { id: "Spanish", label: "Español (স্প্যানিশ)" },
    { id: "Arabic", label: "العربية (আরবি)" },
  ];

  // Prebuilt Gemini TTS Voices
  const VOICES = [
    { id: "Fenrir", label: "Fenrir", persona: "গম্ভীর, গভীর ও কাব্যিক (ডিফল্ট)", tone: "গম্ভীর, উদাত্ত ও ধ্রুপদী স্বর" },
    { id: "Kore", label: "Kore", persona: "করুণ, সুরময় ও সংবেদনশীল", tone: "কোমল, আবেগময় ও সুমিষ্ট স্বর" },
    { id: "Zephyr", label: "Zephyr", persona: "শান্ত ও ধ্যানমগ্ন", tone: "শান্ত, নিভৃত ও ধ্যানী আবহ" },
    { id: "Puck", label: "Puck", persona: "স্পষ্ট ও ঋজু", tone: "দৃঢ়, স্পষ্ট ও সরাসরি বক্তব্য" },
    { id: "Charon", label: "Charon", persona: "ধীরলয় ও ভারী", tone: "ধীরস্থির, ভারী ও ঐতিহাসিক মেজাজ" },
  ];

  // Literary Style Presets
  const STYLE_PRESETS = [
    { label: "মার্জিত ক্লাসিক্যাল কথন", style: "গম্ভীর, গভীর ও কাব্যিক সাহিত্যিক কথন" },
    { label: "বাংলা লোকগাঁথা ও গল্পপাঠ", style: "উষ্ণ ও স্নেহময় লোকগাথা পাঠ" },
    { label: "ঐতিহাসিক ও নাটকীয় গম্ভীরতা", style: "নাটকীয় ঐতিহাসিক গম্ভীর স্বর" },
    { label: "কোমল কাব্যিক আবৃত্তি", style: "কোমল ও সংবেদনশীল কাব্যিক আবৃত্তি" },
    { label: "স্বাভাবিক সাহিত্যিক গদ্যপাঠ", style: "সহজ ও সাবলীল সাহিত্যিক গদ্যপাঠ" },
  ];

  // Sample Stems for Immediate Literary Audition
  const SAMPLE_STEMS = [
    {
      title: "ইউসুফ খান ও মেহের-নেগার",
      author: "লোকগাথা ও প্রাচ্যের ধ্রুপদী ট্র্যাজেডি",
      text: `[ওয়াজিরিস্তান ও নির্জন পাহাড়ের গিরিবাতাস]
পাথুরে ওয়াজিরিস্তানের খাড়া গিরিখাত দিয়ে যখন শীতল ঝোড়ো বাতাস বয়ে যায়, তখন মনে হয় প্রতিটি ধূলিকণা যেন এক রক্তক্ষয়ী যুদ্ধের বিষাদগাথা শোনায়। এই উপত্যকার অসমসাহসী পাঠান যোদ্ধা ইউসুফ খান। তার তলোয়ার ছিল ক্ষিপ্র, কিন্তু হৃদয় ছিল এক কোমল সুরের কাঙাল।

[রাগ ভৈরবী ও দরবারী সুরের বিষণ্ণ বাঁশি]
দূর বাতায়ন থেকে ভেসে আসত বাঁশির এক নিঃশব্দ করুণ সুর। সেই সুর ছিল গুলশান উপত্যকার রাজকুমারী মেহের-নেগারের। তাদের ভালোবাসার পথে দাঁড়িয়ে ছিল শত বছরের রক্তক্ষয়ী গোষ্ঠীদ্বন্দ্ব আর অহংকার।

[ঝিলম নদীর শান্ত কলতান]
ঝিলম নদীর স্নিগ্ধ কলতানের তীরে তারা গোপনে শপথ নিয়েছিল—"প্রেম যেখানে পর্বতসম অটল, নিয়তি সেখানে এক দীর্ঘশ্বাসের কুয়াশা।" তারা জানত, এই ধরণী তাদের মিলন হয়তো সইবে না, তবুও তাদের হৃদয়ের বন্ধন ছিল অবিনশ্বর।

[রণসংগীতের মাদল ও অন্তিম শোকগাথা]
একদিন শত্রুসেনার দামামা বেজে উঠল। রণক্ষেত্রের মাদল আর দামামার গর্জনে কেঁপে উঠল ওয়াজিরিস্তানের আকাশ। মেহের-নেগারকে রক্ষা করতে ইউসুফ খান একাই বুক চিতিয়ে দাঁড়ালেন শত তলোয়ারের মুখে। সূর্যাস্তের আলো যখন নিভে গেল, তখন ইউসুফের রক্তাক্ত দেহ লুটিয়ে পড়ল পাথুরে মাটিতে।

[শাস্ত্রীয় তানপুরা ড্রোন (Sa-Pa-Sa-Sa)]
মেহের-নেগার সেই সংবাদ পেয়ে একমুহূর্তও দ্বিধা করেননি। প্রেমিকের কবরের পাশে এসে তিনি নিজের জীবন সমর্পণ করলেন। আজও গিরিখাতের বাতাসে তাদের সমাধিফলক বার্তা প্রতিধ্বনিত হয়: "এখানে চিরনিদ্রায় শায়িত ইউসুফ খান ও মেহের-নেগার — তাদের প্রেম কোনো অস্ত্রের মুখে নত হয়নি, তাদের নাম লেখা রয়েছে ওয়াজিরিস্তানের পাথুরে বুকে।"`,
    },
    {
      title: "সোনার তরী",
      author: "রবীন্দ্রনাথ ঠাকুর",
      text: `গগনে গরজে মেঘ, ঘন বরষা। কূলে একা বসে আছি, নাহি ভরসা।
রাশি রাশি ভারা ভারা ধান কাটা হল সারা, ভরা নদী ক্ষুরধারা খরপরশা। কাটিতে কাটিতে ধান এল বরষা।
 একখানি ছোটো খেত, আমি একেলা, চারিদিকে বাঁকা জল করিছে খেলা।`,
    },
    {
      title: "বনলতা সেন",
      author: "জীবনানন্দ দাশ",
      text: `হাজার বছর ধরে আমি পথ হাঁটিতেছি পৃথিবীর পথে,
সিংহল সমুদ্র থেকে নিশীথের অন্ধকারে মালয় সাগরে
অনেক ঘুরেছি আমি; বিম্বিসার অশোকের ধূসর জগতে
সেখানে ছিলাম আমি; আরও দূর অন্ধকারে বিদর্ভ নগরে;
আমি ক্লান্ত প্রাণ এক, চারিদিকে জীবনের সমুদ্র সফেন,
আমারে দু-দণ্ড শান্তি দিয়েছিল নাটোরের বনলতা সেন।`,
    },
  ];

  // Initial Check on Mount
  useEffect(() => {
    checkBackendStatus().then((status) => {
      setBackendHasKey(status.hasApiKey);
      if (!status.hasApiKey) {
        setStatusMessage({
          type: "warning",
          text: "Backend API Key (GEMINI_API_KEY) is not active. Cloud TTS will require backend configuration in Settings.",
        });
      }
    });

    // Load Vault, Projects & Narration History
    refreshVault();
    loadVoiceProjects().then(setSavedVoiceProjects).catch(() => {});
    loadNarrationHistory().then(setNarrationHistory).catch(() => {});

    // Restore user draft if available and not overridden by props
    if (!initialText) {
      const savedDraft = loadActiveVoiceDraft();
      if (savedDraft && savedDraft.scriptText && savedDraft.scriptText.trim()) {
        setScriptText(savedDraft.scriptText);
        if (savedDraft.projectTitle) setProjectTitle(savedDraft.projectTitle);
        if (savedDraft.authorName) setAuthorName(savedDraft.authorName);
        if (savedDraft.voiceName) setVoiceName(savedDraft.voiceName);
        if (savedDraft.voiceStyle) setVoiceStyle(savedDraft.voiceStyle);
        if (savedDraft.selectedModel) setSelectedModel(savedDraft.selectedModel);
        if (savedDraft.selectedLanguage) setSelectedLanguage(savedDraft.selectedLanguage);
        if (savedDraft.speed) setSpeed(savedDraft.speed);
      }
    }
  }, []);

  // Update scriptText whenever initialText prop arrives (e.g. from PDF OCR or Translation Studio)
  useEffect(() => {
    if (initialText && initialText.trim()) {
      setScriptText(initialText);
      if (initialTitle) setProjectTitle(initialTitle);
      setMasterAudioUrl(null);
    }
  }, [initialText, initialTitle]);

  // Auto-save draft on changes so work is never lost on navigation
  useEffect(() => {
    if (scriptText) {
      saveActiveVoiceDraft({
        scriptText,
        projectTitle,
        authorName,
        voiceName,
        voiceStyle,
        selectedModel,
        selectedLanguage,
        speed,
        silenceGap,
        chunkMode,
        wordLimit,
        updatedAt: Date.now(),
      });
    }
  }, [scriptText, projectTitle, authorName, voiceName, voiceStyle, selectedModel, selectedLanguage, speed, silenceGap, chunkMode, wordLimit]);

  const refreshVault = () => {
    const allCache = getAllTtsCache();
    setVaultRecords(allCache);
  };

  const refreshHistory = async () => {
    const list = await loadNarrationHistory();
    setNarrationHistory(list);
  };

  // Reset script and clear draft completely
  const handleResetScript = () => {
    const confirmed = window.confirm(
      "আপনি কি নিশ্চিত যে বর্তমান লেখা ও তৈরি করা অডিও পরিষ্কার করে নতুন কথন শুরু করতে চান? (ইতিহাসে পূর্বের তৈরি অডিও সংরক্ষিত থাকবে)"
    );
    if (!confirmed) return;

    setScriptText("");
    setMasterAudioUrl(null);
    setPlayingChunkId(null);
    setChunks([]);
    clearActiveVoiceDraft();
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    setStatusMessage({
      type: "info",
      text: "বর্তমান লেখা ও অডিও পরিষ্কার করা হয়েছে। নতুন কথন শুরু করতে টেক্সট লিখুন।",
    });
  };

  // Cancel any running generation queue immediately
  const handleCancelGeneration = () => {
    abortQueueRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsQueueRunning(false);
    setIsPaused(false);
    setCurrentProcessingChunkId(null);
    setStatusMessage({
      type: "warning",
      text: "অডিও কথন তৈরি বাতিল করা হয়েছে।",
    });
  };

  // History action: Play item
  const handlePlayHistoryItem = async (item: NarrationHistoryItem) => {
    let url = historyAudioUrls[item.id];
    if (!url) {
      const blob = await getAudioBlob(item.audioBlobId);
      if (blob) {
        url = URL.createObjectURL(blob);
        setHistoryAudioUrls((prev) => ({ ...prev, [item.id]: url }));
      }
    }

    if (!url) {
      setStatusMessage({ type: "error", text: "এই কথনের অডিও ফাইল স্টোরেজে পাওয়া যায়নি।" });
      return;
    }

    setMasterAudioUrl(url);
    setProjectTitle(item.title);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.src = url;
      audioPlayerRef.current.play().catch(() => {});
    }
    setStatusMessage({
      type: "info",
      text: `ইতিহাস থেকে "${item.title}" অডিও প্লেয়ারে লোড করা হয়েছে।`,
    });
  };

  // History action: Download WAV
  const handleDownloadHistoryItem = async (item: NarrationHistoryItem) => {
    let blob = await getAudioBlob(item.audioBlobId);
    if (!blob) {
      setStatusMessage({ type: "error", text: "অডিও ফাইল পাওয়া যায়নি।" });
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${item.title.replace(/\s+/g, "_")}_${item.voice}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  // History action: Load back into Studio Editor
  const handleLoadHistoryItemToStudio = async (item: NarrationHistoryItem) => {
    setProjectTitle(item.title);
    setScriptText(item.text);
    setVoiceName(item.voice);
    if (item.model) setSelectedModel(item.model);

    // Also load its master audio if available
    const blob = await getAudioBlob(item.audioBlobId);
    if (blob) {
      const url = URL.createObjectURL(blob);
      setMasterAudioUrl(url);
    }

    setActiveTab("quick");
    setStatusMessage({
      type: "success",
      text: `"${item.title}" কথন স্টুডিও এডিটরে লোড করা হয়েছে!`,
    });
  };

  // History action: Delete single item
  const handleDeleteHistoryItem = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await deleteNarrationHistoryItem(id);
    await refreshHistory();
    setStatusMessage({ type: "info", text: "ইতিহাস থেকে কথনটি মুছে ফেলা হয়েছে।" });
  };

  // History action: Clear all history
  const handleClearAllHistory = async () => {
    const ok = window.confirm("আপনি কি নিশ্চিত যে সম্পূর্ণ কথন ইতিহাস মুছে ফেলতে চান?");
    if (!ok) return;
    await clearNarrationHistory();
    await refreshHistory();
    setStatusMessage({ type: "info", text: "কথন ইতিহাস সম্পূর্ণরূপে পরিষ্কার করা হয়েছে।" });
  };

  // Re-chunk script text whenever text, chunkMode, wordLimit, voice, model, or language changes
  useEffect(() => {
    generateChunksFromText(scriptText);
  }, [scriptText, chunkMode, wordLimit, voiceName, voiceStyle, speed, selectedModel, selectedLanguage]);

  const generateChunksFromText = async (rawText: string) => {
    if (!rawText.trim()) {
      setChunks([]);
      return;
    }

    // Always use smart chunker to keep each piece safely under ~40 words (prevents Gemini 25-30s cutoff)
    const smartChunks = splitTextIntoNarrationChunks(rawText, wordLimit || 40);
    const rawList = smartChunks.map((c) => c.text);

    if (rawList.length === 0) {
      rawList.push(rawText.trim());
    }

    // Build VoiceChunk objects and evaluate deterministic cache
    const newChunks: VoiceChunk[] = [];
    let hits = 0;
    let saved = 0;

    for (let i = 0; i < rawList.length; i++) {
      const chunkText = rawList[i];
      const chunkHash = await computeTtsChunkHash(
        chunkText,
        voiceName,
        voiceStyle,
        speed,
        selectedModel,
        selectedLanguage
      );
      const cacheRecord = getTtsCacheRecord(chunkHash);
      const isCached = Boolean(cacheRecord);

      if (isCached) {
        hits++;
        saved += selectedModel === "gemini-3.8-flash-tts" ? 0.0006 : 0.0003;
      }

      newChunks.push({
        id: `chunk-${i + 1}-${chunkHash.slice(0, 8)}`,
        chunkIndex: i + 1,
        chapterTitle: `অংশ ${i + 1}`,
        text: chunkText,
        textHash: chunkHash,
        voiceName,
        style: voiceStyle,
        speed,
        model: selectedModel,
        language: selectedLanguage,
        status: isCached ? "completed" : "pending",
        audioBlobId: cacheRecord?.audioBlobId,
        audioDuration: cacheRecord?.durationSeconds,
        fileSizeBytes: cacheRecord?.fileSizeBytes,
        isCached,
        error: null,
        retryCount: 0,
        updatedAt: new Date().toISOString(),
      });
    }

    setChunks(newChunks);
    setCacheHitsCount(hits);
    setCostSavedUsd(saved);
  };

  // Calculations for Job Cost & Character Metrics
  const metrics = useMemo(() => {
    const totalChars = chunks.reduce((acc, c) => acc + c.text.length, 0);
    const totalWords = chunks.reduce((acc, c) => acc + c.text.split(/\s+/).filter(Boolean).length, 0);
    const completedChunks = chunks.filter((c) => c.status === "completed").length;
    const failedChunks = chunks.filter((c) => c.status === "failed").length;
    const cachedChunks = chunks.filter((c) => c.isCached).length;

    // Pricing: gemini-3.8-flash-lite-tts ($0.0005/1K) vs gemini-3.8-flash-tts ($0.0015/1K)
    const costPer1k = selectedModel === "gemini-3.8-flash-tts" ? 0.0015 : 0.0005;
    const estimatedApiCost = Number(((totalChars / 1000) * costPer1k).toFixed(5));
    const cachedSavings = Number((cachedChunks * (costPer1k * 0.6)).toFixed(5));
    const actualProjectedCost = Math.max(0, estimatedApiCost - cachedSavings);

    return {
      totalChunks: chunks.length,
      totalChars,
      totalWords,
      completedChunks,
      failedChunks,
      cachedChunks,
      estimatedApiCost,
      cachedSavings,
      actualProjectedCost,
      isOverBudget: actualProjectedCost > maxBudgetUsd,
      isOverChunkLimit: chunks.length > maxChunksLimit,
    };
  }, [chunks, maxBudgetUsd, maxChunksLimit, selectedModel]);

  // Audio Playback Handler for Individual Chunk
  const handlePlayChunk = async (chunk: VoiceChunk, fromSequential: boolean = false) => {
    if (!fromSequential && isSequentialPlaying) {
      setIsSequentialPlaying(false);
    }

    if (playingChunkId === chunk.id && !fromSequential) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingChunkId(null);
      return;
    }

    try {
      let url = chunkAudioUrls[chunk.id];
      if (!url) {
        // Load blob from IndexedDB
        let blob: Blob | null = null;
        if (chunk.audioBlobId) {
          blob = await getAudioBlob(chunk.audioBlobId);
        }
        if (!blob) {
          blob = await getAudioBlob(chunk.id);
        }

        if (!blob) {
          setStatusMessage({
            type: "warning",
            text: `চ্যাঙ্ক #${chunk.chunkIndex}-এর অডিও ফাইল স্টোরেজে পাওয়া যায়নি। পুনরায় তৈরি করুন।`,
          });
          return;
        }

        url = URL.createObjectURL(blob);
        setChunkAudioUrls((prev) => ({ ...prev, [chunk.id]: url }));
      }

      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = url;
        audioPlayerRef.current.playbackRate = speed;
        await audioPlayerRef.current.play();
        setPlayingChunkId(chunk.id);
      }
    } catch (err) {
      console.error("Playback error:", err);
      setStatusMessage({ type: "error", text: `চ্যাঙ্ক #${chunk.chunkIndex} বাজানোর সময় সমস্যা হয়েছে।` });
      if (fromSequential) {
        // Skip to next if sequential
        playNextSequentialChunk(chunk.id);
      }
    }
  };

  // Play Next Chunk in Sequential Mode
  const playNextSequentialChunk = (currentId: string) => {
    const completed = chunks.filter((c) => c.status === "completed");
    const currentIdx = completed.findIndex((c) => c.id === currentId);
    if (currentIdx >= 0 && currentIdx + 1 < completed.length) {
      const nextChunk = completed[currentIdx + 1];
      handlePlayChunk(nextChunk, true);
    } else {
      setIsSequentialPlaying(false);
      setPlayingChunkId(null);
      setStatusMessage({
        type: "success",
        text: "সব অধ্যায়ের ধারাবাহিক কথন প্লেব্যাক সম্পূর্ণ হয়েছে!",
      });
    }
  };

  // Audio Ended Handler (Used by hidden <audio> tag)
  const handleAudioEnded = () => {
    if (isSequentialPlaying && playingChunkId) {
      playNextSequentialChunk(playingChunkId);
    } else {
      setPlayingChunkId(null);
    }
  };

  const handleAudioError = () => {
    setPlayingChunkId(null);
    setIsSequentialPlaying(false);
  };

  // Sequential Playback Controls
  const handleStartSequentialPlayback = async () => {
    const completed = chunks.filter((c) => c.status === "completed");
    if (completed.length === 0) {
      setStatusMessage({
        type: "warning",
        text: "ধারাবাহিক প্লেব্যাকের জন্য কোনো সম্পন্ন চ্যাঙ্ক নেই। অনুগ্রহ করে প্রথমে কথন তৈরি করুন।",
      });
      return;
    }

    setIsSequentialPlaying(true);
    await handlePlayChunk(completed[0], true);
  };

  const handleStopSequentialPlayback = () => {
    setIsSequentialPlaying(false);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setPlayingChunkId(null);
  };

  // Synthesize a Single Chunk with Bounded Exponential Backoff on 429/503
  const synthesizeSingleChunk = async (chunkToProcess: VoiceChunk): Promise<boolean> => {
    // Prevent duplicate in-flight requests for the same chunk
    if (activeProcessingRef.current.has(chunkToProcess.id)) {
      return false;
    }

    activeProcessingRef.current.add(chunkToProcess.id);
    setCurrentProcessingChunkId(chunkToProcess.id);

    // Update chunk status to processing
    setChunks((prev) =>
      prev.map((c) => (c.id === chunkToProcess.id ? { ...c, status: "processing", error: null } : c))
    );

    if (!abortControllerRef.current) {
      abortControllerRef.current = new AbortController();
    }

    const MAX_RETRIES = 2;
    let attempt = 0;

    while (attempt <= MAX_RETRIES) {
      if (abortQueueRef.current) {
        activeProcessingRef.current.delete(chunkToProcess.id);
        return false;
      }

      try {
        // 1. Check client-side IndexedDB & Cache Vault
        const hash = await computeTtsChunkHash(
          chunkToProcess.text,
          voiceName,
          voiceStyle,
          speed,
          selectedModel,
          selectedLanguage
        );
        const cachedRecord = getTtsCacheRecord(hash);

        if (cachedRecord) {
          const existingBlob = await getAudioBlob(cachedRecord.audioBlobId);
          if (existingBlob) {
            // Loaded from persistent cache ($0 cost)
            setChunks((prev) =>
              prev.map((c) =>
                c.id === chunkToProcess.id
                  ? {
                      ...c,
                      status: "completed",
                      isCached: true,
                      model: selectedModel,
                      language: selectedLanguage,
                      audioBlobId: cachedRecord.audioBlobId,
                      audioDuration: cachedRecord.durationSeconds,
                      fileSizeBytes: cachedRecord.fileSizeBytes,
                      error: null,
                    }
                  : c
              )
            );
            const savedUnit = selectedModel === "gemini-3.8-flash-tts" ? 0.0006 : 0.0003;
            setCostSavedUsd((prev) => prev + savedUnit);
            activeProcessingRef.current.delete(chunkToProcess.id);
            return true;
          }
        }

        // 2. Call Server Backend TTS with AbortSignal
        const res: TtsResponse = await callGeminiTTS(
          chunkToProcess.text,
          voiceName,
          voiceStyle,
          speed,
          selectedModel,
          selectedLanguage,
          abortControllerRef.current?.signal
        );

        if (!res.audioBase64) {
          // Web Speech API fallback if server audio was empty
          if ("speechSynthesis" in window) {
            const cleanText = chunkToProcess.text.replace(/\[.*?\]/g, " ").trim();
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = selectedLanguage === "English" ? "en-US" : "bn-BD";
            utterance.rate = speed;
            window.speechSynthesis.speak(utterance);
            setStatusMessage({
              type: "info",
              text: `ব্রাউজার ব্যাকআপ স্পিচ ইঞ্জিন দিয়ে অংশ #${chunkToProcess.chunkIndex} পাঠ করা হচ্ছে।`,
            });
            setChunks((prev) =>
              prev.map((c) =>
                c.id === chunkToProcess.id ? { ...c, status: "completed", error: null } : c
              )
            );
            activeProcessingRef.current.delete(chunkToProcess.id);
            return true;
          }
          throw new Error("Server returned empty audio data.");
        }

        // Convert Base64 to Blob
        const byteChars = atob(res.audioBase64);
        const byteNumbers = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const wavBlob = new Blob([byteNumbers], { type: "audio/wav" });

        // Save permanently in IndexedDB
        await saveAudioBlob(chunkToProcess.id, wavBlob);

        // Create playable URL immediately
        const chunkUrl = URL.createObjectURL(wavBlob);
        setChunkAudioUrls((prev) => ({ ...prev, [chunkToProcess.id]: chunkUrl }));
        if (!masterAudioUrl) {
          setMasterAudioUrl(chunkUrl);
        }

        // Save record in TTS Cache Vault
        const newRecord: TtsCacheRecord = {
          audioBlobId: chunkToProcess.id,
          durationSeconds: res.durationSeconds || Math.round(chunkToProcess.text.length / 15),
          fileSizeBytes: byteNumbers.length,
          voice: voiceName,
          style: voiceStyle,
          speed,
          model: selectedModel,
          language: selectedLanguage,
          textSnippet: chunkToProcess.text.slice(0, 50),
          timestamp: Date.now(),
        };
        setTtsCacheRecord(hash, newRecord);

        // Update state
        setChunks((prev) =>
          prev.map((c) =>
            c.id === chunkToProcess.id
              ? {
                  ...c,
                  status: "completed",
                  isCached: res.cached || false,
                  model: selectedModel,
                  language: selectedLanguage,
                  audioBlobId: chunkToProcess.id,
                  audioDuration: res.durationSeconds,
                  fileSizeBytes: byteNumbers.length,
                  error: null,
                }
              : c
          )
        );

        // Auto-play the synthesized chunk so user hears the voice right away
        if (audioPlayerRef.current) {
          audioPlayerRef.current.src = chunkUrl;
          audioPlayerRef.current.playbackRate = speed;
          audioPlayerRef.current.play().catch(() => {});
          setPlayingChunkId(chunkToProcess.id);
        }

        if (res.cached) {
          setCostSavedUsd((prev) => prev + (res.costSavedUsd || 0.0003));
        } else {
          setApiCallsCount((prev) => prev + 1);
        }

        refreshVault();
        activeProcessingRef.current.delete(chunkToProcess.id);
        return true;
      } catch (err: any) {
        if (err.name === "AbortError" || abortQueueRef.current) {
          activeProcessingRef.current.delete(chunkToProcess.id);
          return false;
        }

        const isRateLimitOrTransient =
          err.status === 429 ||
          err.status === 503 ||
          err.code === "RATE_LIMIT_EXCEEDED" ||
          err.code === "SERVICE_UNAVAILABLE";

        if (isRateLimitOrTransient && attempt < MAX_RETRIES) {
          attempt++;
          const delayMs = attempt * 2500;
          setStatusMessage({
            type: "warning",
            text: `চ্যাঙ্ক #${chunkToProcess.chunkIndex}: সাময়িক রেট লিমিট (${err.status || "API"}), ${delayMs / 1000} সেকেন্ড পর স্বয়ংক্রিয় রিত্রাই (${attempt}/${MAX_RETRIES})...`,
          });
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`Chunk ${chunkToProcess.chunkIndex} synthesis failed:`, errMsg);

        setChunks((prev) =>
          prev.map((c) =>
            c.id === chunkToProcess.id
              ? {
                  ...c,
                  status: "failed",
                  error: errMsg,
                  retryCount: c.retryCount + 1,
                }
              : c
          )
        );

        activeProcessingRef.current.delete(chunkToProcess.id);
        return false;
      }
    }

    activeProcessingRef.current.delete(chunkToProcess.id);
    return false;
  };

  // Start Batch Generation Queue
  const handleStartQueue = async (onlyFailed: boolean = false) => {
    if (metrics.isOverBudget) {
      setStatusMessage({
        type: "error",
        text: `Estimated cost ($${metrics.actualProjectedCost.toFixed(4)}) exceeds your safety budget ($${maxBudgetUsd}). Increase budget limit to proceed.`,
      });
      return;
    }

    if (metrics.isOverChunkLimit) {
      setStatusMessage({
        type: "error",
        text: `Total chunks (${chunks.length}) exceed your chunk limit (${maxChunksLimit}). Adjust chunk limit or increase setting.`,
      });
      return;
    }

    abortQueueRef.current = false;
    abortControllerRef.current = new AbortController();
    setIsQueueRunning(true);
    setIsPaused(false);
    setStatusMessage(null);

    const targetChunks = chunks.filter((c) => (onlyFailed ? c.status === "failed" : c.status !== "completed"));

    for (let i = 0; i < targetChunks.length; i++) {
      if (abortQueueRef.current) {
        setStatusMessage({ type: "info", text: "কথন কিউ ব্যবহারকারী কর্তৃক থামানো হয়েছে।" });
        break;
      }

      const chunk = targetChunks[i];
      await synthesizeSingleChunk(chunk);

      // Brief gentle delay between items to be polite to backend
      if (i < targetChunks.length - 1 && !abortQueueRef.current) {
        await new Promise((res) => setTimeout(res, 350));
      }
    }

    setIsQueueRunning(false);
    setCurrentProcessingChunkId(null);
    abortControllerRef.current = null;

    // Save project automatically
    handleSaveCurrentProject();
  };

  // Pause / Resume / Cancel Queue
  const handlePauseQueue = () => {
    abortQueueRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsPaused(true);
    setIsQueueRunning(false);
    setStatusMessage({ type: "info", text: "কিউ সাময়িক বিরতি দেওয়া হয়েছে। আপনি যেকোনো সময় পুনরায় চালু করতে পারেন।" });
  };

  const handleCancelQueue = () => {
    abortQueueRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsQueueRunning(false);
    setIsPaused(false);
    setCurrentProcessingChunkId(null);
    setStatusMessage({ type: "info", text: "কিউ প্রক্রিয়াকরণ বাতিল করা হয়েছে।" });
  };

  // Concatenate All Completed Chunks into a Master Audiobook WAV file (100% Client DSP, $0 Cost)
  const handleMergeMasterWav = async () => {
    const completed = chunks.filter((c) => c.status === "completed");
    if (completed.length === 0) {
      setStatusMessage({ type: "warning", text: "No completed chunks available to merge." });
      return;
    }

    setIsMergingMaster(true);
    setStatusMessage({ type: "info", text: "Decoding audio chunks and synthesizing master WAV via Web Audio DSP..." });

    try {
      const audioCtx = getAudioContext();
      const decodedBuffers: AudioBuffer[] = [];

      for (const chunk of completed) {
        let blob: Blob | null = null;
        if (chunk.audioBlobId) {
          blob = await getAudioBlob(chunk.audioBlobId);
        }
        if (!blob) {
          blob = await getAudioBlob(chunk.id);
        }

        if (blob) {
          const ab = await blob.arrayBuffer();
          const audioBuf = await audioCtx.decodeAudioData(ab.slice(0));
          decodedBuffers.push(audioBuf);
        }
      }

      if (decodedBuffers.length === 0) {
        throw new Error("Could not decode any audio buffers.");
      }

      // Concatenate with user silence gap and automatic volume normalization
      const masterBuffer = concatenateAudioBuffers(decodedBuffers, silenceGap, true);
      const masterWavBlob = audioBufferToWavBlob(masterBuffer);

      // Save master in IndexedDB
      const masterBlobId = `master-voice-${Date.now()}`;
      await saveAudioBlob(masterBlobId, masterWavBlob);

      const url = URL.createObjectURL(masterWavBlob);
      setMasterAudioUrl(url);

      // Auto-save to Narration History
      await saveNarrationHistory({
        id: `history-${Date.now()}`,
        title: projectTitle,
        text: chunks.map((c) => c.text).join("\n\n"),
        audioBlobId: masterBlobId,
        voice: voiceName,
        model: selectedModel,
        language: selectedLanguage,
        durationSeconds: masterBuffer.duration,
        fileSizeBytes: masterWavBlob.size,
        timestamp: Date.now(),
      });
      await refreshHistory();

      setStatusMessage({
        type: "success",
        text: `Master Audiobook WAV synthesized! Total length: ${Math.round(masterBuffer.duration)}s (${(
          masterWavBlob.size /
          (1024 * 1024)
        ).toFixed(2)} MB)। ইতিহাসে সংরক্ষিত হয়েছে।`,
      });
    } catch (err) {
      console.error("Master merge error:", err);
      setStatusMessage({ type: "error", text: "Failed to merge audio chunks into master WAV." });
    } finally {
      setIsMergingMaster(false);
    }
  };

  // Download Master WAV
  const handleDownloadMaster = () => {
    if (!masterAudioUrl) return;
    const a = document.createElement("a");
    a.href = masterAudioUrl;
    a.download = `${projectTitle.replace(/\s+/g, "_")}_5Min_Full_Master.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setStatusMessage({
      type: "success",
      text: "সম্পূর্ণ অডিওবুক মাস্টার WAV ফাইল ডাউনলোড শুরু হয়েছে!",
    });
  };

  // Download Individual Chunk WAV
  const handleDownloadSingleChunk = async (chunk: VoiceChunk) => {
    let blob: Blob | null = null;
    if (chunk.audioBlobId) blob = await getAudioBlob(chunk.audioBlobId);
    if (!blob) blob = await getAudioBlob(chunk.id);

    if (!blob) {
      setStatusMessage({ type: "error", text: "Chunk audio file not found in storage." });
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectTitle.replace(/\s+/g, "_")}_Part_${chunk.chunkIndex}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  // Generate Full Multi-Chunk Continuous Narration for Quick / Single Text Studio
  // Zero-Drop Policy: Every single word is preserved; no chunk is silently skipped.
  const handleGenerateFullQuickNarration = async () => {
    if (!scriptText.trim()) return;

    // Use smart narration chunker to ensure no chunk exceeds safe unary TTS length (~40 words)
    const smartChunks = splitTextIntoNarrationChunks(scriptText, wordLimit || 40);
    if (smartChunks.length === 0) return;

    abortQueueRef.current = false;
    abortControllerRef.current = new AbortController();
    setIsQueueRunning(true);
    setIsPaused(false);
    setStatusMessage({
      type: "info",
      text: `সম্পূর্ণ কথন তৈরি শুরু হয়েছে: মোট ${smartChunks.length} টি অংশে নিখুঁতভাবে ভাগ করা হয়েছে (${selectedModel} · ${voiceName})...`,
    });

    const collectedAudioBlobs: Blob[] = [];

    for (let i = 0; i < smartChunks.length; i++) {
      if (abortQueueRef.current) {
        setStatusMessage({ type: "info", text: "কথন তৈরি ব্যবহারকারী কর্তৃক থামানো হয়েছে।" });
        break;
      }

      const item = smartChunks[i];
      setStatusMessage({
        type: "info",
        text: `অডিও কথন তৈরি হচ্ছে: অংশ ${i + 1}/${smartChunks.length} প্রস্তুত হচ্ছে (${Math.round(((i + 1) / smartChunks.length) * 100)}%)...`,
      });

      // 1. Check Cache Vault
      const hash = await computeTtsChunkHash(
        item.text,
        voiceName,
        voiceStyle,
        speed,
        selectedModel,
        selectedLanguage
      );
      const cached = getTtsCacheRecord(hash);
      let blob: Blob | null = null;
      if (cached) {
        blob = await getAudioBlob(cached.audioBlobId);
      }

      // 2. Synthesize via Gemini TTS with bounded automatic retries (Never drop intermediate text)
      if (!blob) {
        let chunkSuccess = false;
        const RETRIES = 3;

        for (let attempt = 1; attempt <= RETRIES; attempt++) {
          if (abortQueueRef.current) break;

          try {
            const res = await callGeminiTTS(
              item.text,
              voiceName,
              voiceStyle,
              speed,
              selectedModel,
              selectedLanguage,
              abortControllerRef.current?.signal
            );

            if (res.audioBase64) {
              const byteChars = atob(res.audioBase64);
              const byteNumbers = new Uint8Array(byteChars.length);
              for (let b = 0; b < byteChars.length; b++) {
                byteNumbers[b] = byteChars.charCodeAt(b);
              }
              blob = new Blob([byteNumbers], { type: "audio/wav" });
              const blobId = `quick-${hash.slice(0, 10)}`;
              await saveAudioBlob(blobId, blob);
              setTtsCacheRecord(hash, {
                audioBlobId: blobId,
                durationSeconds: res.durationSeconds || Math.round(item.text.length / 15),
                fileSizeBytes: byteNumbers.length,
                voice: voiceName,
                style: voiceStyle,
                speed,
                model: selectedModel,
                language: selectedLanguage,
                textSnippet: item.text.slice(0, 50),
                timestamp: Date.now(),
              });
              setApiCallsCount((prev) => prev + 1);
              chunkSuccess = true;
              break;
            }
          } catch (err: any) {
            if (err.name === "AbortError" || abortQueueRef.current) break;
            console.warn(`Quick chunk ${i + 1} attempt ${attempt} failed:`, err);
            if (attempt < RETRIES) {
              setStatusMessage({
                type: "warning",
                text: `অংশ ${i + 1}/${smartChunks.length} এপিআই বিরতি, ${attempt * 2} সেকেন্ড পর রিত্রাই করা হচ্ছে (${attempt}/${RETRIES})...`,
              });
              await new Promise((r) => setTimeout(r, attempt * 2000));
            }
          }
        }

        if (!chunkSuccess || !blob) {
          // Zero-drop enforcement: Do NOT skip this chunk or merge partial holes
          setStatusMessage({
            type: "error",
            text: `অংশ #${i + 1} ("${item.text.slice(0, 35)}...") তৈরি করা যায়নি। লেখার ধারাবাহিকতা ও নিখুঁত শব্দ বজায় রাখতে প্রক্রিয়া স্থগিত রাখা হয়েছে। অনুগ্রহ করে পুনরায় তৈরি বাটনে চাপুন।`,
          });
          setIsQueueRunning(false);
          return;
        }
      } else {
        setCostSavedUsd((prev) => prev + (selectedModel === "gemini-3.8-flash-tts" ? 0.0006 : 0.0003));
      }

      if (blob) {
        collectedAudioBlobs.push(blob);
      }
    }

    // 3. Concatenate all collected audio blobs into a single continuous Master WAV
    if (collectedAudioBlobs.length === smartChunks.length && !abortQueueRef.current) {
      try {
        setStatusMessage({
          type: "info",
          text: "সব অডিও চ্যাঙ্ক নিখুঁতভাবে মার্জ করে অবিচ্ছিন্ন মাস্টার অডিও তৈরি হচ্ছে...",
        });

        const audioCtx = getAudioContext();
        const decodedBuffers: AudioBuffer[] = [];
        for (const b of collectedAudioBlobs) {
          const ab = await b.arrayBuffer();
          const buf = await audioCtx.decodeAudioData(ab.slice(0));
          decodedBuffers.push(buf);
        }

        const masterBuffer = concatenateAudioBuffers(decodedBuffers, silenceGap, true);
        const masterBlob = audioBufferToWavBlob(masterBuffer);
        const masterBlobId = `master-quick-${Date.now()}`;
        await saveAudioBlob(masterBlobId, masterBlob);

        const url = URL.createObjectURL(masterBlob);
        setMasterAudioUrl(url);

        // Update all chunk cards in state and store individual chunk URLs for immediate playback & download
        const newChunkAudioUrls: Record<string, string> = {};
        const updatedChunks = chunks.map((c, idx) => {
          const blob = collectedAudioBlobs[idx];
          if (blob) {
            const chunkUrl = URL.createObjectURL(blob);
            newChunkAudioUrls[c.id] = chunkUrl;
            return {
              ...c,
              status: "completed" as const,
              audioBlobId: `quick-blob-${c.id}`,
              audioDuration: Math.round(blob.size / 48000),
              fileSizeBytes: blob.size,
              isCached: true,
            };
          }
          return { ...c, status: "completed" as const };
        });
        setChunks(updatedChunks);
        setChunkAudioUrls((prev) => ({ ...prev, ...newChunkAudioUrls }));

        // Auto-play master audio in floating player
        if (audioPlayerRef.current) {
          audioPlayerRef.current.src = url;
          audioPlayerRef.current.playbackRate = speed;
          audioPlayerRef.current.play().catch(() => {});
        }

        // Auto-save into Narration History
        await saveNarrationHistory({
          id: `history-${Date.now()}`,
          title: projectTitle,
          text: scriptText,
          audioBlobId: masterBlobId,
          voice: voiceName,
          model: selectedModel,
          language: selectedLanguage,
          durationSeconds: masterBuffer.duration,
          fileSizeBytes: masterBlob.size,
          timestamp: Date.now(),
        });
        await refreshHistory();

        const durMin = Math.floor(masterBuffer.duration / 60);
        const durSec = Math.floor(masterBuffer.duration % 60);
        setStatusMessage({
          type: "success",
          text: `সম্পূর্ণ কথন অডিও সফলভাবে তৈরি হয়েছে! মোট সময়: ${durMin}:${durSec < 10 ? "0" : ""}${durSec} (${(
            masterBlob.size /
            (1024 * 1024)
          ).toFixed(2)} MB)। অডিও প্লেয়ার ও ডাউনলোড বাটন সক্রিয়।`,
        });
      } catch (mergeErr) {
        console.error("Merge error:", mergeErr);
        setStatusMessage({
          type: "error",
          text: "অডিও মার্জ করতে সমস্যা হয়েছে।",
        });
      }
    }

    setIsQueueRunning(false);
    refreshVault();
  };

  // Save Voice Project to IndexedDB
  // Save Voice Project to IndexedDB
  const handleSaveCurrentProject = async () => {
    const project: VoiceNarrationProject = {
      id: `voice-proj-${Date.now()}`,
      title: projectTitle,
      bookId: selectedBookId || null,
      author: authorName,
      language: selectedLanguage,
      model: selectedModel,
      voiceName,
      style: voiceStyle,
      speed,
      chunks,
      maxBudgetUsd,
      maxChunksLimit,
      totalCharacters: metrics.totalChars,
      estimatedCostUsd: metrics.estimatedApiCost,
      actualCostUsd: Number((apiCallsCount * (selectedModel === "gemini-3.8-flash-tts" ? 0.0015 : 0.0005)).toFixed(4)),
      cacheHitsCount,
      apiCallsCount,
      status: chunks.every((c) => c.status === "completed") ? "completed" : "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveVoiceProject(project);
    const updated = await loadVoiceProjects();
    setSavedVoiceProjects(updated);
  };

  // Load Saved Project from Cache Vault
  const handleLoadSavedProject = (proj: VoiceNarrationProject) => {
    setProjectTitle(proj.title);
    setAuthorName(proj.author || "");
    setSelectedBookId(proj.bookId || "");
    setVoiceName(proj.voiceName || "Kore");
    setVoiceStyle(proj.style || "");
    setSpeed(proj.speed || 1.0);
    if (proj.model) setSelectedModel(proj.model);
    if (proj.language) setSelectedLanguage(proj.language);
    if (proj.chunks && proj.chunks.length > 0) {
      setChunks(proj.chunks);
    }
    setActiveTab("narration");
    setStatusMessage({
      type: "success",
      text: `প্রজেক্ট "${proj.title}" সফলভাবে লোড করা হয়েছে!`,
    });
  };

  // Delete Saved Project from Cache Vault
  const handleDeleteSavedProject = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm("আপনি কি এই সংরক্ষিত কথন প্রজেক্টটি মুছে ফেলতে চান?")) {
      await deleteVoiceProject(id);
      const updated = await loadVoiceProjects();
      setSavedVoiceProjects(updated);
      setStatusMessage({ type: "info", text: "প্রজেক্ট মুছে ফেলা হয়েছে।" });
    }
  };

  // Handshake 1: Send All Chunks to Audio Studio
  const handleSendToAudioStudio = async () => {
    const completed = chunks.filter((c) => c.status === "completed");
    if (completed.length === 0) {
      setStatusMessage({ type: "warning", text: "Synthesize at least one chunk before sending to Audio Studio." });
      return;
    }

    // Convert VoiceChunks to AudioClips
    const audioClips: AudioClip[] = [];
    for (let i = 0; i < completed.length; i++) {
      const c = completed[i];
      let blob: Blob | null = null;
      if (c.audioBlobId) blob = await getAudioBlob(c.audioBlobId);
      if (!blob) blob = await getAudioBlob(c.id);

      const clipId = `clip-voice-${c.id}`;
      if (blob) {
        await saveAudioBlob(clipId, blob);
      }

      audioClips.push({
        id: clipId,
        name: `${projectTitle} - Part ${c.chunkIndex}`,
        chapterNumber: c.chunkIndex,
        chapterTitle: c.chapterTitle || `Section ${c.chunkIndex}`,
        duration: c.audioDuration || 6,
        sampleRate: 24000,
        channels: 1,
        fileSize: c.fileSizeBytes || 50000,
        format: "WAV",
        trimStart: 0,
        trimEnd: c.audioDuration || 6,
        fadeIn: 0.05,
        fadeOut: 0.05,
        volume: 1.0,
        transcript: c.text,
        fileHash: c.textHash,
        isCached: c.isCached,
        storageKey: clipId,
      });
    }

    // Save as an AudiobookProject in IndexedDB so Audio Studio loads it cleanly
    const audiobookProject: AudiobookProject = {
      id: `audiobook-${Date.now()}`,
      title: projectTitle,
      bookId: selectedBookId || null,
      author: authorName,
      language: "Bengali",
      clips: audioClips,
      silenceGap,
      normalizeVolume: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveAudioProject(audiobookProject);

    if (onSendToAudioStudio) {
      onSendToAudioStudio();
    } else if (onNavigate) {
      onNavigate("audio-studio");
    }
  };

  // Handshake 2: Attach / Save to Library Books
  const handleSaveToLibrary = () => {
    const completed = chunks.filter((c) => c.status === "completed");
    if (completed.length === 0) {
      setStatusMessage({ type: "warning", text: "Synthesize audio chunks before adding to Library." });
      return;
    }

    const totalAudioSeconds = completed.reduce((acc, c) => acc + (c.audioDuration || 5), 0);

    const newBook: Book = {
      id: selectedBookId || `book-voice-${Date.now()}`,
      title: projectTitle,
      originalTitle: projectTitle,
      author: authorName || "Unknown",
      country: "Bangladesh / India",
      originalLanguage: "Bengali",
      targetLanguage: "Bengali",
      genre: "World Literature / Poetry",
      tags: ["Audiobook", "AI Narration", voiceName],
      description: `Gemini 3.8 Flash-Lite TTS audiobook narration (${voiceName} voice). ${completed.length} spoken sections.`,
      coverUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80",
      copyrightStatus: "public_domain",
      chaptersCount: completed.length,
      audioDurationSeconds: totalAudioSeconds,
      hasAudio: true,
      hasVideo: false,
      hasSubtitles: false,
      status: "completed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chapters: completed.map((c, i) => ({
        id: `chap-${i + 1}`,
        bookId: selectedBookId || `book-voice-${Date.now()}`,
        chapterNumber: i + 1,
        title: c.chapterTitle || `অংশ ${i + 1}`,
        originalText: c.text,
        translationStatus: "approved",
        audioDuration: c.audioDuration,
        wordCount: c.text.split(/\s+/).filter(Boolean).length,
      })),
    };

    if (onSaveBooks) {
      const existingIdx = books.findIndex((b) => b.id === newBook.id);
      let updated: Book[];
      if (existingIdx >= 0) {
        updated = [...books];
        updated[existingIdx] = newBook;
      } else {
        updated = [newBook, ...books];
      }
      onSaveBooks(updated);
      setStatusMessage({
        type: "success",
        text: `"${projectTitle}" has been saved with audio chapters in your Library!`,
      });
    }
  };

  // Load Book from Library
  const handleSelectBook = (bookId: string) => {
    setSelectedBookId(bookId);
    const book = books.find((b) => b.id === bookId);
    if (!book) return;

    setProjectTitle(book.title);
    setAuthorName(book.author);

    if (book.chapters && book.chapters.length > 0) {
      const combined = book.chapters.map((ch) => ch.originalText || ch.translatedText || "").join("\n\n");
      if (combined.trim()) {
        setScriptText(combined);
      }
    }
  };

  // Load Literary Sample Stem
  const handleLoadSample = (sample: { title: string; author: string; text: string }) => {
    setProjectTitle(sample.title);
    setAuthorName(sample.author);
    setScriptText(sample.text);
    setStatusMessage({
      type: "info",
      text: `Loaded classical sample: "${sample.title}" by ${sample.author}.`,
    });
  };

  // Clear Cache Vault
  const handleClearCacheVault = () => {
    if (window.confirm("Are you sure you want to clear all cached TTS audio chunks? This will force new API calls for identical text.")) {
      clearTtsCache();
      refreshVault();
      setCostSavedUsd(0);
      setStatusMessage({ type: "info", text: "TTS Cache Vault cleared." });
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Hidden audio element for clean playback */}
      <audio
        ref={audioPlayerRef}
        onEnded={handleAudioEnded}
        onError={handleAudioError}
        className="hidden"
      />

      {/* Studio Header & Cost Safeguards Dashboard */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#202735] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#B88746]">
            <Mic2 className="w-4 h-4" />
            <span className="font-semibold uppercase tracking-wider">Text-to-Speech (TTS) Studio</span>
            <span aria-hidden="true">·</span>
            <span>{selectedModel} ({selectedLanguage}) · 24kHz Mono 16-bit WAV</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-[#F4EFE6] mt-0.5">
            টেক্সট থেকে স্পিচ ও ভয়েস স্টুডিও (Text to Speech)
          </h1>
          <p className="text-xs text-[#8F9AA9] font-editorial text-sm mt-0.5">
            বাংলা ও বিশ্বসাহিত্যের যেকোনো টেক্সট লিখুন বা পেস্ট করুন এবং Gemini 3.8 Flash TTS ভয়েস ইঞ্জিনের মাধ্যমে সরাসরি জীবন্ত কথন ও অডিও তৈরি করুন।
          </p>
        </div>

        {/* Real-time Cost & Cache Metrics Bar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3 py-1.5 bg-[#12161F] border border-[#232C3D] rounded flex items-center gap-2">
            <Coins className="w-3.5 h-3.5 text-[#E5C380]" />
            <span className="text-[#8F9AA9]">Projected Cost:</span>
            <span className="font-mono font-medium text-[#EDE8DE]">${metrics.actualProjectedCost.toFixed(4)}</span>
          </div>

          <div className="px-3 py-1.5 bg-[#12161F] border border-[#232C3D] rounded flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#50B876]" />
            <span className="text-[#8F9AA9]">Cache Saved:</span>
            <span className="font-mono font-medium text-[#50B876]">${(costSavedUsd + metrics.cachedSavings).toFixed(4)}</span>
          </div>

          <div className="px-3 py-1.5 bg-[#12161F] border border-[#232C3D] rounded flex items-center gap-2">
            <HardDrive className="w-3.5 h-3.5 text-[#4D9EFF]" />
            <span className="text-[#8F9AA9]">IndexedDB:</span>
            <span className="font-mono font-medium text-[#4D9EFF]">{Object.keys(vaultRecords).length} Chunks</span>
          </div>

          <div
            className={`px-3 py-1.5 border rounded flex items-center gap-1.5 ${
              backendHasKey
                ? "bg-[#14231A] border-[#254B33] text-[#50B876]"
                : "bg-[#2A1818] border-[#552727] text-[#FF8585]"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="font-mono text-[11px]">{backendHasKey ? "Backend Active" : "No API Key"}</span>
          </div>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {statusMessage && (
        <div
          className={`p-3.5 text-xs rounded-md flex items-center justify-between gap-3 border ${
            statusMessage.type === "error"
              ? "bg-[#261517] border-[#5A252B] text-[#FF9E9E]"
              : statusMessage.type === "warning"
              ? "bg-[#231E15] border-[#52401C] text-[#E5C380]"
              : statusMessage.type === "success"
              ? "bg-[#122319] border-[#224A32] text-[#85E2A8]"
              : "bg-[#131B26] border-[#21354F] text-[#8CB8F5]"
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-[11px] underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Studio Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#1E2533] pb-2 text-xs">
        <button
          onClick={() => setActiveTab("quick")}
          className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
            activeTab === "quick"
              ? "bg-[#B88746] text-[#0D0F12] font-bold shadow-sm"
              : "text-[#8F9AA9] hover:text-[#EDE8DE] hover:bg-[#151922]"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>টেক্সট টু স্পিচ (Text to Speech - TTS)</span>
        </button>

        <button
          onClick={() => setActiveTab("reader")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded transition-colors ${
            activeTab === "reader"
              ? "bg-[#B88746] text-[#0D0F12] font-semibold"
              : "text-[#8F9AA9] hover:text-[#EDE8DE] hover:bg-[#151922]"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>সাহিত্যিক রিডার ও আবহসুর (Reader & Ambience)</span>
        </button>

        <button
          onClick={() => setActiveTab("narration")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded transition-colors ${
            activeTab === "narration"
              ? "bg-[#B88746] text-[#0D0F12] font-semibold"
              : "text-[#8F9AA9] hover:text-[#EDE8DE] hover:bg-[#151922]"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>অধ্যায় ও চ্যাঙ্ক স্টুডিও (Chapter & Chunk Studio)</span>
          <span className="font-mono text-[11px] opacity-75">({chunks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded transition-colors ${
            activeTab === "history"
              ? "bg-[#B88746] text-[#0D0F12] font-semibold"
              : "text-[#8F9AA9] hover:text-[#EDE8DE] hover:bg-[#151922]"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>কথন ইতিহাস (History)</span>
          {narrationHistory.length > 0 && (
            <span
              className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
                activeTab === "history" ? "bg-[#0D0F12] text-[#B88746]" : "bg-[#252C3D] text-[#EDE8DE]"
              }`}
            >
              {narrationHistory.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("cache-vault")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded transition-colors ${
            activeTab === "cache-vault"
              ? "bg-[#B88746] text-[#0D0F12] font-semibold"
              : "text-[#8F9AA9] hover:text-[#EDE8DE] hover:bg-[#151922]"
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>ক্যাশিং ভল্ট ও আর্কাইভ (Cache Vault)</span>
        </button>

        {/* Global Quick Action: Reset / New Narration */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleResetScript}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium bg-[#161B24] hover:bg-[#25181A] text-[#C4B7A5] hover:text-[#FF8585] border border-[#2B3547] hover:border-[#5C2B30] transition-all"
            title="বর্তমান লেখা ও অডিও সম্পূর্ণ পরিষ্কার করে নতুন কথন শুরু করুন"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>নতুন কথন / পরিষ্কার</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Long Book & Chapter-Wise Chunk Studio */}
      {activeTab === "narration" && (
        <div className="space-y-6">
          {/* Top Panel: Manuscript Metadata & Sample Stems */}
          <div className="bg-[#12151C] border border-[#202735] rounded-md p-5 manuscript-paper space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="বই বা প্রজেক্টের নাম..."
                  className="bg-[#0E1015] border border-[#232B3B] rounded px-3 py-1.5 text-xs text-[#EDE8DE] font-semibold focus:border-[#B88746] focus:outline-none min-w-[200px]"
                />
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="লেখকের নাম..."
                  className="bg-[#0E1015] border border-[#232B3B] rounded px-3 py-1.5 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none min-w-[150px]"
                />

                {/* Import from Library Dropdown */}
                {books.length > 0 && (
                  <select
                    value={selectedBookId}
                    onChange={(e) => handleSelectBook(e.target.value)}
                    className="bg-[#0E1015] border border-[#232B3B] rounded px-3 py-1.5 text-xs text-[#8F9AA9] focus:border-[#B88746] focus:outline-none"
                  >
                    <option value="">-- Import from Library Book --</option>
                    {books.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} ({b.author})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Sample Literature Stems */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[11px] text-[#7F8D9E]">Quick Sample:</span>
                {SAMPLE_STEMS.map((sample) => (
                  <button
                    key={sample.title}
                    onClick={() => handleLoadSample(sample)}
                    className="px-2 py-1 bg-[#181D26] hover:bg-[#222938] text-[11px] text-[#8C98AC] hover:text-[#EDE8DE] rounded border border-[#273042] transition-colors"
                  >
                    {sample.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Narration Script Area */}
            <div>
              <div className="flex items-center justify-between text-xs text-[#8F9AA9] mb-1.5">
                <span className="font-semibold text-[#EDE8DE]">মূল পাণ্ডুলিপি বা অধ্যায়ের টেক্সট (Original Script)</span>
                <span className="font-mono text-[11px] text-[#697486]">
                  {metrics.totalWords} words · {metrics.totalChars} characters
                </span>
              </div>
              <textarea
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                placeholder="এখানে বইয়ের সম্পূর্ণ অধ্যায় বা কবিতার পঙ্‌ক্তি পেস্ট করুন..."
                rows={5}
                className="w-full bg-[#0E1117] border border-[#222938] rounded-md p-3.5 text-xs font-editorial text-[14px] leading-relaxed text-[#EDE8DE] focus:border-[#B88746] focus:outline-none resize-y"
              />
            </div>
          </div>

          {/* Controls Bar: Model, Language, Voice Persona, Style, Chunking & Timing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 bg-[#12151C] border border-[#202735] p-5 rounded-md text-xs">
            {/* 1. Model Selection */}
            <div className="space-y-1.5">
              <label className="text-[#8F9AA9] font-medium flex items-center justify-between">
                <span>এআই মডেল (Model):</span>
                <span className="text-[10px] font-mono text-[#50B876]">
                  {selectedModel === "gemini-3.8-flash-tts" ? "$0.0015/1K" : "$0.0005/1K"}
                </span>
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-[#0E1015] border border-[#232B3B] rounded p-2 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
              >
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-[#697486] leading-tight">
                {MODELS.find((m) => m.id === selectedModel)?.desc}
              </p>
            </div>

            {/* 2. Language Selection */}
            <div className="space-y-1.5">
              <label className="text-[#8F9AA9] font-medium">কথনের ভাষা (Language):</label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full bg-[#0E1015] border border-[#232B3B] rounded p-2 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-[#697486] leading-tight">
                বাংলা যতিচিহ্ন (।) ও উচ্চারণে সমন্বিত
              </p>
            </div>

            {/* 3. Voice Persona */}
            <div className="space-y-1.5">
              <label className="text-[#8F9AA9] font-medium flex items-center justify-between">
                <span>কথক (Voice):</span>
                <span className="text-[11px] font-mono text-[#B88746]">
                  {VOICES.find((v) => v.id === voiceName)?.tone}
                </span>
              </label>
              <select
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                className="w-full bg-[#0E1015] border border-[#232B3B] rounded p-2 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
              >
                {VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.id} — {v.persona}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-[#697486] leading-tight">
                {VOICES.find((v) => v.id === voiceName)?.persona}
              </p>
            </div>

            {/* 4. Speaking Style */}
            <div className="space-y-1.5">
              <label className="text-[#8F9AA9] font-medium">কথনের শৈলী (Style):</label>
              <input
                type="text"
                value={voiceStyle}
                onChange={(e) => setVoiceStyle(e.target.value)}
                placeholder="e.g. Solemn, steady rhythm"
                className="w-full bg-[#0E1015] border border-[#232B3B] rounded p-2 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
              />
              <p className="text-[10px] text-[#697486] leading-tight truncate" title={voiceStyle}>
                প্রম্পট টিউনিং সক্রিয়
              </p>
            </div>

            {/* 5. Chunking Strategy */}
            <div className="space-y-1.5">
              <label className="text-[#8F9AA9] font-medium">চ্যাঙ্কিং (Chunking):</label>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => setChunkMode("paragraph")}
                  className={`py-1.5 px-1 rounded text-[11px] border text-center transition-colors ${
                    chunkMode === "paragraph"
                      ? "bg-[#252C3B] border-[#B88746] text-[#EDE8DE] font-semibold"
                      : "bg-[#0E1015] border-[#232B3B] text-[#8F9AA9]"
                  }`}
                >
                  অনুচ্ছেদ
                </button>
                <button
                  type="button"
                  onClick={() => setChunkMode("sentence")}
                  className={`py-1.5 px-1 rounded text-[11px] border text-center transition-colors ${
                    chunkMode === "sentence"
                      ? "bg-[#252C3B] border-[#B88746] text-[#EDE8DE] font-semibold"
                      : "bg-[#0E1015] border-[#232B3B] text-[#8F9AA9]"
                  }`}
                >
                  বাক্য
                </button>
                <button
                  type="button"
                  onClick={() => setChunkMode("wordLimit")}
                  className={`py-1.5 px-1 rounded text-[11px] border text-center transition-colors ${
                    chunkMode === "wordLimit"
                      ? "bg-[#252C3B] border-[#B88746] text-[#EDE8DE] font-semibold"
                      : "bg-[#0E1015] border-[#232B3B] text-[#8F9AA9]"
                  }`}
                >
                  শব্দ ({wordLimit})
                </button>
              </div>
              <p className="text-[10px] text-[#697486] leading-tight">
                মোট {chunks.length} চ্যাঙ্ক বিভক্ত
              </p>
            </div>

            {/* 6. Speed & Silence Gap */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#8F9AA9] font-medium">গতি ও বিরতি:</span>
                <span className="font-mono text-[#B88746]">
                  {speed}x · {silenceGap}s
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0.75"
                  max="1.5"
                  step="0.05"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full accent-[#B88746]"
                />
              </div>
              <p className="text-[10px] text-[#697486] leading-tight">
                সংযুক্তির সময় {silenceGap}s ব্যবধান
              </p>
            </div>
          </div>

          {/* Quick Style Presets Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] text-[#7F8D9E]">স্টাইল প্রিসেট:</span>
            {STYLE_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setVoiceStyle(p.style)}
                className="px-2.5 py-1 bg-[#151922] hover:bg-[#1E2533] text-[11px] text-[#A6B2C3] hover:text-[#EDE8DE] rounded border border-[#232B3B] transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Queue Action Bar & Safeguards */}
          <div className="bg-[#12151C] border border-[#202735] p-4 rounded-md flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[#8F9AA9]">চ্যাঙ্ক অগ্রগতি:</span>
                <span className="font-mono font-bold text-[#EDE8DE]">
                  {metrics.completedChunks} / {metrics.totalChunks} সম্পন্ন
                </span>
                {metrics.cachedChunks > 0 && (
                  <span className="text-[11px] font-mono text-[#50B876]">({metrics.cachedChunks} ক্যাশড ⚡)</span>
                )}
              </div>

              {/* Safety Budget & Limit Inputs */}
              <div className="flex items-center gap-2 border-l border-[#232C3D] pl-4">
                <span className="text-[#8F9AA9]">সর্বোচ্চ বাজেট:</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={maxBudgetUsd}
                  onChange={(e) => setMaxBudgetUsd(parseFloat(e.target.value) || 0.05)}
                  className="w-16 bg-[#0E1015] border border-[#232B3B] rounded px-1.5 py-0.5 text-xs text-[#EDE8DE] font-mono"
                />
                <span className="text-[#8F9AA9] ml-2">চ্যাঙ্ক সীমা:</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={maxChunksLimit}
                  onChange={(e) => setMaxChunksLimit(parseInt(e.target.value, 10) || 15)}
                  className="w-14 bg-[#0E1015] border border-[#232B3B] rounded px-1.5 py-0.5 text-xs text-[#EDE8DE] font-mono"
                />
              </div>
            </div>

            {/* Queue Execution Buttons */}
            <div className="flex items-center gap-2">
              {metrics.failedChunks > 0 && !isQueueRunning && (
                <button
                  onClick={() => handleStartQueue(true)}
                  className="px-3 py-2 bg-[#421D1D] hover:bg-[#582525] text-[#FF9E9E] border border-[#6E2E2E] rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ব্যর্থ চ্যাঙ্ক পুনরায় চালু ({metrics.failedChunks})</span>
                </button>
              )}

              {isQueueRunning ? (
                <>
                  <button
                    onClick={handlePauseQueue}
                    className="px-3.5 py-2 bg-[#2D2415] hover:bg-[#3D311C] text-[#E5C380] border border-[#52401C] rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>বিরতি (Pause)</span>
                  </button>

                  <button
                    onClick={handleCancelQueue}
                    className="px-3.5 py-2 bg-[#251A1C] hover:bg-[#382226] text-[#FF8585] border border-[#4D2328] rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <span>বাতিল (Cancel)</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleStartQueue(false)}
                  disabled={chunks.length === 0 || metrics.isOverBudget || metrics.isOverChunkLimit}
                  className="px-4 py-2 bg-[#B88746] hover:bg-[#C99654] disabled:opacity-50 text-[#0D0F12] text-xs font-bold rounded flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {metrics.completedChunks > 0 && metrics.completedChunks < metrics.totalChunks
                      ? `বাকি ${metrics.totalChunks - metrics.completedChunks} চ্যাঙ্ক কথন শুরু`
                      : "সব চ্যাঙ্ক কথন তৈরি শুরু (Start Narration)"}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Master Post-Production Bar (When at least 1 chunk is completed) */}
          {metrics.completedChunks > 0 && (
            <div className="bg-[#10141D] border border-[#1E293B] p-4 rounded-md flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#50B876]" />
                <span className="font-semibold text-[#EDE8DE]">
                  {metrics.completedChunks} চ্যাঙ্ক অডিও স্থায়ীভাবে সংরক্ষিত
                </span>
                <span className="text-[#8F9AA9]">·</span>
                <span className="text-[#8F9AA9]">WAV মাস্টার প্রস্তুত করার জন্য প্রস্তুত</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Sequential Playback Button */}
                {isSequentialPlaying ? (
                  <button
                    onClick={handleStopSequentialPlayback}
                    className="px-3 py-1.5 bg-[#421D1D] hover:bg-[#582525] text-[#FF9E9E] border border-[#6E2E2E] rounded font-semibold flex items-center gap-1.5 transition-colors animate-pulse"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>ধারাবাহিক প্লেব্যাক বন্ধ</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStartSequentialPlayback}
                    className="px-3 py-1.5 bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12] rounded font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>সব চ্যাঙ্ক ধারাবাহিকভাবে বাজান</span>
                  </button>
                )}

                <button
                  onClick={handleMergeMasterWav}
                  disabled={isMergingMaster}
                  className="px-3 py-1.5 bg-[#1B2332] hover:bg-[#253044] text-[#D8CFBF] border border-[#2B374E] rounded font-medium flex items-center gap-1.5 transition-colors"
                >
                  {isMergingMaster ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#B88746]" />
                      <span>মার্জ হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-3.5 h-3.5 text-[#B88746]" />
                      <span>মাস্টার অডিওবুক WAV মার্জ করুন</span>
                    </>
                  )}
                </button>

                {masterAudioUrl && (
                  <button
                    onClick={handleDownloadMaster}
                    className="px-3 py-1.5 bg-[#18261E] hover:bg-[#22382A] text-[#50B876] border border-[#2E4F39] rounded font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>মাস্টার WAV ডাউনলোড</span>
                  </button>
                )}

                <button
                  onClick={handleSendToAudioStudio}
                  className="px-3 py-1.5 bg-[#1B202A] hover:bg-[#242C3A] text-[#B88746] border border-[#353229] rounded font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <SendHorizontal className="w-3.5 h-3.5" />
                  <span>Audio Studio-তে পাঠান</span>
                </button>

                <button
                  onClick={handleSaveToLibrary}
                  className="px-3 py-1.5 bg-[#1B202A] hover:bg-[#242C3A] text-[#EDE8DE] border border-[#273042] rounded font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Bookmark className="w-3.5 h-3.5 text-[#B88746]" />
                  <span>লাইব্রেরিতে যুক্ত করুন</span>
                </button>
              </div>
            </div>
          )}

          {/* Master Audio Waveform Preview */}
          {masterAudioUrl && (
            <div className="bg-[#0E1117] border border-[#222938] p-4 rounded-md space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#EDE8DE]">
                  Master Audiobook Preview ({projectTitle})
                </span>
                <span className="font-mono text-[#50B876] text-[11px]">24kHz Linear PCM RIFF WAV</span>
              </div>
              <WaveformVisualizer
                audioUrl={masterAudioUrl}
                duration={metrics.completedChunks * 6}
                title={`${projectTitle} - Complete Master`}
              />
            </div>
          )}

          {/* Chunk List / Queue Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#8F9AA9]">
              <span className="font-semibold text-[#EDE8DE]">
                অধ্যায় ও চ্যাঙ্ক কিউ ({chunks.length} চ্যাঙ্ক)
                {isSequentialPlaying && (
                  <span className="ml-2 font-mono text-[11px] text-[#B88746] animate-pulse">
                    ● ধারাবাহিক প্লেব্যাক সক্রিয়
                  </span>
                )}
              </span>
              <span className="text-[11px] text-[#697486]">
                প্রতিটি চ্যাঙ্কের টেক্সট সরাসরি সম্পাদনাযোগ্য; পরিবর্তনের পর স্বয়ংক্রিয়ভাবে নতুন হ্যাশ গণনা হবে
              </span>
            </div>

            <div className="space-y-2.5">
              {chunks.map((chunk, index) => {
                const isPlaying = playingChunkId === chunk.id;
                const isProcessing = chunk.status === "processing";
                const isCompleted = chunk.status === "completed";
                const isFailed = chunk.status === "failed";

                return (
                  <div
                    key={chunk.id}
                    className={`p-4 rounded-md border transition-all ${
                      isPlaying
                        ? "bg-[#161D28] border-[#B88746] ring-1 ring-[#B88746]/60 shadow-md shadow-[#B88746]/10"
                        : isProcessing
                        ? "bg-[#161C26] border-[#B88746]"
                        : isCompleted
                        ? "bg-[#11141B] border-[#222A38]"
                        : isFailed
                        ? "bg-[#1F1416] border-[#4A242A]"
                        : "bg-[#11141A] border-[#1D2330]"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      {/* Left: Chunk Index, Text & Metrics */}
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className={`px-2 py-0.5 rounded font-mono font-bold ${
                            isPlaying
                              ? "bg-[#B88746] text-[#0D0F12]"
                              : "bg-[#1B212D] border border-[#283244] text-[#EDE8DE]"
                          }`}>
                            #{chunk.chunkIndex}
                          </span>
                          <span className="text-[#8F9AA9] text-[11px] font-mono">
                            {chunk.text.split(/\s+/).filter(Boolean).length} words · {chunk.text.length} chars
                          </span>

                          {/* Now Playing Live Badge */}
                          {isPlaying && (
                            <span className="px-2 py-0.5 bg-[#B88746]/20 border border-[#B88746] text-[#E5C380] rounded font-mono text-[10px] flex items-center gap-1.5 animate-pulse">
                              <Volume2 className="w-3 h-3 text-[#B88746]" />
                              <span>এখন বাজছে {isSequentialPlaying ? "(ধারাবাহিক)" : ""}</span>
                            </span>
                          )}

                          {/* Cache Status Badge */}
                          {chunk.isCached ? (
                            <span className="px-2 py-0.5 bg-[#14231A] border border-[#23442F] text-[#50B876] rounded font-mono text-[10px] flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              <span>ক্যাশড ($0.00 খরচ)</span>
                            </span>
                          ) : isCompleted ? (
                            <span className="px-2 py-0.5 bg-[#1B212D] text-[#8C98AC] rounded font-mono text-[10px]">
                              সদ্য প্রস্তুত ({chunk.model?.includes("lite") ? "Flash-Lite" : "Flash"})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-[#181D26] text-[#7F8D9E] rounded font-mono text-[10px]">
                              আনুমানিক ~{selectedModel === "gemini-3.8-flash-tts" ? "$0.0003" : "$0.0001"}
                            </span>
                          )}

                          {chunk.audioDuration && (
                            <span className="text-[11px] font-mono text-[#A0AEC0]">
                              ~{chunk.audioDuration.toFixed(1)}s
                            </span>
                          )}

                          {chunk.fileSizeBytes && (
                            <span className="text-[11px] font-mono text-[#697486]">
                              {(chunk.fileSizeBytes / 1024).toFixed(0)} KB
                            </span>
                          )}
                        </div>

                        {/* Editable Text Area for Chunk */}
                        <textarea
                          value={chunk.text}
                          onChange={(e) => {
                            const newText = e.target.value;
                            setChunks((prev) =>
                              prev.map((c, i) => (i === index ? { ...c, text: newText, status: "pending" } : c))
                            );
                          }}
                          rows={2}
                          className="w-full bg-[#0D0F14] border border-[#202735] rounded p-2 text-xs font-editorial text-[14px] leading-relaxed text-[#EDE8DE] focus:border-[#B88746] focus:outline-none resize-none"
                        />

                        {isFailed && chunk.error && (
                          <div className="text-[11px] text-[#FF8585] flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>ত্রুটি: {chunk.error}</span>
                          </div>
                        )}
                      </div>

                      {/* Right: Chunk Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0 pt-1">
                        {isCompleted && (
                          <>
                            <button
                              onClick={() => handlePlayChunk(chunk)}
                              className={`p-2 rounded border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                                isPlaying
                                  ? "bg-[#B88746] text-[#0D0F12] border-[#B88746]"
                                  : "bg-[#181D26] hover:bg-[#222A38] text-[#D8CFBF] border-[#2A3446]"
                              }`}
                              title={isPlaying ? "Pause" : "Play Spoken Chunk"}
                            >
                              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                              <span className="hidden sm:inline">{isPlaying ? "Pause" : "Play"}</span>
                            </button>

                            <button
                              onClick={() => handleDownloadSingleChunk(chunk)}
                              className="p-2 bg-[#181D26] hover:bg-[#222A38] text-[#8F9AA9] hover:text-[#EDE8DE] border border-[#2A3446] rounded text-xs transition-colors"
                              title="Download WAV for this chunk"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => synthesizeSingleChunk(chunk)}
                          disabled={isProcessing}
                          className="px-2.5 py-2 bg-[#181D26] hover:bg-[#222A38] text-[#B88746] border border-[#2E374A] rounded text-xs font-medium flex items-center gap-1 transition-colors"
                          title="Generate or Re-synthesize this chunk"
                        >
                          {isProcessing ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5" />
                          )}
                          <span className="hidden sm:inline">
                            {isProcessing ? "উৎপাদন হচ্ছে..." : isCompleted ? "পুনরায় তৈরি" : "তৈরি করুন"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Quick Audition / Full 5-Min Narration Studio */}
      {activeTab === "quick" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-4">
            {/* Title & Quick Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#12151C] p-3 rounded-md border border-[#202735]">
              <div className="flex-1 flex items-center gap-2">
                <span className="text-xs text-[#8F9AA9] shrink-0">শিরোনাম:</span>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="কথন বা গল্পের শিরোনাম..."
                  className="bg-[#0A0D12] border border-[#222B3B] rounded px-2.5 py-1 text-xs text-[#EDE8DE] font-semibold focus:border-[#B88746] focus:outline-none w-full"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleResetScript}
                  className="px-2.5 py-1 rounded text-[11px] font-medium bg-[#1F1719] hover:bg-[#2C1C1F] text-[#FF9E9E] border border-[#52252B] flex items-center gap-1 transition-colors"
                  title="লেখা ও অডিও পরিষ্কার করুন"
                >
                  <Eraser className="w-3 h-3" />
                  <span>পরিষ্কার করুন</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className="px-2.5 py-1 rounded text-[11px] font-medium bg-[#131B26] hover:bg-[#1A2636] text-[#8CB8F5] border border-[#233852] flex items-center gap-1 transition-colors"
                  title="পূর্বের তৈরি কথন ইতিহাস দেখুন"
                >
                  <History className="w-3 h-3" />
                  <span>ইতিহাস ({narrationHistory.length})</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#8F9AA9]">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#EDE8DE]">টেক্সট ইনপুট (Text-to-Speech Input Script):</span>
                <span className="text-[11px] px-2 py-0.5 bg-[#1B2332] text-[#8CB8F5] border border-[#2B3B55] rounded font-mono">
                  Gemini 3.8 Flash TTS
                </span>
              </div>
              <span className="font-mono text-[11px] text-[#697486]">
                {scriptText.split(/\s+/).filter(Boolean).length} শব্দ · আনুমানিক ~
                {Math.round(scriptText.split(/\s+/).filter(Boolean).length / 2.5)} সেকেন্ড
              </span>
            </div>

            <textarea
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder="এখানে যেকোনো বাংলা বা বিশ্বসাহিত্যের টেক্সট, গল্প, উপন্যাস, কবিতা বা কথন লিখুন অথবা পেস্ট করুন..."
              rows={9}
              className="w-full bg-[#0E1117] border border-[#222938] rounded-md p-4 text-xs font-editorial text-[15px] leading-relaxed text-[#EDE8DE] focus:border-[#B88746] focus:outline-none resize-none font-['Noto_Serif_Bengali']"
            />

            {/* Quick Sample Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-[#8F9AA9]">নমুনা সাহিত্য:</span>
              {SAMPLE_STEMS.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => handleLoadSample(sample)}
                  className="px-2.5 py-1 bg-[#12161F] hover:bg-[#1E2535] text-[#D8CFBF] border border-[#232C3D] rounded text-[11px] transition-colors"
                >
                  {sample.title}
                </button>
              ))}
            </div>

            {/* If audio generated: Waveform & Direct Download */}
            {masterAudioUrl && (
              <div className="bg-[#0E1117] border border-[#222938] p-5 rounded-md space-y-4 shadow-lg shadow-black/40">
                <div className="flex items-center justify-between text-xs border-b border-[#1E2533] pb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#50B876]" />
                    <span className="font-semibold text-[#EDE8DE]">
                      তৈরিকৃত সম্পূর্ণ মাস্টার অডিও ({projectTitle})
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#50B876] bg-[#14231A] px-2 py-0.5 rounded border border-[#23442F]">
                    24kHz Linear PCM RIFF WAV
                  </span>
                </div>

                <WaveformVisualizer
                  audioUrl={masterAudioUrl}
                  title={`${projectTitle} - সম্পূর্ণ অডিও কথন`}
                  filename={`${projectTitle.replace(/\s+/g, "_")}_Full_Audio.wav`}
                />

                {/* Primary Prominent Download Button */}
                <div className="pt-2">
                  <button
                    onClick={handleDownloadMaster}
                    className="w-full py-3 bg-[#18261E] hover:bg-[#233B2C] text-[#50B876] border border-[#2E4F39] rounded-md font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    <span>সম্পূর্ণ অডিও ডাউনলোড করুন (.wav ফাইল সরাসরি নামান)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#12151C] border border-[#202735] p-6 rounded-md space-y-5 manuscript-paper">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#B88746] flex items-center justify-between">
                <span>Voice Persona & Directing</span>
                <span className="text-[10px] text-[#8F9AA9] lowercase">gemini-3.8-flash-tts</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1.5">
                  <label className="text-[#8F9AA9]">এআই মডেল:</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full bg-[#0E1015] border border-[#232B3B] rounded p-2 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                  >
                    {MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label.replace("Gemini 3.8 ", "")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#8F9AA9]">কথনের ভাষা:</label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full bg-[#0E1015] border border-[#232B3B] rounded p-2 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 5 Distinct Voice Options */}
              <div className="space-y-2 text-xs">
                <label className="text-[#8F9AA9]">কথকের কণ্ঠস্বর (Voice Selection):</label>
                <div className="space-y-1.5">
                  {VOICES.map((v) => {
                    const isSelected = voiceName === v.id;
                    return (
                      <div
                        key={v.id}
                        onClick={() => setVoiceName(v.id)}
                        className={`p-2.5 rounded border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-[#1C1812] border-[#B88746] ring-1 ring-[#B88746]/50"
                            : "bg-[#0E1015] border-[#202735] hover:border-[#354157]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              isSelected ? "bg-[#B88746]" : "bg-[#2E374A]"
                            }`}
                          />
                          <span className="font-bold text-[#EDE8DE]">{v.id}</span>
                          <span className="text-[#8F9AA9] text-[11px]">({v.persona})</span>
                        </div>
                        <span className="text-[10px] text-[#B88746] font-medium">{v.tone}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="text-[#8F9AA9]">মুড ও কথনের শৈলী (Style Prompt):</label>
                <input
                  type="text"
                  value={voiceStyle}
                  onChange={(e) => setVoiceStyle(e.target.value)}
                  className="w-full bg-[#0E1015] border border-[#232B3B] rounded p-2 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none font-editorial"
                />
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#8F9AA9]">Pace & Tempo:</span>
                  <span className="font-mono text-[#B88746]">{speed}x</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.75"
                    max="1.5"
                    step="0.05"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    className="w-full accent-[#B88746]"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    {[0.8, 1.0, 1.25].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSpeed(s)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                          speed === s ? "bg-[#B88746] text-[#0D0F12]" : "bg-[#181D26] text-[#8F9AA9]"
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Primary Action Button: Text-to-Speech Conversion */}
              <div className="space-y-2">
                <button
                  onClick={handleGenerateFullQuickNarration}
                  disabled={isQueueRunning || !scriptText.trim()}
                  className="w-full py-4 bg-[#B88746] hover:bg-[#C99654] disabled:opacity-50 text-[#0D0F12] text-sm font-bold rounded flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-[0.99]"
                >
                  {isQueueRunning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>টেক্সট থেকে স্পিচ অডিও তৈরি হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>টেক্সট থেকে স্পিচ অডিও তৈরি করুন (Convert Text to Speech)</span>
                    </>
                  )}
                </button>

                {isQueueRunning && (
                  <button
                    type="button"
                    onClick={handleCancelGeneration}
                    className="w-full py-2.5 bg-[#2A1517] hover:bg-[#3D1E22] text-[#FF8585] border border-[#5A252B] text-xs font-bold rounded flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <X className="w-4 h-4" />
                    <span>স্পিচ তৈরি বাতিল করুন (Cancel Generation)</span>
                  </button>
                )}
              </div>

              {/* Fallback Single Audition Button */}
              <button
                onClick={async () => {
                  if (chunks.length > 0) {
                    const success = await synthesizeSingleChunk(chunks[0]);
                    if (success) {
                      const blob = await getAudioBlob(chunks[0].id);
                      if (blob) {
                        const url = URL.createObjectURL(blob);
                        setMasterAudioUrl(url);
                        setStatusMessage({
                          type: "success",
                          text: `প্রথম অংশ (${chunks[0].chunkIndex}) তৈরি সম্পন্ন।`,
                        });
                      }
                    }
                  }
                }}
                disabled={isQueueRunning || !scriptText.trim()}
                className="w-full py-2 bg-[#161B24] hover:bg-[#202734] disabled:opacity-50 text-[#B88746] border border-[#2B364A] text-xs font-medium rounded flex items-center justify-center gap-1.5 transition-colors"
              >
                <Mic2 className="w-3.5 h-3.5" />
                <span>প্রথম অংশ দিয়ে টেস্ট স্পিচ তৈরি করুন (Test Single Chunk TTS)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Reader Experience with Aesthetic Typography & Soundscapes */}
      {activeTab === "reader" && (
        <div className="space-y-6">
          {/* Reader Top Action Bar: Voice Conversion & Manuscript Controls */}
          <div className="bg-[#12151C] border border-[#202735] p-4 rounded-md space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Voice Persona Selector */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#8F9AA9] font-medium flex items-center gap-1">
                  <Mic2 className="w-3.5 h-3.5 text-[#B88746]" />
                  <span>কথকের কণ্ঠ:</span>
                </span>
                <select
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  className="bg-[#0E1117] border border-[#242C3D] rounded px-2.5 py-1.5 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none font-medium"
                >
                  {VOICES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label} ({v.persona})
                    </option>
                  ))}
                </select>
              </div>

              {/* Primary Buttons: Generate Audio, Download Master WAV, Edit Manuscript */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Convert Full Text to Voice Button */}
                <button
                  onClick={handleGenerateFullQuickNarration}
                  disabled={isQueueRunning || !scriptText.trim()}
                  className="px-4 py-2 bg-[#B88746] hover:bg-[#C99654] disabled:opacity-50 text-[#0D0F12] text-xs font-bold rounded flex items-center gap-2 transition-all shadow-md active:scale-95"
                  title="সম্পূর্ণ লেখার সকল অংশের অডিও তৈরি ও মার্জ করুন"
                >
                  {isQueueRunning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>অডিও তৈরি হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>টেক্সট থেকে স্পিচ তৈরি করুন (Convert to Speech)</span>
                    </>
                  )}
                </button>

                {/* Persistent Download WAV Button */}
                <button
                  onClick={masterAudioUrl ? handleDownloadMaster : undefined}
                  disabled={!masterAudioUrl}
                  className={`px-3.5 py-2 rounded text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm ${
                    masterAudioUrl
                      ? "bg-[#18261E] hover:bg-[#233B2C] text-[#50B876] border border-[#2E4F39] active:scale-95 cursor-pointer"
                      : "bg-[#141822] text-[#697486] border border-[#202735] opacity-50 cursor-not-allowed"
                  }`}
                  title={
                    masterAudioUrl
                      ? "সম্পূর্ণ কথনের .wav ফাইল সরাসরি ডাউনলোড করুন"
                      : "কথন তৈরি করার পর .wav ফাইল ডাউনলোড সক্রিয় হবে"
                  }
                >
                  <Download className="w-4 h-4" />
                  <span>ডাউনলোড (.wav)</span>
                </button>

                {/* Edit / Paste Text Toggle */}
                <button
                  onClick={() => setShowReaderEditor(!showReaderEditor)}
                  className={`px-3 py-2 rounded text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                    showReaderEditor
                      ? "bg-[#B88746]/20 border-[#B88746] text-[#E0D7C6]"
                      : "bg-[#1B212D] border-[#2C384E] text-[#EDE8DE] hover:bg-[#252E3E]"
                  }`}
                  title="লেখা পরিবর্তন বা নতুন টেক্সট পেস্ট করুন"
                >
                  <FileText className="w-3.5 h-3.5 text-[#B88746]" />
                  <span>লেখা পরিবর্তন / পেস্ট</span>
                </button>

                <button
                  onClick={() => setIsTocOpen(!isTocOpen)}
                  className="px-3 py-2 bg-[#1B212D] hover:bg-[#252E3E] text-[#EDE8DE] border border-[#2C384E] rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <BookMarked className="w-3.5 h-3.5 text-[#B88746]" />
                  <span>সূচিপত্র ({chunks.length})</span>
                </button>

                <button
                  onClick={() => setIsContextModalOpen(true)}
                  className="px-3 py-2 bg-[#1B212D] hover:bg-[#252E3E] text-[#EDE8DE] border border-[#2C384E] rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Info className="w-3.5 h-3.5 text-[#4D9EFF]" />
                  <span>প্রেক্ষাপট ও চরিত্র</span>
                </button>
              </div>
            </div>

            {/* Sub-bar: Theme Switcher & Typography */}
            <div className="pt-2 border-t border-[#1C2230] flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Themes */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[#8F9AA9] font-medium">থিম:</span>
                {[
                  { id: "nocturne", label: "রাত্রির মায়া", color: "#14100D" },
                  { id: "parchment", label: "পাণ্ডুলিপি", color: "#F6F0E4" },
                  { id: "oled", label: "কালিমা", color: "#000000" },
                  { id: "dawn", label: "ভোরবেলা", color: "#FFF6F2" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setReaderTheme(t.id as any)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium border flex items-center gap-1.5 transition-all ${
                      readerTheme === t.id
                        ? "bg-[#1E2636] border-[#B88746] text-[#EDE8DE] ring-1 ring-[#B88746]"
                        : "bg-[#0E1117] border-[#222938] text-[#8F9AA9] hover:text-[#EDE8DE]"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/40"
                      style={{ backgroundColor: t.color }}
                    />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Font & Size */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-[#0E1117] p-1 border border-[#222938] rounded">
                  <button
                    onClick={() => setReaderFont("noto")}
                    className={`px-2 py-0.5 rounded text-[11px] font-['Noto_Serif_Bengali'] transition-colors ${
                      readerFont === "noto" ? "bg-[#B88746] text-[#0D0F12] font-bold" : "text-[#8F9AA9]"
                    }`}
                  >
                    সেরিফ (Noto)
                  </button>
                  <button
                    onClick={() => setReaderFont("hind")}
                    className={`px-2 py-0.5 rounded text-[11px] font-['Hind_Siliguri'] transition-colors ${
                      readerFont === "hind" ? "bg-[#B88746] text-[#0D0F12] font-bold" : "text-[#8F9AA9]"
                    }`}
                  >
                    ঋজু (Hind)
                  </button>
                </div>

                <div className="flex items-center gap-1 bg-[#0E1117] border border-[#222938] rounded px-2 py-1">
                  <button
                    onClick={() => setReaderFontSize((prev) => Math.max(14, prev - 1))}
                    className="px-1.5 py-0.5 text-[#B88746] hover:bg-[#1E2533] rounded font-bold"
                    title="লেখা ছোট করুন"
                  >
                    অ-
                  </button>
                  <span className="font-mono text-[11px] text-[#EDE8DE] px-1">{readerFontSize}px</span>
                  <button
                    onClick={() => setReaderFontSize((prev) => Math.min(26, prev + 1))}
                    className="px-1.5 py-0.5 text-[#B88746] hover:bg-[#1E2533] rounded font-bold"
                    title="লেখা বড় করুন"
                  >
                    অ+
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Collapsible Manuscript Text Editor */}
          {showReaderEditor && (
            <div className="bg-[#10141D] border border-[#263348] rounded-md p-5 space-y-4 shadow-xl animate-fade-in">
              <div className="flex items-center justify-between border-b border-[#202735] pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#B88746]" />
                  <h3 className="font-bold text-sm text-[#EDE8DE]">
                    সাহিত্যিক পাঠ্য ও স্ক্রিপ্ট পরিবর্তন করুন
                  </h3>
                </div>
                <button
                  onClick={() => setShowReaderEditor(false)}
                  className="p-1 text-[#8F9AA9] hover:text-[#EDE8DE]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] text-[#8F9AA9] block mb-1">গল্প বা অধ্যায়ের শিরোনাম:</label>
                  <input
                    type="text"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    className="w-full bg-[#0E1117] border border-[#232B3B] rounded p-2 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                    placeholder="শিরোনাম লিখুন..."
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8F9AA9] block mb-1">লেখক / কথক পরিচিতি:</label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="w-full bg-[#0E1117] border border-[#232B3B] rounded p-2 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                    placeholder="লেখকের নাম..."
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-[#8F9AA9] block mb-1">
                  মূল পাণ্ডুলিপি বা পাঠ্য টেক্সট (ব্র্যাকেটে [আবহসুর] রাখতে পারেন):
                </label>
                <textarea
                  value={scriptText}
                  onChange={(e) => {
                    setScriptText(e.target.value);
                    setMasterAudioUrl(null);
                  }}
                  rows={8}
                  className="w-full bg-[#0A0D13] border border-[#232B3B] rounded p-3 text-xs font-editorial text-[14px] leading-relaxed text-[#EDE8DE] focus:border-[#B88746] focus:outline-none resize-y"
                  placeholder="এখানে আপনার বই, গল্প বা যে কোনো বাংলা লেখা পেস্ট করুন..."
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1C2230]">
                <div className="flex items-center gap-3 text-xs text-[#8F9AA9] font-mono">
                  <span>{scriptText.split(/\s+/).filter(Boolean).length} শব্দ</span>
                  <span>·</span>
                  <span>{scriptText.length} অক্ষর</span>
                  <span>·</span>
                  <span className="text-[#B88746]">~{chunks.length} টি অংশে পাঠ হবে</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowReaderEditor(false)}
                    className="px-3 py-1.5 bg-[#171D27] hover:bg-[#202735] text-[#8F9AA9] rounded text-xs font-medium"
                  >
                    বন্ধ করুন
                  </button>

                  <button
                    onClick={() => {
                      setShowReaderEditor(false);
                      handleGenerateFullQuickNarration();
                    }}
                    disabled={isQueueRunning || !scriptText.trim()}
                    className="px-4 py-1.5 bg-[#B88746] hover:bg-[#C99654] disabled:opacity-50 text-[#0D0F12] text-xs font-bold rounded flex items-center gap-1.5 shadow-md"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>সংরক্ষণ ও অডিও তৈরি করুন</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reader Content Area Styled by Active Theme */}
          <div
            className={`p-6 sm:p-10 rounded-lg border transition-all ${
              readerTheme === "nocturne"
                ? "bg-[#13110E] text-[#E8DFC9] border-[#382B1C]"
                : readerTheme === "parchment"
                ? "bg-[#FAF4E8] text-[#2D2115] border-[#DFD1BD]"
                : readerTheme === "oled"
                ? "bg-[#000000] text-[#E5E7EB] border-[#1F2937]"
                : "bg-[#FFF6F3] text-[#3D2525] border-[#F2D7D0]"
            } ${readerFont === "noto" ? "font-['Noto_Serif_Bengali']" : "font-['Hind_Siliguri']"}`}
            style={{ fontSize: `${readerFontSize}px`, lineHeight: 1.85 }}
          >
            {/* Story Header Banner */}
            <div className="border-b pb-6 mb-8 text-center space-y-2 opacity-95">
              <span className="text-xs uppercase tracking-widest font-mono text-[#B88746]">
                ক্লাসিক্যাল সাহিত্য ও আবহ আবৃত্তি
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold font-display">{projectTitle}</h2>
              <p className="text-sm italic opacity-80">{authorName}</p>

              {/* Soundscape Quick Launcher Bar */}
              <div className="pt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
                <span className="text-[11px] opacity-75 font-mono">আবহসুর চালু করুন:</span>
                {AMBIENCE_TRACKS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      if (ambienceSynthesizer.getActiveTrack() === t.id) {
                        ambienceSynthesizer.stop();
                      } else {
                        ambienceSynthesizer.play(t.id);
                      }
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] border flex items-center gap-1.5 transition-all ${
                      ambienceSynthesizer.getActiveTrack() === t.id
                        ? "bg-[#B88746] text-[#0D0F12] border-[#B88746] font-bold shadow-sm"
                        : "bg-black/20 border-current/20 hover:border-current/40 opacity-85"
                    }`}
                  >
                    <Music className="w-3 h-3" />
                    <span>{t.bengaliName.split(" ")[0]} ({t.title.split(" ")[0]})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Paragraph / Chunk Flow with Read-Along Highlighting */}
            <div className="space-y-6">
              {chunks.map((chunk) => {
                const isPlaying = playingChunkId === chunk.id;
                const isCompleted = chunk.status === "completed";

                // Detect Bracketed Soundscape Cues: [ ... ]
                const soundCueMatch = chunk.text.match(/\[(.*?)\]/);
                const soundCue = soundCueMatch ? soundCueMatch[1] : null;

                // Detect Quotes: " ... "
                const quoteMatch = chunk.text.match(/["“](.*?)["”]/);
                const quoteText = quoteMatch ? quoteMatch[1] : null;

                return (
                  <div
                    key={chunk.id}
                    className={`p-5 rounded-md border transition-all duration-300 relative group ${
                      isPlaying
                        ? readerTheme === "nocturne"
                          ? "bg-[#241B13] border-[#C59B4D] ring-2 ring-[#C59B4D]/50 shadow-xl shadow-[#C59B4D]/10"
                          : readerTheme === "parchment"
                          ? "bg-[#F1E5D0] border-[#9E6229] ring-2 ring-[#9E6229]/40 shadow-xl shadow-[#9E6229]/15"
                          : readerTheme === "oled"
                          ? "bg-[#111827] border-[#F59E0B] ring-2 ring-[#F59E0B]/50 shadow-xl shadow-[#F59E0B]/10"
                          : "bg-[#FCEAE5] border-[#C8523A] ring-2 ring-[#C8523A]/40 shadow-xl shadow-[#C8523A]/15"
                        : "border-transparent hover:border-current/15 bg-black/5"
                    }`}
                  >
                    {/* Active Reading Badge */}
                    {isPlaying && (
                      <div className="absolute top-2 right-3 flex items-center gap-1.5 px-2 py-0.5 bg-[#B88746] text-[#0D0F12] rounded font-mono text-[10px] font-bold shadow-sm animate-pulse">
                        <Volume2 className="w-3 h-3" />
                        <span>এখন পাঠ চলছে</span>
                      </div>
                    )}

                    {/* Bracketed Soundscape Cue Card */}
                    {soundCue && (
                      <div className="mb-3 p-3 rounded border border-dashed flex flex-wrap items-center justify-between gap-2 text-xs bg-black/10 border-[#B88746]/40">
                        <div className="flex items-center gap-2">
                          <Music className="w-3.5 h-3.5 text-[#B88746]" />
                          <span className="font-semibold text-[#B88746]">
                            আবহসুর নির্দেশিকা: [{soundCue}]
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            if (soundCue.includes("বাঁশি")) ambienceSynthesizer.play("bansuri");
                            else if (soundCue.includes("বাতাস")) ambienceSynthesizer.play("mountain-wind");
                            else if (soundCue.includes("নদী") || soundCue.includes("কলতান")) ambienceSynthesizer.play("river-waves");
                            else if (soundCue.includes("মাদল") || soundCue.includes("রণ")) ambienceSynthesizer.play("war-drums");
                            else ambienceSynthesizer.play("tanpura");
                          }}
                          className="px-2.5 py-1 bg-[#B88746]/20 hover:bg-[#B88746]/30 text-[#B88746] border border-[#B88746]/50 rounded text-[11px] font-bold flex items-center gap-1 transition-colors"
                        >
                          <Play className="w-3 h-3" />
                          <span>সুর শুনুন</span>
                        </button>
                      </div>
                    )}

                    {/* Main Paragraph Text */}
                    <p className="leading-relaxed whitespace-pre-wrap">{chunk.text}</p>

                    {/* Highlighted Quote / Epitaph Card */}
                    {quoteText && (
                      <div className="mt-4 p-4 rounded-md border-l-4 border-[#B88746] bg-black/20 text-sm italic flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
                        <div className="flex items-center gap-2 font-display">
                          <span className="text-xl text-[#B88746] leading-none">“</span>
                          <span>{quoteText}</span>
                          <span className="text-xl text-[#B88746] leading-none">”</span>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(quoteText);
                            setCopiedQuote(quoteText);
                            setTimeout(() => setCopiedQuote(null), 2500);
                          }}
                          className="px-2.5 py-1 bg-[#1E2535] hover:bg-[#2B354C] text-[#EDE8DE] border border-[#374461] rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors shrink-0"
                        >
                          {copiedQuote === quoteText ? (
                            <>
                              <Check className="w-3 h-3 text-[#50B876]" />
                              <span>কপি হয়েছে!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-[#B88746]" />
                              <span>উদ্ধৃতি কপি করুন</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Controls Row for this Paragraph */}
                    <div className="mt-3 pt-2 border-t border-current/10 flex items-center justify-between text-xs opacity-75 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span>অংশ #{chunk.chunkIndex}</span>
                        <span>·</span>
                        <span>{chunk.text.split(/\s+/).filter(Boolean).length} শব্দ</span>
                        {chunk.audioDuration && <span>· ~{chunk.audioDuration} সে.</span>}
                      </div>

                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <>
                            <button
                              onClick={() => handlePlayChunk(chunk)}
                              className="px-2.5 py-1 bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12] rounded font-bold text-[11px] flex items-center gap-1 transition-colors"
                            >
                              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                              <span>{isPlaying ? "থামান" : "শুনুন"}</span>
                            </button>

                            <button
                              onClick={() => handleDownloadSingleChunk(chunk)}
                              className="p-1 hover:text-[#50B876] transition-colors"
                              title="এই অংশের WAV ডাউনলোড"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => synthesizeSingleChunk(chunk)}
                            className="px-2.5 py-1 bg-black/30 hover:bg-black/50 text-[#B88746] border border-current/20 rounded font-medium text-[11px] flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>অডিও তৈরি</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Slide-out Table of Contents Drawer */}
          {isTocOpen && (
            <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="w-full max-w-md bg-[#11141B] border-l border-[#202838] h-full flex flex-col p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-[#202838] pb-4">
                  <div className="flex items-center gap-2">
                    <BookMarked className="w-4 h-4 text-[#B88746]" />
                    <h3 className="font-bold text-sm text-[#EDE8DE]">সূচিপত্র ও অধ্যায় তালিকা</h3>
                  </div>
                  <button
                    onClick={() => setIsTocOpen(false)}
                    className="p-1 text-[#8F9AA9] hover:text-[#EDE8DE] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {chunks.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        handlePlayChunk(c);
                        setIsTocOpen(false);
                      }}
                      className={`p-3 rounded-md border cursor-pointer transition-all ${
                        playingChunkId === c.id
                          ? "bg-[#1C1812] border-[#B88746]"
                          : "bg-[#0E1117] border-[#1E2535] hover:border-[#354157]"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#EDE8DE]">
                          অংশ #{c.chunkIndex}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            c.status === "completed"
                              ? "bg-[#14231A] text-[#50B876]"
                              : "bg-[#252015] text-[#E5C380]"
                          }`}
                        >
                          {c.status === "completed" ? "প্রস্তুত" : "বাকি"}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8F9AA9] truncate mt-1">
                        {c.text.slice(0, 70)}...
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#202838] pt-3">
                  <button
                    onClick={handleStartSequentialPlayback}
                    className="w-full py-2.5 bg-[#B88746] text-[#0D0F12] rounded font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>সব অধ্যায় একটানা বাজান</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Context & Character Analysis Modal */}
          {isContextModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
              <div className="w-full max-w-2xl bg-[#11141B] border border-[#232D40] rounded-lg p-6 space-y-5 shadow-2xl max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-[#202838] pb-3">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-[#4D9EFF]" />
                    <h3 className="font-bold text-base text-[#EDE8DE]">গল্পের প্রেক্ষাপট ও চরিত্র পরিচিতি</h3>
                  </div>
                  <button
                    onClick={() => setIsContextModalOpen(false)}
                    className="p-1 text-[#8F9AA9] hover:text-[#EDE8DE] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4 text-xs text-[#D8CFBF] leading-relaxed">
                  <div className="p-4 bg-[#0E1117] border border-[#1E2535] rounded-md space-y-2">
                    <h4 className="font-bold text-sm text-[#B88746] font-display">ঐতিহাসিক ও ভৌগোলিক প্রেক্ষাপট</h4>
                    <p>
                      ওয়াজিরিস্তান ও খাইবার গিরিপথ—অনমনীয় রুক্ষ পাথর, দুর্লঙ্ঘ্য গিরিখাত ও আদিম শৌর্যবীর্যের ভূমি। শতাব্দীর পর শতাব্দী ধরে এই ভূখণ্ড একদিকে যেমন রক্তক্ষয়ী সংঘাতের সাক্ষী, অন্যদিকে অনন্ত আত্মত্যাগী প্রেমের অমর ধাত্রীভূমি।
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 bg-[#0E1117] border border-[#1E2535] rounded-md space-y-1.5">
                      <span className="text-[10px] font-mono text-[#4D9EFF] uppercase">নায়ক</span>
                      <h4 className="font-bold text-sm text-[#EDE8DE]">ইউসুফ খান</h4>
                      <p className="text-[11px] text-[#8F9AA9]">
                        অসমসাহসী পাঠান যোদ্ধা। যার বক্ষ ছিল তলোয়ারের চেয়েও শক্ত, কিন্তু প্রাণ ছিল মেহের-নেগারের বাঁশির সুরে নিবেদিত। প্রেম ও সম্মান রক্ষায় নিজের জীবন উৎসর্গকারী বীর।
                      </p>
                    </div>

                    <div className="p-4 bg-[#0E1117] border border-[#1E2535] rounded-md space-y-1.5">
                      <span className="text-[10px] font-mono text-[#FF85A2] uppercase">নায়িকা</span>
                      <h4 className="font-bold text-sm text-[#EDE8DE]">গুলশান / মেহের-নেগার</h4>
                      <p className="text-[11px] text-[#8F9AA9]">
                        গুলশান উপত্যকার রাজকুমারী ও সুরসাধিকা। যাঁর বাঁশির করুণ সুর পাথুরে পাহাড়ে দীর্ঘশ্বাস জাগাতো। প্রেমিকের সমাধিতে নিজেকে বিসর্জন দিয়ে প্রণয়কে অমর করে তোলেন।
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-[#0E1117] border border-[#1E2535] rounded-md space-y-2">
                    <h4 className="font-bold text-xs text-[#50B876] font-display">সাহিত্যিক মূল্যায়ন ও বার্তা</h4>
                    <p>
                      প্রাচ্যের রোমিও-জুলিয়েট বা শিরি-ফরহাদের ধারায় এটি এক ধ্রুপদী বিয়োগান্তক প্রেমগাথা। অস্ত্র যেখানে নতি স্বীকার করে, সেখানে প্রেম পর্বতসম অবিচল থেকে ইতিহাসের পাতায় অমরত্ব লাভ করে।
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#202838] pt-3 flex justify-end">
                  <button
                    onClick={() => setIsContextModalOpen(false)}
                    className="px-4 py-2 bg-[#B88746] text-[#0D0F12] rounded text-xs font-bold"
                  >
                    বন্ধ করুন
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Narration History & Archive */}
      {activeTab === "history" && (
        <div className="space-y-6">
          {/* History Header & Search Controls */}
          <div className="bg-[#12151C] border border-[#202735] p-5 rounded-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-[#B88746]" />
                  <h3 className="font-bold text-base text-[#EDE8DE]">কথন ইতিহাস ও সংরক্ষণাগার</h3>
                </div>
                <p className="text-xs text-[#8F9AA9] mt-0.5">
                  আপনার পূর্বে প্রস্তুতকৃত সমস্ত অডিও কথন, টেক্সট এবং WAV ফাইল এখানে সংরক্ষিত আছে।
                </p>
              </div>

              <div className="flex items-center gap-2">
                {narrationHistory.length > 0 && (
                  <button
                    onClick={handleClearAllHistory}
                    className="px-3 py-1.5 bg-[#261517] hover:bg-[#3D1E22] text-[#FF8585] border border-[#52252A] rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>সম্পূর্ণ ইতিহাস মুছুন</span>
                  </button>
                )}
              </div>
            </div>

            {/* Search Filter Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#8F9AA9] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                placeholder="শিরোনাম, কণ্ঠস্বর বা টেক্সট লিখে খুঁজুন..."
                className="w-full bg-[#0A0D12] border border-[#202735] rounded-md pl-9 pr-4 py-2 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
              />
              {historySearchQuery && (
                <button
                  onClick={() => setHistorySearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8F9AA9] hover:text-[#EDE8DE]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* History Item Cards */}
          {(() => {
            const filtered = narrationHistory.filter((item) => {
              if (!historySearchQuery.trim()) return true;
              const q = historySearchQuery.toLowerCase();
              return (
                item.title.toLowerCase().includes(q) ||
                item.voice.toLowerCase().includes(q) ||
                item.text.toLowerCase().includes(q)
              );
            });

            if (filtered.length === 0) {
              return (
                <div className="p-12 text-center bg-[#11141A] border border-dashed border-[#232B3B] rounded-md space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#181D26] border border-[#2B3547] flex items-center justify-center text-[#8F9AA9]">
                    <History className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-[#EDE8DE]">
                    {historySearchQuery ? "কোনো মিল পাওয়া যায়নি" : "কোনো কথন ইতিহাস সংরক্ষিত নেই"}
                  </h4>
                  <p className="text-xs text-[#8F9AA9] max-w-md mx-auto">
                    {historySearchQuery
                      ? "আপনার অনুসন্ধানের সাথে মেলে এমন কোনো রেকর্ড পাওয়া যায়নি।"
                      : 'কথন তৈরি করলে তা স্বয়ংক্রিয়ভাবে এখানে সংরক্ষিত হবে। আপনি "একক কথন" বা "অধ্যায় স্টুডিও" থেকে কথন তৈরি করতে পারেন।'}
                  </p>
                  {!historySearchQuery && (
                    <button
                      onClick={() => setActiveTab("quick")}
                      className="px-4 py-2 bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12] text-xs font-bold rounded inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>নতুন কথন তৈরি করুন</span>
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 gap-4">
                {filtered.map((item) => {
                  const durMin = Math.floor(item.durationSeconds / 60);
                  const durSec = Math.floor(item.durationSeconds % 60);
                  const sizeMb = (item.fileSizeBytes / (1024 * 1024)).toFixed(2);
                  const isCurrentMaster =
                    masterAudioUrl && historyAudioUrls[item.id] === masterAudioUrl;

                  return (
                    <div
                      key={item.id}
                      className="bg-[#11141B] border border-[#202838] hover:border-[#B88746] rounded-md p-5 transition-all space-y-3.5"
                    >
                      {/* Top Row: Meta & Badges */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1C2230] pb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-display font-bold text-base text-[#EDE8DE]">
                            {item.title}
                          </h4>
                          <span className="px-2 py-0.5 bg-[#1C1812] border border-[#B88746]/50 text-[#E5C380] rounded font-mono text-[11px] font-bold">
                            {item.voice}
                          </span>
                          <span className="px-2 py-0.5 bg-[#14231A] text-[#50B876] border border-[#23442F] rounded text-[10px] font-mono">
                            {item.model?.includes("lite") ? "Flash-Lite" : "Flash"}
                          </span>
                          <span className="px-2 py-0.5 bg-[#1B212D] text-[#8C98AC] rounded text-[10px] font-mono">
                            {item.language || "বাংলা"}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs font-mono text-[#8F9AA9]">
                          <span className="text-[#EDE8DE] font-semibold">
                            সময়: {durMin}:{durSec < 10 ? "0" : ""}{durSec}
                          </span>
                          <span>·</span>
                          <span>{sizeMb} MB WAV</span>
                          <span>·</span>
                          <span className="text-[11px] text-[#697486]">
                            {new Date(item.timestamp).toLocaleString("bn-BD")}
                          </span>
                        </div>
                      </div>

                      {/* Text Excerpt */}
                      <div className="bg-[#0A0D12] border border-[#1A202C] p-3 rounded text-xs font-['Noto_Serif_Bengali'] text-[#D8CFBF] leading-relaxed line-clamp-3">
                        {item.text}
                      </div>

                      {/* Bottom Action Row */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePlayHistoryItem(item)}
                            className="px-3 py-1.5 bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12] rounded text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>শুনুন</span>
                          </button>

                          <button
                            onClick={() => handleDownloadHistoryItem(item)}
                            className="px-3 py-1.5 bg-[#16221A] hover:bg-[#203326] text-[#50B876] border border-[#284A35] rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>ডাউনলোড WAV</span>
                          </button>

                          <button
                            onClick={() => handleLoadHistoryItemToStudio(item)}
                            className="px-3 py-1.5 bg-[#161C26] hover:bg-[#202938] text-[#8CB8F5] border border-[#2B3B52] rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
                            title="এই লেখা ও অডিও এডিটরে লোড করে সম্পাদনা করুন"
                          >
                            <CornerDownLeft className="w-3.5 h-3.5" />
                            <span>স্টুডিওতে লোড করুন</span>
                          </button>
                        </div>

                        <button
                          onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                          className="px-2.5 py-1.5 text-[#8F9AA9] hover:text-[#FF8585] hover:bg-[#261517] border border-transparent hover:border-[#52252A] rounded text-xs transition-colors flex items-center gap-1"
                          title="ইতিহাস থেকে মুছে ফেলুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>মুছে ফেলুন</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 3: Cache Vault & Saved Projects */}
      {activeTab === "cache-vault" && (
        <div className="space-y-6">
          {/* Vault Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#12151C] border border-[#202735] p-5 rounded-md space-y-1">
              <span className="text-xs text-[#8F9AA9]">ক্যাশড অডিও চ্যাঙ্ক (IndexedDB)</span>
              <div className="text-2xl font-bold font-mono text-[#EDE8DE]">
                {Object.keys(vaultRecords).length}
              </div>
              <span className="text-[11px] text-[#50B876]">রিলোড হলেও অক্ষত থাকবে</span>
            </div>

            <div className="bg-[#12151C] border border-[#202735] p-5 rounded-md space-y-1">
              <span className="text-xs text-[#8F9AA9]">সংরক্ষিত এআই বাজেট (Saved Cost)</span>
              <div className="text-2xl font-bold font-mono text-[#50B876]">
                ${costSavedUsd.toFixed(4)}
              </div>
              <span className="text-[11px] text-[#8F9AA9]">পুনরাবৃত্তি এআই কল রোধ করা হয়েছে</span>
            </div>

            <div className="bg-[#12151C] border border-[#202735] p-5 rounded-md space-y-1">
              <span className="text-xs text-[#8F9AA9]">সংরক্ষিত কথন প্রজেক্ট (Saved Projects)</span>
              <div className="text-2xl font-bold font-mono text-[#B88746]">
                {savedVoiceProjects.length}
              </div>
              <span className="text-[11px] text-[#8F9AA9]">ভবিষ্যতে লোড বা সম্পাদনাযোগ্য</span>
            </div>
          </div>

          {/* Saved Voice Projects Section */}
          {savedVoiceProjects.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#8F9AA9] border-b border-[#202735] pb-2">
                <span className="font-semibold text-[#EDE8DE]">সংরক্ষিত কথন প্রজেক্টসমূহ (Saved Voice Projects):</span>
                <span className="text-[11px] font-mono text-[#B88746]">{savedVoiceProjects.length} টি সংরক্ষিত প্রজেক্ট</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {savedVoiceProjects.map((proj) => {
                  const completedCount = proj.chunks?.filter((c) => c.status === "completed").length || 0;
                  const totalCount = proj.chunks?.length || 0;

                  return (
                    <div
                      key={proj.id}
                      className="p-4 bg-[#11141B] border border-[#202838] hover:border-[#B88746] rounded-md transition-all flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-display font-bold text-sm text-[#EDE8DE] truncate">{proj.title}</h4>
                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[10px] shrink-0 ${
                              proj.status === "completed"
                                ? "bg-[#14231A] text-[#50B876] border border-[#23442F]"
                                : "bg-[#252015] text-[#E5C380] border border-[#483B1B]"
                            }`}
                          >
                            {proj.status === "completed" ? "সম্পন্ন" : "খসড়া"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#8F9AA9]">
                          <span>লেখক: {proj.author || "অজানা"}</span>
                          <span>·</span>
                          <span className="font-mono text-[#B88746]">{proj.voiceName}</span>
                          <span>·</span>
                          <span>{proj.language || "বাংলা"}</span>
                          <span>·</span>
                          <span className="font-mono text-[#50B876]">{completedCount}/{totalCount} চ্যাঙ্ক প্রস্তুত</span>
                        </div>

                        <p className="text-[11px] font-editorial text-[#7F8D9E] line-clamp-1 italic">
                          {proj.chunks?.[0]?.text || "কোনো টেক্সট নেই"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#1C2230] text-xs">
                        <span className="text-[10px] font-mono text-[#697486]">
                          {new Date(proj.updatedAt || proj.createdAt).toLocaleDateString("bn-BD")}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleLoadSavedProject(proj)}
                            className="px-2.5 py-1 bg-[#1A2332] hover:bg-[#253246] text-[#B88746] hover:text-[#EDE8DE] border border-[#2C384E] rounded text-xs font-medium flex items-center gap-1 transition-colors"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>লোড করুন</span>
                          </button>

                          <button
                            onClick={(e) => handleDeleteSavedProject(proj.id, e)}
                            className="p-1 text-[#8F9AA9] hover:text-[#FF8585] transition-colors"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action to Clear Vault & Raw Cache Listing */}
          <div className="flex items-center justify-between text-xs text-[#8F9AA9] border-b border-[#202735] pb-3">
            <span>ক্যাশ ভল্টের বিশদ বিবরণ (SHA-256 Hash Index):</span>
            <button
              onClick={handleClearCacheVault}
              className="px-3 py-1.5 bg-[#261517] hover:bg-[#3D1E22] text-[#FF8585] border border-[#52252A] rounded font-medium flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ক্যাশ ভল্ট খালি করুন</span>
            </button>
          </div>

          {/* Vault Chunks Table */}
          {Object.keys(vaultRecords).length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8F9AA9] border border-dashed border-[#232B3B] rounded-md">
              কোনো ক্যাশড চ্যাঙ্ক পাওয়া যায়নি। কথন তৈরি করলে এখানে স্বয়ংক্রিয়ভাবে হ্যাশ অনুসারে সংরক্ষিত হবে।
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(vaultRecords).map(([hash, rec]) => (
                <div
                  key={hash}
                  className="p-3 bg-[#11141A] border border-[#1E2533] rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[#B88746] text-[11px]">{hash.slice(0, 16)}...</span>
                      <span className="text-[#8F9AA9]">·</span>
                      <span className="font-medium text-[#EDE8DE]">{rec.voice}</span>
                      <span className="text-[#8F9AA9]">·</span>
                      <span className="text-[#8F9AA9] font-editorial italic">"{rec.textSnippet}..."</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[#697486] font-mono">
                      <span>~{rec.durationSeconds}s</span>
                      <span>{(rec.fileSizeBytes / 1024).toFixed(0)} KB</span>
                      <span>{new Date(rec.timestamp).toLocaleString("bn-BD")}</span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 bg-[#14231A] text-[#50B876] border border-[#23442F] rounded text-[10px] font-mono shrink-0">
                    Active Cache
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating Sticky Audio Player Bar */}
      <FloatingAudioPlayer
        audioUrl={masterAudioUrl || (playingChunkId ? chunkAudioUrls[playingChunkId] || null : null)}
        title={
          masterAudioUrl
            ? `${projectTitle} (সম্পূর্ণ অডিও কথন)`
            : playingChunkId
            ? `${projectTitle} - অংশ #${chunks.find((c) => c.id === playingChunkId)?.chunkIndex || 1}`
            : projectTitle
        }
        narratorName={voiceName}
        isLoading={isQueueRunning}
        hasNext={
          playingChunkId
            ? Boolean(chunks.find((c) => c.status === "completed" && c.chunkIndex > (chunks.find((x) => x.id === playingChunkId)?.chunkIndex || 0)))
            : false
        }
        hasPrev={
          playingChunkId
            ? Boolean(chunks.find((c) => c.status === "completed" && c.chunkIndex < (chunks.find((x) => x.id === playingChunkId)?.chunkIndex || 0)))
            : false
        }
        onNext={() => {
          if (playingChunkId) playNextSequentialChunk(playingChunkId);
        }}
        onPrev={() => {
          const completed = chunks.filter((c) => c.status === "completed");
          const idx = completed.findIndex((c) => c.id === playingChunkId);
          if (idx > 0) handlePlayChunk(completed[idx - 1]);
        }}
        continuousPlayback={isSequentialPlaying}
        onToggleContinuous={() => setIsSequentialPlaying(!isSequentialPlaying)}
        onEnded={handleAudioEnded}
        onDownload={
          masterAudioUrl
            ? handleDownloadMaster
            : playingChunkId
            ? () => {
                const c = chunks.find((x) => x.id === playingChunkId);
                if (c) handleDownloadSingleChunk(c);
              }
            : undefined
        }
        speed={speed}
        onSpeedChange={(newSpeed) => setSpeed(newSpeed)}
      />
    </div>
  );
};
