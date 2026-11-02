import React, { useState } from "react";
import {
  SendHorizontal,
  Youtube,
  Share2,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Sparkles,
  FileCheck2,
  AlertCircle,
  Download,
} from "lucide-react";
import { Book, PublishingPackage } from "../../types";
import { downloadTextFile } from "../../services/subtitleService";

interface PublishingStudioProps {
  books: Book[];
}

export const PublishingStudio: React.FC<PublishingStudioProps> = ({ books }) => {
  const [selectedBookId, setSelectedBookId] = useState<string>(books[0]?.id || "nbm-book-001");
  const currentBook = books.find((b) => b.id === selectedBookId) || books[0];

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Initial publishing kit derived from book
  const [pkg, setPkg] = useState<PublishingPackage>({
    bookId: currentBook?.id || "nbm-book-001",
    bookTitle: currentBook?.title || "Gitanjali",
    author: currentBook?.author || "Rabindranath Tagore",
    youtubeTitle: "গীতাঞ্জলি — সম্পূর্ণ বাংলা অডিওবুক | Rabindranath Tagore | NBM Audio Studio",
    youtubeDescription: `বিশ্বকবি রবীন্দ্রনাথ ঠাকুরের নোবেলজয়ী অমর সৃষ্টি ‘গীতাঞ্জলি’ (Gitanjali) - শতবর্ষিকী বিশেষ পূর্ণাঙ্গ বাংলা অডিওবুক পাঠ।

কণ্ঠ: কোর ও জফির (NBM Audio Studio Literary Narration)
মূল রচনা: রবীন্দ্রনাথ ঠাকুর
ইংরেজি সমান্তরাল পাঠ ও অনুবাদ সমন্বয়: এনবিএম লিটারারি টিম
শব্দ পরিকল্পনা ও অডিও মাস্টারিং: NBM Audio Studio (24kHz 16-bit Master)

সময়রেখা / অধ্যায় বিভাজন (Timestamps):
00:00 - ভূমিকা ও গীত ১: আমার মাথা নত করে দাও
03:15 - গীত ২: তুমি যখন গান গাহিতে আদেশ কর
07:40 - গীত ৩: আমি কেবল গান গাহিতে আসিয়াছি
12:10 - গীত ৪: জীবনের জীবনে আমার তুমি বসিয়াছ

কপিরাইট তথ্য:
রবীন্দ্রনাথ ঠাকুরের রচনাবলী বৈশ্বিক পাবলিক ডোমেইনের (Public Domain) অন্তর্ভুক্ত। এই অডিও প্রযোজনা ও সাউন্ড রেকর্ডিং এনবিএম স্টুডিও কর্তৃক সংরক্ষিত।

#Gitanjali #RabindranathTagore #BengaliAudiobook #WorldLiterature #NBMAudioStudio`,
    youtubeTags: [
      "Gitanjali",
      "Rabindranath Tagore",
      "গীতাঞ্জলি",
      "রবীন্দ্রনাথ ঠাকুর",
      "Bengali Audiobook",
      "বাংলা অডিওবুক",
      "World Literature",
      "Nobel Prize Literature",
      "NBM Studio",
    ],
    chapterTimestamps: [
      { time: "00:00", title: "Song I: Thou hast made me endless" },
      { time: "03:15", title: "Song II: When thou commandest me to sing" },
      { time: "07:40", title: "Song III: I know not how thou singest" },
      { time: "12:10", title: "Song IV: Life of my life" },
    ],
    thumbnailHeadline: "গীতাঞ্জলি পূর্ণাঙ্গ পাঠ",
    thumbnailSubhead: "রবীন্দ্রনাথ ঠাকুর · সুর ও আবৃত্তি",
    facebookPost: `“আমার মাথা নত করে দাও হে তোমার চরণধূলার তলে...”

রবীন্দ্রনাথ ঠাকুরের নোবেলজয়ী অমর কাব্যগ্রন্থ ‘গীতাঞ্জলি’-র পূর্ণাঙ্গ বাংলা অডিওবুক এখন শুনুন আমাদের চ্যানেলে। মূল বাংলা সুর এবং বিশ্বসাহিত্যের প্রেক্ষাপটে এর গভীর দার্শনিক তাৎপর্য উন্মোচন করেছে NBM Audio Studio।

হেডফোন লাগিয়ে শুনুন এক অপার্থিব সাহিত্যিক অভিজ্ঞতা। 🎧📚
#Gitanjali #Tagore #BengaliLiterature #Audiobook`,
    promotionalCopy: "An immortal classic of mystical surrender and cosmic lyrical grace. Produced by NBM Studio with unabridged fidelity and cinematic acoustic mastering.",
    creditsBlock: `Original Author: ${currentBook?.author || "Rabindranath Tagore"}
Production: NBM Audio & Book Studio
Sound Mastering: 24kHz / 16-bit Linear PCM
Copyright Verification: Verified Public Domain Worldwide`,
    checklist: [
      { id: "c1", label: "Source manuscript verified against archival edition", checked: true },
      { id: "c2", label: "Translation paragraph-by-paragraph omission check passed", checked: true },
      { id: "c3", label: "Master audio normalized to broadcast standards (-16 LUFS)", checked: true },
      { id: "c4", label: "YouTube 16:9 thumbnail and safe-area checked", checked: true },
      { id: "c5", label: "Public Domain copyright status verified", checked: true },
      { id: "c6", label: "Dual-language SRT subtitles generated & synchronized", checked: true },
    ],
    status: "ready_for_distribution",
  });

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleChecklist = (id: string) => {
    const updated = pkg.checklist.map((c) => (c.id === id ? { ...c, checked: !c.checked } : c));
    setPkg({ ...pkg, checklist: updated });
  };

  const handleExportKit = () => {
    const content = `PUBLISHING KIT: ${pkg.bookTitle}\n=========================================\n\nYOUTUBE TITLE:\n${pkg.youtubeTitle}\n\nTAGS:\n${pkg.youtubeTags.join(", ")}\n\nTIMESTAMPS:\n${pkg.chapterTimestamps.map((t) => `${t.time} - ${t.title}`).join("\n")}\n\nYOUTUBE DESCRIPTION:\n${pkg.youtubeDescription}\n\nFACEBOOK POST:\n${pkg.facebookPost}\n\nCREDITS:\n${pkg.creditsBlock}\n`;
    downloadTextFile(content, `${pkg.bookTitle.replace(/\s+/g, "_")}_publishing_kit.txt`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#B88746]">
            <SendHorizontal className="w-4 h-4" />
            <span className="font-semibold uppercase tracking-wider">Publication & Media Distribution</span>
            <span aria-hidden="true">·</span>
            <span>Release Checklist & Metadata Kit</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-[#F4EFE6]">Publishing Studio</h1>
          <p className="text-xs text-[#8F9AA9] mt-0.5 font-editorial text-sm">
            Generate complete release packages for YouTube, social media blurbs, timestamp directories, and pre-flight verification checklists.
          </p>
        </div>

        {/* Book Selector & Export */}
        <div className="flex items-center gap-3">
          <select
            value={selectedBookId}
            onChange={(e) => setSelectedBookId(e.target.value)}
            className="bg-[#12151C] border border-[#242C3D] rounded px-3 py-1.5 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
          >
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportKit}
            className="px-4 py-2 bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12] text-xs font-semibold rounded flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Publishing Kit</span>
          </button>
        </div>
      </div>

      {/* Pre-Flight Release Checklist */}
      <div className="bg-[#12151C] border border-[#202735] p-5 rounded-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-[#B88746]" />
            <h3 className="text-xs font-semibold text-[#EDE8DE]">Pre-Flight Verification Checklist</h3>
          </div>
          <span className="font-mono text-xs text-[#50B876]">
            {pkg.checklist.filter((c) => c.checked).length} of {pkg.checklist.length} verified
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1 text-xs">
          {pkg.checklist.map((item) => (
            <label
              key={item.id}
              onClick={() => handleToggleChecklist(item.id)}
              className="flex items-center gap-2 p-2.5 bg-[#0E1015] border border-[#1E2535] rounded cursor-pointer hover:border-[#2D394E] transition-colors"
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => {}}
                className="accent-[#B88746]"
              />
              <span className={item.checked ? "text-[#C9BFAD]" : "text-[#7A8699]"}>{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Main Publishing Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: YouTube & Timestamps */}
        <div className="lg:col-span-7 space-y-5">
          {/* YouTube Title */}
          <div className="bg-[#12151C] border border-[#202735] p-5 rounded-md space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-[#E66262]">
                <Youtube className="w-4 h-4" />
                <span className="font-semibold text-[#EDE8DE]">YouTube Optimized Title</span>
              </div>
              <button
                onClick={() => handleCopy(pkg.youtubeTitle, "yt_title")}
                className="text-[#B88746] hover:underline"
              >
                {copiedKey === "yt_title" ? "Copied" : "Copy"}
              </button>
            </div>
            <input
              type="text"
              value={pkg.youtubeTitle}
              onChange={(e) => setPkg({ ...pkg, youtubeTitle: e.target.value })}
              className="w-full bg-[#0D0F14] border border-[#232B3B] rounded p-2.5 text-xs text-[#EDE8DE] font-medium focus:border-[#B88746] focus:outline-none"
            />
          </div>

          {/* YouTube Description with Chapter Timestamps */}
          <div className="bg-[#12151C] border border-[#202735] p-5 rounded-md space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#EDE8DE]">
                Full Description with Chapter Timestamps
              </span>
              <button
                onClick={() => handleCopy(pkg.youtubeDescription, "yt_desc")}
                className="text-[#B88746] hover:underline"
              >
                {copiedKey === "yt_desc" ? "Copied" : "Copy"}
              </button>
            </div>
            <textarea
              rows={12}
              value={pkg.youtubeDescription}
              onChange={(e) => setPkg({ ...pkg, youtubeDescription: e.target.value })}
              className="w-full bg-[#0D0F14] border border-[#232B3B] rounded p-3 text-xs text-[#D8CFBF] font-editorial leading-relaxed focus:border-[#B88746] focus:outline-none resize-none font-mono text-[12px]"
            />
          </div>

          {/* Tags */}
          <div className="bg-[#12151C] border border-[#202735] p-4 rounded-md space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#EDE8DE]">Search Tags / Keywords:</span>
              <button
                onClick={() => handleCopy(pkg.youtubeTags.join(", "), "tags")}
                className="text-[#B88746] hover:underline"
              >
                {copiedKey === "tags" ? "Copied" : "Copy Tags"}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {pkg.youtubeTags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-[#181D26] text-[#A8B4C7] rounded border border-[#273042] text-[11px]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Social Media, Blurbs and Credits */}
        <div className="lg:col-span-5 space-y-5">
          {/* Facebook / Community Post */}
          <div className="bg-[#12151C] border border-[#202735] p-5 rounded-md space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#EDE8DE]">Facebook / Social Copy</span>
              <button
                onClick={() => handleCopy(pkg.facebookPost, "fb")}
                className="text-[#B88746] hover:underline"
              >
                {copiedKey === "fb" ? "Copied" : "Copy"}
              </button>
            </div>
            <textarea
              rows={6}
              value={pkg.facebookPost}
              onChange={(e) => setPkg({ ...pkg, facebookPost: e.target.value })}
              className="w-full bg-[#0D0F14] border border-[#232B3B] rounded p-3 text-xs text-[#D8CFBF] font-editorial leading-relaxed focus:border-[#B88746] focus:outline-none resize-none"
            />
          </div>

          {/* Credits Block */}
          <div className="bg-[#12151C] border border-[#202735] p-5 rounded-md space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#EDE8DE]">Archival & Licensing Credits</span>
              <button
                onClick={() => handleCopy(pkg.creditsBlock, "credits")}
                className="text-[#B88746] hover:underline"
              >
                {copiedKey === "credits" ? "Copied" : "Copy"}
              </button>
            </div>
            <textarea
              rows={5}
              value={pkg.creditsBlock}
              onChange={(e) => setPkg({ ...pkg, creditsBlock: e.target.value })}
              className="w-full bg-[#0D0F14] border border-[#232B3B] rounded p-3 text-xs text-[#A8B4C7] font-mono leading-relaxed focus:border-[#B88746] focus:outline-none resize-none text-[11px]"
            />
          </div>

          {/* Status Note */}
          <div className="bg-[#141822] border border-[#232C3E] p-4 rounded-md text-xs space-y-1.5 text-[#8F9CB0]">
            <div className="flex items-center gap-1.5 text-[#50B876] font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Ready for Controlled Release</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              External social API tokens are not configured, preserving private-by-default integrity. Use the copy buttons above to publish directly to your designated channels.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
