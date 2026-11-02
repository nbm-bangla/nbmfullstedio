import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Sliders,
  Upload,
  Play,
  Pause,
  Download,
  Trash2,
  ArrowUp,
  ArrowDown,
  Volume2,
  Plus,
  RefreshCw,
  Bell,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileCode,
  FolderOpen,
  Save,
  RotateCcw,
  Scissors,
  VolumeX,
  Volume1,
  FileText,
  Search,
  Check,
  Copy,
  Layers,
  Clock,
  Coins,
  Zap,
  Bookmark,
  Share2,
  BookOpen,
  ArrowRight,
  Split,
  Eye,
  FileJson,
} from "lucide-react";
import { WaveformVisualizer } from "../common/WaveformVisualizer";
import {
  analyzeAudioFile,
  concatenateAudioBuffers,
  audioBufferToWavBlob,
  generateToneBuffer,
  sliceAndProcessClipBuffer,
  splitClipAtTime,
  AudioAnalysis,
  getAudioContext,
} from "../../services/audioEngine";
import {
  saveAudioBlob,
  getAudioBlob,
  deleteAudioBlob,
  saveAudioProject,
  loadAudioProjects,
  deleteAudioProject,
  computeFileHash,
  getCachedTranscript,
  setCachedTranscript,
} from "../../services/audioStorage";
import { callGeminiTranscribe } from "../../services/apiClient";
import { downloadTextFile } from "../../services/subtitleService";
import { AudioClip, AudiobookManifestJSON, AudiobookProject, Book } from "../../types";

interface AudioStudioProps {
  books?: Book[];
  onSaveBooks?: (books: Book[]) => void;
  onSendToVoice?: (text: string, title: string) => void;
}

interface LoadedClipItem {
  clip: AudioClip;
  buffer: AudioBuffer;
  blob?: Blob;
  analysis: AudioAnalysis;
  audioUrl: string;
}

export const AudioStudio: React.FC<AudioStudioProps> = ({
  books = [],
  onSaveBooks,
  onSendToVoice,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonImportRef = useRef<HTMLInputElement>(null);

  // Studio Sub-Tabs
  const [activeTab, setActiveTab] = useState<"timeline" | "audio_json" | "projects">("timeline");

  // Project Info
  const [projectId, setProjectId] = useState<string>(() => `proj-${Date.now()}`);
  const [projectTitle, setProjectTitle] = useState<string>("Audiobook Production Master");
  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const [bookAuthor, setBookAuthor] = useState<string>("Unknown Author");
  const [bookLanguage, setBookLanguage] = useState<string>("Bengali");

  // Clips and Audio State
  const [loadedClips, setLoadedClips] = useState<LoadedClipItem[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>("");

  // Timeline Global Controls
  const [silenceGap, setSilenceGap] = useState<number>(0.5);
  const [normalizeVolume, setNormalizeVolume] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processStatusText, setProcessStatusText] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Consolidated Master Audio Output & Dedicated Master Editor
  const [masterBlob, setMasterBlob] = useState<Blob | null>(null);
  const [masterUrl, setMasterUrl] = useState<string | null>(null);
  const [masterDuration, setMasterDuration] = useState<number>(0);
  const [masterFileSize, setMasterFileSize] = useState<number>(0);
  const [masterAudioBuffer, setMasterAudioBuffer] = useState<AudioBuffer | null>(null);
  const [masterTrimStart, setMasterTrimStart] = useState<number>(0);
  const [masterTrimEnd, setMasterTrimEnd] = useState<number>(0);
  const [masterGain, setMasterGain] = useState<number>(1.0);
  const [masterPlayhead, setMasterPlayhead] = useState<number>(0);
  const [showMasterEditor, setShowMasterEditor] = useState<boolean>(false);

  // In-Studio Audio Player State
  const [isPlayingMaster, setIsPlayingMaster] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Audio-to-JSON State
  const [jsonManifest, setJsonManifest] = useState<string>("");
  const [jsonValidationResult, setJsonValidationResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [showSttNoticeModal, setShowSttNoticeModal] = useState<boolean>(false);
  const [pendingSttClipId, setPendingSttClipId] = useState<string | null>(null);

  // Cost & Cache Tracking
  const [apiCostUsd, setApiCostUsd] = useState<number>(0);
  const [cacheHits, setCacheHits] = useState<number>(0);
  const [savedCostUsd, setSavedCostUsd] = useState<number>(0);

  // Saved Projects List (IndexedDB)
  const [savedProjectsList, setSavedProjectsList] = useState<AudiobookProject[]>([]);
  const [projectSaveSuccess, setProjectSaveSuccess] = useState<boolean>(false);

  // Load Saved Projects on Mount
  useEffect(() => {
    loadAudioProjects().then((list) => {
      setSavedProjectsList(list);
    });
  }, []);

  // Sync author and language if book is selected
  useEffect(() => {
    if (selectedBookId) {
      const b = books.find((x) => x.id === selectedBookId);
      if (b) {
        setBookAuthor(b.author || "Unknown Author");
        setBookLanguage(b.originalLanguage || "Bengali");
        if (projectTitle === "Audiobook Production Master") {
          setProjectTitle(`${b.title} — Audiobook Master`);
        }
      }
    }
  }, [selectedBookId, books]);

  // Selected Clip Object
  const selectedLoadedClip = useMemo(() => {
    return loadedClips.find((c) => c.clip.id === selectedClipId) || loadedClips[0] || null;
  }, [loadedClips, selectedClipId]);

  // Total Duration Calculation
  const totalDuration = useMemo(() => {
    if (loadedClips.length === 0) return 0;
    const clipDurations = loadedClips.reduce((sum, item) => {
      const trimmedLen = Math.max(0.1, (item.clip.trimEnd || item.clip.duration) - (item.clip.trimStart || 0));
      return sum + trimmedLen;
    }, 0);
    const gaps = loadedClips.length > 1 ? (loadedClips.length - 1) * silenceGap : 0;
    return clipDurations + gaps;
  }, [loadedClips, silenceGap]);

  // Handle Multi-file Upload (MP3, WAV, M4A, AAC, OGG)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setProcessStatusText("Decoding audio files via Web Audio API...");

    try {
      const newItems: LoadedClipItem[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProcessStatusText(`Decoding track ${i + 1} of ${files.length}: ${file.name}...`);

        try {
          const { buffer, analysis } = await analyzeAudioFile(file);
          const clipId = `clip-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`;
          const hash = await computeFileHash(file);

          // Check if transcript exists in cache ($0 cost!)
          const cachedTranscript = getCachedTranscript(hash);
          if (cachedTranscript) {
            setCacheHits((c) => c + 1);
            setSavedCostUsd((s) => s + 0.005);
          }

          // Persist Audio Blob permanently in IndexedDB
          await saveAudioBlob(clipId, file);

          const clipMetadata: AudioClip = {
            id: clipId,
            name: file.name.replace(/\.[^/.]+$/, ""),
            chapterNumber: loadedClips.length + i + 1,
            chapterTitle: `Chapter ${loadedClips.length + i + 1}`,
            duration: buffer.duration,
            sampleRate: buffer.sampleRate,
            channels: buffer.numberOfChannels,
            fileSize: file.size,
            format: file.type || "audio/wav",
            trimStart: 0,
            trimEnd: buffer.duration,
            fadeIn: 0,
            fadeOut: 0,
            volume: 1.0,
            transcript: cachedTranscript || null,
            fileHash: hash,
            peaks: analysis.peaks,
            isCached: Boolean(cachedTranscript),
            storageKey: clipId,
          };

          const audioUrl = URL.createObjectURL(file);
          newItems.push({
            clip: clipMetadata,
            buffer,
            blob: file,
            analysis,
            audioUrl,
          });
        } catch (clipErr) {
          console.error("Error decoding clip:", file.name, clipErr);
          setErrorMsg(`ফাইল "${file.name}" ডিকোড করতে সমস্যা হয়েছে। অডিওটি বৈধ MP3/WAV/AAC কি না যাচাই করুন।`);
        }
      }

      setLoadedClips((prev) => [...prev, ...newItems]);
      if (newItems.length > 0 && !selectedClipId) {
        setSelectedClipId(newItems[0].clip.id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Audio decoding error: ${msg}`);
    } finally {
      setIsProcessing(false);
      setProcessStatusText("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Add Chapter Interlude Chime (Synthesized locally with $0 cost)
  const handleAddChime = async () => {
    const chimeBuffer = generateToneBuffer(528, 1.5);
    const wavBlob = audioBufferToWavBlob(chimeBuffer);
    const clipId = `chime-${Date.now()}`;
    await saveAudioBlob(clipId, wavBlob);

    const peaks = [0.2, 0.4, 0.7, 0.9, 0.8, 0.6, 0.4, 0.3, 0.1];
    const clipMetadata: AudioClip = {
      id: clipId,
      name: "Chapter Interlude (528 Hz Solfeggio Chime)",
      chapterNumber: null,
      chapterTitle: "Interlude / Chime",
      duration: 1.5,
      sampleRate: chimeBuffer.sampleRate,
      channels: 1,
      fileSize: wavBlob.size,
      format: "audio/wav",
      trimStart: 0,
      trimEnd: 1.5,
      fadeIn: 0.1,
      fadeOut: 0.3,
      volume: 0.8,
      transcript: null,
      fileHash: "tone_528hz_builtin",
      peaks,
      isCached: true,
      storageKey: clipId,
    };

    const audioUrl = URL.createObjectURL(wavBlob);
    const newItem: LoadedClipItem = {
      clip: clipMetadata,
      buffer: chimeBuffer,
      blob: wavBlob,
      analysis: {
        duration: 1.5,
        sampleRate: chimeBuffer.sampleRate,
        channels: 1,
        peaks,
        peakLoudnessDb: -6.0,
        silenceIntervals: [],
        fileSize: wavBlob.size,
      },
      audioUrl,
    };

    setLoadedClips((prev) => [...prev, newItem]);
    setSelectedClipId(clipId);
  };

  // Load a Pre-configured Sample for Immediate Verification
  const handleLoadVerificationSample = async () => {
    setIsProcessing(true);
    setProcessStatusText("Loading verified audiobook sample stems...");
    setErrorMsg(null);

    try {
      // Synthesize 2 contrasting audio stems (Narration tone & Interlude)
      const stem1 = generateToneBuffer(320, 2.8);
      const stem2 = generateToneBuffer(440, 2.2);

      const blob1 = audioBufferToWavBlob(stem1);
      const blob2 = audioBufferToWavBlob(stem2);

      const id1 = `sample-narr-${Date.now()}`;
      const id2 = `sample-chime-${Date.now() + 1}`;

      await saveAudioBlob(id1, blob1);
      await saveAudioBlob(id2, blob2);

      const item1: LoadedClipItem = {
        clip: {
          id: id1,
          name: "Chapter 1 — Introduction (Bengali Narration)",
          chapterNumber: 1,
          chapterTitle: "প্রথম অধ্যায়: গোধূলির পদ্মা",
          duration: 2.8,
          sampleRate: stem1.sampleRate,
          channels: 1,
          fileSize: blob1.size,
          format: "audio/wav",
          trimStart: 0,
          trimEnd: 2.8,
          fadeIn: 0.2,
          fadeOut: 0.2,
          volume: 1.0,
          transcript: "দিন তখন এক শান্ত গম্ভীর সমাপ্তির মুখে উপনীত, যখন নৌকাখানি পদ্মার নিস্তরঙ্গ বাঁকে ভাসিয়া আসিল।",
          transcriptVersion: 1,
          fileHash: "sample_stem1_hash",
          peaks: [0.3, 0.6, 0.9, 0.7, 0.4, 0.8, 0.5],
          isCached: true,
        },
        buffer: stem1,
        blob: blob1,
        analysis: {
          duration: 2.8,
          sampleRate: stem1.sampleRate,
          channels: 1,
          peaks: [0.3, 0.6, 0.9, 0.7, 0.4, 0.8, 0.5],
          peakLoudnessDb: -4.2,
          silenceIntervals: [],
          fileSize: blob1.size,
        },
        audioUrl: URL.createObjectURL(blob1),
      };

      const item2: LoadedClipItem = {
        clip: {
          id: id2,
          name: "Chapter 1 — Dialogue Passage",
          chapterNumber: 1,
          chapterTitle: "বৃদ্ধ মাঝির সংলাপ",
          duration: 2.2,
          sampleRate: stem2.sampleRate,
          channels: 1,
          fileSize: blob2.size,
          format: "audio/wav",
          trimStart: 0,
          trimEnd: 2.2,
          fadeIn: 0.1,
          fadeOut: 0.3,
          volume: 0.95,
          transcript: "বৃদ্ধ মাঝি মৃদুস্বরে কহিল, 'কর্তা, রাত্রি ঘোর অন্ধকার হইবে বটে, কিন্তু পূর্বের বনানীর ঊর্ধ্বে ইতিমধ্যেই তারকারা ফুটিয়া উঠিয়াছে।'",
          transcriptVersion: 1,
          fileHash: "sample_stem2_hash",
          peaks: [0.4, 0.8, 0.6, 0.9, 0.3, 0.5],
          isCached: true,
        },
        buffer: stem2,
        blob: blob2,
        analysis: {
          duration: 2.2,
          sampleRate: stem2.sampleRate,
          channels: 1,
          peaks: [0.4, 0.8, 0.6, 0.9, 0.3, 0.5],
          peakLoudnessDb: -3.8,
          silenceIntervals: [],
          fileSize: blob2.size,
        },
        audioUrl: URL.createObjectURL(blob2),
      };

      setProjectTitle("পথের পাঁচালী — Audiobook Production Master");
      setBookAuthor("বিভূতিভূষণ বন্দ্যোপাধ্যায়");
      setBookLanguage("Bengali");
      setLoadedClips([item1, item2]);
      setSelectedClipId(id1);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(`Failed to load sample: ${msg}`);
    } finally {
      setIsProcessing(false);
      setProcessStatusText("");
    }
  };

  // Reorder Clips
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const copy = [...loadedClips];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    setLoadedClips(copy);
  };

  const handleMoveDown = (index: number) => {
    if (index === loadedClips.length - 1) return;
    const copy = [...loadedClips];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    setLoadedClips(copy);
  };

  // Remove Clip
  const handleRemoveClip = async (id: string) => {
    await deleteAudioBlob(id);
    const updated = loadedClips.filter((c) => c.clip.id !== id);
    setLoadedClips(updated);
    if (selectedClipId === id) {
      setSelectedClipId(updated[0]?.clip.id || null);
    }
  };

  // Update Specific Clip Parameters (Trim, Fade, Volume, Metadata)
  const handleUpdateClip = (id: string, updates: Partial<AudioClip>) => {
    setLoadedClips((prev) =>
      prev.map((item) => {
        if (item.clip.id === id) {
          return {
            ...item,
            clip: { ...item.clip, ...updates },
          };
        }
        return item;
      })
    );
  };

  // Split Clip at Playhead Position
  const handleSplitClip = async (clipId: string, splitTimeSec: number) => {
    const item = loadedClips.find((c) => c.clip.id === clipId);
    if (!item) return;

    if (splitTimeSec <= 0.2 || splitTimeSec >= item.clip.duration - 0.2) {
      setErrorMsg("স্প্লিট পয়েন্ট ক্লিপের শুরু বা শেষের খুব কাছাকাছি রাখা যাবে না।");
      return;
    }

    try {
      const [buf1, buf2] = splitClipAtTime(item.buffer, splitTimeSec);
      const blob1 = audioBufferToWavBlob(buf1);
      const blob2 = audioBufferToWavBlob(buf2);

      const id1 = `${clipId}-pt1`;
      const id2 = `${clipId}-pt2`;

      await saveAudioBlob(id1, blob1);
      await saveAudioBlob(id2, blob2);

      const item1: LoadedClipItem = {
        ...item,
        clip: {
          ...item.clip,
          id: id1,
          name: `${item.clip.name} (Part 1)`,
          duration: buf1.duration,
          trimStart: 0,
          trimEnd: buf1.duration,
          fileSize: blob1.size,
          storageKey: id1,
        },
        buffer: buf1,
        blob: blob1,
        audioUrl: URL.createObjectURL(blob1),
      };

      const item2: LoadedClipItem = {
        ...item,
        clip: {
          ...item.clip,
          id: id2,
          name: `${item.clip.name} (Part 2)`,
          duration: buf2.duration,
          trimStart: 0,
          trimEnd: buf2.duration,
          fileSize: blob2.size,
          storageKey: id2,
        },
        buffer: buf2,
        blob: blob2,
        audioUrl: URL.createObjectURL(blob2),
      };

      const index = loadedClips.findIndex((c) => c.clip.id === clipId);
      const updated = [...loadedClips];
      updated.splice(index, 1, item1, item2);

      setLoadedClips(updated);
      setSelectedClipId(id1);
    } catch (e) {
      console.error("Split clip error:", e);
      setErrorMsg("ক্লিপ বিভক্ত করতে ব্যর্থ হয়েছে।");
    }
  };

  // MERGE & MASTER AUDIO TIMELINE (100% LOCAL DSP WITH $0 COST)
  const handleMasterAll = async () => {
    if (loadedClips.length === 0) return;
    setIsProcessing(true);
    setProcessStatusText("Processing trim, fades, gain & concatenating audio stream...");
    setErrorMsg(null);

    try {
      // Process each buffer according to trim, fade, volume
      const processedBuffers = loadedClips.map((item) => {
        return sliceAndProcessClipBuffer(item.buffer, {
          trimStart: item.clip.trimStart,
          trimEnd: item.clip.trimEnd,
          fadeIn: item.clip.fadeIn,
          fadeOut: item.clip.fadeOut,
          volume: item.clip.volume,
        });
      });

      const masterBuffer = concatenateAudioBuffers(processedBuffers, silenceGap, normalizeVolume);
      const wavBlob = audioBufferToWavBlob(masterBuffer);
      const url = URL.createObjectURL(wavBlob);

      setMasterBlob(wavBlob);
      setMasterUrl(url);
      setMasterAudioBuffer(masterBuffer);
      setMasterDuration(masterBuffer.duration);
      setMasterTrimStart(0);
      setMasterTrimEnd(masterBuffer.duration);
      setMasterFileSize(wavBlob.size);

      // Persist master in IndexedDB
      await saveAudioBlob(`${projectId}-master`, wavBlob);

      // Auto-generate Audio-to-JSON Manifest
      generateJsonManifest(masterBuffer.duration, wavBlob.size);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Mastering error: ${msg}`);
    } finally {
      setIsProcessing(false);
      setProcessStatusText("");
    }
  };

  // Load Merged Master into Editor as a single editable track
  const handleLoadMasterAsEditableTrack = async () => {
    if (!masterBlob || !masterAudioBuffer) return;
    const masterClipId = `master-track-${Date.now()}`;
    await saveAudioBlob(masterClipId, masterBlob);

    const masterClipItem: LoadedClipItem = {
      clip: {
        id: masterClipId,
        name: `${projectTitle} (সম্পূর্ণ মাস্টার ট্র্যাক)`,
        chapterNumber: 1,
        chapterTitle: "Complete Master Audiobook",
        duration: masterAudioBuffer.duration,
        sampleRate: masterAudioBuffer.sampleRate,
        channels: masterAudioBuffer.numberOfChannels,
        fileSize: masterBlob.size,
        format: "WAV",
        trimStart: 0,
        trimEnd: masterAudioBuffer.duration,
        fadeIn: 0,
        fadeOut: 0,
        volume: 1.0,
        storageKey: masterClipId,
      },
      buffer: masterAudioBuffer,
      blob: masterBlob,
      analysis: {
        duration: masterAudioBuffer.duration,
        sampleRate: masterAudioBuffer.sampleRate,
        channels: masterAudioBuffer.numberOfChannels,
        peaks: [],
        peakLoudnessDb: -0.5,
        silenceIntervals: [],
        fileSize: masterBlob.size,
      },
      audioUrl: masterUrl || URL.createObjectURL(masterBlob),
    };

    setLoadedClips([masterClipItem]);
    setSelectedClipId(masterClipId);
  };

  // Apply in-place trim & gain edits to the Master Audio
  const handleApplyMasterEdits = async () => {
    if (!masterAudioBuffer) return;
    setIsProcessing(true);
    setProcessStatusText("Applying trim & gain edits to consolidated master audio...");
    try {
      const editedBuffer = sliceAndProcessClipBuffer(masterAudioBuffer, {
        trimStart: masterTrimStart,
        trimEnd: masterTrimEnd,
        fadeIn: 0.05,
        fadeOut: 0.05,
        volume: masterGain,
      });

      const wavBlob = audioBufferToWavBlob(editedBuffer);
      const url = URL.createObjectURL(wavBlob);

      setMasterBlob(wavBlob);
      setMasterUrl(url);
      setMasterAudioBuffer(editedBuffer);
      setMasterDuration(editedBuffer.duration);
      setMasterTrimStart(0);
      setMasterTrimEnd(editedBuffer.duration);
      setMasterFileSize(wavBlob.size);

      await saveAudioBlob(`${projectId}-master`, wavBlob);
      generateJsonManifest(editedBuffer.duration, wavBlob.size);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Master edit error: ${msg}`);
    } finally {
      setIsProcessing(false);
      setProcessStatusText("");
    }
  };

  // Split Master Track at current playhead into two separate tracks
  const handleSplitMasterAtPlayhead = async () => {
    if (!masterAudioBuffer || !masterBlob) return;
    const splitTime = masterPlayhead;
    if (splitTime <= 0.5 || splitTime >= masterAudioBuffer.duration - 0.5) {
      setErrorMsg("বিভক্ত করার জন্য প্লেহেড অডিওর শুরু এবং শেষের মাঝে (কমপক্ষে ০.৫ সেকেন্ড পর) রাখুন।");
      return;
    }

    try {
      const [part1, part2] = splitClipAtTime(masterAudioBuffer, splitTime);
      const blob1 = audioBufferToWavBlob(part1);
      const blob2 = audioBufferToWavBlob(part2);
      const id1 = `master-part1-${Date.now()}`;
      const id2 = `master-part2-${Date.now()}`;

      await saveAudioBlob(id1, blob1);
      await saveAudioBlob(id2, blob2);

      const item1: LoadedClipItem = {
        clip: {
          id: id1,
          name: `${projectTitle} (অংশ ১)`,
          chapterNumber: 1,
          chapterTitle: "Part 1",
          duration: part1.duration,
          sampleRate: part1.sampleRate,
          channels: part1.numberOfChannels,
          fileSize: blob1.size,
          format: "WAV",
          trimStart: 0,
          trimEnd: part1.duration,
          fadeIn: 0.05,
          fadeOut: 0.05,
          volume: masterGain,
          storageKey: id1,
        },
        buffer: part1,
        blob: blob1,
        analysis: {
          duration: part1.duration,
          sampleRate: part1.sampleRate,
          channels: part1.numberOfChannels,
          peaks: [],
          peakLoudnessDb: -0.5,
          silenceIntervals: [],
          fileSize: blob1.size,
        },
        audioUrl: URL.createObjectURL(blob1),
      };

      const item2: LoadedClipItem = {
        clip: {
          id: id2,
          name: `${projectTitle} (অংশ ২)`,
          chapterNumber: 2,
          chapterTitle: "Part 2",
          duration: part2.duration,
          sampleRate: part2.sampleRate,
          channels: part2.numberOfChannels,
          fileSize: blob2.size,
          format: "WAV",
          trimStart: 0,
          trimEnd: part2.duration,
          fadeIn: 0.05,
          fadeOut: 0.05,
          volume: masterGain,
          storageKey: id2,
        },
        buffer: part2,
        blob: blob2,
        analysis: {
          duration: part2.duration,
          sampleRate: part2.sampleRate,
          channels: part2.numberOfChannels,
          peaks: [],
          peakLoudnessDb: -0.5,
          silenceIntervals: [],
          fileSize: blob2.size,
        },
        audioUrl: URL.createObjectURL(blob2),
      };

      setLoadedClips([item1, item2]);
      setSelectedClipId(id1);
      setShowMasterEditor(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Split error: ${msg}`);
    }
  };

  // GENERATE AUDIO-TO-JSON MANIFEST (Strict Anti-Hallucination: Unknowns remain null)
  const generateJsonManifest = (duration = masterDuration || totalDuration, fileSize = masterFileSize) => {
    let currentMarker = 0;
    const chaptersList = loadedClips.map((item, idx) => {
      const clipEffectiveLen = Math.max(0.1, (item.clip.trimEnd || item.clip.duration) - (item.clip.trimStart || 0));
      const start = currentMarker;
      const end = currentMarker + clipEffectiveLen;
      currentMarker = end + silenceGap;

      return {
        index: idx + 1,
        title: item.clip.chapterTitle || `Chapter ${idx + 1}`,
        startTime: Number(start.toFixed(2)),
        endTime: Number(end.toFixed(2)),
        duration: Number(clipEffectiveLen.toFixed(2)),
        transcript: item.clip.transcript || null,
        clipId: item.clip.id,
      };
    });

    const manifest: AudiobookManifestJSON = {
      schemaVersion: "1.0",
      manifestType: "AudiobookMasterManifest",
      generatedAt: new Date().toISOString(),
      book: {
        title: projectTitle,
        originalTitle: selectedBookId ? books.find((b) => b.id === selectedBookId)?.originalTitle || null : null,
        author: bookAuthor || "Unknown Author",
        narrator: null, // Unknown stays null
        language: bookLanguage || "Bengali",
        genre: selectedBookId ? books.find((b) => b.id === selectedBookId)?.genre || null : null,
        country: selectedBookId ? books.find((b) => b.id === selectedBookId)?.country || null : null,
        copyrightStatus: selectedBookId ? books.find((b) => b.id === selectedBookId)?.copyrightStatus || null : null,
      },
      audioProperties: {
        format: "audio/wav (16-bit PCM RIFF)",
        totalDurationSeconds: Number(duration.toFixed(2)),
        totalFileSizeBytes: fileSize,
        sampleRate: loadedClips[0]?.clip.sampleRate || 44100,
        channels: loadedClips[0]?.clip.channels || 2,
        silenceGapSeconds: silenceGap,
        isNormalized: normalizeVolume,
      },
      chapters: chaptersList,
      clips: loadedClips.map((item) => ({
        id: item.clip.id,
        name: item.clip.name,
        duration: item.clip.duration,
        trimStart: item.clip.trimStart,
        trimEnd: item.clip.trimEnd,
        volume: item.clip.volume,
        fadeIn: item.clip.fadeIn,
        fadeOut: item.clip.fadeOut,
      })),
      costMetrics: {
        apiCallsCount: apiCostUsd > 0 ? 1 : 0,
        cacheHitsCount: cacheHits,
        estimatedCostSavedUsd: savedCostUsd,
      },
    };

    const formatted = JSON.stringify(manifest, null, 2);
    setJsonManifest(formatted);
    validateJsonString(formatted);
  };

  // Validate JSON string
  const validateJsonString = (rawJson: string) => {
    try {
      const parsed = JSON.parse(rawJson);
      if (!parsed.schemaVersion || !parsed.book || !parsed.chapters) {
        setJsonValidationResult({
          valid: false,
          message: "Warning: Missing required schema keys ('schemaVersion', 'book', or 'chapters').",
        });
        return;
      }
      setJsonValidationResult({
        valid: true,
        message: "JSON Validated: Strict Audiobook Manifest Schema Compliant.",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setJsonValidationResult({
        valid: false,
        message: `JSON Syntax Error: ${msg}`,
      });
    }
  };

  // Speech-to-Text Transcription via Backend (/api/gemini/transcribe) with Cache Guard
  const handleRequestTranscription = (clipId: string) => {
    setPendingSttClipId(clipId);
    setShowSttNoticeModal(true);
  };

  const handleExecuteTranscription = async () => {
    if (!pendingSttClipId) return;
    const clipItem = loadedClips.find((c) => c.clip.id === pendingSttClipId);
    setShowSttNoticeModal(false);
    if (!clipItem || !clipItem.blob) return;

    // Check cache first via SHA-256 hash
    if (clipItem.clip.fileHash) {
      const cached = getCachedTranscript(clipItem.clip.fileHash);
      if (cached) {
        handleUpdateClip(pendingSttClipId, {
          transcript: cached,
          isCached: true,
          transcriptVersion: (clipItem.clip.transcriptVersion || 0) + 1,
        });
        setCacheHits((c) => c + 1);
        setSavedCostUsd((s) => s + 0.005);
        return;
      }
    }

    setIsTranscribing(true);
    setErrorMsg(null);

    try {
      // Read blob as base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(clipItem.blob);
      const base64Audio = await base64Promise;

      const res = await callGeminiTranscribe(base64Audio, clipItem.clip.format || "audio/wav");
      const transcript = res.transcript || "";

      // Store in persistent transcript cache
      if (clipItem.clip.fileHash && transcript) {
        setCachedTranscript(clipItem.clip.fileHash, transcript);
      }

      handleUpdateClip(pendingSttClipId, {
        transcript,
        isCached: false,
        transcriptVersion: (clipItem.clip.transcriptVersion || 0) + 1,
      });

      setApiCostUsd((prev) => prev + 0.003); // Approximate STT cost
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Speech-to-Text transcription failed: ${msg}`);
    } finally {
      setIsTranscribing(false);
      setPendingSttClipId(null);
    }
  };

  // Save Current Project to IndexedDB
  const handleSaveCurrentProject = async () => {
    const project: AudiobookProject = {
      id: projectId,
      title: projectTitle,
      bookId: selectedBookId || null,
      author: bookAuthor,
      language: bookLanguage,
      clips: loadedClips.map((c) => c.clip),
      silenceGap,
      normalizeVolume,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    if (jsonManifest) {
      try {
        project.manifestJson = JSON.parse(jsonManifest);
      } catch {
        // ignore
      }
    }

    await saveAudioProject(project);
    const updatedList = await loadAudioProjects();
    setSavedProjectsList(updatedList);
    setProjectSaveSuccess(true);
    setTimeout(() => setProjectSaveSuccess(false), 2000);
  };

  // Load a Saved Project from IndexedDB
  const handleLoadProject = async (p: AudiobookProject) => {
    setIsProcessing(true);
    setProcessStatusText("Reconstituting audio project and buffers from IndexedDB...");
    setErrorMsg(null);

    try {
      setProjectId(p.id);
      setProjectTitle(p.title);
      setSelectedBookId(p.bookId || "");
      setBookAuthor(p.author);
      setBookLanguage(p.language);
      setSilenceGap(p.silenceGap);
      setNormalizeVolume(p.normalizeVolume);

      const items: LoadedClipItem[] = [];
      const ctx = getAudioContext();

      for (const clip of p.clips) {
        const blob = await getAudioBlob(clip.id);
        if (blob) {
          const arrayBuf = await blob.arrayBuffer();
          const buffer = await ctx.decodeAudioData(arrayBuf.slice(0));
          const audioUrl = URL.createObjectURL(blob);
          items.push({
            clip,
            buffer,
            blob,
            analysis: {
              duration: buffer.duration,
              sampleRate: buffer.sampleRate,
              channels: buffer.numberOfChannels,
              peaks: clip.peaks || [],
              peakLoudnessDb: -3.0,
              silenceIntervals: [],
              fileSize: clip.fileSize,
            },
            audioUrl,
          });
        }
      }

      setLoadedClips(items);
      if (items.length > 0) {
        setSelectedClipId(items[0].clip.id);
      }

      if (p.manifestJson) {
        setJsonManifest(JSON.stringify(p.manifestJson, null, 2));
      }

      setActiveTab("timeline");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Failed to load project: ${msg}`);
    } finally {
      setIsProcessing(false);
      setProcessStatusText("");
    }
  };

  // Export JSON Manifest File
  const handleExportJson = () => {
    if (!jsonManifest) generateJsonManifest();
    downloadTextFile(
      jsonManifest || "{}",
      `${projectTitle.replace(/\s+/g, "_")}_audiobook_manifest.json`,
      "application/json"
    );
  };

  // Import JSON Manifest File
  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setJsonManifest(text);
        validateJsonString(text);
        try {
          const parsed = JSON.parse(text);
          if (parsed.book?.title) setProjectTitle(parsed.book.title);
          if (parsed.book?.author) setBookAuthor(parsed.book.author);
          if (parsed.book?.language) setBookLanguage(parsed.book.language);
        } catch {
          // ignore
        }
      }
    };
    reader.readAsText(file);
  };

  // Format Seconds Helper
  const formatSec = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${mins}:${s < 10 ? "0" : ""}${s}.${ms}`;
  };

  // Filtered Clips
  const filteredClips = useMemo(() => {
    if (!searchFilter.trim()) return loadedClips;
    const q = searchFilter.toLowerCase();
    return loadedClips.filter(
      (c) =>
        c.clip.name.toLowerCase().includes(q) ||
        (c.clip.chapterTitle && c.clip.chapterTitle.toLowerCase().includes(q)) ||
        (c.clip.transcript && c.clip.transcript.toLowerCase().includes(q))
    );
  }, [loadedClips, searchFilter]);

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#B88746]">
            <Sliders className="w-4 h-4" />
            <span className="font-semibold uppercase tracking-wider">Audio Engineering & Metadata Studio</span>
            <span aria-hidden="true">·</span>
            <span>Local DSP, Audio-to-JSON & Audiobook Project Manager</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-[#F4EFE6]">
            Audio Studio & Audio-to-JSON
          </h1>
          <p className="text-xs text-[#8F9AA9] mt-0.5 font-editorial text-sm">
            16-bit PCM multi-clip stem sequencing, non-destructive trimming, fades, silence insertion, and structured audiobook metadata extraction with zero-cost client-side DSP.
          </p>
        </div>

        {/* Global Action Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="px-4 py-2 bg-[#B88746] hover:bg-[#C99654] disabled:opacity-40 text-[#0D0F12] text-xs font-semibold rounded flex items-center gap-2 transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Add Audio Files (MP3/WAV/AAC)</span>
          </button>

          <button
            onClick={handleAddChime}
            disabled={isProcessing}
            className="px-3 py-2 bg-[#1A202C] hover:bg-[#252E3E] disabled:opacity-40 text-[#D8CFBF] border border-[#2B3547] text-xs font-medium rounded flex items-center gap-1.5 transition-colors"
          >
            <Bell className="w-3.5 h-3.5 text-[#B88746]" />
            <span>+ 528Hz Interlude</span>
          </button>

          <button
            onClick={handleLoadVerificationSample}
            disabled={isProcessing}
            className="px-3 py-2 bg-[#171D27] hover:bg-[#222B38] text-[#D8CFBF] border border-[#2B3547] text-xs font-mono rounded flex items-center gap-1.5 transition-colors"
            title="Load sample stems for immediate verification"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#B88746]" />
            <span>Load Test Stems</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-[#202735] pb-2 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("timeline")}
            className={`px-4 py-2 rounded-t font-medium transition-colors flex items-center gap-2 ${
              activeTab === "timeline"
                ? "bg-[#181D26] text-[#B88746] border-b-2 border-[#B88746] font-semibold"
                : "text-[#8E9BAC] hover:text-[#EDE8DE]"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Audio Studio & Timeline ({loadedClips.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("audio_json");
              if (!jsonManifest) generateJsonManifest();
            }}
            className={`px-4 py-2 rounded-t font-medium transition-colors flex items-center gap-2 ${
              activeTab === "audio_json"
                ? "bg-[#181D26] text-[#B88746] border-b-2 border-[#B88746] font-semibold"
                : "text-[#8E9BAC] hover:text-[#EDE8DE]"
            }`}
          >
            <FileJson className="w-4 h-4" />
            <span>Audio-to-JSON Studio</span>
          </button>

          <button
            onClick={() => setActiveTab("projects")}
            className={`px-4 py-2 rounded-t font-medium transition-colors flex items-center gap-2 ${
              activeTab === "projects"
                ? "bg-[#181D26] text-[#B88746] border-b-2 border-[#B88746] font-semibold"
                : "text-[#8E9BAC] hover:text-[#EDE8DE]"
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Audiobook Projects ({savedProjectsList.length})</span>
          </button>
        </div>

        {/* Save Current Project Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveCurrentProject}
            className="px-3 py-1.5 bg-[#181E2A] hover:bg-[#232B3B] text-[#D8CFBF] border border-[#293548] rounded text-xs flex items-center gap-1.5 transition-colors"
          >
            {projectSaveSuccess ? (
              <Check className="w-3.5 h-3.5 text-[#50B876]" />
            ) : (
              <Save className="w-3.5 h-3.5 text-[#B88746]" />
            )}
            <span>{projectSaveSuccess ? "Project Saved (IndexedDB)!" : "Save Project"}</span>
          </button>
        </div>
      </div>

      {/* Cost, Cache & Status Banner */}
      <div className="bg-[#12151C] border border-[#202735] p-3 rounded-md flex flex-wrap items-center justify-between text-xs text-[#8F9AA9] gap-3">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-[#EDE8DE] font-mono">
            <Coins className="w-3.5 h-3.5 text-[#B88746]" />
            <span>API Cost: ${apiCostUsd.toFixed(4)} USD</span>
          </span>
          <span className="text-[#647187]">|</span>
          <span className="font-mono text-[#50B876] flex items-center gap-1">
            <Zap className="w-3 h-3" />
            <span>Cache Hits: {cacheHits} (Saved: ${savedCostUsd.toFixed(3)})</span>
          </span>
          <span className="text-[#647187]">|</span>
          <span className="font-mono text-[11px] text-[#A6B2C4]">
            Total Master Duration: {formatSec(masterDuration || totalDuration)}
          </span>
        </div>

        {processStatusText && (
          <div className="text-[#60A5FA] flex items-center gap-1.5 font-mono text-[11px] animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>{processStatusText}</span>
          </div>
        )}
      </div>

      {/* Error Message Notice */}
      {errorMsg && (
        <div className="p-3.5 bg-[#2C1818] border border-[#682424] text-[#F3A5A5] text-xs rounded-md flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#E66262] shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-[#F3A5A5] hover:text-white underline">
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: AUDIO STUDIO & TIMELINE */}
      {activeTab === "timeline" && (
        <div className="space-y-6">
          {/* Master Timeline Controls */}
          <div className="bg-[#12151C] border border-[#202735] p-5 rounded-md flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <div className="space-y-1">
                <span className="text-[#7F8D9E]">Project Name:</span>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="bg-[#0E1015] border border-[#232B3B] rounded px-2.5 py-1 text-xs text-[#EDE8DE] font-semibold focus:border-[#B88746] focus:outline-none w-64"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[#7F8D9E]">Link to Library Book:</span>
                <select
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="bg-[#0E1015] border border-[#232B3B] rounded px-2.5 py-1 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none w-56"
                >
                  <option value="">No Book Linked (Custom)</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({b.author})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[#7F8D9E]">Inter-Clip Silence Gap:</span>
                <select
                  value={silenceGap}
                  onChange={(e) => setSilenceGap(parseFloat(e.target.value))}
                  className="bg-[#0E1015] border border-[#232B3B] rounded px-2.5 py-1 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none font-mono"
                >
                  <option value="0.0">0.0s (Direct Cut)</option>
                  <option value="0.2">0.2s (Tight Cross)</option>
                  <option value="0.5">0.5s (Standard Natural)</option>
                  <option value="1.0">1.0s (Breath Pause)</option>
                  <option value="2.0">2.0s (Chapter Break)</option>
                  <option value="3.0">3.0s (Section Silence)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="normVolToggle"
                  checked={normalizeVolume}
                  onChange={(e) => setNormalizeVolume(e.target.checked)}
                  className="accent-[#B88746]"
                />
                <label htmlFor="normVolToggle" className="text-[#8F9AA9] cursor-pointer">
                  Normalize Peak Gain (-0.5 dBFS)
                </label>
              </div>
            </div>

            {/* Merge Action */}
            <button
              onClick={handleMasterAll}
              disabled={loadedClips.length === 0 || isProcessing}
              className="px-5 py-2.5 bg-[#B88746] hover:bg-[#C99654] disabled:opacity-40 text-[#0D0F12] text-xs font-semibold rounded flex items-center gap-2 transition-colors shadow-sm"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Mastering Audio Stems...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Merge & Master 16-bit WAV</span>
                </>
              )}
            </button>
          </div>

          {/* Master Consolidate Output Banner with Dedicated In-Place Editor */}
          {masterUrl && (
            <div className="bg-[#141924] border border-[#2C384D] p-5 rounded-md space-y-4 manuscript-paper">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#50B876]" />
                    <h3 className="text-sm font-semibold text-[#EDE8DE]">Consolidated Master Stream Ready</h3>
                  </div>
                  <p className="text-xs text-[#8F9AA9]">
                    16-bit PCM RIFF WAV · Duration: {formatSec(masterDuration)} · Size: {(masterFileSize / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowMasterEditor(!showMasterEditor)}
                    className={`px-3 py-2 border text-xs font-semibold rounded flex items-center gap-1.5 transition-colors ${
                      showMasterEditor
                        ? "bg-[#B88746] text-[#0D0F12] border-[#B88746]"
                        : "bg-[#1E2738] hover:bg-[#28354D] text-[#D8CFBF] border-[#2F3E57]"
                    }`}
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>{showMasterEditor ? "মাস্টার এডিটর বন্ধ" : "সম্পূর্ণ মাস্টার অডিও এডিট করুন"}</span>
                  </button>

                  <button
                    onClick={handleLoadMasterAsEditableTrack}
                    className="px-3 py-2 bg-[#1A2536] hover:bg-[#233249] text-[#EDE8DE] border border-[#304360] text-xs font-medium rounded flex items-center gap-1.5 transition-colors"
                    title="Load merged audio as a single track on timeline"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#B88746]" />
                    <span>টাইমলাইনে এডিটেবল ট্র্যাক হিসেবে লোড</span>
                  </button>

                  <a
                    href={masterUrl}
                    download={`${projectTitle.replace(/\s+/g, "_")}_master.wav`}
                    className="px-4 py-2 bg-[#50B876] hover:bg-[#5BC583] text-[#0D0F12] text-xs font-semibold rounded flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Master WAV</span>
                  </a>

                  <button
                    onClick={() => {
                      setActiveTab("audio_json");
                      generateJsonManifest(masterDuration, masterFileSize);
                    }}
                    className="px-3 py-2 bg-[#1E2738] hover:bg-[#28354D] text-[#EDE8DE] border border-[#2F3E57] text-xs rounded transition-colors flex items-center gap-1.5"
                  >
                    <FileJson className="w-3.5 h-3.5 text-[#B88746]" />
                    <span>Generate Audio-to-JSON</span>
                  </button>
                </div>
              </div>

              {/* Master Audio Waveform Preview */}
              <WaveformVisualizer
                audioUrl={masterUrl}
                duration={masterDuration}
                title={`${projectTitle} — Complete Mastered Audiobook`}
              />

              {/* Interactive In-Place Master Track Editor Panel */}
              {showMasterEditor && (
                <div className="mt-4 pt-4 border-t border-[#232F42] bg-[#0E121A] p-4 rounded-md space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-[#B88746]" />
                      <span className="font-semibold text-[#EDE8DE]">মাস্টার অডিও এডিটর (Full Master Track Inspector & Slicer)</span>
                    </div>
                    <span className="text-[11px] font-mono text-[#8F9AA9]">
                      মোট দৈর্ঘ্য: {formatSec(masterDuration)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {/* 1. Trim Controls */}
                    <div className="space-y-1.5 bg-[#141824] p-3 rounded border border-[#222B3D]">
                      <div className="flex items-center justify-between">
                        <span className="text-[#8F9AA9]">Trim Start (শুরু ছাঁটাই):</span>
                        <span className="font-mono text-[#B88746]">{masterTrimStart.toFixed(2)}s</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={Math.max(1, masterDuration - 0.5)}
                        step="0.05"
                        value={masterTrimStart}
                        onChange={(e) => setMasterTrimStart(Math.min(parseFloat(e.target.value), masterTrimEnd - 0.5))}
                        className="w-full accent-[#B88746]"
                      />

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[#8F9AA9]">Trim End (শেষ ছাঁটাই):</span>
                        <span className="font-mono text-[#B88746]">{masterTrimEnd.toFixed(2)}s</span>
                      </div>
                      <input
                        type="range"
                        min={masterTrimStart + 0.5}
                        max={masterDuration}
                        step="0.05"
                        value={masterTrimEnd}
                        onChange={(e) => setMasterTrimEnd(Math.max(parseFloat(e.target.value), masterTrimStart + 0.5))}
                        className="w-full accent-[#B88746]"
                      />
                    </div>

                    {/* 2. Gain & Volume */}
                    <div className="space-y-1.5 bg-[#141824] p-3 rounded border border-[#222B3D]">
                      <div className="flex items-center justify-between">
                        <span className="text-[#8F9AA9]">Master Gain (ভলিউম গেইন):</span>
                        <span className="font-mono text-[#B88746]">{(masterGain * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="2.0"
                        step="0.05"
                        value={masterGain}
                        onChange={(e) => setMasterGain(parseFloat(e.target.value))}
                        className="w-full accent-[#B88746]"
                      />
                      <p className="text-[11px] text-[#697486] pt-2">
                        ক্লিপ জোড়া লাগানোর পর যদি সামগ্রিক আওয়াজ বাড়ানো বা কমানোর প্রয়োজন হয়।
                      </p>
                    </div>

                    {/* 3. Playhead & Split Action */}
                    <div className="space-y-2 bg-[#141824] p-3 rounded border border-[#222B3D] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#8F9AA9]">Playhead Slicer:</span>
                          <span className="font-mono text-[#B88746]">{formatSec(masterPlayhead)}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={masterDuration}
                          step="0.1"
                          value={masterPlayhead}
                          onChange={(e) => setMasterPlayhead(parseFloat(e.target.value))}
                          className="w-full accent-[#50B876] mt-1"
                        />
                      </div>

                      <button
                        onClick={handleSplitMasterAtPlayhead}
                        className="w-full py-1.5 bg-[#1C2638] hover:bg-[#25354F] text-[#EDE8DE] border border-[#2F415E] rounded font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Split className="w-3.5 h-3.5 text-[#B88746]" />
                        <span>বর্তমান সময়ে বিভক্ত করুন (Split)</span>
                      </button>
                    </div>
                  </div>

                  {/* Save Master Edits Action Button */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => {
                        setMasterTrimStart(0);
                        setMasterTrimEnd(masterDuration);
                        setMasterGain(1.0);
                      }}
                      className="px-3 py-1.5 bg-[#181D26] hover:bg-[#202735] text-[#8F9AA9] border border-[#273142] rounded text-xs transition-colors"
                    >
                      রিসেট (Reset)
                    </button>

                    <button
                      onClick={handleApplyMasterEdits}
                      disabled={isProcessing}
                      className="px-4 py-1.5 bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12] text-xs font-semibold rounded flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>সম্পাদনা প্রয়োগ করে মাস্টার WAV আপডেট করুন</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Two-Column Editor: Clip Playlist on Left, In-Depth Editor on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Clips Playlist (7 Cols) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#B88746]">
                    Audiobook Playlist ({filteredClips.length}/{loadedClips.length})
                  </span>
                  <span className="text-[11px] text-[#697486]">· Drag or move to reorder sequence</span>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#5F6B7E] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search clips..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="bg-[#0E1015] border border-[#222A3B] rounded pl-8 pr-2.5 py-1 text-[11px] text-[#EDE8DE] focus:border-[#B88746] focus:outline-none w-36"
                  />
                </div>
              </div>

              {filteredClips.length === 0 ? (
                <div className="p-16 border border-dashed border-[#202735] rounded-md text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-[#181D26] text-[#B88746] flex items-center justify-center mx-auto">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div className="text-xs text-[#7F8D9E]">
                    No audio clips loaded. Click "Add Audio Files" above or click "Load Test Stems" to begin.
                  </div>
                </div>
              ) : (
                filteredClips.map((item, idx) => {
                  const isSelected = item.clip.id === selectedClipId;
                  const effectiveDuration = Math.max(0.1, (item.clip.trimEnd || item.clip.duration) - (item.clip.trimStart || 0));

                  return (
                    <div
                      key={item.clip.id}
                      onClick={() => setSelectedClipId(item.clip.id)}
                      className={`cursor-pointer rounded-md border p-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-[#171D28] border-[#B88746] shadow-sm shadow-[#B88746]/10"
                          : "bg-[#12151C] border-[#202735] hover:border-[#2E384C]"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="font-mono text-xs text-[#6F7C90] w-6 shrink-0 font-bold">
                          #{idx + 1}
                        </span>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[#EDE8DE] truncate">
                              {item.clip.name}
                            </span>
                            {item.clip.chapterTitle && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-[#B88746]/10 text-[#C99654] border border-[#B88746]/20 rounded truncate max-w-[150px]">
                                {item.clip.chapterTitle}
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-[#7F8D9E] font-mono flex items-center gap-2 flex-wrap">
                            <span>{formatSec(effectiveDuration)}</span>
                            <span aria-hidden="true">·</span>
                            <span>{item.clip.sampleRate} Hz</span>
                            <span aria-hidden="true">·</span>
                            <span>{item.clip.channels === 1 ? "Mono" : "Stereo"}</span>
                            <span aria-hidden="true">·</span>
                            <span>Vol: {Math.round(item.clip.volume * 100)}%</span>
                            {item.clip.transcript && (
                              <span className="text-[#50B876] text-[10px] flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Transcript</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Controls: Mini Peaks, Move & Delete */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <div className="hidden sm:flex items-center gap-[2px] h-5 w-24 bg-[#0E1015] px-1 py-0.5 rounded border border-[#1A1F29]">
                          {item.analysis.peaks.slice(0, 24).map((p, i) => (
                            <div
                              key={i}
                              className="flex-1 bg-[#B88746]/60 rounded-[1px]"
                              style={{ height: `${Math.max(2, p * 14)}px` }}
                            />
                          ))}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveUp(idx);
                            }}
                            disabled={idx === 0}
                            className="p-1 bg-[#181D26] hover:bg-[#222938] disabled:opacity-20 rounded border border-[#273042] text-[#8C98AC]"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveDown(idx);
                            }}
                            disabled={idx === loadedClips.length - 1}
                            className="p-1 bg-[#181D26] hover:bg-[#222938] disabled:opacity-20 rounded border border-[#273042] text-[#8C98AC]"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveClip(item.clip.id);
                            }}
                            className="p-1 bg-[#181D26] hover:bg-[#341818] rounded border border-[#273042] text-[#8C98AC] hover:text-[#E66262]"
                            title="Remove Clip"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right: In-Depth Clip DSP Editor (5 Cols) */}
            <div className="lg:col-span-5">
              {selectedLoadedClip ? (
                <div className="bg-[#12151C] border border-[#202735] rounded-md p-5 space-y-5 sticky top-24 manuscript-paper">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[#B88746]">
                        Clip Inspector & DSP Editor
                      </span>
                      <span className="font-mono text-[11px] text-[#7F8D9E]">
                        Raw: {formatSec(selectedLoadedClip.clip.duration)}
                      </span>
                    </div>

                    <input
                      type="text"
                      value={selectedLoadedClip.clip.name}
                      onChange={(e) => handleUpdateClip(selectedLoadedClip.clip.id, { name: e.target.value })}
                      className="w-full bg-[#0E1015] border border-[#232B3B] rounded px-3 py-1.5 text-xs text-[#EDE8DE] font-semibold focus:border-[#B88746] focus:outline-none"
                    />
                  </div>

                  {/* Chapter Assignment */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-[#0E1015] p-3 rounded border border-[#1E2536]">
                    <div className="space-y-1">
                      <label className="text-[11px] text-[#7F8D9E]">Chapter Number:</label>
                      <input
                        type="number"
                        min="1"
                        value={selectedLoadedClip.clip.chapterNumber || ""}
                        onChange={(e) =>
                          handleUpdateClip(selectedLoadedClip.clip.id, {
                            chapterNumber: e.target.value ? parseInt(e.target.value, 10) : null,
                          })
                        }
                        placeholder="e.g. 1"
                        className="w-full bg-[#131720] border border-[#232B3B] rounded px-2.5 py-1 text-xs text-[#EDE8DE] font-mono focus:border-[#B88746] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-[#7F8D9E]">Chapter Title:</label>
                      <input
                        type="text"
                        value={selectedLoadedClip.clip.chapterTitle || ""}
                        onChange={(e) =>
                          handleUpdateClip(selectedLoadedClip.clip.id, { chapterTitle: e.target.value })
                        }
                        placeholder="e.g. সূচনা পর্ব"
                        className="w-full bg-[#131720] border border-[#232B3B] rounded px-2.5 py-1 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Waveform & Playback */}
                  <div className="space-y-2">
                    <WaveformVisualizer
                      audioUrl={selectedLoadedClip.audioUrl}
                      duration={selectedLoadedClip.clip.duration}
                      title={selectedLoadedClip.clip.name}
                    />
                  </div>

                  {/* Non-Destructive Trim Markers */}
                  <div className="space-y-3 pt-2 border-t border-[#1E2536]">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#EDE8DE]">
                      <span className="flex items-center gap-1.5">
                        <Scissors className="w-3.5 h-3.5 text-[#B88746]" />
                        <span>Trim Markers (Start & End)</span>
                      </span>
                      <span className="font-mono text-[11px] text-[#B88746]">
                        Length:{" "}
                        {formatSec(
                          (selectedLoadedClip.clip.trimEnd || selectedLoadedClip.clip.duration) -
                            (selectedLoadedClip.clip.trimStart || 0)
                        )}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <span className="text-[11px] text-[#7F8D9E]">Trim Start (sec):</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max={selectedLoadedClip.clip.duration}
                          value={selectedLoadedClip.clip.trimStart}
                          onChange={(e) =>
                            handleUpdateClip(selectedLoadedClip.clip.id, {
                              trimStart: Math.max(0, parseFloat(e.target.value) || 0),
                            })
                          }
                          className="w-full bg-[#0E1015] border border-[#232B3B] rounded px-2.5 py-1 text-xs text-[#EDE8DE] font-mono focus:border-[#B88746] focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[11px] text-[#7F8D9E]">Trim End (sec):</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max={selectedLoadedClip.clip.duration}
                          value={selectedLoadedClip.clip.trimEnd || selectedLoadedClip.clip.duration}
                          onChange={(e) =>
                            handleUpdateClip(selectedLoadedClip.clip.id, {
                              trimEnd: Math.min(selectedLoadedClip.clip.duration, parseFloat(e.target.value) || selectedLoadedClip.clip.duration),
                            })
                          }
                          className="w-full bg-[#0E1015] border border-[#232B3B] rounded px-2.5 py-1 text-xs text-[#EDE8DE] font-mono focus:border-[#B88746] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fades & Volume DSP */}
                  <div className="space-y-3 pt-2 border-t border-[#1E2536]">
                    <div className="text-xs font-semibold text-[#EDE8DE]">
                      <span>Fade In, Fade Out & Gain</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="space-y-1">
                        <span className="text-[10px] text-[#7F8D9E]">Fade In (s):</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="5"
                          value={selectedLoadedClip.clip.fadeIn}
                          onChange={(e) =>
                            handleUpdateClip(selectedLoadedClip.clip.id, {
                              fadeIn: Math.max(0, parseFloat(e.target.value) || 0),
                            })
                          }
                          className="w-full bg-[#0E1015] border border-[#232B3B] rounded px-2 py-1 text-xs text-[#EDE8DE] font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] text-[#7F8D9E]">Fade Out (s):</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="5"
                          value={selectedLoadedClip.clip.fadeOut}
                          onChange={(e) =>
                            handleUpdateClip(selectedLoadedClip.clip.id, {
                              fadeOut: Math.max(0, parseFloat(e.target.value) || 0),
                            })
                          }
                          className="w-full bg-[#0E1015] border border-[#232B3B] rounded px-2 py-1 text-xs text-[#EDE8DE] font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] text-[#7F8D9E]">Volume ({Math.round(selectedLoadedClip.clip.volume * 100)}%):</span>
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.05"
                          value={selectedLoadedClip.clip.volume}
                          onChange={(e) =>
                            handleUpdateClip(selectedLoadedClip.clip.id, {
                              volume: parseFloat(e.target.value) || 1.0,
                            })
                          }
                          className="w-full accent-[#B88746] mt-2"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Split Action */}
                  <div className="pt-2 border-t border-[#1E2536] flex items-center justify-between">
                    <button
                      onClick={() =>
                        handleSplitClip(
                          selectedLoadedClip.clip.id,
                          selectedLoadedClip.clip.duration / 2
                        )
                      }
                      className="px-3 py-1.5 bg-[#171D28] hover:bg-[#202735] text-[#D8CFBF] border border-[#273245] rounded text-xs transition-colors flex items-center gap-1.5"
                    >
                      <Split className="w-3.5 h-3.5 text-[#B88746]" />
                      <span>Split Clip in Half</span>
                    </button>

                    <button
                      onClick={() => handleRequestTranscription(selectedLoadedClip.clip.id)}
                      disabled={isTranscribing}
                      className="px-3 py-1.5 bg-[#B88746] hover:bg-[#C99654] disabled:opacity-40 text-[#0D0F12] font-semibold rounded text-xs transition-colors flex items-center gap-1.5"
                    >
                      {isTranscribing && pendingSttClipId === selectedLoadedClip.clip.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileText className="w-3.5 h-3.5" />
                      )}
                      <span>{selectedLoadedClip.clip.transcript ? "Re-transcribe" : "Generate Transcript"}</span>
                    </button>
                  </div>

                  {/* Transcript Viewer / Editor */}
                  {selectedLoadedClip.clip.transcript && (
                    <div className="space-y-1.5 pt-2 border-t border-[#1E2536]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#EDE8DE] flex items-center gap-1">
                          <span>Chapter Transcript:</span>
                          {selectedLoadedClip.clip.isCached && (
                            <span className="text-[10px] text-[#50B876] font-mono flex items-center gap-0.5">
                              <Zap className="w-2.5 h-2.5" />
                              Cached ($0.00)
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-[#7F8D9E] font-mono">
                          {selectedLoadedClip.clip.transcript.split(/\s+/).filter(Boolean).length} words
                        </span>
                      </div>
                      <textarea
                        value={selectedLoadedClip.clip.transcript}
                        onChange={(e) =>
                          handleUpdateClip(selectedLoadedClip.clip.id, { transcript: e.target.value })
                        }
                        rows={4}
                        placeholder="Audio transcription will appear here..."
                        className="w-full bg-[#0E1015] border border-[#232B3B] rounded p-2.5 text-xs text-[#EDE8DE] leading-relaxed font-editorial focus:border-[#B88746] focus:outline-none resize-none"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 border border-dashed border-[#202735] rounded-md text-center text-xs text-[#7F8D9E]">
                  Select a clip from the playlist to inspect and adjust DSP controls.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIO-TO-JSON STUDIO */}
      {activeTab === "audio_json" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#12151C] border border-[#202735] p-4 rounded-md">
            <div>
              <h2 className="text-sm font-semibold text-[#EDE8DE]">Audio-to-JSON Metadata Generator</h2>
              <p className="text-xs text-[#8F9AA9]">
                Structured chapter timings, acoustic properties, and transcripts formatted according to international audiobook manifest standards.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={jsonImportRef}
                accept=".json,application/json"
                onChange={handleImportJsonFile}
                className="hidden"
              />
              <button
                onClick={() => jsonImportRef.current?.click()}
                className="px-3 py-1.5 bg-[#171D27] hover:bg-[#222B38] text-[#D8CFBF] border border-[#2B3547] rounded text-xs flex items-center gap-1.5 transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5 text-[#B88746]" />
                <span>Import JSON</span>
              </button>

              <button
                onClick={() => generateJsonManifest()}
                className="px-3 py-1.5 bg-[#171D27] hover:bg-[#222B38] text-[#D8CFBF] border border-[#2B3547] rounded text-xs flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#B88746]" />
                <span>Regenerate JSON</span>
              </button>

              <button
                onClick={handleExportJson}
                disabled={!jsonManifest}
                className="px-4 py-1.5 bg-[#B88746] hover:bg-[#C99654] disabled:opacity-40 text-[#0D0F12] font-semibold rounded text-xs flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export .JSON</span>
              </button>
            </div>
          </div>

          {/* Validation Status Box */}
          {jsonValidationResult && (
            <div
              className={`p-3.5 rounded-md border text-xs flex items-center gap-2 ${
                jsonValidationResult.valid
                  ? "bg-[#14261B] border-[#296839] text-[#71E69C]"
                  : "bg-[#2C1818] border-[#682424] text-[#F3A5A5]"
              }`}
            >
              {jsonValidationResult.valid ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{jsonValidationResult.message}</span>
            </div>
          )}

          {/* Interactive JSON Editor & Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: JSON Textarea Editor (7 Cols) */}
            <div className="lg:col-span-7 space-y-2">
              <div className="flex items-center justify-between text-xs text-[#8F9AA9]">
                <span className="font-semibold text-[#EDE8DE]">Manifest JSON Document:</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(jsonManifest);
                    alert("JSON copied to clipboard!");
                  }}
                  className="hover:text-white flex items-center gap-1 text-[11px]"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              </div>

              <textarea
                value={jsonManifest}
                onChange={(e) => {
                  setJsonManifest(e.target.value);
                  validateJsonString(e.target.value);
                }}
                rows={22}
                className="w-full bg-[#0A0D12] border border-[#202735] rounded-md p-4 font-mono text-xs text-[#D8CFBF] leading-relaxed focus:border-[#B88746] focus:outline-none resize-none selection:bg-[#B88746]/30"
              />
            </div>

            {/* Right: Human-Readable Metadata Summary (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#12151C] border border-[#202735] p-5 rounded-md space-y-4">
                <h3 className="text-xs font-mono uppercase tracking-wider text-[#B88746]">
                  Acoustic & Literary Metadata Inspector
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-[#1C2230]">
                    <span className="text-[#7F8D9E]">Book Title:</span>
                    <span className="text-[#EDE8DE] font-semibold">{projectTitle}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#1C2230]">
                    <span className="text-[#7F8D9E]">Author:</span>
                    <span className="text-[#EDE8DE]">{bookAuthor || "null"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#1C2230]">
                    <span className="text-[#7F8D9E]">Language:</span>
                    <span className="text-[#EDE8DE]">{bookLanguage || "Bengali"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#1C2230]">
                    <span className="text-[#7F8D9E]">Total Chapters:</span>
                    <span className="text-[#EDE8DE] font-mono">{loadedClips.length} Chapters</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#1C2230]">
                    <span className="text-[#7F8D9E]">Master Duration:</span>
                    <span className="text-[#B88746] font-mono font-bold">
                      {formatSec(masterDuration || totalDuration)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#1C2230]">
                    <span className="text-[#7F8D9E]">Sample Rate:</span>
                    <span className="text-[#EDE8DE] font-mono">
                      {loadedClips[0]?.clip.sampleRate || 44100} Hz
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#1C2230]">
                    <span className="text-[#7F8D9E]">Silence Padding:</span>
                    <span className="text-[#EDE8DE] font-mono">{silenceGap} seconds</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <span className="text-xs font-semibold text-[#EDE8DE]">Chapter Timestamps:</span>
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                    {loadedClips.map((item, idx) => (
                      <div
                        key={item.clip.id}
                        className="p-2 bg-[#0E1015] border border-[#1C2332] rounded text-[11px] flex items-center justify-between"
                      >
                        <span className="text-[#D8CFBF] truncate max-w-[180px]">
                          {item.clip.chapterTitle || `Ch. ${idx + 1}`}
                        </span>
                        <span className="text-[#B88746] font-mono">
                          {formatSec(item.clip.duration)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIOBOOK PROJECT MANAGER */}
      {activeTab === "projects" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-[#12151C] border border-[#202735] p-4 rounded-md">
            <div>
              <h2 className="text-sm font-semibold text-[#EDE8DE]">Saved Audiobook Projects (IndexedDB)</h2>
              <p className="text-xs text-[#8F9AA9]">
                Audio files and buffers are persistently stored in browser IndexedDB. Closing and reopening preserves all stems and edits.
              </p>
            </div>

            <button
              onClick={() => {
                setProjectId(`proj-${Date.now()}`);
                setProjectTitle("Untitled Audiobook Production");
                setLoadedClips([]);
                setMasterBlob(null);
                setMasterUrl(null);
                setJsonManifest("");
                setActiveTab("timeline");
              }}
              className="px-3.5 py-1.5 bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12] font-semibold rounded text-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Start New Project</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedProjectsList.length === 0 ? (
              <div className="col-span-full p-16 border border-dashed border-[#202735] rounded-md text-center text-xs text-[#7F8D9E] space-y-2">
                <FolderOpen className="w-8 h-8 text-[#B88746] mx-auto opacity-70" />
                <p>No saved projects in IndexedDB storage. Click "Save Project" above to create an archive.</p>
              </div>
            ) : (
              savedProjectsList.map((p) => {
                const isCurrent = p.id === projectId;

                return (
                  <div
                    key={p.id}
                    className={`bg-[#12151C] border rounded-md p-4 space-y-3 flex flex-col justify-between transition-all ${
                      isCurrent ? "border-[#B88746] shadow-sm shadow-[#B88746]/10" : "border-[#202735]"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-[#B88746]">
                          {p.language}
                        </span>
                        <span className="text-[10px] text-[#7F8D9E] font-mono">
                          {new Date(p.updatedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-[#EDE8DE] line-clamp-1">{p.title}</h3>
                      <div className="text-xs text-[#8F9AA9]">Author: {p.author}</div>
                      <div className="text-[11px] text-[#7F8D9E] font-mono">
                        {p.clips?.length || 0} Audio Clips / Stems
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#1C2230] flex items-center justify-between">
                      <button
                        onClick={() => handleLoadProject(p)}
                        className="px-3 py-1.5 bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12] text-xs font-semibold rounded flex items-center gap-1.5 transition-colors"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>Open Project</span>
                      </button>

                      <button
                        onClick={async () => {
                          if (confirm(`Delete project "${p.title}"?`)) {
                            await deleteAudioProject(p.id, p.clips.map((c) => c.id));
                            const updated = await loadAudioProjects();
                            setSavedProjectsList(updated);
                          }
                        }}
                        className="p-1.5 text-[#7F8D9E] hover:text-[#E66262] transition-colors"
                        title="Delete project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SPEECH-TO-TEXT NOTICE / CONSENT MODAL */}
      {showSttNoticeModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#12151D] border border-[#263145] rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-xs text-[#B88746]">
              <FileText className="w-4 h-4" />
              <span className="font-semibold uppercase tracking-wider">Speech-to-Text API Confirmation</span>
            </div>

            <h2 className="text-lg font-bold text-[#F4EFE6]">অডিও ট্রান্সক্রিপশন অনুমোদন</h2>
            <p className="text-xs text-[#8F9AA9] leading-relaxed">
              এই অডিও ক্লিপটির টেক্সট ট্রান্সক্রিপ্ট তৈরি করার জন্য নিরাপদ ব্যাকএন্ডের মাধ্যমে <strong>Gemini Speech-to-Text API</strong> কল করা হবে।
            </p>

            <div className="bg-[#0E1117] p-3 rounded border border-[#20283A] text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-[#7E8B9E]">ক্লিপের নাম:</span>
                <span className="text-[#EDE8DE] truncate max-w-[200px]">
                  {loadedClips.find((c) => c.clip.id === pendingSttClipId)?.clip.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7E8B9E]">আনুমানিক এপিআই খরচ:</span>
                <span className="text-[#50B876]">~$0.003 USD (সাশ্রয়ী)</span>
              </div>
              <div className="text-[10px] text-[#697486] pt-1 border-t border-[#1F2636]">
                * ট্রান্সক্রিপ্ট তৈরি হওয়ার পর ফাইলের SHA-256 হ্যাশ দিয়ে ক্যাশ করা হবে। একই অডিও পরবর্তীতে ট্রান্সক্রিপ্ট করলে $0.00 খরচে তাৎক্ষণিকভাবে ক্যাশ থেকে লোড হবে।
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowSttNoticeModal(false);
                  setPendingSttClipId(null);
                }}
                className="px-3 py-1.5 bg-[#161B24] hover:bg-[#202735] text-[#8E9BAC] rounded text-xs transition-colors"
              >
                বাতিল করুন
              </button>
              <button
                onClick={handleExecuteTranscription}
                className="px-4 py-1.5 bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12] font-semibold rounded text-xs transition-colors flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>অনুমোদন ও শুরু করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
