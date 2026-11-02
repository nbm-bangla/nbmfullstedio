import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, RotateCcw, Download } from "lucide-react";

interface WaveformVisualizerProps {
  peaks?: number[];
  audioUrl?: string;
  duration?: number;
  height?: number;
  color?: string;
  progressColor?: string;
  title?: string;
  filename?: string;
  onTimeUpdate?: (currentTime: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  peaks,
  audioUrl,
  duration = 180,
  height = 70,
  color = "#364153",
  progressColor = "#B88746",
  title,
  filename = "narration_audio.wav",
  onTimeUpdate,
  onPlayStateChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [realDuration, setRealDuration] = useState<number>(duration);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // Sync realDuration if duration prop changes and audio metadata is not yet loaded
  useEffect(() => {
    if (duration > 0 && !audioRef.current?.duration) {
      setRealDuration(duration);
    }
  }, [duration]);

  // Generate realistic default peaks if none provided
  const displayPeaks = React.useMemo(() => {
    if (peaks && peaks.length > 0) return peaks;
    const count = 100;
    const arr: number[] = [];
    for (let i = 0; i < count; i++) {
      const v = Math.sin(i * 0.15) * 0.35 + Math.cos(i * 0.32) * 0.25 + 0.35;
      arr.push(Math.max(0.12, Math.min(0.95, v + (Math.random() * 0.1 - 0.05))));
    }
    return arr;
  }, [peaks]);

  useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.playbackRate = playbackSpeed;

    audio.onloadedmetadata = () => {
      if (audio.duration && Number.isFinite(audio.duration) && audio.duration > 0) {
        setRealDuration(audio.duration);
      }
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdate?.(audio.currentTime);
    };

    audio.onended = () => {
      setIsPlaying(false);
      onPlayStateChange?.(false);
      setCurrentTime(0);
    };

    audio.onerror = () => {
      setIsPlaying(false);
      onPlayStateChange?.(false);
    };

    return () => {
      audio.pause();
      audioRef.current = null;
      playPromiseRef.current = null;
    };
  }, [audioUrl, onTimeUpdate, onPlayStateChange, playbackSpeed]);

  const togglePlay = async () => {
    if (audioRef.current) {
      if (isPlaying) {
        // Wait for active play promise to prevent interruption error
        if (playPromiseRef.current) {
          try {
            await playPromiseRef.current;
          } catch {
            // ignore
          }
        }
        audioRef.current.pause();
        setIsPlaying(false);
        onPlayStateChange?.(false);
      } else {
        try {
          audioRef.current.playbackRate = playbackSpeed;
          playPromiseRef.current = audioRef.current.play();
          setIsPlaying(true);
          onPlayStateChange?.(true);
          await playPromiseRef.current;
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          if (!errMsg.includes("interrupted by a call to pause")) {
            console.error("Playback error:", err);
          }
          setIsPlaying(false);
          onPlayStateChange?.(false);
        } finally {
          playPromiseRef.current = null;
        }
      }
    } else {
      setIsPlaying(!isPlaying);
      onPlayStateChange?.(!isPlaying);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const target = ratio * realDuration;
    setCurrentTime(target);
    if (audioRef.current) {
      audioRef.current.currentTime = target;
    }
    onTimeUpdate?.(target);
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = filename.endsWith(".wav") ? filename : `${filename}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatSeconds = (sec: number) => {
    const safeSec = Math.max(0, isNaN(sec) ? 0 : sec);
    const mins = Math.floor(safeSec / 60);
    const s = Math.floor(safeSec % 60);
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  const progressFraction = realDuration > 0 ? currentTime / realDuration : 0;

  return (
    <div className="bg-[#12151C] border border-[#232938] rounded-md p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#9DA8BC]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#EDE8DE]">{title || "Audio Preview"}</span>
          <span className="px-1.5 py-0.5 bg-[#1B212D] text-[#50B876] border border-[#283830] rounded font-mono text-[10px]">
            24kHz PCM WAV
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-[#AAB4C4]">
            {formatSeconds(currentTime)} / {formatSeconds(realDuration)}
          </span>
          {audioUrl && (
            <button
              onClick={handleDownload}
              className="px-2.5 py-1 bg-[#1A261E] hover:bg-[#253A2C] text-[#50B876] hover:text-[#7DE8A1] border border-[#2B4E38] rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              title="ডাউনলোড করুন .wav ফাইল"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ডাউনলোড (.wav)</span>
            </button>
          )}
        </div>
      </div>

      {/* Waveform timeline bars */}
      <div
        ref={containerRef}
        onClick={handleSeek}
        className="w-full relative cursor-pointer select-none bg-[#0E1015] rounded border border-[#1A1F29] px-2 py-2 flex items-center justify-between gap-[2px]"
        style={{ height: `${height}px` }}
      >
        {displayPeaks.map((peak, idx) => {
          const barFraction = idx / displayPeaks.length;
          const isPassed = barFraction <= progressFraction;
          return (
            <div
              key={idx}
              className="flex-1 rounded-[1px] transition-colors"
              style={{
                height: `${Math.max(4, peak * (height - 16))}px`,
                backgroundColor: isPassed ? progressColor : color,
              }}
            />
          );
        })}

        {/* Progress playhead needle */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-[#FFE1A8] shadow-[0_0_8px_#B88746] pointer-events-none"
          style={{ left: `${Math.min(100, Math.max(0, progressFraction * 100))}%` }}
        />
      </div>

      {/* Audio controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded bg-[#B88746] hover:bg-[#C79653] text-[#0D0F12] flex items-center justify-center font-bold transition-all shadow-sm active:scale-95"
            title={isPlaying ? "Pause" : "Play Narration"}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>
          <button
            onClick={() => {
              setCurrentTime(0);
              if (audioRef.current) audioRef.current.currentTime = 0;
            }}
            className="p-1.5 rounded hover:bg-[#1E2430] text-[#7F8D9E] hover:text-[#EDE8DE] transition-colors"
            title="প্রথম থেকে বাজান (Restart)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono text-[#EDE8DE]">
            {formatSeconds(currentTime)} <span className="text-[#59667E]">/</span> {formatSeconds(realDuration)}
          </span>
        </div>

        {/* Speed Controls & DSP indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#0E1015] border border-[#232B3B] p-0.5 rounded text-[11px] font-mono">
            {[0.8, 1.0, 1.25].map((spd) => (
              <button
                key={spd}
                onClick={() => handleSpeedChange(spd)}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  playbackSpeed === spd
                    ? "bg-[#B88746] text-[#0D0F12] font-bold"
                    : "text-[#8F9AA9] hover:text-[#EDE8DE]"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#8F9AA9]">
            <Volume2 className="w-3.5 h-3.5 text-[#B88746]" />
            <span className="text-[11px]">Web Audio DSP</span>
          </div>
        </div>
      </div>
    </div>
  );
};
