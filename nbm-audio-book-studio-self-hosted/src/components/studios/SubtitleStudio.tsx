import React, { useState } from "react";
import {
  Subtitles,
  Upload,
  Download,
  Plus,
  Trash2,
  Clock,
  Play,
  RotateCcw,
  Sparkles,
  FileText,
  Split,
} from "lucide-react";
import { SubtitleCue } from "../../types";
import {
  parseSrt,
  exportToSrt,
  exportToVtt,
  formatTimeSrt,
  downloadTextFile,
} from "../../services/subtitleService";

export const SubtitleStudio: React.FC = () => {
  const [cues, setCues] = useState<SubtitleCue[]>([]);

  const [activeCueId, setActiveCueId] = useState<string>("");
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const maxDuration = Math.max(15, ...cues.map((cue) => cue.endTime));

  // Playback timer simulation
  React.useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setPlaybackTime((prev) => {
        const next = prev + 0.1;
        if (next > maxDuration) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, maxDuration]);

  const handleImportSrt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseSrt(reader.result as string);
      if (parsed.length > 0) {
        setCues(parsed);
        setActiveCueId(parsed[0].id);
        setPlaybackTime(0);
      }
    };
    reader.readAsText(file);
  };

  const handleAddCue = () => {
    const last = cues[cues.length - 1];
    const newStart = last ? last.endTime + 0.5 : 0;
    const newEnd = newStart + 3.0;

    const newCue: SubtitleCue = {
      id: `cue-${Date.now()}`,
      index: cues.length + 1,
      startTime: Math.round(newStart * 10) / 10,
      endTime: Math.round(newEnd * 10) / 10,
      text: "New dialogue subtitle cue...",
      translatedText: "নতুন সাবটাইটেল বাক্য...",
    };
    setCues([...cues, newCue]);
    setActiveCueId(newCue.id);
  };

  const handleUpdateCue = (id: string, updates: Partial<SubtitleCue>) => {
    setCues(cues.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const handleDeleteCue = (id: string) => {
    setCues(cues.filter((c) => c.id !== id));
  };

  const handleExportSrt = () => {
    const srt = exportToSrt(cues);
    downloadTextFile(srt, "subtitles.srt");
  };

  const handleExportVtt = () => {
    const vtt = exportToVtt(cues);
    downloadTextFile(vtt, "subtitles.vtt");
  };

  // Find currently active cue during playback
  const currentActiveCue = cues.find((c) => playbackTime >= c.startTime && playbackTime <= c.endTime);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#B88746]">
            <Subtitles className="w-4 h-4" />
            <span className="font-semibold uppercase tracking-wider">Timed Text & Subtitle Studio</span>
            <span aria-hidden="true">·</span>
            <span>SRT / VTT Literary Dual-Language</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-[#F4EFE6]">Subtitle Studio</h1>
          <p className="text-xs text-[#8F9AA9] mt-0.5 font-editorial text-sm">
            Synchronize timestamps, preview bilingual subtitle burning, split lines, and export valid SRT/VTT captions.
          </p>
        </div>

        {/* Import/Export buttons */}
        <div className="flex items-center gap-2">
          <label className="px-3 py-2 bg-[#181D26] hover:bg-[#222938] text-[#D8CFBF] border border-[#2B3547] text-xs font-medium rounded flex items-center gap-1.5 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>Import SRT/VTT</span>
            <input type="file" accept=".srt,.vtt,.txt" onChange={handleImportSrt} className="hidden" />
          </label>
          <button
            onClick={handleExportSrt}
            className="px-3 py-2 bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12] text-xs font-semibold rounded flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export .SRT</span>
          </button>
          <button
            onClick={handleExportVtt}
            className="px-3 py-2 bg-[#181D26] hover:bg-[#222938] text-[#D8CFBF] border border-[#2B3547] text-xs font-medium rounded flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export .VTT</span>
          </button>
        </div>
      </div>

      {/* Screen Preview Theater */}
      <div className="bg-[#0B0D11] border border-[#202735] rounded-md p-8 flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden">
        <div className="text-xs text-[#6F7C90] absolute top-4 left-4 font-mono">
          Virtual Display (Time: {playbackTime.toFixed(1)}s)
        </div>

        {/* Live Subtitle Overlay Display */}
        {currentActiveCue ? (
          <div className="text-center space-y-2 max-w-2xl px-6 py-3 bg-[#11141A]/90 backdrop-blur-md rounded border border-[#273042] shadow-xl">
            <div className="text-sm font-semibold text-[#EDE8DE]">{currentActiveCue.text}</div>
            {currentActiveCue.translatedText && (
              <div className="text-base text-[#FFE5A3] font-editorial">{currentActiveCue.translatedText}</div>
            )}
          </div>
        ) : (
          <div className="text-xs text-[#4A5468] italic font-editorial">
            [No active subtitle cue at current timestamp]
          </div>
        )}

        {/* Scrub Bar */}
        <div className="absolute bottom-4 left-6 right-6 flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 bg-[#B88746] text-[#0D0F12] rounded transition-colors"
          >
            {isPlaying ? <span className="text-[10px] font-bold px-1">PAUSE</span> : <Play className="w-3.5 h-3.5 fill-current" />}
          </button>
          <button
            onClick={() => setPlaybackTime(0)}
            className="p-1.5 bg-[#181D26] text-[#7F8D9E] hover:text-[#EDE8DE] rounded"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <input
            type="range"
            min="0"
            max={maxDuration}
            step="0.1"
            value={playbackTime}
            onChange={(e) => setPlaybackTime(parseFloat(e.target.value))}
            className="flex-1 accent-[#B88746]"
          />
        </div>
      </div>

      {/* Subtitles Cue List */}
      <div className="bg-[#12151C] border border-[#202735] p-5 rounded-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-wider text-[#B88746]">
            Subtitle Cues & Timecodes ({cues.length})
          </h3>
          <button
            onClick={handleAddCue}
            className="px-3 py-1.5 bg-[#181D26] hover:bg-[#222938] text-[#EDE8DE] border border-[#2B3547] text-xs font-medium rounded flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[#B88746]" />
            <span>Add Cue</span>
          </button>
        </div>

        <div className="space-y-3">
          {cues.map((cue, idx) => (
            <div
              key={cue.id}
              className={`p-4 rounded-md border text-xs transition-colors space-y-3 ${
                activeCueId === cue.id
                  ? "bg-[#161B24] border-[#B88746]"
                  : "bg-[#0E1015] border-[#1F2636] hover:border-[#2C374D]"
              }`}
              onClick={() => setActiveCueId(cue.id)}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[#6E7B8E]">#{idx + 1}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-[#8F9AA9]">Start:</span>
                    <input
                      type="number"
                      step="0.1"
                      value={cue.startTime}
                      onChange={(e) =>
                        handleUpdateCue(cue.id, { startTime: parseFloat(e.target.value) || 0 })
                      }
                      className="w-16 bg-[#0B0D11] border border-[#232B3B] rounded px-1.5 py-0.5 text-[#EDE8DE] text-center"
                    />
                    <span className="text-[#6E7B8E]">→</span>
                    <span className="text-[#8F9AA9]">End:</span>
                    <input
                      type="number"
                      step="0.1"
                      value={cue.endTime}
                      onChange={(e) =>
                        handleUpdateCue(cue.id, { endTime: parseFloat(e.target.value) || 0 })
                      }
                      className="w-16 bg-[#0B0D11] border border-[#232B3B] rounded px-1.5 py-0.5 text-[#EDE8DE] text-center"
                    />
                    <span className="text-[#59667E] text-[11px]">
                      ({Math.round((cue.endTime - cue.startTime) * 10) / 10}s)
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCue(cue.id);
                  }}
                  className="text-[#647085] hover:text-[#E66262]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[#7F8D9E] mb-1">Source Line:</label>
                  <input
                    type="text"
                    value={cue.text}
                    onChange={(e) => handleUpdateCue(cue.id, { text: e.target.value })}
                    className="w-full bg-[#0B0D11] border border-[#232B3B] rounded px-3 py-1.5 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#7F8D9E] mb-1">Bilingual Translation:</label>
                  <input
                    type="text"
                    value={cue.translatedText || ""}
                    onChange={(e) => handleUpdateCue(cue.id, { translatedText: e.target.value })}
                    className="w-full bg-[#0B0D11] border border-[#232B3B] rounded px-3 py-1.5 text-[#EDE8DE] font-editorial focus:border-[#B88746] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
