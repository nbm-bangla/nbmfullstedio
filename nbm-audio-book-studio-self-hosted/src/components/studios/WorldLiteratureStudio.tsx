import React, { useState, useMemo, useRef } from "react";
import {
  Search,
  Globe2,
  BookOpen,
  Sparkles,
  SendHorizontal,
  Filter,
  ShieldCheck,
  AlertCircle,
  ArrowUpRight,
  Upload,
  ExternalLink,
  FileText,
  Info,
  Check,
  X,
  BookPlus,
} from "lucide-react";
import { WORLD_LITERATURE_WORKS, WORLD_LITERATURE_REGIONS } from "../../data/worldLiteratureData";
import { WorldLiteratureWork, Book } from "../../types";

interface WorldLiteratureStudioProps {
  onSendToTranslation: (text: string, title: string, sourceLang: string) => void;
  onSendToVoice: (text: string, title: string) => void;
  onAddToLibrary: (book: Partial<Book>) => void;
}

export const WorldLiteratureStudio: React.FC<WorldLiteratureStudioProps> = ({
  onSendToTranslation,
  onSendToVoice,
  onAddToLibrary,
}) => {
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWork, setSelectedWork] = useState<WorldLiteratureWork | null>(WORLD_LITERATURE_WORKS[0]);
  const [languageFilter, setLanguageFilter] = useState("All Languages");
  const [copyrightFilter, setCopyrightFilter] = useState<"all" | "public_domain" | "copyrighted">("all");

  // User Document Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadTitle, setUploadTitle] = useState<string>("");
  const [uploadAuthor, setUploadAuthor] = useState<string>("");
  const [uploadLang, setUploadLang] = useState<string>("Bengali");
  const [uploadCountry, setUploadCountry] = useState<string>("Bangladesh");
  const [uploadText, setUploadText] = useState<string>("");
  const [uploadFileName, setUploadFileName] = useState<string>("");
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive unique languages from works catalog
  const availableLanguages = useMemo(() => {
    const set = new Set<string>();
    WORLD_LITERATURE_WORKS.forEach((w) => set.add(w.originalLanguage));
    return [
      "All Languages",
      "Bengali",
      "English",
      "Arabic",
      "Hindi",
      "Urdu",
      "French",
      "German",
      "Russian",
      "Spanish",
      "Japanese",
      "Persian",
      "Chinese",
      ...Array.from(set).filter(
        (l) =>
          ![
            "Bengali",
            "English",
            "Arabic",
            "Hindi",
            "Urdu",
            "French",
            "German",
            "Russian",
            "Spanish",
            "Japanese",
            "Persian",
            "Chinese",
          ].includes(l)
      ),
    ];
  }, []);

  const filteredWorks = useMemo(() => {
    return WORLD_LITERATURE_WORKS.filter((work) => {
      const matchesRegion = selectedRegion === "All Regions" || work.region === selectedRegion;
      const matchesLanguage = languageFilter === "All Languages" || work.originalLanguage === languageFilter;
      const matchesCopyright =
        copyrightFilter === "all" ||
        (copyrightFilter === "public_domain" && work.publicDomain) ||
        (copyrightFilter === "copyrighted" && !work.publicDomain);

      const q = searchQuery.toLowerCase();
      const matchesQuery =
        !q ||
        work.title.toLowerCase().includes(q) ||
        (work.bengaliTitle && work.bengaliTitle.toLowerCase().includes(q)) ||
        work.author.toLowerCase().includes(q) ||
        (work.bengaliAuthor && work.bengaliAuthor.toLowerCase().includes(q)) ||
        work.country.toLowerCase().includes(q) ||
        work.movement.toLowerCase().includes(q) ||
        work.epoch.toLowerCase().includes(q);

      return matchesRegion && matchesLanguage && matchesCopyright && matchesQuery;
    });
  }, [selectedRegion, languageFilter, copyrightFilter, searchQuery]);

  const handleImportToLibrary = (work: WorldLiteratureWork) => {
    onAddToLibrary({
      id: `nbm-work-${Date.now()}`,
      title: work.title,
      originalTitle: work.bengaliTitle || work.title,
      author: work.author,
      country: work.country,
      originalLanguage: work.originalLanguage,
      targetLanguage: "Bengali",
      genre: work.movement,
      tags: [work.movement, work.epoch, work.publicDomain ? "Public Domain" : "Copyrighted"],
      description: work.synopsis,
      coverUrl: work.coverImage,
      copyrightStatus: work.publicDomain ? "public_domain" : "in_copyright",
      licenseDetails: work.licenseDetails || (work.publicDomain ? "Verified Public Domain" : "Copyright Protected"),
      status: "draft",
      chaptersCount: 1,
      hasAudio: false,
      hasVideo: false,
      hasSubtitles: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chapters: [
        {
          id: `ch-1-${Date.now()}`,
          bookId: `nbm-work-${Date.now()}`,
          chapterNumber: 1,
          title: "Introduction & Unabridged Excerpt",
          originalText: work.sampleText,
          translationStatus: "pending",
          wordCount: work.sampleText.split(/\s+/).filter(Boolean).length,
        },
      ],
    });
  };

  // Handle User File Upload for Personal Library
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    const inferredTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    setUploadTitle(inferredTitle);

    if (file.name.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setUploadText(content || "");
      };
      reader.readAsText(file);
    } else {
      // For PDF / EPUB files, note file name and initial placeholder
      setUploadText(`[File attached: ${file.name}] - Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB`);
    }
  };

  const handleSaveUploadedBook = () => {
    if (!uploadTitle.trim()) return;

    onAddToLibrary({
      id: `user-book-${Date.now()}`,
      title: uploadTitle.trim(),
      originalTitle: uploadTitle.trim(),
      author: uploadAuthor.trim() || "User Manuscript",
      country: uploadCountry,
      originalLanguage: uploadLang,
      targetLanguage: "Bengali",
      genre: "Personal Manuscript",
      tags: ["User Upload", uploadLang],
      description: `User-uploaded book manuscript (${uploadFileName || "Custom document"}).`,
      coverUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
      copyrightStatus: "licensed",
      licenseDetails: "Personal User Archive / Fair Use",
      status: "draft",
      chaptersCount: 1,
      hasAudio: false,
      hasVideo: false,
      hasSubtitles: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chapters: [
        {
          id: `ch-user-${Date.now()}`,
          bookId: `user-book-${Date.now()}`,
          chapterNumber: 1,
          title: "Manuscript Content",
          originalText: uploadText || "Uploaded document text.",
          translationStatus: "pending",
          wordCount: uploadText ? uploadText.split(/\s+/).filter(Boolean).length : 0,
        },
      ],
    });

    setUploadSuccessMsg(`"${uploadTitle}" লাইব্রেরিতে সফলভাবে যুক্ত হয়েছে!`);
    setTimeout(() => {
      setUploadSuccessMsg(null);
      setShowUploadModal(false);
      setUploadTitle("");
      setUploadAuthor("");
      setUploadText("");
      setUploadFileName("");
    }, 1500);
  };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Studio Header and Discovery Mission */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#B88746]">
            <Globe2 className="w-4 h-4" />
            <span className="font-semibold uppercase tracking-wider">Universal Archive</span>
            <span aria-hidden="true">·</span>
            <span>Multilingual Literary Heritage & Open Repositories</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-[#F4EFE6]">
            World Literature & Classical Archive
          </h1>
          <p className="text-sm text-[#A5AFBF] max-w-3xl font-editorial text-base mt-1">
            Browse timeless literary masterpieces across Bengali, English, Arabic, Hindi, Urdu, French, German, Russian, Spanish, Japanese, Persian, and Chinese traditions. Decoupled countries and linguistic origins ensure unconstrained cross-cultural exploration.
          </p>
        </div>

        {/* User Document Upload Trigger */}
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2.5 bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12] text-xs font-semibold rounded transition-colors flex items-center gap-2 shrink-0 shadow-sm"
        >
          <BookPlus className="w-4 h-4" />
          <span>Upload Document to My Library</span>
        </button>
      </div>

      {/* Honest Licensing & Open Source Transparency Notice */}
      <div className="p-3 bg-[#131720] border border-[#212938] rounded-md text-xs text-[#8F9AA9] flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[#B88746] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-[#EDE8DE]">কপিরাইট ও উন্মুক্ত লাইব্রেরি নীতিমালা:</span>
          <p className="leading-relaxed">
            এনবিএম স্টুডিও বৌদ্ধিক সম্পত্তি ও কপিরাইট আইন কঠোরভাবে শ্রদ্ধা করে। পাবলিক ডোমেইনভুক্ত মাস্টারপিসগুলোর জন্য ভেরিফাইড মুক্ত উৎস (Project Gutenberg, Internet Archive, Wikisource, ইত্যাদি) নির্দেশ করা হয়েছে। কপিরাইটযুক্ত আধুনিক সাহিত্যের ক্ষেত্রে সম্পূর্ণ বই উন্মুক্ত বলে দাবি করা হয় না; কেবল অধ্যায় ও পাঠ পর্যালোচনা উপযোগী অনুমোদিত উদ্ধৃতি পরিবেশিত হয়। ব্যবহারকারী তার নিজস্ব কপি করা বা স্ক্যান করা পাণ্ডুলিপি সরাসরি আপলোড করে ব্যক্তিগত লাইব্রেরিতে যুক্ত করতে পারেন।
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#12151C] border border-[#202735] p-4 rounded-md space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#637085] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="বই, লেখক (রবীন্দ্রনাথ, પ્રેમચંદ, Manto, Dostoevsky, কাফকা), দেশ বা সাহিত্যধারা দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0D0F14] border border-[#232B3B] rounded pl-9 pr-4 py-2 text-xs text-[#EDE8DE] placeholder-[#5A6578] focus:border-[#B88746] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="bg-[#0D0F14] border border-[#232B3B] rounded px-3 py-2 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
            >
              {WORLD_LITERATURE_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="bg-[#0D0F14] border border-[#232B3B] rounded px-3 py-2 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
            >
              {availableLanguages.map((l) => (
                <option key={l} value={l}>
                  {l === "All Languages" ? "All Languages (সব ভাষা)" : l}
                </option>
              ))}
            </select>

            <select
              value={copyrightFilter}
              onChange={(e) => setCopyrightFilter(e.target.value as any)}
              className="bg-[#0D0F14] border border-[#232B3B] rounded px-3 py-2 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
            >
              <option value="all">All Licenses (সব স্ট্যাটাস)</option>
              <option value="public_domain">Public Domain Only (উন্মুক্ত ও বিশ্বস্ত)</option>
              <option value="copyrighted">Copyrighted / Excerpts</option>
            </select>
          </div>
        </div>

        {/* Region tabs for instant browsing */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          {WORLD_LITERATURE_REGIONS.map((reg) => (
            <button
              key={reg}
              onClick={() => setSelectedRegion(reg)}
              className={`px-3 py-1.5 rounded-sm text-[11px] whitespace-nowrap transition-colors ${
                selectedRegion === reg
                  ? "bg-[#B88746] text-[#0D0F12] font-semibold"
                  : "bg-[#181D26] text-[#8692A6] hover:text-[#EDE8DE]"
              }`}
            >
              {reg.split(" (")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Two Column Layout: Catalog on Left, Full Literary Inspection on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Works Grid */}
        <div className="lg:col-span-7 space-y-4">
          <div className="text-xs text-[#7F8D9E] flex items-center justify-between">
            <span>Showing {filteredWorks.length} world masterpieces</span>
            <span>Unabridged original texts</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredWorks.map((work) => {
              const isSelected = selectedWork?.id === work.id;
              return (
                <div
                  key={work.id}
                  onClick={() => setSelectedWork(work)}
                  className={`cursor-pointer rounded-md border p-4 transition-all duration-200 text-left flex flex-col justify-between ${
                    isSelected
                      ? "bg-[#171C26] border-[#B88746] shadow-md shadow-[#B88746]/5"
                      : "bg-[#12151C] border-[#202735] hover:border-[#323D52]"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="relative aspect-[4/3] rounded overflow-hidden border border-[#232B3A]">
                      <img
                        src={work.coverImage}
                        alt={work.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-mono backdrop-blur-md bg-[#0D0F12]/80 border border-[#2B3444] text-[#E0D8CB]">
                        {work.country}
                      </div>
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] font-mono backdrop-blur-md bg-[#0D0F12]/80 border border-[#2B3444] text-[#B88746]">
                        {work.originalLanguage}
                      </div>
                    </div>

                    <div>
                      {work.bengaliTitle && (
                        <div className="text-xs text-[#B88746] font-editorial font-medium">{work.bengaliTitle}</div>
                      )}
                      <h3 className="text-sm font-semibold text-[#F2ECE1] line-clamp-1">{work.title}</h3>
                      <div className="text-xs text-[#8F9AA9] mt-0.5">
                        {work.author} {work.bengaliAuthor ? `(${work.bengaliAuthor})` : ""}
                      </div>
                    </div>

                    <p className="text-xs text-[#7E8B9E] line-clamp-2 leading-relaxed">
                      {work.synopsis}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#1F2634] mt-3 flex items-center justify-between text-[11px] text-[#6E7B8E]">
                    <span className="flex items-center gap-1 font-mono">
                      {work.publicDomain ? (
                        <ShieldCheck className="w-3 h-3 text-[#50B876]" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-[#D49842]" />
                      )}
                      {work.publicDomain ? "Public Domain" : "Copyright"}
                    </span>
                    <span>{work.epoch}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Literary Dossier and Dispatch */}
        <div className="lg:col-span-5">
          {selectedWork ? (
            <div className="sticky top-24 bg-[#12151C] border border-[#202735] rounded-md p-6 space-y-6 manuscript-paper">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#B88746]">
                    Literary Archival Dossier
                  </span>
                  {selectedWork.publicDomain ? (
                    <span className="text-xs text-[#50B876] flex items-center gap-1 font-mono bg-[#50B876]/10 px-2 py-0.5 rounded border border-[#50B876]/30">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Public Domain
                    </span>
                  ) : (
                    <span className="text-xs text-[#D49842] flex items-center gap-1 font-mono bg-[#D49842]/10 px-2 py-0.5 rounded border border-[#D49842]/30">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Copyrighted / Excerpt
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-bold font-display text-[#F4EFE6]">{selectedWork.title}</h2>
                {selectedWork.bengaliTitle && (
                  <div className="text-sm text-[#B88746] font-editorial">{selectedWork.bengaliTitle}</div>
                )}
                <div className="text-xs text-[#8E9BAF]">
                  By <span className="text-[#EDE8DE] font-semibold">{selectedWork.author}</span>
                  {selectedWork.bengaliAuthor && ` (${selectedWork.bengaliAuthor})`}
                </div>
              </div>

              {/* Metadata Dossier */}
              <div className="space-y-2 text-xs bg-[#0E1015] p-3.5 rounded border border-[#1E2533]">
                <div className="flex justify-between">
                  <span className="text-[#7F8D9F]">Country / Culture:</span>
                  <span className="text-[#EDE8DE] font-medium">{selectedWork.country}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7F8D9F]">Source Language:</span>
                  <span className="text-[#EDE8DE] font-medium">{selectedWork.originalLanguage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7F8D9F]">Movement / Period:</span>
                  <span className="text-[#EDE8DE]">{selectedWork.movement}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7F8D9F]">Historical Epoch:</span>
                  <span className="text-[#EDE8DE]">{selectedWork.epoch}</span>
                </div>
                {selectedWork.sourceAttribution && (
                  <div className="flex justify-between pt-1 border-t border-[#1C2230]">
                    <span className="text-[#7F8D9F]">Source Archive:</span>
                    <span className="text-[#B88746] font-mono text-[11px] truncate max-w-[200px]">
                      {selectedWork.sourceAttribution}
                    </span>
                  </div>
                )}
              </div>

              {/* Verified Online Repository Link if Public Domain */}
              {selectedWork.openSourceUrl && (
                <div className="p-2.5 bg-[#141923] border border-[#252E3E] rounded flex items-center justify-between text-xs">
                  <span className="text-[#96A2B4] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#B88746]" />
                    <span>Verified Open Archive:</span>
                  </span>
                  <a
                    href={selectedWork.openSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#B88746] hover:underline flex items-center gap-1 font-mono text-[11px]"
                  >
                    <span>View Repository</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Bilingual Synopsis */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-[#E6DFC5]">Synopsis & Historical Context:</div>
                <p className="text-xs text-[#A1ADBF] leading-relaxed font-editorial text-[13px]">
                  {selectedWork.synopsis}
                </p>
                {selectedWork.bengaliSynopsis && (
                  <div className="p-3 bg-[#161B24] rounded border border-[#252E3E] text-xs text-[#D8CFBF] font-editorial leading-relaxed">
                    {selectedWork.bengaliSynopsis}
                  </div>
                )}
              </div>

              {/* Sample Excerpt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-[#E6DFC5]">
                  <span>Original Manuscript Excerpt ({selectedWork.originalLanguage}):</span>
                  <span className="text-[11px] text-[#7E8B9E] font-mono">Unabridged</span>
                </div>
                <div className="bg-[#0E1116] border border-[#232A38] rounded p-3 text-xs font-editorial text-[#C9BFAC] italic leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
                  "{selectedWork.sampleText}"
                </div>
              </div>

              {/* Recommended Translations */}
              {selectedWork.recommendedTranslations && (
                <div className="text-xs space-y-1">
                  <span className="text-[#7F8D9E]">Key Recommended Editions:</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedWork.recommendedTranslations.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 bg-[#171D27] border border-[#293345] rounded text-[11px] text-[#D0C5B3]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions & Dispatch to Studios */}
              <div className="pt-2 space-y-2">
                <div className="text-[11px] font-semibold text-[#7E8B9E] uppercase tracking-wider">
                  Dispatch to Studio Pipeline:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      onSendToTranslation(selectedWork.sampleText, selectedWork.title, selectedWork.originalLanguage)
                    }
                    className="px-3 py-2 bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12] text-xs font-semibold rounded transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <SendHorizontal className="w-3.5 h-3.5" />
                    <span>Send to Translation Studio</span>
                  </button>

                  <button
                    onClick={() => onSendToVoice(selectedWork.sampleText, selectedWork.title)}
                    className="px-3 py-2 bg-[#1A202C] hover:bg-[#252D3E] text-[#EDE8DE] border border-[#2D3647] text-xs font-medium rounded transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Send to AI Voice Studio</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#B88746]" />
                  </button>
                </div>

                <button
                  onClick={() => handleImportToLibrary(selectedWork)}
                  className="w-full py-2 bg-[#141822] hover:bg-[#1B212D] text-[#C9BFAD] border border-[#242C3C] text-xs rounded transition-colors flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-3.5 h-3.5 text-[#B88746]" />
                  <span>Add Masterpiece to My Library Archive</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 border border-dashed border-[#242C3C] rounded-md text-center text-xs text-[#7F8D9E]">
              Select a literary work from the catalog to inspect details.
            </div>
          )}
        </div>
      </div>

      {/* User Document Upload to Library Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#12151D] border border-[#263145] rounded-lg max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-[#B88746]">
                <BookPlus className="w-4 h-4" />
                <span className="font-semibold uppercase tracking-wider">User Manuscript Archiver</span>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-[#647187] hover:text-[#EDE8DE]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h2 className="text-lg font-bold text-[#F4EFE6]">Upload Document to My Library</h2>
            <p className="text-xs text-[#8F9AA9]">
              আপলোড করুন আপনার নিজস্ব PDF, TXT বা পাণ্ডুলিপি ফাইল। এটি সরাসরি আপনার ব্যক্তিগত লাইব্রেরি আর্কাইভে যুক্ত হবে এবং অনুবাদ বা ভয়েস স্টুডিওতে প্রসেস করা যাবে।
            </p>

            {uploadSuccessMsg && (
              <div className="p-3 bg-[#1C3624] border border-[#2F683D] text-[#71E69C] text-xs rounded flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{uploadSuccessMsg}</span>
              </div>
            )}

            <div className="space-y-3">
              {/* File input */}
              <div className="space-y-1">
                <label className="text-[11px] text-[#7E8B9E] font-medium">Select File (PDF, TXT, EPUB):</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,.txt,.epub"
                  onChange={handleFileUpload}
                  className="w-full bg-[#0E1117] border border-[#232B3B] rounded p-2 text-xs text-[#EDE8DE]"
                />
              </div>

              {/* Title input */}
              <div className="space-y-1">
                <label className="text-[11px] text-[#7E8B9E] font-medium">Book / Manuscript Title:</label>
                <input
                  type="text"
                  placeholder="e.g. কালবেলা / My Translation Manuscript"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full bg-[#0E1117] border border-[#232B3B] rounded px-3 py-2 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                />
              </div>

              {/* Author and Language */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#7E8B9E] font-medium">Author Name:</label>
                  <input
                    type="text"
                    placeholder="Author name"
                    value={uploadAuthor}
                    onChange={(e) => setUploadAuthor(e.target.value)}
                    className="w-full bg-[#0E1117] border border-[#232B3B] rounded px-3 py-2 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[#7E8B9E] font-medium">Source Language:</label>
                  <select
                    value={uploadLang}
                    onChange={(e) => setUploadLang(e.target.value)}
                    className="w-full bg-[#0E1117] border border-[#232B3B] rounded px-3 py-2 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                  >
                    <option value="Bengali">বাংলা (Bengali)</option>
                    <option value="English">English</option>
                    <option value="Arabic">Arabic (العربية)</option>
                    <option value="Hindi">Hindi (हिन्दी)</option>
                    <option value="Urdu">Urdu (اردو)</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                    <option value="Russian">Russian</option>
                    <option value="Spanish">Spanish</option>
                    <option value="Japanese">Japanese</option>
                    <option value="Persian">Persian</option>
                    <option value="Chinese">Chinese</option>
                  </select>
                </div>
              </div>

              {/* Text content preview */}
              <div className="space-y-1">
                <label className="text-[11px] text-[#7E8B9E] font-medium">
                  Excerpt / Text Preview ({uploadText ? uploadText.length : 0} chars):
                </label>
                <textarea
                  value={uploadText}
                  onChange={(e) => setUploadText(e.target.value)}
                  placeholder="Paste or review text content here..."
                  rows={4}
                  className="w-full bg-[#0E1117] border border-[#232B3B] rounded p-2.5 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none resize-none font-editorial"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1F2636]">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-3 py-1.5 bg-[#161B24] hover:bg-[#202735] text-[#8E9BAC] rounded text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUploadedBook}
                disabled={!uploadTitle.trim()}
                className="px-4 py-1.5 bg-[#B88746] hover:bg-[#C99654] disabled:opacity-40 text-[#0D0F12] font-semibold rounded text-xs transition-colors flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save to Library</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
