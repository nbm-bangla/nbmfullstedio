import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Download,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Sparkles,
  Music,
  Radio,
  Loader2,
} from "lucide-react";
import {
  ambienceSynthesizer,
  AMBIENCE_TRACKS,
  AmbienceType,
} from "../../services/ambienceSynthesizer";

interface FloatingAudioPlayerProps {
  audioUrl: string | null;
  title: string;
  narratorName?: string;
  isLoading?: boolean;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  continuousPlayback?: boolean;
  onToggleContinuous?: () => void;
  onEnded?: () => void;
  onDownload?: () => void;
  speed?: number;
  onSpeedChange?: (speed: number) => void;
}

export const FloatingAudioPlayer: React.FC<FloatingAudioPlayerProps> = ({
  audioUrl,
  title,
  narratorName = "Fenrir",
  isLoading = false,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
  continuousPlayback = true,
  onToggleContinuous,
  onEnded,
  onDownload,
  speed = 1.0,
  onSpeedChange,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1.0);

  // Ambience state
  const [isAmbienceOpen, setIsAmbienceOpen] = useState<boolean>(false);
  const [activeAmbience, setActiveAmbience] = useState<AmbienceType | null>(null);
  const [ambienceVol, setAmbienceVol] = useState<number>(0.35);

  // Load and mount audio
  useEffect(() => {
    if (!audioUrl) {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.playbackRate = speed;
    audio.volume = isMuted ? 0 : volume;

    audio.onloadedmetadata = () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setIsPlaying(false);
      ambienceSynthesizer.setDucking(false);
      onEnded?.();
    };

    audio.onerror = () => {
      setIsPlaying(false);
      ambienceSynthesizer.setDucking(false);
    };

    return () => {
      audio.pause();
      audioRef.current = null;
      playPromiseRef.current = null;
      ambienceSynthesizer.setDucking(false);
    };
  }, [audioUrl, speed, onEnded]);

  // Update speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  // Handle play/pause with safe playPromise
  const togglePlay = async () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      if (playPromiseRef.current) {
        try {
          await playPromiseRef.current;
        } catch {
          // ignore
        }
      }
      audioRef.current.pause();
      setIsPlaying(false);
      ambienceSynthesizer.setDucking(false);
    } else {
      try {
        audioRef.current.playbackRate = speed;
        audioRef.current.volume = isMuted ? 0 : volume;
        playPromiseRef.current = audioRef.current.play();
        setIsPlaying(true);
        ambienceSynthesizer.setDucking(true);
        await playPromiseRef.current;
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (!errMsg.includes("interrupted by a call to pause")) {
          console.error("Audio playback error:", err);
        }
        setIsPlaying(false);
        ambienceSynthesizer.setDucking(false);
      } finally {
        playPromiseRef.current = null;
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    setCurrentTime(target);
    if (audioRef.current) {
      audioRef.current.currentTime = target;
    }
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.volume = !isMuted ? 0 : volume;
    }
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    setIsMuted(false);
    if (audioRef.current) {
      audioRef.current.volume = v;
    }
  };

  // Ambience controls
  const handleSelectAmbience = (type: AmbienceType) => {
    if (activeAmbience === type) {
      ambienceSynthesizer.stop();
      setActiveAmbience(null);
    } else {
      ambienceSynthesizer.play(type);
      setActiveAmbience(type);
      ambienceSynthesizer.setDucking(isPlaying);
    }
  };

  const handleAmbienceVolume = (v: number) => {
    setAmbienceVol(v);
    ambienceSynthesizer.setVolume(v);
  };

  const formatTime = (sec: number) => {
    const safe = Math.max(0, isNaN(sec) ? 0 : sec);
    const m = Math.floor(safe / 60);
    const s = Math.floor(safe % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handlePlayButtonClick = () => {
    if (!audioUrl) {
      if (onDownload) {
        // Can trigger generation if provided
        return;
      }
      return;
    }
    togglePlay();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0E121A]/95 backdrop-blur-md border-t border-[#B88746]/40 shadow-2xl text-[#EDE8DE] px-4 py-3 select-none">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Track Information & Ambience Indicator */}
        <div className="flex items-center gap-3 w-full md:w-1/4 min-w-0">
          <div className="w-10 h-10 rounded-md bg-[#1B212D] border border-[#B88746]/40 flex items-center justify-center shrink-0 shadow-sm relative">
            <Radio className="w-5 h-5 text-[#B88746]" />
            {isPlaying && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#50B876] rounded-full animate-ping" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-semibold text-[#EDE8DE] truncate font-display">
              {title || "সাহিত্যিক কথন ও আবৃত্তি"}
            </h4>
            <div className="flex items-center gap-2 text-[11px] text-[#8F9AA9]">
              <span className="text-[#B88746] font-mono">{narratorName}</span>
              <span>·</span>
              <span>{audioUrl ? "24kHz WAV" : "টেক্সট থেকে স্পিচ প্রস্তুত করুন"}</span>
              {activeAmbience && (
                <>
                  <span>·</span>
                  <span className="text-[#50B876] flex items-center gap-1 font-mono">
                    <Music className="w-3 h-3" />
                    <span>সুর চালু</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center: Playback Controls & Scrubber */}
        <div className="flex flex-col items-center gap-1.5 w-full md:w-2/4">
          <div className="flex items-center gap-4">
            {/* Prev Button */}
            <button
              onClick={onPrev}
              disabled={!hasPrev || !audioUrl}
              className="p-1.5 text-[#8F9AA9] hover:text-[#EDE8DE] disabled:opacity-30 transition-colors"
              title="পূর্ববর্তী অংশ (Previous)"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={audioUrl ? togglePlay : undefined}
              disabled={isLoading || !audioUrl}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all shadow-md active:scale-95 ${
                audioUrl
                  ? "bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12]"
                  : "bg-[#202735] text-[#8F9AA9] cursor-not-allowed opacity-60"
              }`}
              title={
                !audioUrl
                  ? "অডিও তৈরি করতে উপরের 'সম্পূর্ণ অডিও তৈরি করুন' চাপুন"
                  : isPlaying
                  ? "বিরতি (Pause)"
                  : "বাজান (Play)"
              }
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-[#B88746]" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            {/* Next Button */}
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="p-1.5 text-[#8F9AA9] hover:text-[#EDE8DE] disabled:opacity-30 transition-colors"
              title="পরবর্তী অংশ (Next)"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Continuous Playback Toggle */}
            <button
              onClick={onToggleContinuous}
              className={`p-1.5 rounded transition-colors text-xs flex items-center gap-1 ${
                continuousPlayback
                  ? "text-[#B88746] bg-[#B88746]/10"
                  : "text-[#697486] hover:text-[#8F9AA9]"
              }`}
              title={continuousPlayback ? "একটানা পাঠ সক্রিয়" : "একটানা পাঠ বন্ধ"}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">একটানা পাঠ</span>
            </button>

            {/* Speed Selector */}
            <div className="flex items-center bg-[#0E1015] border border-[#232B3B] p-0.5 rounded text-[11px] font-mono">
              {[0.8, 1.0, 1.25].map((s) => (
                <button
                  key={s}
                  onClick={() => onSpeedChange?.(s)}
                  className={`px-1.5 py-0.5 rounded transition-colors ${
                    speed === s
                      ? "bg-[#B88746] text-[#0D0F12] font-bold"
                      : "text-[#8F9AA9] hover:text-[#EDE8DE]"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Scrubber Progress Bar */}
          <div className="w-full flex items-center gap-3">
            <span className="font-mono text-[11px] text-[#AAB4C4] w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration > 0 ? duration : 100}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-[#1B212D] accent-[#B88746] rounded cursor-pointer"
            />
            <span className="font-mono text-[11px] text-[#EDE8DE] w-10">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right: Download WAV, Ambience Soundscape & Volume */}
        <div className="flex items-center justify-end gap-3 w-full md:w-1/4">
          {/* Download Button - Always visible, enabled once audio is generated */}
          <button
            onClick={audioUrl && onDownload ? onDownload : undefined}
            disabled={!audioUrl || !onDownload}
            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm ${
              audioUrl && onDownload
                ? "bg-[#1A261E] hover:bg-[#253A2C] text-[#50B876] hover:text-[#7DE8A1] border border-[#2B4E38] active:scale-95 cursor-pointer"
                : "bg-[#141822] text-[#697486] border border-[#202735] opacity-50 cursor-not-allowed"
            }`}
            title={audioUrl ? "সম্পূর্ণ অডিও .wav ফাইল ডাউনলোড করুন" : "কথন তৈরি করার পর .wav ফাইল ডাউনলোড করতে পারবেন"}
          >
            <Download className="w-4 h-4" />
            <span>ডাউনলোড (.wav)</span>
          </button>

          {/* Ambience Soundscape Panel Toggle */}
          <div className="relative">
            <button
              onClick={() => setIsAmbienceOpen(!isAmbienceOpen)}
              className={`px-2.5 py-1.5 rounded text-xs border flex items-center gap-1.5 transition-colors ${
                activeAmbience
                  ? "bg-[#B88746]/20 border-[#B88746] text-[#E5C380]"
                  : "bg-[#141822] border-[#252E3E] text-[#8F9AA9] hover:text-[#EDE8DE]"
              }`}
              title="লাইভ আবহসুর ও সাউন্ডস্কেপ সিন্থেসাইজার"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#B88746]" />
              <span className="text-[11px] hidden sm:inline">আবহসুর</span>
            </button>

            {/* Ambience Dropdown Popover */}
            {isAmbienceOpen && (
              <div className="absolute right-0 bottom-full mb-2 w-72 bg-[#12161F] border border-[#2A3548] rounded-lg shadow-2xl p-4 space-y-3 z-50">
                <div className="flex items-center justify-between border-b border-[#222B3B] pb-2 text-xs">
                  <span className="font-bold text-[#EDE8DE] flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-[#B88746]" />
                    <span>লাইভ আবহসুর সিন্থেসাইজার</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#50B876]">Web Audio DSP</span>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {AMBIENCE_TRACKS.map((t) => {
                    const isActive = activeAmbience === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleSelectAmbience(t.id)}
                        className={`w-full text-left p-2 rounded transition-colors text-xs flex items-center justify-between border ${
                          isActive
                            ? "bg-[#1E2535] border-[#B88746] text-[#EDE8DE]"
                            : "bg-[#0E1117] border-[#1C2330] text-[#8F9AA9] hover:text-[#EDE8DE] hover:bg-[#141924]"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-[11px] text-[#EDE8DE] truncate">
                            {t.bengaliName}
                          </p>
                          <p className="text-[10px] text-[#697486] truncate">{t.description}</p>
                        </div>
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isActive ? "bg-[#50B876] animate-pulse" : "bg-[#252E3E]"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Ambience Volume Slider */}
                {activeAmbience && (
                  <div className="space-y-1 pt-2 border-t border-[#202735] text-[11px]">
                    <div className="flex items-center justify-between text-[#8F9AA9]">
                      <span>আবহসুর ভলিউম (Auto-Ducking সক্রিয়):</span>
                      <span className="font-mono text-[#B88746]">{Math.round(ambienceVol * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={ambienceVol}
                      onChange={(e) => handleAmbienceVolume(parseFloat(e.target.value))}
                      className="w-full h-1 bg-[#1A202C] accent-[#B88746] rounded cursor-pointer"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Master Volume */}
          <div className="hidden lg:flex items-center gap-2">
            <button
              onClick={handleToggleMute}
              className="text-[#8F9AA9] hover:text-[#EDE8DE] transition-colors"
              title={isMuted ? "শব্দ চালু" : "নিঃশব্দ"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-[#FF8585]" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-16 h-1 bg-[#1A202C] accent-[#B88746] rounded cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
