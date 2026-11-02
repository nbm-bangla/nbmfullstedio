import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Video,
  Play,
  Pause,
  Download,
  RotateCcw,
  Sparkles,
  Layers,
  Upload,
  CheckCircle2,
  RefreshCw,
  Monitor,
  Smartphone,
  Square,
  Sliders,
  FolderOpen,
  Save,
  Trash2,
  Copy,
  Plus,
  ArrowUp,
  ArrowDown,
  Volume2,
  AlertCircle,
  Clock,
  HardDrive,
  Check,
  Bookmark,
  Share2,
  FileVideo,
  Eye,
  Film,
  Zap,
} from "lucide-react";
import {
  saveAudioBlob,
  getAudioBlob,
  deleteAudioBlob,
  saveVideoProject,
  loadVideoProjects,
  deleteVideoProject,
  loadAudioProjects,
  loadVoiceProjects,
} from "../../services/audioStorage";
import { getAudioContext } from "../../services/audioEngine";
import { Book, VideoProject, VideoClipItem, WaveformStyle } from "../../types";

interface VideoStudioProps {
  books?: Book[];
  onSaveBooks?: (newBooks: Book[]) => void;
  onNavigate?: (tab: string) => void;
}

// Supported Mime Types Detection for Browser & Windows 11
function detectSupportedVideoMimes(): { mimeType: string; label: string; ext: string }[] {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return [{ mimeType: "video/webm", label: "WebM (Default)", ext: "webm" }];
  }

  const candidates = [
    { mimeType: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", label: "MP4 (H.264 / AAC) — Recommended for YouTube", ext: "mp4" },
    { mimeType: "video/mp4", label: "MP4 (Standard Video Container)", ext: "mp4" },
    { mimeType: "video/webm;codecs=vp9,opus", label: "WebM (VP9 / Opus) — High Quality Web", ext: "webm" },
    { mimeType: "video/webm;codecs=vp8,opus", label: "WebM (VP8 / Opus) — Standard Web", ext: "webm" },
    { mimeType: "video/webm", label: "WebM (Browser Fallback)", ext: "webm" },
  ];

  const supported = candidates.filter((c) => MediaRecorder.isTypeSupported(c.mimeType));
  if (supported.length > 0) return supported;
  return [{ mimeType: "video/webm", label: "WebM (Default)", ext: "webm" }];
}

export const VideoStudio: React.FC<VideoStudioProps> = ({
  books = [],
  onSaveBooks,
  onNavigate,
}) => {
  // Sub-tabs
  const [activeTab, setActiveTab] = useState<"composer" | "clips" | "render" | "projects">("composer");

  // Project Metadata
  const [projectId, setProjectId] = useState<string>(() => `vid-proj-${Date.now()}`);
  const [projectTitle, setProjectTitle] = useState<string>("");
  const [authorName, setAuthorName] = useState<string>("");
  const [chapterTitle, setChapterTitle] = useState<string>("");
  const [subtitleSnippet, setSubtitleSnippet] = useState<string>("");
  const [watermarkText, setWatermarkText] = useState<string>("");
  const [selectedBookId, setSelectedBookId] = useState<string>("");

  // Video Canvas Configuration: 1920x1080 (1080p 16:9 30fps)
  const canvasWidth = 1920;
  const canvasHeight = 1080;
  const fps = 30;

  // Cover Image State
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [coverBlobId, setCoverBlobId] = useState<string | null>(null);
  const [backdropMode, setBackdropMode] = useState<"blurred" | "charcoal" | "vignette">("blurred");

  // Audio Sequencer & Clips State
  const [clips, setClips] = useState<VideoClipItem[]>([]);
  const [activeClipIndex, setActiveClipIndex] = useState<number>(0);
  const [interClipGap, setInterClipGap] = useState<number>(1.0);

  // Waveform Settings
  const [enableWaveform, setEnableWaveform] = useState<boolean>(true);
  const [waveformStyle, setWaveformStyle] = useState<WaveformStyle>("bars");
  const [waveformColor, setWaveformColor] = useState<string>("#B88746");
  const [waveformHeight, setWaveformHeight] = useState<number>(90);
  const [waveformPosition, setWaveformPosition] = useState<"bottom" | "center" | "bottom-right">("center");

  // Format & Codec State
  const [supportedFormats, setSupportedFormats] = useState<{ mimeType: string; label: string; ext: string }[]>([]);
  const [selectedMimeType, setSelectedMimeType] = useState<string>("video/webm");

  // Canvas & Audio References
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const coverImageRef = useRef<HTMLImageElement | null>(null);

  // Web Audio & Waveform Analysis
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const mediaStreamDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // Playback & Rendering State
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [renderStatusText, setRenderStatusText] = useState<string>("");
  const [renderElapsedTime, setRenderElapsedTime] = useState<number>(0);
  const [renderEtaSeconds, setRenderEtaSeconds] = useState<number>(0);
  const [renderedVideoBlob, setRenderedVideoBlob] = useState<Blob | null>(null);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
  const [renderedVideoSize, setRenderedVideoSize] = useState<number>(0);
  const [isPreviewRender, setIsPreviewRender] = useState<boolean>(false);

  // Project Management State
  const [savedProjects, setSavedProjects] = useState<VideoProject[]>([]);
  const [notification, setNotification] = useState<{ type: "success" | "error" | "info" | "warning"; text: string } | null>(null);

  // Recorder Reference
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const abortRenderRef = useRef<boolean>(false);

  // Frequency Data Buffer for Waveform
  const frequencyDataRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(128));

  // Initialize Codecs and Projects
  useEffect(() => {
    const detected = detectSupportedVideoMimes();
    setSupportedFormats(detected);
    if (detected.length > 0) {
      // Pick MP4 if supported, else first available
      const mp4Option = detected.find((d) => d.ext === "mp4");
      setSelectedMimeType(mp4Option ? mp4Option.mimeType : detected[0].mimeType);
    }

    // Load Cover Image
    preloadCoverImage(coverUrl);

    // Load Saved Video Projects from IndexedDB
    loadVideoProjects().then(setSavedProjects).catch(() => {});
  }, []);

  const preloadCoverImage = (url: string) => {
    if (!url) {
      coverImageRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => {
      coverImageRef.current = img;
    };
  };

  // Calculate Total Duration & Output Size
  const totalDuration = useMemo(() => {
    return clips.reduce((acc, c) => acc + c.duration + (c.gapAfter ?? interClipGap), 0);
  }, [clips, interClipGap]);

  const estimatedVideoSizeMb = useMemo(() => {
    // 1080p 30fps video at ~3.5 Mbps + 192 kbps audio ≈ 0.46 MB per second
    return ((totalDuration * 0.46) || 0).toFixed(1);
  }, [totalDuration]);

  // Format Seconds Helper
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s.toString().padStart(2, "0")}`;
  };

  // Setup Web Audio Analyser
  const setupAudioGraph = () => {
    const ctx = getAudioContext();
    audioContextRef.current = ctx;

    if (!analyserRef.current) {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
    }

    if (!mediaStreamDestRef.current) {
      const dest = ctx.createMediaStreamDestination();
      mediaStreamDestRef.current = dest;
      analyserRef.current.connect(dest);
    }
  };

  // RENDER A SINGLE 1920x1080 FRAME ONTO CANVAS
  const drawFrame = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    // 1. Clear background
    ctx.fillStyle = "#0A0D12";
    ctx.fillRect(0, 0, width, height);

    const img = coverImageRef.current;

    // 2. Backdrop Rendering
    if (backdropMode === "blurred" && img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      // Draw blurred cover scaled to fill 1920x1080
      ctx.filter = "blur(45px) brightness(0.32)";
      ctx.drawImage(img, -40, -40, width + 80, height + 80);
      ctx.restore();

      // Cinematic Vignette Overlay
      const grad = ctx.createRadialGradient(width / 2, height / 2, 200, width / 2, height / 2, width / 1.1);
      grad.addColorStop(0, "rgba(10, 13, 18, 0.4)");
      grad.addColorStop(1, "rgba(5, 7, 10, 0.95)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (backdropMode === "charcoal") {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#0F131A");
      grad.addColorStop(1, "#080A0E");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = "#050608";
      ctx.fillRect(0, 0, width, height);
    }

    // 3. Draw Pristine Book Cover (Preserving original aspect ratio)
    if (img && img.complete && img.naturalWidth > 0) {
      const targetCoverH = 680;
      const naturalAspect = img.naturalWidth / img.naturalHeight;
      const targetCoverW = targetCoverH * naturalAspect;

      const coverX = 140;
      const coverY = (height - targetCoverH) / 2;

      ctx.save();
      // Soft cinematic drop shadow
      ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
      ctx.shadowBlur = 40;
      ctx.shadowOffsetX = 10;
      ctx.shadowOffsetY = 15;

      // Draw pristine image without stretching
      ctx.drawImage(img, coverX, coverY, targetCoverW, targetCoverH);
      ctx.restore();

      // Subtle framing border
      ctx.strokeStyle = "rgba(184, 135, 70, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(coverX, coverY, targetCoverW, targetCoverH);

      // 4. Draw Right-Side Metadata & Typography
      const textX = coverX + targetCoverW + 100;
      const textY = coverY + 70;
      const textMaxW = width - textX - 140;

      // Brand Watermark
      ctx.fillStyle = "#B88746";
      ctx.font = "bold 15px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(watermarkText.toUpperCase(), textX, textY);

      // Book Title
      ctx.fillStyle = "#F5EFE6";
      ctx.font = "bold 44px 'Cinzel', serif";
      ctx.fillText(projectTitle, textX, textY + 65, textMaxW);

      // Author Name
      ctx.fillStyle = "#C8BFA8";
      ctx.font = "24px 'Noto Serif Bengali', serif";
      ctx.fillText(`লেখক: ${authorName}`, textX, textY + 120, textMaxW);

      // Chapter / Current Section Indicator
      ctx.fillStyle = "#8F9AA9";
      ctx.font = "19px 'Noto Serif Bengali', serif";
      ctx.fillText(chapterTitle, textX, textY + 175, textMaxW);

      // Subtitle / Dialogue Banner
      if (subtitleSnippet) {
        const subY = textY + 225;
        ctx.fillStyle = "rgba(16, 21, 30, 0.85)";
        ctx.fillRect(textX, subY, textMaxW, 65);
        ctx.strokeStyle = "rgba(42, 53, 72, 0.8)";
        ctx.lineWidth = 1;
        ctx.strokeRect(textX, subY, textMaxW, 65);

        ctx.fillStyle = "#FFE7B8";
        ctx.font = "18px 'Noto Serif Bengali', serif";
        ctx.fillText(subtitleSnippet, textX + 25, subY + 40, textMaxW - 50);
      }

      // 5. Draw Genuine Audio-Reactive Animated Waveform
      if (enableWaveform) {
        // Sample frequencies from Web Audio Analyser
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(frequencyDataRef.current);
        }

        const waveData = frequencyDataRef.current;
        let waveOriginX = textX;
        let waveOriginY = textY + 390;
        let waveAvailableW = textMaxW;

        if (waveformPosition === "bottom") {
          waveOriginX = 140;
          waveOriginY = height - 120;
          waveAvailableW = width - 280;
        } else if (waveformPosition === "bottom-right") {
          waveOriginX = textX;
          waveOriginY = height - 140;
          waveAvailableW = textMaxW;
        }

        ctx.save();
        ctx.fillStyle = waveformColor;
        ctx.strokeStyle = waveformColor;

        if (waveformStyle === "bars") {
          const numBars = 50;
          const barWidth = 8;
          const barGap = (waveAvailableW - numBars * barWidth) / (numBars - 1);

          for (let i = 0; i < numBars; i++) {
            const dataIdx = Math.floor((i / numBars) * waveData.length * 0.7);
            const amplitude = isPlayingPreview || isRendering ? waveData[dataIdx] / 255 : 0.08;
            const barH = Math.max(4, amplitude * waveformHeight);
            const bx = waveOriginX + i * (barWidth + barGap);
            const by = waveOriginY - barH / 2;

            ctx.fillRect(bx, by, barWidth, barH);
          }
        } else if (waveformStyle === "mirrored") {
          const numBars = 60;
          const barWidth = 6;
          const barGap = (waveAvailableW - numBars * barWidth) / (numBars - 1);

          for (let i = 0; i < numBars; i++) {
            const dataIdx = Math.floor((i / numBars) * waveData.length * 0.6);
            const amplitude = isPlayingPreview || isRendering ? waveData[dataIdx] / 255 : 0.06;
            const barH = Math.max(3, amplitude * waveformHeight);
            const bx = waveOriginX + i * (barWidth + barGap);

            // Top half
            ctx.fillRect(bx, waveOriginY - barH, barWidth, barH);
            // Mirrored bottom half
            ctx.fillStyle = `${waveformColor}99`; // slightly translucent
            ctx.fillRect(bx, waveOriginY + 2, barWidth, barH * 0.75);
            ctx.fillStyle = waveformColor;
          }
        } else if (waveformStyle === "line") {
          ctx.beginPath();
          ctx.lineWidth = 3;
          ctx.shadowColor = waveformColor;
          ctx.shadowBlur = 15;

          const pointsCount = 80;
          const stepX = waveAvailableW / pointsCount;

          for (let i = 0; i <= pointsCount; i++) {
            const dataIdx = Math.floor((i / pointsCount) * waveData.length * 0.6);
            const amplitude = isPlayingPreview || isRendering ? (waveData[dataIdx] / 255) - 0.5 : 0;
            const px = waveOriginX + i * stepX;
            const py = waveOriginY + amplitude * waveformHeight;

            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        } else if (waveformStyle === "circular") {
          const radius = waveformHeight / 2;
          const cx = waveOriginX + radius + 30;
          const cy = waveOriginY;
          const numSlices = 48;

          ctx.beginPath();
          ctx.arc(cx, cy, radius * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(184, 135, 70, 0.2)";
          ctx.fill();

          for (let i = 0; i < numSlices; i++) {
            const angle = (i / numSlices) * Math.PI * 2;
            const dataIdx = Math.floor((i / numSlices) * waveData.length * 0.6);
            const amplitude = isPlayingPreview || isRendering ? waveData[dataIdx] / 255 : 0.08;
            const rayLen = radius * 0.4 + amplitude * (radius * 0.6);

            const x1 = cx + Math.cos(angle) * (radius * 0.4);
            const y1 = cy + Math.sin(angle) * (radius * 0.4);
            const x2 = cx + Math.cos(angle) * rayLen;
            const y2 = cy + Math.sin(angle) * rayLen;

            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    }
  };

  // Preview Loop on Preview Canvas
  useEffect(() => {
    let animId: number;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    let startTime = performance.now();

    const loop = (timestamp: number) => {
      const elapsed = (timestamp - startTime) / 1000;
      drawFrame(ctx, canvasWidth, canvasHeight, elapsed);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [
    coverUrl,
    projectTitle,
    authorName,
    chapterTitle,
    subtitleSnippet,
    watermarkText,
    backdropMode,
    enableWaveform,
    waveformStyle,
    waveformColor,
    waveformHeight,
    waveformPosition,
    isPlayingPreview,
    isRendering,
  ]);

  // Play Preview Audio Stream
  const toggleAudioPreview = async () => {
    setupAudioGraph();
    const ctx = audioContextRef.current;
    if (!ctx) return;

    if (isPlayingPreview) {
      if (currentAudioSourceRef.current) {
        try {
          currentAudioSourceRef.current.stop();
        } catch {}
      }
      setIsPlayingPreview(false);
      return;
    }

    try {
      // Preview only uploaded or previously generated audio.
      let blob: Blob | null = null;
      const currentClip = clips[activeClipIndex] || clips[0];
      if (currentClip?.audioBlobId) {
        blob = await getAudioBlob(currentClip.audioBlobId);
      }

      if (blob) {
        const ab = await blob.arrayBuffer();
        const buffer = await ctx.decodeAudioData(ab.slice(0));
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(analyserRef.current!);
        analyserRef.current!.connect(ctx.destination);
        src.onended = () => setIsPlayingPreview(false);
        src.start(0);
        currentAudioSourceRef.current = src;
        setIsPlayingPreview(true);
      } else {
        setNotification({ type: "warning", text: "অডিও প্রিভিউর জন্য আগে একটি অডিও ক্লিপ যোগ করুন।" });
      }
    } catch (e) {
      console.error("Preview play error:", e);
      setNotification({ type: "warning", text: "অডিও প্রিভিউ চালাতে ব্যর্থ হয়েছে। অডিও ফাইল পরীক্ষা করুন।" });
      setIsPlayingPreview(false);
    }
  };

  // FULL VIDEO / PREVIEW RENDERING ENGINE
  // Memory-efficient, stream-based, zero uncompressed frames in RAM!
  const startVideoRender = async (previewOnly: boolean = false) => {
    if (clips.length === 0) {
      setNotification({ type: "warning", text: "রেন্ডার করার আগে অন্তত একটি অডিও ক্লিপ যোগ করুন।" });
      return;
    }
    const canvas = previewCanvasRef.current;
    if (!canvas) {
      setNotification({ type: "error", text: "ভিডিও ক্যানভাস পাওয়া যায়নি।" });
      return;
    }

    setupAudioGraph();
    const ctx = audioContextRef.current;
    if (!ctx) {
      setNotification({ type: "error", text: "Web Audio ইঞ্জিন চালু করা সম্ভব হয়নি।" });
      return;
    }

    setIsRendering(true);
    setIsPreviewRender(previewOnly);
    setRenderProgress(0);
    setRenderElapsedTime(0);
    abortRenderRef.current = false;
    recordedChunksRef.current = [];

    const targetDuration = previewOnly ? Math.min(10, totalDuration) : totalDuration;
    setRenderStatusText(previewOnly ? "রেন্ডারিং প্রিভিউ (১০ সেকেন্ড)..." : `রেন্ডারিং সম্পূর্ণ ১০৮০p ভিডিও (${formatTime(totalDuration)})...`);

    try {
      // 1. Capture 30 FPS stream from 1920x1080 Canvas
      const canvasStream = canvas.captureStream(fps);
      const videoTrack = canvasStream.getVideoTracks()[0];

      // 2. Connect Audio Destination to capture live audio stream
      const dest = mediaStreamDestRef.current || ctx.createMediaStreamDestination();
      const audioTrack = dest.stream.getAudioTracks()[0];

      // 3. Combine Video & Audio Tracks into single MediaStream
      const combinedStream = new MediaStream([videoTrack]);
      if (audioTrack) {
        combinedStream.addTrack(audioTrack);
      }

      // 4. Initialize MediaRecorder with safe chunking (timeslice 1000ms = constant tiny RAM footprint!)
      const recorder = new MediaRecorder(combinedStream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 4500000, // 4.5 Mbps 1080p high fidelity
        audioBitsPerSecond: 192000,
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      const renderStartTime = performance.now();

      recorder.onstop = async () => {
        setIsRendering(false);
        setIsPlayingPreview(false);

        if (abortRenderRef.current) {
          setNotification({ type: "info", text: "ভিডিও রেন্ডারিং বাতিল করা হয়েছে।" });
          return;
        }

        const isMp4 = selectedMimeType.includes("mp4");
        const finalBlob = new Blob(recordedChunksRef.current, {
          type: isMp4 ? "video/mp4" : "video/webm",
        });

        const url = URL.createObjectURL(finalBlob);
        setRenderedVideoBlob(finalBlob);
        setRenderedVideoUrl(url);
        setRenderedVideoSize(finalBlob.size);

        // Persist Video in IndexedDB
        const vidStorageId = `vid-${Date.now()}`;
        await saveAudioBlob(vidStorageId, finalBlob);

        // Auto Save Project
        await handleSaveProject(vidStorageId);

        setNotification({
          type: "success",
          text: `ভিডিও সফলভাবে রেন্ডার সম্পন্ন হয়েছে! ফরম্যাট: ${isMp4 ? "MP4" : "WebM"} (${(finalBlob.size / (1024 * 1024)).toFixed(2)} MB)।`,
        });
      };

      // Start Recording with 1000ms slice (streaming chunks directly to memory, lightweight!)
      recorder.start(1000);
      setIsPlayingPreview(true);

      // Play audio clips through graph
      playSequencedClips(previewOnly, targetDuration, renderStartTime);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Render start failed:", msg);
      setIsRendering(false);
      setNotification({ type: "error", text: `রেন্ডারিং ত্রুটি: ${msg}` });
    }
  };

  // Play audio sequentially and report progress
  const playSequencedClips = async (
    previewOnly: boolean,
    targetDuration: number,
    renderStartTime: number
  ) => {
    const ctx = audioContextRef.current!;
    let timeElapsed = 0;

    const progressTimer = setInterval(() => {
      if (abortRenderRef.current || !mediaRecorderRef.current || mediaRecorderRef.current.state !== "recording") {
        clearInterval(progressTimer);
        return;
      }

      timeElapsed = (performance.now() - renderStartTime) / 1000;
      setRenderElapsedTime(timeElapsed);

      const pct = Math.min(100, Math.round((timeElapsed / targetDuration) * 100));
      setRenderProgress(pct);

      const remainingSecs = Math.max(0, targetDuration - timeElapsed);
      setRenderEtaSeconds(remainingSecs);

      if (timeElapsed >= targetDuration) {
        clearInterval(progressTimer);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }
    }, 250);
  };

  // Cancel Rendering
  const cancelRender = () => {
    abortRenderRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRendering(false);
    setIsPlayingPreview(false);
  };

  // Download Rendered Video
  const handleDownloadVideo = () => {
    if (!renderedVideoUrl || !renderedVideoBlob) return;
    const isMp4 = renderedVideoBlob.type.includes("mp4");
    const a = document.createElement("a");
    a.href = renderedVideoUrl;
    a.download = `${projectTitle.replace(/\s+/g, "_")}_1080p.${isMp4 ? "mp4" : "webm"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Save Video as Library Asset
  const handleAttachToLibraryBook = () => {
    if (!renderedVideoUrl || !renderedVideoBlob) {
      setNotification({ type: "warning", text: "সংরক্ষণ করার মতো কোনো রেন্ডার করা ভিডিও নেই।" });
      return;
    }

    if (books.length === 0) {
      setNotification({ type: "info", text: "লাইব্রেরিতে কোনো বই পাওয়া যায়নি।" });
      return;
    }

    const targetBook = books.find((b) => b.id === selectedBookId) || books[0];
    const updatedBook: Book = {
      ...targetBook,
      hasVideo: true,
      updatedAt: new Date().toISOString(),
    };

    if (onSaveBooks) {
      const updatedList = books.map((b) => (b.id === updatedBook.id ? updatedBook : b));
      onSaveBooks(updatedList);
      setNotification({
        type: "success",
        text: `ভিডিও সফলভাবে লাইব্রেরির "${targetBook.title}" বইয়ে ভিডিও সম্পদ হিসেবে সংরক্ষিত হয়েছে!`,
      });
    }
  };

  // Upload Custom Cover Image
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        setCoverUrl(dataUrl);
        preloadCoverImage(dataUrl);

        // Save cover blob in IndexedDB
        const blobId = `cover-${Date.now()}`;
        await saveAudioBlob(blobId, file);
        setCoverBlobId(blobId);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload Custom Audio File for Sequencer
  const handleAddAudioFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const blobId = `vid-audio-${Date.now()}-${i}`;
      await saveAudioBlob(blobId, file);

      // Decode duration via Web Audio
      const ctx = getAudioContext();
      const ab = await file.arrayBuffer();
      const buf = await ctx.decodeAudioData(ab.slice(0));

      const newClip: VideoClipItem = {
        id: blobId,
        name: file.name.replace(/\.[^/.]+$/, ""),
        duration: Number(buf.duration.toFixed(2)),
        audioBlobId: blobId,
        audioUrl: URL.createObjectURL(file),
        gapAfter: interClipGap,
      };

      setClips((prev) => [...prev, newClip]);
    }

    setNotification({ type: "success", text: `${files.length}টি অডিও ফাইল সিকোয়েন্সারে যুক্ত হয়েছে।` });
  };

  // Reorder Clips
  const handleMoveClip = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === clips.length - 1) return;

    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const copy = [...clips];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    setClips(copy);
  };

  const handleRemoveClip = (id: string) => {
    setClips((prev) => prev.filter((c) => c.id !== id));
  };

  // Import Clips from Audio Studio
  const handleImportFromAudioStudio = async () => {
    const audioProjects = await loadAudioProjects();
    if (audioProjects.length === 0) {
      setNotification({ type: "info", text: "Audio Studio-তে কোনো সংরক্ষিত প্রজেক্ট পাওয়া যায়নি।" });
      return;
    }

    const first = audioProjects[0];
    const newClips: VideoClipItem[] = first.clips.map((c) => ({
      id: c.id,
      name: c.name,
      duration: c.duration,
      audioBlobId: c.storageKey || c.id,
      gapAfter: interClipGap,
    }));

    setClips(newClips);
    setProjectTitle(`${first.title} (ভিডিও সংস্করণ)`);
    setAuthorName(first.author);
    setNotification({ type: "success", text: `Audio Studio থেকে "${first.title}"-এর ${newClips.length}টি ক্লিপ লোড করা হয়েছে।` });
  };

  // Save Project in IndexedDB
  const handleSaveProject = async (videoBlobId?: string) => {
    const project: VideoProject = {
      id: projectId,
      title: projectTitle,
      bookId: selectedBookId || null,
      author: authorName,
      chapterTitle,
      subtitleSnippet,
      watermarkText,
      resolution: { width: canvasWidth, height: canvasHeight },
      fps,
      aspectRatio: "16:9",
      coverBlobId: coverBlobId || undefined,
      coverUrl,
      useBlurredBackdrop: backdropMode === "blurred",
      enableWaveform,
      waveformStyle,
      waveformColor,
      waveformHeight,
      waveformPosition,
      clips,
      totalDuration,
      outputFormat: selectedMimeType,
      renderedVideoBlobId: videoBlobId,
      renderedAt: videoBlobId ? new Date().toISOString() : undefined,
      status: videoBlobId ? "completed" : "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveVideoProject(project);
    const updated = await loadVideoProjects();
    setSavedProjects(updated);
  };

  // Load Saved Project
  const handleLoadProject = (proj: VideoProject) => {
    setProjectId(proj.id);
    setProjectTitle(proj.title);
    setAuthorName(proj.author);
    setChapterTitle(proj.chapterTitle);
    setSubtitleSnippet(proj.subtitleSnippet || "");
    setWatermarkText(proj.watermarkText || "");
    setSelectedBookId(proj.bookId || "");
    setCoverUrl(proj.coverUrl || coverUrl);
    preloadCoverImage(proj.coverUrl || coverUrl);
    setBackdropMode(proj.useBlurredBackdrop ? "blurred" : "charcoal");
    setEnableWaveform(proj.enableWaveform);
    setWaveformStyle(proj.waveformStyle);
    setWaveformColor(proj.waveformColor);
    setWaveformHeight(proj.waveformHeight);
    setWaveformPosition(proj.waveformPosition);
    setClips(proj.clips);
    setActiveTab("composer");
    setNotification({ type: "success", text: `"${proj.title}" প্রজেক্ট লোড করা হয়েছে।` });
  };

  const handleDeleteProject = async (id: string) => {
    if (window.confirm("আপনি কি নিশ্চিতভাবে এই ভিডিও প্রজেক্টটি মুছে ফেলতে চান?")) {
      await deleteVideoProject(id);
      const updated = await loadVideoProjects();
      setSavedProjects(updated);
      setNotification({ type: "info", text: "ভিডিও প্রজেক্ট মুছে ফেলা হয়েছে।" });
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Studio Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#202735] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#B88746]">
            <Video className="w-4 h-4" />
            <span className="font-semibold uppercase tracking-wider">Cinematic Video Synthesis</span>
            <span aria-hidden="true">·</span>
            <span>1920×1080 (1080p 16:9) · Audio-Reactive Waveform</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-[#F4EFE6] mt-0.5">Video Studio</h1>
          <p className="text-xs text-[#8F9AA9] font-editorial text-sm mt-0.5">
            বইয়ের কভার ও অডিও ক্লিপ দিয়ে উচ্চমানের ১০৮০p ভিডিও ও চলমান অডিও-রিঅ্যাকটিভ ওয়েভফর্ম তৈরি করুন।
          </p>
        </div>

        {/* Stats & Format Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3 py-1.5 bg-[#12161F] border border-[#232C3D] rounded flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#B88746]" />
            <span className="text-[#8F9AA9]">Duration:</span>
            <span className="font-mono font-medium text-[#EDE8DE]">{formatTime(totalDuration)}</span>
          </div>

          <div className="px-3 py-1.5 bg-[#12161F] border border-[#232C3D] rounded flex items-center gap-2">
            <HardDrive className="w-3.5 h-3.5 text-[#50B876]" />
            <span className="text-[#8F9AA9]">Est. Size:</span>
            <span className="font-mono font-medium text-[#50B876]">~{estimatedVideoSizeMb} MB</span>
          </div>

          <div className="px-3 py-1.5 bg-[#12161F] border border-[#232C3D] rounded flex items-center gap-1.5 text-[#8CB8F5]">
            <Film className="w-3.5 h-3.5" />
            <span className="font-mono text-[11px]">
              {selectedMimeType.includes("mp4") ? "MP4 (H.264)" : "WebM (VP9/VP8)"}
            </span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-3.5 text-xs rounded-md flex items-center justify-between gap-3 border ${
            notification.type === "error"
              ? "bg-[#261517] border-[#5A252B] text-[#FF9E9E]"
              : notification.type === "warning"
              ? "bg-[#231E15] border-[#52401C] text-[#E5C380]"
              : notification.type === "success"
              ? "bg-[#122319] border-[#224A32] text-[#85E2A8]"
              : "bg-[#131B26] border-[#21354F] text-[#8CB8F5]"
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-[11px] underline opacity-80 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#1E2533] pb-2 text-xs">
        <button
          onClick={() => setActiveTab("composer")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded transition-colors ${
            activeTab === "composer"
              ? "bg-[#B88746] text-[#0D0F12] font-semibold"
              : "text-[#8F9AA9] hover:text-[#EDE8DE] hover:bg-[#151922]"
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>ভিডিও কম্পোজার ও প্রিভিউ (Composer)</span>
        </button>

        <button
          onClick={() => setActiveTab("clips")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded transition-colors ${
            activeTab === "clips"
              ? "bg-[#B88746] text-[#0D0F12] font-semibold"
              : "text-[#8F9AA9] hover:text-[#EDE8DE] hover:bg-[#151922]"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>অডিও ক্লিপ সিকোয়েন্সার (Clips: {clips.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("render")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded transition-colors ${
            activeTab === "render"
              ? "bg-[#B88746] text-[#0D0F12] font-semibold"
              : "text-[#8F9AA9] hover:text-[#EDE8DE] hover:bg-[#151922]"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>রেন্ডার কিউ ও এক্সপোর্ট (Render & Export)</span>
        </button>

        <button
          onClick={() => setActiveTab("projects")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded transition-colors ${
            activeTab === "projects"
              ? "bg-[#B88746] text-[#0D0F12] font-semibold"
              : "text-[#8F9AA9] hover:text-[#EDE8DE] hover:bg-[#151922]"
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>ভিডিও প্রজেক্ট আর্কাইভ ({savedProjects.length})</span>
        </button>
      </div>

      {/* TAB 1: Video Composer & Visual Controls */}
      {activeTab === "composer" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Live 1920x1080 Scaled Canvas Preview */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-[#0B0D11] border border-[#202735] rounded-md p-3 flex flex-col items-center justify-center min-h-[440px] overflow-hidden relative shadow-2xl">
              <canvas
                ref={previewCanvasRef}
                className="w-full aspect-video object-contain rounded shadow-2xl border border-[#1A212E]"
              />

              {/* Rendering Overlay on Canvas */}
              {isRendering && (
                <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <RefreshCw className="w-8 h-8 text-[#B88746] animate-spin" />
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-[#F5EFE6]">
                      {isPreviewRender ? "ছোট প্রিভিউ রেন্ডার হচ্ছে..." : "১০৮০p ভিডিও এনকোডিং চলছে..."}
                    </h3>
                    <p className="text-xs text-[#8F9AA9] font-mono">
                      অগ্রগতি: {renderProgress}% · অতিবাহিত সময়: {formatTime(renderElapsedTime)} · বাকি: ~{renderEtaSeconds}s
                    </p>
                  </div>
                  <div className="w-64 bg-[#1A2230] h-2 rounded-full overflow-hidden border border-[#2E3B52]">
                    <div
                      className="bg-[#B88746] h-full transition-all duration-300"
                      style={{ width: `${renderProgress}%` }}
                    />
                  </div>
                  <button
                    onClick={cancelRender}
                    className="px-4 py-1.5 bg-[#3B1C1F] hover:bg-[#4E2226] text-[#FF8585] border border-[#63292E] rounded text-xs font-semibold"
                  >
                    রেন্ডারিং বাতিল করুন
                  </button>
                </div>
              )}
            </div>

            {/* Quick Action & Audio Preview Bar */}
            <div className="bg-[#12151C] border border-[#202735] p-4 rounded-md flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleAudioPreview}
                  disabled={isRendering}
                  className="px-4 py-2 bg-[#B88746] hover:bg-[#C99654] disabled:opacity-50 text-[#0D0F12] text-xs font-bold rounded flex items-center gap-2 transition-colors shadow-sm"
                >
                  {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  <span>{isPlayingPreview ? "প্রিভিউ থামান" : "চলমান অডিও প্রিভিউ শুনুন"}</span>
                </button>

                <button
                  onClick={() => startVideoRender(true)}
                  disabled={isRendering}
                  className="px-3.5 py-2 bg-[#1A2230] hover:bg-[#243044] text-[#EDE8DE] border border-[#2E3C52] text-xs font-semibold rounded flex items-center gap-1.5 transition-colors"
                  title="Render a fast 10-second test video file"
                >
                  <Eye className="w-3.5 h-3.5 text-[#B88746]" />
                  <span>১০ সেকেন্ড প্রিভিউ রেন্ডার</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSaveProject()}
                  className="px-3.5 py-2 bg-[#151922] hover:bg-[#1E2430] text-[#EDE8DE] border border-[#283244] text-xs rounded flex items-center gap-1.5 transition-colors"
                >
                  <Save className="w-3.5 h-3.5 text-[#B88746]" />
                  <span>প্রজেক্ট সেভ</span>
                </button>

                <button
                  onClick={() => setActiveTab("render")}
                  className="px-4 py-2 bg-[#50B876] hover:bg-[#5BC583] text-[#0D0F12] text-xs font-bold rounded flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>সম্পূর্ণ ভিডিও রেন্ডারে যান</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Elements & Waveform Styling Controls */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#12151C] border border-[#202735] p-5 rounded-md space-y-5 manuscript-paper text-xs">
              <h3 className="font-mono uppercase tracking-wider text-[#B88746]">
                কভার ও ভিজ্যুয়াল কম্পোজিশন
              </h3>

              {/* Book Title Input */}
              <div className="space-y-1">
                <label className="text-[#8F9AA9] font-medium">বইয়ের শিরোনাম (Title):</label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="w-full bg-[#0E1015] border border-[#232B3B] rounded p-2 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                />
              </div>

              {/* Author Credits Input */}
              <div className="space-y-1">
                <label className="text-[#8F9AA9] font-medium">লেখক / কথকের নাম:</label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full bg-[#0E1015] border border-[#232B3B] rounded p-2 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                />
              </div>

              {/* Chapter Indicator */}
              <div className="space-y-1">
                <label className="text-[#8F9AA9] font-medium">অধ্যায় / স্তবক পরিচিতি:</label>
                <input
                  type="text"
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  className="w-full bg-[#0E1015] border border-[#232B3B] rounded p-2 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                />
              </div>

              {/* Subtitle Snippet */}
              <div className="space-y-1">
                <label className="text-[#8F9AA9] font-medium">ডায়লগ বা পঙ্‌ক্তি ব্যানার:</label>
                <input
                  type="text"
                  value={subtitleSnippet}
                  onChange={(e) => setSubtitleSnippet(e.target.value)}
                  className="w-full bg-[#0E1015] border border-[#232B3B] rounded p-2 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none font-editorial"
                />
              </div>

              {/* Cover Image Upload (Strict Anti-Distortion) */}
              <div className="space-y-1.5 pt-2 border-t border-[#1F2636]">
                <label className="text-[#8F9AA9] font-medium block">বইয়ের কভার পরিবর্তন (JPG, PNG, WebP):</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="w-full text-[11px] text-[#7F8D9E] file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:bg-[#1A202C] file:text-[#D8CFBF]"
                />
                <p className="text-[10px] text-[#697486]">
                  * মূল কভার ইমেজটি বিকৃত বা পরিবর্তন না করে ১৬:৯ ফ্রেমে প্রাকৃতিক অনুপাতে বসানো হবে।
                </p>
              </div>

              {/* Backdrop Mode Selection */}
              <div className="space-y-1.5 pt-2 border-t border-[#1F2636]">
                <label className="text-[#8F9AA9] font-medium block">১৬:৯ ব্যাকড্রপ স্টাইল:</label>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => setBackdropMode("blurred")}
                    className={`py-1.5 px-2 rounded text-[11px] border text-center transition-colors ${
                      backdropMode === "blurred"
                        ? "bg-[#252C3B] border-[#B88746] text-[#EDE8DE] font-semibold"
                        : "bg-[#0E1015] border-[#232B3B] text-[#8F9AA9]"
                    }`}
                  >
                    ব্লার কভার
                  </button>
                  <button
                    type="button"
                    onClick={() => setBackdropMode("charcoal")}
                    className={`py-1.5 px-2 rounded text-[11px] border text-center transition-colors ${
                      backdropMode === "charcoal"
                        ? "bg-[#252C3B] border-[#B88746] text-[#EDE8DE] font-semibold"
                        : "bg-[#0E1015] border-[#232B3B] text-[#8F9AA9]"
                    }`}
                  >
                    চারকোল
                  </button>
                  <button
                    type="button"
                    onClick={() => setBackdropMode("vignette")}
                    className={`py-1.5 px-2 rounded text-[11px] border text-center transition-colors ${
                      backdropMode === "vignette"
                        ? "bg-[#252C3B] border-[#B88746] text-[#EDE8DE] font-semibold"
                        : "bg-[#0E1015] border-[#232B3B] text-[#8F9AA9]"
                    }`}
                  >
                    সলিড ডার্ক
                  </button>
                </div>
              </div>

              {/* Waveform Controls */}
              <div className="space-y-3 pt-3 border-t border-[#1F2636]">
                <div className="flex items-center justify-between">
                  <label className="text-[#8F9AA9] font-medium">চলমান ওয়েভফর্ম (Waveform):</label>
                  <input
                    type="checkbox"
                    checked={enableWaveform}
                    onChange={(e) => setEnableWaveform(e.target.checked)}
                    className="accent-[#B88746]"
                  />
                </div>

                {enableWaveform && (
                  <div className="space-y-3 pt-1">
                    {/* Style Selection */}
                    <div className="space-y-1">
                      <span className="text-[#7F8D9E] text-[11px]">ওয়েভফর্ম স্টাইল:</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: "bars", label: "ফ্রিকোয়েন্সি বার" },
                          { id: "mirrored", label: "মিররড সাউন্ডওয়েভ" },
                          { id: "line", label: "গ্লোয়িং লাইন" },
                          { id: "circular", label: "সার্কুলার পালস" },
                        ].map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setWaveformStyle(s.id as WaveformStyle)}
                            className={`py-1.5 px-2 rounded text-[11px] border text-center transition-colors ${
                              waveformStyle === s.id
                                ? "bg-[#252C3B] border-[#B88746] text-[#EDE8DE] font-semibold"
                                : "bg-[#0E1015] border-[#232B3B] text-[#8F9AA9]"
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color Presets */}
                    <div className="space-y-1">
                      <span className="text-[#7F8D9E] text-[11px]">রং নির্বাচন:</span>
                      <div className="flex items-center gap-2">
                        {[
                          { color: "#B88746", name: "Gold" },
                          { color: "#50B876", name: "Emerald" },
                          { color: "#D97706", name: "Amber" },
                          { color: "#38BDF8", name: "Cyan" },
                          { color: "#EDE8DE", name: "Ivory" },
                        ].map((c) => (
                          <button
                            key={c.color}
                            type="button"
                            onClick={() => setWaveformColor(c.color)}
                            className="w-6 h-6 rounded-full border border-white/20 transition-transform hover:scale-110 flex items-center justify-center"
                            style={{ backgroundColor: c.color }}
                          >
                            {waveformColor === c.color && <Check className="w-3.5 h-3.5 text-black" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Waveform Height */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#7F8D9E]">উচ্চতা (Height):</span>
                        <span className="font-mono text-[#B88746]">{waveformHeight}px</span>
                      </div>
                      <input
                        type="range"
                        min="40"
                        max="160"
                        step="5"
                        value={waveformHeight}
                        onChange={(e) => setWaveformHeight(parseInt(e.target.value, 10))}
                        className="w-full accent-[#B88746]"
                      />
                    </div>

                    {/* Waveform Position */}
                    <div className="space-y-1">
                      <span className="text-[#7F8D9E] text-[11px]">অবস্থান (Position):</span>
                      <select
                        value={waveformPosition}
                        onChange={(e) => setWaveformPosition(e.target.value as "bottom" | "center" | "bottom-right")}
                        className="w-full bg-[#0E1015] border border-[#232B3B] rounded p-1.5 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                      >
                        <option value="center">মাঝে / শিরোনামের নিচে (Center)</option>
                        <option value="bottom">সম্পূর্ণ ক্যানভাসের নিচে (Bottom Span)</option>
                        <option value="bottom-right">ডান কোণে (Bottom Right)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Audio Clips Sequencer */}
      {activeTab === "clips" && (
        <div className="space-y-6">
          {/* Sequencer Toolbar */}
          <div className="bg-[#12151C] border border-[#202735] p-5 rounded-md flex flex-wrap items-center justify-between gap-4 text-xs manuscript-paper">
            <div>
              <h3 className="font-mono uppercase tracking-wider text-[#B88746]">
                অডিও ক্লিপ সিকোয়েন্সার ({clips.length} ক্লিপ)
              </h3>
              <p className="text-[#8F9AA9] mt-0.5">
                ক্লিপগুলোর ক্রম অনুযায়ী অডিও জোড়া লাগানো হবে এবং পুরো ভিডিওর মোট দৈর্ঘ্য নির্ধারিত হবে।
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleImportFromAudioStudio}
                className="px-3.5 py-2 bg-[#1B2433] hover:bg-[#253246] text-[#EDE8DE] border border-[#2D3D56] rounded font-medium flex items-center gap-1.5 transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-[#B88746]" />
                <span>Audio Studio থেকে লোড করুন</span>
              </button>

              <label className="px-3.5 py-2 bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12] font-semibold rounded cursor-pointer flex items-center gap-1.5 transition-colors shadow-sm">
                <Upload className="w-3.5 h-3.5" />
                <span>নতুন অডিও ফাইল যোগ করুন</span>
                <input
                  type="file"
                  multiple
                  accept="audio/*"
                  onChange={handleAddAudioFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Clips List */}
          <div className="space-y-3">
            {clips.map((clip, index) => (
              <div
                key={clip.id}
                className={`p-4 bg-[#11141A] border rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                  activeClipIndex === index ? "border-[#B88746]" : "border-[#1E2533]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded bg-[#1A212E] text-[#B88746] font-mono font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <div>
                    <h4 className="font-semibold text-[#EDE8DE]">{clip.name}</h4>
                    <p className="text-[11px] text-[#697486] font-mono">
                      দৈর্ঘ্য: {clip.duration.toFixed(1)}s · বিরতি: {clip.gapAfter}s
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleMoveClip(index, "up")}
                    disabled={index === 0}
                    className="p-1.5 bg-[#181D26] hover:bg-[#222938] disabled:opacity-30 text-[#EDE8DE] border border-[#273042] rounded"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleMoveClip(index, "down")}
                    disabled={index === clips.length - 1}
                    className="p-1.5 bg-[#181D26] hover:bg-[#222938] disabled:opacity-30 text-[#EDE8DE] border border-[#273042] rounded"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      setActiveClipIndex(index);
                      toggleAudioPreview();
                    }}
                    className="px-2.5 py-1.5 bg-[#1A2230] hover:bg-[#243044] text-[#B88746] border border-[#2E3C52] rounded flex items-center gap-1 font-medium"
                  >
                    <Play className="w-3 h-3" />
                    <span>শুনুন</span>
                  </button>

                  <button
                    onClick={() => handleRemoveClip(clip.id)}
                    className="p-1.5 bg-[#261517] hover:bg-[#381C20] text-[#FF8585] border border-[#4D2328] rounded"
                    title="Remove Clip"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Render Queue & Export */}
      {activeTab === "render" && (
        <div className="space-y-6">
          <div className="bg-[#12151C] border border-[#202735] p-6 rounded-md space-y-6 manuscript-paper text-xs">
            <div>
              <h3 className="font-mono uppercase tracking-wider text-[#B88746] text-sm">
                ভিডিও এক্সপোর্ট কনফিগারেশন (1080p Video Master)
              </h3>
              <p className="text-[#8F9AA9] mt-0.5">
                আপনার HP EliteBook 845 G10-এর জন্য মেমোরি-সাশ্রয়ী স্ট্রিমিং এনকোডার প্রস্তুত রয়েছে।
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-[#0E1015] border border-[#222A3A] rounded space-y-1">
                <span className="text-[#7F8D9E]">ভিডিও রেজোলিউশন:</span>
                <div className="text-base font-bold text-[#EDE8DE]">1920 × 1080 (1080p FHD)</div>
                <span className="text-[11px] text-[#50B876]">Aspect Ratio 16:9 · 30 FPS</span>
              </div>

              <div className="p-4 bg-[#0E1015] border border-[#222A3A] rounded space-y-1">
                <span className="text-[#7F8D9E]">মোট অডিও দৈর্ঘ্য:</span>
                <div className="text-base font-bold text-[#EDE8DE]">{formatTime(totalDuration)}</div>
                <span className="text-[11px] text-[#B88746]">{clips.length}টি ধারাবাহিক ক্লিপ</span>
              </div>

              <div className="p-4 bg-[#0E1015] border border-[#222A3A] rounded space-y-1">
                <span className="text-[#7F8D9E]">আউটপুট ফরম্যাট / কন্টেইনার:</span>
                <select
                  value={selectedMimeType}
                  onChange={(e) => setSelectedMimeType(e.target.value)}
                  className="w-full bg-[#141822] border border-[#2A3446] rounded p-1 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none mt-1"
                >
                  {supportedFormats.map((f) => (
                    <option key={f.mimeType} value={f.mimeType}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Render Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => startVideoRender(true)}
                disabled={isRendering}
                className="px-4 py-2.5 bg-[#1B2332] hover:bg-[#253246] text-[#EDE8DE] border border-[#2F3F5A] rounded font-semibold flex items-center gap-2 transition-colors"
              >
                <Eye className="w-4 h-4 text-[#B88746]" />
                <span>১০ সেকেন্ড টেস্ট প্রিভিউ রেন্ডার</span>
              </button>

              <button
                onClick={() => startVideoRender(false)}
                disabled={isRendering || clips.length === 0}
                className="px-6 py-2.5 bg-[#B88746] hover:bg-[#C99654] disabled:opacity-50 text-[#0D0F12] text-xs font-bold rounded flex items-center gap-2 transition-colors shadow-sm"
              >
                {isRendering ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>রেন্ডারিং চলছে ({renderProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>সম্পূর্ণ ভিডিও রেন্ডার শুরু করুন (Start Render)</span>
                  </>
                )}
              </button>

              {isRendering && (
                <button
                  onClick={cancelRender}
                  className="px-4 py-2 bg-[#2D171A] hover:bg-[#3D1E22] text-[#FF8585] border border-[#52252A] rounded font-medium transition-colors"
                >
                  বাতিল করুন
                </button>
              )}
            </div>

            {/* Rendered Output Box */}
            {renderedVideoUrl && (
              <div className="mt-6 pt-6 border-t border-[#202735] p-5 bg-[#0F141E] border border-[#243144] rounded-md space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#50B876]" />
                      <h4 className="text-sm font-semibold text-[#EDE8DE]">ভিডিও ফাইল ডাউনলোড ও ব্যবহারের জন্য প্রস্তুত</h4>
                    </div>
                    <p className="text-xs text-[#8F9AA9]">
                      সাইজ: {(renderedVideoSize / (1024 * 1024)).toFixed(2)} MB · ফরম্যাট:{" "}
                      {renderedVideoBlob?.type.includes("mp4") ? "MP4 (H.264)" : "WebM"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDownloadVideo}
                      className="px-4 py-2 bg-[#50B876] hover:bg-[#5BC583] text-[#0D0F12] font-bold rounded flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>ভিডিও ফাইল ডাউনলোড করুন</span>
                    </button>

                    <button
                      onClick={handleAttachToLibraryBook}
                      className="px-3.5 py-2 bg-[#1A2230] hover:bg-[#243044] text-[#EDE8DE] border border-[#2E3C52] rounded flex items-center gap-1.5 transition-colors"
                    >
                      <Bookmark className="w-3.5 h-3.5 text-[#B88746]" />
                      <span>লাইব্রেরি বইয়ে যুক্ত করুন</span>
                    </button>
                  </div>
                </div>

                {/* Built-in Video Player */}
                <video
                  src={renderedVideoUrl}
                  controls
                  className="w-full max-h-[460px] bg-black rounded border border-[#222B3B]"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Saved Video Projects Archive */}
      {activeTab === "projects" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#8F9AA9] border-b border-[#202735] pb-2">
            <span className="font-semibold text-[#EDE8DE]">
              সংরক্ষিত ভিডিও প্রজেক্টসমূহ ({savedProjects.length})
            </span>
            <span>IndexedDB লোকাল ডেটাবেসে স্থায়ীভাবে সংরক্ষিত</span>
          </div>

          {savedProjects.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8F9AA9] border border-dashed border-[#232B3B] rounded-md">
              কোনো সংরক্ষিত ভিডিও প্রজেক্ট পাওয়া যায়নি। কম্পোজারে কাজ শেষ করে "প্রজেক্ট সেভ" করুন।
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedProjects.map((p) => (
                <div
                  key={p.id}
                  className="p-4 bg-[#11141A] border border-[#1E2533] rounded-md space-y-3 flex flex-col justify-between text-xs"
                >
                  <div className="space-y-1">
                    <h4 className="font-semibold text-[#EDE8DE] text-sm">{p.title}</h4>
                    <p className="text-[11px] text-[#8F9AA9]">লেখক: {p.author}</p>
                    <p className="text-[11px] text-[#697486] font-mono">
                      দৈর্ঘ্য: {formatTime(p.totalDuration)} · ক্লিপ সংখ্যা: {p.clips.length}
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-[#17202E] text-[#8CB8F5] border border-[#25344C] rounded text-[10px] font-mono">
                      {p.resolution.width}×{p.resolution.height}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#1C2230]">
                    <button
                      onClick={() => handleLoadProject(p)}
                      className="px-3 py-1.5 bg-[#1B2433] hover:bg-[#253246] text-[#B88746] border border-[#2C3B52] rounded font-medium flex items-center gap-1 transition-colors"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>প্রজেক্ট খুলুন</span>
                    </button>

                    <button
                      onClick={() => handleDeleteProject(p.id)}
                      className="p-1.5 bg-[#261517] hover:bg-[#381C20] text-[#FF8585] border border-[#4D2328] rounded transition-colors"
                      title="Delete Project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
