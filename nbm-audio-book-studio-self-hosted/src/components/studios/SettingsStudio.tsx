import React, { useState } from "react";
import {
  Settings2,
  CheckCircle2,
  AlertCircle,
  Shield,
  Download,
  Upload,
  Coins,
  Cpu,
  Lock,
  RefreshCw,
  Database,
} from "lucide-react";
import { ApiStatusResponse } from "../../services/apiClient";
import { Book, ProjectRecord, EditorialReview, ReaderReview } from "../../types";
import { downloadTextFile } from "../../services/subtitleService";

interface SettingsStudioProps {
  apiStatus: ApiStatusResponse;
  books: Book[];
  projects: ProjectRecord[];
  editorialReviews: EditorialReview[];
  readerReviews: ReaderReview[];
  onRestoreBackup: (data: {
    books?: Book[];
    projects?: ProjectRecord[];
    editorialReviews?: EditorialReview[];
    readerReviews?: ReaderReview[];
  }) => void;
  onRefreshStatus: () => void;
}

export const SettingsStudio: React.FC<SettingsStudioProps> = ({
  apiStatus,
  books,
  projects,
  editorialReviews,
  readerReviews,
  onRestoreBackup,
  onRefreshStatus,
}) => {
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState(false);

  const handleExportFullBackup = () => {
    const backup = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      studioName: "NBM Audio & Book Studio",
      books,
      projects,
      editorialReviews,
      readerReviews,
    };
    downloadTextFile(
      JSON.stringify(backup, null, 2),
      `nbm_studio_complete_backup_${new Date().toISOString().slice(0, 10)}.json`,
      "application/json"
    );
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreStatus(null);
    setRestoreError(false);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(reader.result as string);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Backup must be a JSON object.");
        const candidate = parsed as Record<string, unknown>;
        const fields = ["books", "projects", "editorialReviews", "readerReviews"] as const;
        const payload: Record<string, unknown[]> = {};
        for (const field of fields) {
          if (candidate[field] === undefined) continue;
          if (!Array.isArray(candidate[field]) || candidate[field].some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
            throw new Error(`Invalid ${field} list in backup.`);
          }
          payload[field] = candidate[field] as unknown[];
        }
        if (!fields.some((field) => field in payload)) throw new Error("This file has no NBM backup data.");
        onRestoreBackup(payload as Parameters<typeof onRestoreBackup>[0]);
        setRestoreStatus("Backup restored to this browser.");
      } catch (err) {
        setRestoreError(true);
        setRestoreStatus(err instanceof Error ? err.message : "Invalid JSON backup file.");
      } finally {
        e.target.value = "";
      }
    };
    reader.onerror = () => {
      setRestoreError(true);
      setRestoreStatus("Could not read the selected file.");
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Studio Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-[#B88746]">
          <Settings2 className="w-4 h-4" />
          <span className="font-semibold uppercase tracking-wider">System Architecture & Safeguards</span>
          <span aria-hidden="true">·</span>
          <span>Security & API Cost Management</span>
        </div>
        <h1 className="text-2xl font-display font-bold text-[#F4EFE6]">Settings & Safeguards</h1>
        <p className="text-xs text-[#8F9AA9] mt-0.5 font-editorial text-sm">
          Transparent distinction between zero-cost local Web Audio processing and paid API workloads, with full backup control.
        </p>
      </div>

      {/* Backend API Connection Status */}
      <div className="bg-[#12151C] border border-[#202735] p-6 rounded-md space-y-4 manuscript-paper">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[#EDE8DE]">Cloud AI Backend Architecture</h2>
              {apiStatus.hasApiKey ? (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-[#50B876]/40 bg-[#50B876]/10 text-[#50B876] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  CLOUD AI API READY
                </span>
              ) : (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-[#D49842]/40 bg-[#D49842]/10 text-[#D49842] flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  STANDALONE WORKSTATION MODE
                </span>
              )}
            </div>
            <p className="text-xs text-[#7F8D9E] font-editorial">
              Provider Engine: <span className="text-[#C9BFAD] font-sans font-medium">{apiStatus.provider}</span>
            </p>
          </div>

          <button
            onClick={onRefreshStatus}
            className="px-3.5 py-2 bg-[#181D26] hover:bg-[#222938] text-[#D8CFBF] border border-[#2A3447] text-xs font-medium rounded flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#B88746]" />
            <span>Check Backend Health</span>
          </button>
        </div>

        <div className="p-4 bg-[#0E1015] border border-[#1E2535] rounded text-xs space-y-2 text-[#9DA8BC]">
          <div className="flex items-center gap-2 text-[#EDE8DE] font-semibold">
            <Lock className="w-3.5 h-3.5 text-[#B88746]" />
            <span>Strict Server-Side Secret Management (সুরক্ষিত ব্যাকএন্ড)</span>
          </div>
          <p className="leading-relaxed">
            কোনো API Key কখনো ফ্রন্টএন্ড বা ব্রাউজারে প্রবেশ করে না। সার্ভারের <code className="text-[#B88746] font-mono">.env</code> ফাইল থেকে সরাসরি ব্যাকএন্ড (Node.js/Express) দ্বারা Gemini SDK কল পরিচালিত হয়। ফ্রন্টএন্ড শুধুমাত্র <code className="text-[#B88746] font-mono">/api/*</code> এন্ডপয়েন্টে রিকোয়েস্ট পাঠায়। <code className="text-[#B88746] font-mono">.gitignore</code> ফাইলে <code className="text-[#B88746] font-mono">.env*</code> অন্তর্ভুক্ত থাকায় কোনো গোপন তথ্য কোড রিপোজিটরিতে জমা হতে পারে না।
          </p>
        </div>
      </div>

      {/* Local vs Cloud Workload Transparency Table */}
      <div className="bg-[#12151C] border border-[#202735] p-6 rounded-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-[#B88746]" />
            <h2 className="text-sm font-semibold text-[#EDE8DE]">Cost & Execution Transparency Breakdown</h2>
          </div>
              <span className="text-[11px] text-[#7F8D9E] font-mono">Local and paid API work are identified separately</span>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-[#0E1015] text-[#7F8D9E] uppercase font-mono text-[10px] border-b border-[#202735]">
              <tr>
                <th className="p-3 pl-4">Creative Feature</th>
                <th className="p-3">Processing Engine</th>
                <th className="p-3">Cost Tier</th>
                <th className="p-3 pr-4">Safeguard Strategy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B212D]">
              <tr>
                <td className="p-3 pl-4 font-medium text-[#EDE8DE]">Audio Waveform & Peak DSP</td>
                <td className="p-3 text-[#A8B4C7]">Client Web Audio API</td>
                <td className="p-3 text-[#50B876] font-mono">Zero Cost ($0)</td>
                <td className="p-3 pr-4 text-[#7F8D9E]">Computed entirely in user's browser memory</td>
              </tr>
              <tr>
                <td className="p-3 pl-4 font-medium text-[#EDE8DE]">Audio Concatenation & Silence Insert</td>
                <td className="p-3 text-[#A8B4C7]">Web Audio Buffer Synthesizer</td>
                <td className="p-3 text-[#50B876] font-mono">Zero Cost ($0)</td>
                <td className="p-3 pr-4 text-[#7F8D9E]">Mastered to 16-bit PCM RIFF in browser</td>
              </tr>
              <tr>
                <td className="p-3 pl-4 font-medium text-[#EDE8DE]">Canvas Video & Audiogram Synth</td>
                <td className="p-3 text-[#A8B4C7]">HTML5 Canvas & MediaRecorder</td>
                <td className="p-3 text-[#50B876] font-mono">Zero Cost ($0)</td>
                <td className="p-3 pr-4 text-[#7F8D9E]">Client-side frame animation and WebM capture</td>
              </tr>
              <tr>
                <td className="p-3 pl-4 font-medium text-[#EDE8DE]">Thumbnail & Book Jacket Generator</td>
                <td className="p-3 text-[#A8B4C7]">HTML5 2D Canvas Engine</td>
                <td className="p-3 text-[#50B876] font-mono">Zero Cost ($0)</td>
                <td className="p-3 pr-4 text-[#7F8D9E]">Local rendering with system Unicode typography</td>
              </tr>
              <tr>
                <td className="p-3 pl-4 font-medium text-[#EDE8DE]">Subtitle SRT/VTT Formatting</td>
                <td className="p-3 text-[#A8B4C7]">JavaScript Subtitle Parser</td>
                <td className="p-3 text-[#50B876] font-mono">Zero Cost ($0)</td>
                <td className="p-3 pr-4 text-[#7F8D9E]">Client-side parsing and text downloads</td>
              </tr>
              <tr>
                <td className="p-3 pl-4 font-medium text-[#EDE8DE]">Scanned PDF & Manuscript OCR</td>
                <td className="p-3 text-[#A8B4C7]">Configured cloud AI model</td>
                <td className="p-3 text-[#D49842] font-mono">Cloud API (Optimized)</td>
                <td className="p-3 pr-4 text-[#7F8D9E]">Page-by-page batches with confidence filtering</td>
              </tr>
              <tr>
                <td className="p-3 pl-4 font-medium text-[#EDE8DE]">Unabridged Literary Translation</td>
                <td className="p-3 text-[#A8B4C7]">Configured cloud AI model</td>
                <td className="p-3 text-[#D49842] font-mono">Cloud API (Chunked)</td>
                <td className="p-3 pr-4 text-[#7F8D9E]">Chunk caching with omission detection QC</td>
              </tr>
              <tr>
                <td className="p-3 pl-4 font-medium text-[#EDE8DE]">AI Voice Narration</td>
                <td className="p-3 text-[#A8B4C7]">Configured cloud AI speech model</td>
                <td className="p-3 text-[#D49842] font-mono">Cloud Audio (Unary)</td>
                <td className="p-3 pr-4 text-[#7F8D9E]">4000-char safety bounds; fallback to browser speech</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Backup & Restore Section */}
      <div className="bg-[#12151C] border border-[#202735] p-6 rounded-md space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-[#B88746]" />
          <h2 className="text-sm font-semibold text-[#EDE8DE]">Database & Library Backup / Restore</h2>
        </div>
        <p className="text-xs text-[#7F8D9E]">
          Export your entire workstation state—including all catalogued books, chapter text, translation memory glossaries, active project queues, and reader reviews—as a single portable JSON file.
        </p>

        {restoreStatus && (
          <div role="status" className={`p-3 text-xs rounded ${restoreError ? "bg-[#2A1919] border border-[#653737] text-[#F3A5A5]" : "bg-[#18231E] border border-[#28483B] text-[#72E5A8]"}`}>
            {restoreStatus}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={handleExportFullBackup}
            className="px-4 py-2 bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12] text-xs font-semibold rounded flex items-center gap-2 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Download Full Workstation Backup (JSON)</span>
          </button>

          <label className="px-4 py-2 bg-[#181D26] hover:bg-[#222938] text-[#D8CFBF] border border-[#2A3447] text-xs font-medium rounded flex items-center gap-2 cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-[#B88746]" />
            <span>Restore from Backup File</span>
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
};
