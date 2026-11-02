import React from "react";
import {
  FileScan,
  Languages,
  BookMarked,
  Mic2,
  Sliders,
  Video,
  Library,
  Clock,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Headphones,
} from "lucide-react";
import { Book, ProjectRecord } from "../../types";

interface CommandCenterProps {
  books: Book[];
  projects: ProjectRecord[];
  onNavigate: (tabId: string) => void;
  onOpenBook: (book: Book) => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  books,
  projects,
  onNavigate,
  onOpenBook,
}) => {
  const completedJobs = projects.filter((p) => p.status === "completed").length;
  const activeJobs = projects.filter((p) => p.status === "processing" || p.status === "review_required").length;
  const totalAudioHours = Math.round(
    books.reduce((acc, b) => acc + (b.audioDurationSeconds || 0), 0) / 3600 * 10
  ) / 10;
  const totalChapters = books.reduce((acc, b) => acc + (b.chaptersCount || 0), 0);

  const quickLaunchStudios = [
    {
      id: "pdf-ocr",
      title: "PDF & OCR Studio",
      bengali: "স্ক্যান ও পাণ্ডুলিপি উদ্ধার",
      desc: "Recover text from archival manuscripts and scanned PDF editions with script-aware AI.",
      icon: FileScan,
    },
    {
      id: "translation",
      title: "Translation Studio",
      bengali: "বহুভাষিক অনুবাদ ওয়ার্কস্পেস",
      desc: "Side-by-side manuscript translation with character glossary, chapter chunking, and omission QC.",
      icon: Languages,
    },
    {
      id: "ai-voice",
      title: "Text to Speech (AI Voice Studio)",
      bengali: "টেক্সট থেকে স্পিচ ও কথন",
      desc: "Configured cloud speech service দিয়ে টেক্সট থেকে সাহিত্যিক কথন ও অডিও তৈরি করুন।",
      icon: Mic2,
    },
    {
      id: "audio-studio",
      title: "Audio Studio & Timeline",
      bengali: "অডিও মিক্সিং ও সংকলন",
      desc: "Inspect loudness, trim silence, concatenate chapter stems, and export mastering-grade WAV files.",
      icon: Sliders,
    },
    {
      id: "video-studio",
      title: "Video Studio & Waveform",
      bengali: "অডিও-রিঅ্যাক্টিভ ভিডিও",
      desc: "Synthesize full 1080p landscape & vertical video with audio-reactive waveforms and book covers.",
      icon: Video,
    },
    {
      id: "book-review",
      title: "Book Review Studio",
      bengali: "সাহিত্যিক সমালোচনা ও পাঠক রিভিউ",
      desc: "Generate editorial literary analyses, discussion prompts, and moderate verified reader reviews.",
      icon: BookMarked,
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      {/* Literary Hero Banner */}
      <div className="relative overflow-hidden rounded-md border border-[#272E3C] bg-gradient-to-r from-[#12161E] via-[#161B26] to-[#12151D] p-8 manuscript-paper">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex items-center gap-2 text-xs text-[#B88746]">
            <span className="font-semibold tracking-widest uppercase">Creative Literature Workstation</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#8F8170]">Self-hosted creative workstation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#F5EFE6] tracking-tight">
            NBM Audio & Book Studio
          </h1>
          <p className="text-sm text-[#B4BCCB] font-editorial text-base leading-relaxed">
            A dedicated sanctuary for world literature, archival manuscript recovery, literary translation,
            audiobook mastering, and digital publication. Engineered for authentic literary fidelity without shortcuts.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate("world-literature")}
              className="px-4 py-2 bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12] text-xs font-semibold rounded transition-colors flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>Explore World Literature Catalog</span>
            </button>
            <button
              onClick={() => onNavigate("pdf-ocr")}
              className="px-4 py-2 bg-[#1B212D] hover:bg-[#232B3B] text-[#E0D7C9] border border-[#30394A] text-xs font-medium rounded transition-colors flex items-center gap-2"
            >
              <FileScan className="w-4 h-4 text-[#B88746]" />
              <span>Upload Scanned Manuscript (OCR)</span>
            </button>
          </div>
        </div>

        {/* Subtle decorative watermark */}
        <div className="absolute right-4 -bottom-6 text-[#222B3A]/30 select-none pointer-events-none font-display text-9xl font-bold">
          NBM
        </div>
      </div>

      {/* Library & Pipeline Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-[#12151C] border border-[#202735] rounded-md">
          <div className="flex items-center justify-between text-xs text-[#808C9F] pb-2">
            <span>Books in Archive</span>
            <BookOpen className="w-4 h-4 text-[#B88746]" />
          </div>
          <div className="text-2xl font-bold text-[#F4EFE6] font-display">{books.length}</div>
          <div className="text-[11px] text-[#697486] mt-1">
            <span>Across 4 Continents</span>
            <span className="mx-1.5">·</span>
            <span>{totalChapters} Chapters</span>
          </div>
        </div>

        <div className="p-5 bg-[#12151C] border border-[#202735] rounded-md">
          <div className="flex items-center justify-between text-xs text-[#808C9F] pb-2">
            <span>Audiobook Hours</span>
            <Headphones className="w-4 h-4 text-[#B88746]" />
          </div>
          <div className="text-2xl font-bold text-[#F4EFE6] font-display">{totalAudioHours} hrs</div>
          <div className="text-[11px] text-[#697486] mt-1">
            <span>Mastered Stems</span>
            <span className="mx-1.5">·</span>
            <span>16-bit 24kHz</span>
          </div>
        </div>

        <div className="p-5 bg-[#12151C] border border-[#202735] rounded-md">
          <div className="flex items-center justify-between text-xs text-[#808C9F] pb-2">
            <span>Completed Releases</span>
            <CheckCircle2 className="w-4 h-4 text-[#50B876]" />
          </div>
          <div className="text-2xl font-bold text-[#F4EFE6] font-display">{completedJobs}</div>
          <div className="text-[11px] text-[#697486] mt-1">
            <span>Quality Controlled</span>
            <span className="mx-1.5">·</span>
            <span>Archived</span>
          </div>
        </div>

        <div className="p-5 bg-[#12151C] border border-[#202735] rounded-md">
          <div className="flex items-center justify-between text-xs text-[#808C9F] pb-2">
            <span>Active Pipeline Queue</span>
            <Clock className="w-4 h-4 text-[#D49842]" />
          </div>
          <div className="text-2xl font-bold text-[#F4EFE6] font-display">{activeJobs}</div>
          <div className="text-[11px] text-[#697486] mt-1">
            <span>OCR & Translation</span>
            <span className="mx-1.5">·</span>
            <span>Ready for Review</span>
          </div>
        </div>
      </div>

      {/* Quick Launch Studios */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#F2ECE1]">Production Studios</h2>
            <p className="text-xs text-[#8692A6]">Functional modular environments for each creative stage</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLaunchStudios.map((st) => {
            const Icon = st.icon;
            return (
              <button
                key={st.id}
                onClick={() => onNavigate(st.id)}
                className="p-5 bg-[#12151C] hover:bg-[#161B24] border border-[#202735] hover:border-[#333E53] rounded-md text-left transition-all duration-200 group flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded bg-[#181D28] border border-[#283244] flex items-center justify-center text-[#B88746] group-hover:scale-105 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#4F5A70] group-hover:text-[#B88746] group-hover:translate-x-1 transition-all" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#EDE8DE] group-hover:text-[#FFF8EE]">
                      {st.title}
                    </h3>
                    <div className="text-[11px] text-[#8C7D6B] font-editorial">{st.bengali}</div>
                  </div>
                  <p className="text-xs text-[#8C98AC] leading-relaxed line-clamp-2">{st.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Studio Projects & Pipeline State */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Projects */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#F2ECE1]">Recent Literary Projects</h2>
              <p className="text-xs text-[#8692A6]">Stateful project pipelines saved across sessions</p>
            </div>
            <button
              onClick={() => onNavigate("project-manager")}
              className="text-xs text-[#B88746] hover:underline flex items-center gap-1"
            >
              <span>View All Projects</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {projects.map((proj) => {
              const statusColors: Record<string, string> = {
                completed: "text-[#50B876] bg-[#50B876]/10 border-[#50B876]/30",
                review_required: "text-[#D49842] bg-[#D49842]/10 border-[#D49842]/30",
                processing: "text-[#6292E6] bg-[#6292E6]/10 border-[#6292E6]/30",
                failed: "text-[#E66262] bg-[#E66262]/10 border-[#E66262]/30",
              };
              const badgeStyle = statusColors[proj.status] || "text-[#9AA6BA] bg-[#1B202B]";

              return (
                <div
                  key={proj.id}
                  className="p-4 bg-[#12151C] border border-[#202735] rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#EFEAE1] truncate">{proj.name}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${badgeStyle}`}>
                        {proj.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="text-xs text-[#7F8D9E] flex items-center gap-2">
                      <span>{proj.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{proj.currentStep}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-[#1A1F2B] h-1.5 rounded-full overflow-hidden max-w-md">
                      <div
                        className="bg-[#B88746] h-full transition-all duration-300"
                        style={{ width: `${proj.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono text-[#8C98AC]">{proj.progressPercent}%</span>
                    <button
                      onClick={() => onNavigate("project-manager")}
                      className="px-3 py-1.5 text-xs bg-[#1A202C] hover:bg-[#232B3B] text-[#EDE8DE] rounded border border-[#2D3647] transition-colors"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Featured Book from Library */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#F2ECE1]">Masterpiece Highlight</h2>
            <button
              onClick={() => onNavigate("library")}
              className="text-xs text-[#B88746] hover:underline"
            >
              Library ({books.length})
            </button>
          </div>

          {books[0] && (
            <div className="bg-[#12151C] border border-[#202735] rounded-md p-5 space-y-4 manuscript-paper">
              <div className="relative aspect-[3/2] overflow-hidden rounded border border-[#273042]">
                <img
                  src={books[0].coverUrl}
                  alt={books[0].title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0E1015] via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 text-xs">
                  <div className="text-[#B88746] font-medium font-editorial">{books[0].originalTitle}</div>
                  <div className="text-sm font-semibold text-[#FFF8EE] font-display">{books[0].title}</div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-[#8C98AC]">
                <div className="flex items-center justify-between text-[#B9C4D5]">
                  <span>Author:</span>
                  <span className="text-[#EDE8DE] font-medium">{books[0].author}</span>
                </div>
                <div className="flex items-center justify-between text-[#B9C4D5]">
                  <span>Origin:</span>
                  <span className="text-[#EDE8DE]">{books[0].country}</span>
                </div>
                <div className="flex items-center justify-between text-[#B9C4D5]">
                  <span>Copyright:</span>
                  <span className="text-[#50B876]">Verified Public Domain</span>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => onOpenBook(books[0])}
                  className="flex-1 py-2 bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12] text-xs font-semibold rounded text-center transition-colors"
                >
                  Open in Manuscript Editor
                </button>
                <button
                  onClick={() => onNavigate("ai-voice")}
                  className="p-2 bg-[#1A202B] hover:bg-[#252C3B] text-[#B88746] border border-[#2E3747] rounded transition-colors"
                  title="Generate Audiobook"
                >
                  <Headphones className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
