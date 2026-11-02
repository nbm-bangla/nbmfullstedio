import React from "react";
import { BookOpen, Menu, X, CheckCircle2, ShieldCheck, Cpu } from "lucide-react";
import { ApiStatusResponse } from "../../services/apiClient";

interface HeaderProps {
  currentTab: string;
  apiStatus: ApiStatusResponse;
  onOpenSettings: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  apiStatus,
  onOpenSettings,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  const titlesMap: Record<string, { en: string; bn: string }> = {
    "command-center": { en: "Command Center", bn: "নিয়ন্ত্রণ কক্ষ ও ওভারভিউ" },
    "world-literature": { en: "World Literature Archive", bn: "বিশ্বসাহিত্য সংগ্রহ" },
    "pdf-ocr": { en: "PDF & OCR Studio", bn: "পিডিএফ ও পাণ্ডুলিপি স্ক্যানার" },
    "translation": { en: "Translation Studio", bn: "বহুভাষিক সাহিত্য অনুবাদ" },
    "book-review": { en: "Book Review Studio", bn: "গ্রন্থ পর্যালোচনা ও মূল্যায়ন" },
    "ai-voice": { en: "AI Voice & Narration", bn: "কণ্ঠ ও অডিওবুক আবৃত্তি" },
    "audio-studio": { en: "Audio Studio & Timeline", bn: "অডিও মিক্সিং ও সংকলন" },
    "video-studio": { en: "Video Studio & Waveform", bn: "ভিডিও ও অডিও ভিজ্যুয়ালাইজার" },
    "subtitle-studio": { en: "Subtitle Studio (SRT/VTT)", bn: "সাবটাইটেল সম্পাদক" },
    "thumbnail-studio": { en: "Thumbnail & Cover Studio", bn: "বইয়ের কভার ও থাম্বনেইল" },
    "library": { en: "Audio & Book Library", bn: "ডিজিটাল লাইব্রেরি ও সংরক্ষণাগার" },
    "publishing": { en: "Publishing & Distribution", bn: "প্রকাশনা ও ডিস্ট্রিবিউশন কিট" },
    "project-manager": { en: "Project Manager & Queue", bn: "প্রজেক্ট ট্র্যাকার ও ওয়ার্কফ্লো" },
    "file-converter": { en: "Utilities & Converter", bn: "সাহিত্যিক টেক্সট ও ফাইল টুলস" },
    "settings": { en: "Settings & API Safeguards", bn: "সেটিংস ও এপিআই ব্যবস্থাপনা" },
  };

  const current = titlesMap[currentTab] || { en: "Studio Workspace", bn: "সাহিত্য ওয়ার্কস্পেস" };

  return (
    <header className="h-16 border-b border-[#222733] bg-[#0E1014]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Toggle Menu Button */}
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded bg-[#151922] hover:bg-[#1E2432] text-[#E0D8CA] border border-[#2A3344] transition-colors flex items-center gap-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#B88746]"
          title={isSidebarOpen ? "মেনু বন্ধ করুন" : "মেনু খুলুন"}
          aria-label={isSidebarOpen ? "Close Menu" : "Open Menu"}
        >
          {isSidebarOpen ? <X className="w-4 h-4 text-[#B88746]" /> : <Menu className="w-4 h-4 text-[#B88746]" />}
          <span className="hidden sm:inline font-medium text-[11px] uppercase tracking-wider text-[#C9BFAD]">
            {isSidebarOpen ? "Close" : "Menu"}
          </span>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-sm bg-gradient-to-br from-[#B88746] to-[#785424] flex items-center justify-center text-[#0D0F12] shadow-sm shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs text-[#9B8C77]">
              <span className="tracking-widest uppercase font-semibold text-[10px]">NBM Studio</span>
              <span aria-hidden="true">/</span>
              <span className="text-[#D3C7B3] hidden sm:inline">{current.bn}</span>
            </div>
            <h1 className="text-sm font-semibold text-[#F4EFE6] tracking-tight">{current.en}</h1>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Real Backend / Server Status Indicator */}
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-2 px-3 py-1.5 text-xs rounded border border-[#2A3140] bg-[#14171E] hover:bg-[#1A1F29] text-[#C9BFAD] transition-colors"
          title="Server-side API architecture & local storage status"
        >
          {apiStatus.hasApiKey ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#50B876]" />
              <span className="font-medium text-[#E4DDCE]">Server AI</span>
              <span className="text-[#78849E] hidden sm:inline">·</span>
              <span className="text-[#899BB7] text-[11px] hidden sm:inline">Backend Active</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-[#B88746]" />
              <span className="font-medium text-[#E4DDCE]">Server Ready</span>
              <span className="text-[#78849E] hidden sm:inline">·</span>
              <span className="text-[#B88746] text-[11px] hidden sm:inline">Local Storage</span>
            </>
          )}
        </button>

        <div className="hidden md:flex items-center gap-2 text-xs text-[#899BB7]">
          <span>Web Audio DSP</span>
          <span aria-hidden="true">·</span>
          <span>16-bit PCM</span>
          <span aria-hidden="true">·</span>
          <span className="text-[#B88746]">v1.0 Workstation</span>
        </div>
      </div>
    </header>
  );
};
