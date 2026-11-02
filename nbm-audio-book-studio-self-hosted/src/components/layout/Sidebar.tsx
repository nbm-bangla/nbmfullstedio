import React from "react";
import {
  LayoutDashboard,
  Globe2,
  FileScan,
  Languages,
  BookMarked,
  Mic2,
  Sliders,
  Video,
  Subtitles,
  Image as ImageIcon,
  Library,
  SendHorizontal,
  KanbanSquare,
  FileCode2,
  Settings2,
  Feather,
  X,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: string;
  onSelectTab: (tabId: string) => void;
  activeJobsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  currentTab,
  onSelectTab,
  activeJobsCount = 0,
}) => {
  const navSections = [
    {
      group: "Overview & Archive",
      items: [
        { id: "command-center", label: "Command Center", bengali: "কমান্ড সেন্টার", icon: LayoutDashboard },
        { id: "world-literature", label: "World Literature", bengali: "বিশ্বসাহিত্য সংগ্রহ", icon: Globe2 },
        { id: "library", label: "Audio & Book Library", bengali: "ডিজিটাল লাইব্রেরি", icon: Library },
        { id: "project-manager", label: "Project Manager", bengali: "প্রজেক্ট ম্যানেজার", icon: KanbanSquare, badge: activeJobsCount },
      ],
    },
    {
      group: "Manuscript & Text",
      items: [
        { id: "pdf-ocr", label: "PDF & OCR Studio", bengali: "পিডিএফ ও ওসিআর", icon: FileScan },
        { id: "translation", label: "Translation Studio", bengali: "অনুবাদ স্টুডিও", icon: Languages },
        { id: "book-review", label: "Book Review Studio", bengali: "বুক রিভিউ স্টুডিও", icon: BookMarked },
      ],
    },
    {
      group: "Sound & Cinema",
      items: [
        { id: "ai-voice", label: "Text to Speech (TTS)", bengali: "টেক্সট থেকে স্পিচ (AI Voice)", icon: Mic2 },
        { id: "audio-studio", label: "Audio Studio", bengali: "অডিও স্টুডিও", icon: Sliders },
        { id: "video-studio", label: "Video Studio", bengali: "ভিডিও স্টুডিও", icon: Video },
        { id: "subtitle-studio", label: "Subtitle Studio", bengali: "সাবটাইটেল স্টুডিও", icon: Subtitles },
        { id: "thumbnail-studio", label: "Thumbnail & Cover", bengali: "কভার ও থাম্বনেইল", icon: ImageIcon },
      ],
    },
    {
      group: "Operations & Tools",
      items: [
        { id: "publishing", label: "Publishing Studio", bengali: "প্রকাশনা ও মেটাডাটা", icon: SendHorizontal },
        { id: "file-converter", label: "File Converter", bengali: "টেক্সট ও কনভার্টার", icon: FileCode2 },
        { id: "settings", label: "Settings & APIs", bengali: "সেটিংস ও এপিআই", icon: Settings2 },
      ],
    },
  ];

  const handleItemClick = (id: string) => {
    onSelectTab(id);
    onClose(); // Automatically close menu on any selection (mobile & desktop)
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0B0D11] border-r border-[#1E232E] flex flex-col h-screen select-none shadow-2xl transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
      }`}
      aria-label="Studio Navigation Drawer"
    >
      {/* Brand header with Close Button */}
      <div className="p-4 border-b border-[#1E232E] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#181D26] border border-[#B88746]/40 flex items-center justify-center text-[#B88746]">
            <Feather className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-display font-bold text-xs tracking-wider text-[#F4EFE6]">NBM STUDIO</h2>
            <p className="text-[10px] text-[#8F8170] tracking-wider uppercase">Creative Literature</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded text-[#8C98AC] hover:text-[#EDE8DE] hover:bg-[#181D26] transition-colors"
          title="মেনু বন্ধ করুন (Esc)"
          aria-label="Close navigation menu"
        >
          <X className="w-4 h-4 text-[#B88746]" />
        </button>
      </div>

      {/* Nav list */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navSections.map((sec) => (
          <div key={sec.group}>
            <div className="px-3 pb-1.5 text-[9px] uppercase tracking-wider text-[#685D4F] font-semibold">
              {sec.group}
            </div>
            <nav className="space-y-1">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded text-left transition-colors text-xs font-medium group ${
                      isActive
                        ? "bg-[#1A1F2A] text-[#F3EFE6] border-l-2 border-[#B88746] shadow-sm"
                        : "text-[#97A0B2] hover:text-[#ECE6DB] hover:bg-[#13171F]"
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? "text-[#B88746]" : "text-[#67738A] group-hover:text-[#B88746]"
                        }`}
                      />
                      <div className="truncate">
                        <div className="leading-tight truncate">{item.label}</div>
                        <div className="text-[10px] text-[#606A7C] group-hover:text-[#8895AD] leading-tight truncate">
                          {item.bengali}
                        </div>
                      </div>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="text-[10px] text-[#B88746] font-mono px-1.5 py-0.2 bg-[#B88746]/10 rounded border border-[#B88746]/30">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer info */}
      <div className="p-3.5 border-t border-[#1E232E] bg-[#0E1015] text-[11px] text-[#67738A]">
        <div className="flex items-center justify-between">
          <span className="text-[#8C98AC]">Navigation Drawer</span>
          <span className="text-[#B88746] font-mono text-[10px]">v1.0 Workstation</span>
        </div>
        <div className="text-[10px] text-[#4E586E] mt-0.5">
          Click any option or outside to dismiss.
        </div>
      </div>
    </aside>
  );
};
