import React, { useState } from "react";
import {
  FileCode2,
  Sparkles,
  Copy,
  Check,
  Download,
  Trash2,
  Calculator,
  RefreshCw,
  Clock,
  Type,
} from "lucide-react";
import { downloadTextFile } from "../../services/subtitleService";

export const FileConverterStudio: React.FC = () => {
  const [activeTool, setActiveTool] = useState<"cleaner" | "counter" | "youtube" | "calculator">("cleaner");

  // Text Cleaner State
  const [rawText, setRawText] = useState<string>("");
  const [cleanedText, setCleanedText] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  // Word Counter Stats
  const wordCount = rawText.split(/\s+/).filter(Boolean).length;
  const charCount = rawText.length;
  const sentenceCount = rawText.split(/[।!?\.]/).filter((s) => s.trim().length > 0).length;
  const readingTimeMin = Math.max(1, Math.round((wordCount / 200) * 10) / 10);
  const narrationTimeMin = Math.max(1, Math.round((wordCount / 140) * 10) / 10);

  // YouTube Chapter Generator State
  const [ytRawChapters, setYtRawChapters] = useState<string>("");
  const formattedChapters = ytRawChapters
    .split(/\r?\n/)
    .map((line) => {
      const match = line.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{2})\s+(.+)$/);
      if (!match) return null;
      const hours = Number(match[1] || 0);
      const minutes = Number(match[2]);
      const seconds = Number(match[3]);
      if (minutes > 59 || seconds > 59) return null;
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      const normalized = `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
      return { totalSeconds, text: `${normalized} ${match[4].trim()}` };
    })
    .filter((entry): entry is { totalSeconds: number; text: string } => Boolean(entry));
  const formattedChapterText = formattedChapters.map((entry) => entry.text).join("\n");

  // Bitrate Video Size Estimator
  const [calcMinutes, setCalcMinutes] = useState<number>(30);
  const [calcBitrateMbps, setCalcBitrateMbps] = useState<number>(8); // 8 Mbps for 1080p
  const estimatedMb = Math.round(((calcMinutes * 60 * calcBitrateMbps) / 8) * 10) / 10;

  const handleCleanText = () => {
    let result = rawText;
    // Normalize newlines
    result = result.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    // Normalize unicode quotes
    result = result.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
    // Remove duplicate consecutive spaces
    result = result.replace(/[ \t]+/g, " ");
    // Remove duplicate consecutive empty lines
    result = result.replace(/\n{3,}/g, "\n\n");
    // Trim line edges
    result = result
      .split("\n")
      .map((l) => l.trim())
      .join("\n");
    // Remove duplicate consecutive identical lines
    const lines = result.split("\n");
    const uniqueLines: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (i === 0 || lines[i] !== lines[i - 1] || lines[i] === "") {
        uniqueLines.push(lines[i]);
      }
    }
    result = uniqueLines.join("\n").trim();
    setCleanedText(result);
  };

  const handleCopyCleaned = () => {
    navigator.clipboard.writeText(cleanedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Studio Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-[#B88746]">
          <FileCode2 className="w-4 h-4" />
          <span className="font-semibold uppercase tracking-wider">Literary Utilities & Data Conversions</span>
          <span aria-hidden="true">·</span>
          <span>Offline Processing Suite</span>
        </div>
        <h1 className="text-2xl font-display font-bold text-[#F4EFE6]">File Converter & Literary Tools</h1>
        <p className="text-xs text-[#8F9AA9] mt-0.5 font-editorial text-sm">
          Precision tools for OCR cleanup, duplicate line removal, reading pace estimation, and YouTube timestamp formatting.
        </p>
      </div>

      {/* Utility Nav Tabs */}
      <div className="flex items-center gap-2 border-b border-[#202735] pb-2 text-xs">
        <button
          onClick={() => setActiveTool("cleaner")}
          className={`px-4 py-2 rounded-t font-semibold transition-colors flex items-center gap-2 ${
            activeTool === "cleaner"
              ? "bg-[#181D26] text-[#F5EFE6] border-b-2 border-[#B88746]"
              : "text-[#8692A6] hover:text-[#EDE8DE]"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#B88746]" />
          <span>OCR & Text Cleaner</span>
        </button>

        <button
          onClick={() => setActiveTool("counter")}
          className={`px-4 py-2 rounded-t font-semibold transition-colors flex items-center gap-2 ${
            activeTool === "counter"
              ? "bg-[#181D26] text-[#F5EFE6] border-b-2 border-[#B88746]"
              : "text-[#8692A6] hover:text-[#EDE8DE]"
          }`}
        >
          <Type className="w-3.5 h-3.5 text-[#B88746]" />
          <span>Word & Narration Pace Analyzer</span>
        </button>

        <button
          onClick={() => setActiveTool("youtube")}
          className={`px-4 py-2 rounded-t font-semibold transition-colors flex items-center gap-2 ${
            activeTool === "youtube"
              ? "bg-[#181D26] text-[#F5EFE6] border-b-2 border-[#B88746]"
              : "text-[#8692A6] hover:text-[#EDE8DE]"
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-[#B88746]" />
          <span>YouTube Chapter Formatter</span>
        </button>

        <button
          onClick={() => setActiveTool("calculator")}
          className={`px-4 py-2 rounded-t font-semibold transition-colors flex items-center gap-2 ${
            activeTool === "calculator"
              ? "bg-[#181D26] text-[#F5EFE6] border-b-2 border-[#B88746]"
              : "text-[#8692A6] hover:text-[#EDE8DE]"
          }`}
        >
          <Calculator className="w-3.5 h-3.5 text-[#B88746]" />
          <span>Video File Size Calculator</span>
        </button>
      </div>

      {/* Tool 1: OCR & Text Cleaner */}
      {activeTool === "cleaner" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between text-[#8F9AA9]">
              <span className="font-semibold text-[#EDE8DE]">Input Dirty / Scanned Text:</span>
              <span>{rawText.length} characters</span>
            </div>
            <textarea
              rows={14}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste raw OCR text with irregular breaks, carriage returns, or duplicates..."
              className="w-full bg-[#0E1117] border border-[#222938] rounded-md p-4 font-editorial text-[14px] leading-relaxed text-[#EDE8DE] focus:border-[#B88746] focus:outline-none resize-none"
            />
            <button
              onClick={handleCleanText}
              className="w-full py-2.5 bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12] font-semibold rounded flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>Clean Typography & Remove Duplicate Lines</span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between text-[#8F9AA9]">
              <span className="font-semibold text-[#EDE8DE]">Normalized Output:</span>
              {cleanedText && (
                <button
                  onClick={handleCopyCleaned}
                  className="text-[#B88746] hover:underline flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#50B876]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy Output"}</span>
                </button>
              )}
            </div>
            <textarea
              readOnly
              rows={14}
              value={cleanedText}
              placeholder="Click 'Clean Typography' on the left to generate clean, normalized prose..."
              className="w-full bg-[#0E1117] border border-[#222938] rounded-md p-4 font-editorial text-[14px] leading-relaxed text-[#C9BFAD] focus:outline-none resize-none"
            />
            {cleanedText && (
              <button
                onClick={() => downloadTextFile(cleanedText, "cleaned_manuscript.txt")}
                className="w-full py-2.5 bg-[#181D26] hover:bg-[#222938] text-[#D8CFBF] border border-[#283244] font-medium rounded flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Cleaned File (.TXT)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tool 2: Word & Narration Pace Analyzer */}
      {activeTool === "counter" && (
        <div className="space-y-6 text-xs">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 bg-[#12151C] border border-[#202735] rounded-md">
              <span className="text-[#7F8D9E]">Total Words</span>
              <div className="text-2xl font-bold text-[#F4EFE6] font-display mt-1">{wordCount}</div>
            </div>
            <div className="p-4 bg-[#12151C] border border-[#202735] rounded-md">
              <span className="text-[#7F8D9E]">Characters</span>
              <div className="text-2xl font-bold text-[#F4EFE6] font-display mt-1">{charCount}</div>
            </div>
            <div className="p-4 bg-[#12151C] border border-[#202735] rounded-md">
              <span className="text-[#7F8D9E]">Sentences</span>
              <div className="text-2xl font-bold text-[#F4EFE6] font-display mt-1">{sentenceCount}</div>
            </div>
            <div className="p-4 bg-[#12151C] border border-[#202735] rounded-md">
              <span className="text-[#7F8D9E]">Silent Reading Time</span>
              <div className="text-2xl font-bold text-[#50B876] font-display mt-1">~{readingTimeMin} min</div>
              <span className="text-[10px] text-[#556377]">@ 200 WPM</span>
            </div>
            <div className="p-4 bg-[#12151C] border border-[#202735] rounded-md">
              <span className="text-[#7F8D9E]">Audiobook Narration</span>
              <div className="text-2xl font-bold text-[#B88746] font-display mt-1">~{narrationTimeMin} min</div>
              <span className="text-[10px] text-[#556377]">@ 140 WPM pace</span>
            </div>
          </div>

          <textarea
            rows={10}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Type or paste prose here to compute instant reading and audiobook pacing metrics..."
            className="w-full bg-[#0E1117] border border-[#222938] rounded-md p-4 font-editorial text-[14px] leading-relaxed text-[#EDE8DE] focus:border-[#B88746] focus:outline-none resize-none"
          />
        </div>
      )}

      {/* Tool 3: YouTube Chapter Formatter */}
      {activeTool === "youtube" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-3">
            <span className="font-semibold text-[#EDE8DE]">Timestamp List:</span>
            <textarea
              rows={10}
              value={ytRawChapters}
              onChange={(e) => setYtRawChapters(e.target.value)}
              className="w-full bg-[#0E1117] border border-[#222938] rounded-md p-4 font-mono leading-relaxed text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
            />
          </div>

          <div className="space-y-3 bg-[#12151C] border border-[#202735] p-5 rounded-md manuscript-paper">
            <span className="font-semibold text-[#EDE8DE]">YouTube Formatted Description Block:</span>
            <div className="bg-[#0A0C10] p-4 rounded border border-[#1A202C] font-mono text-[11px] text-[#B9C4D5] leading-relaxed whitespace-pre-wrap">
              {formattedChapterText || "Enter one chapter per line, e.g. 00:00 Introduction"}
            </div>
            {ytRawChapters.trim() && formattedChapters.length === 0 && (
              <p role="alert" className="text-[#F3A5A5]">No valid chapter lines found. Use MM:SS or HH:MM:SS followed by a title.</p>
            )}
            <button
              disabled={formattedChapters.length === 0}
              onClick={() => {
                navigator.clipboard.writeText(formattedChapterText);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="px-4 py-2 bg-[#B88746] hover:bg-[#C99654] disabled:opacity-40 text-[#0D0F12] font-semibold rounded flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy YouTube Timestamps"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tool 4: Video File Size Calculator */}
      {activeTool === "calculator" && (
        <div className="bg-[#12151C] border border-[#202735] p-6 rounded-md max-w-xl space-y-4 text-xs manuscript-paper">
          <h3 className="font-mono uppercase tracking-wider text-[#B88746]">
            Video Bitrate & File Size Estimator
          </h3>

          <div>
            <label className="block text-[#8F9AA9] mb-1">Video Duration (Minutes):</label>
            <input
              type="number"
              value={calcMinutes}
              onChange={(e) => setCalcMinutes(parseFloat(e.target.value) || 1)}
              className="w-full bg-[#0D0F14] border border-[#232B3B] rounded p-2 text-[#EDE8DE] font-mono"
            />
          </div>

          <div>
            <label className="block text-[#8F9AA9] mb-1">Target Bitrate (Mbps):</label>
            <select
              value={calcBitrateMbps}
              onChange={(e) => setCalcBitrateMbps(parseFloat(e.target.value))}
              className="w-full bg-[#0D0F14] border border-[#232B3B] rounded p-2 text-[#EDE8DE] font-mono"
            >
              <option value="4">4 Mbps (720p / Lightweight)</option>
              <option value="8">8 Mbps (1080p Standard YouTube)</option>
              <option value="12">12 Mbps (1080p High Quality Audiogram)</option>
              <option value="20">20 Mbps (4K Archive Master)</option>
            </select>
          </div>

          <div className="p-4 bg-[#0A0C10] rounded border border-[#1A202C] flex items-center justify-between">
            <span className="text-[#8F9AA9]">Estimated File Size:</span>
            <span className="text-xl font-bold text-[#B88746] font-mono">{estimatedMb} MB</span>
          </div>
        </div>
      )}
    </div>
  );
};
