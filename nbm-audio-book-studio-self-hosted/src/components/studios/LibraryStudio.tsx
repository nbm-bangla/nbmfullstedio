import React, { useState, useMemo, useRef } from "react";
import {
  Library,
  Search,
  Filter,
  Grid,
  List,
  BookOpen,
  Headphones,
  Video,
  Subtitles,
  Download,
  Plus,
  Edit3,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileJson,
  X,
  ShieldCheck,
  ArrowUpDown,
  BookMarked,
  Save,
} from "lucide-react";
import { Book, Chapter, CopyrightStatus } from "../../types";
import { downloadTextFile } from "../../services/subtitleService";

interface LibraryStudioProps {
  books: Book[];
  onSaveBooks: (books: Book[]) => void;
  onOpenBook: (book: Book) => void;
  onSendToTranslation: (text: string, title: string, sourceLang: string) => void;
  onSendToVoice: (text: string, title: string) => void;
}

export const LibraryStudio: React.FC<LibraryStudioProps> = ({
  books,
  onSaveBooks,
  onOpenBook,
  onSendToTranslation,
  onSendToVoice,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLang, setFilterLang] = useState("all");
  const [filterCopyright, setFilterCopyright] = useState("all");
  const [sortBy, setSortBy] = useState<"recent" | "title" | "author" | "chapters">("recent");

  // Selection & Modals
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Form State for Add / Edit
  const [formBookId, setFormBookId] = useState<string>("");
  const [formTitle, setFormTitle] = useState("");
  const [formOriginalTitle, setFormOriginalTitle] = useState("");
  const [formAuthor, setFormAuthor] = useState("");
  const [formTranslator, setFormTranslator] = useState("");
  const [formPublisher, setFormPublisher] = useState("");
  const [formCountry, setFormCountry] = useState("Bangladesh & India");
  const [formOriginalLang, setFormOriginalLang] = useState("Bengali");
  const [formTargetLang, setFormTargetLang] = useState("English & World Languages");
  const [formGenre, setFormGenre] = useState("World Literature");
  const [formTags, setFormTags] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCoverUrl, setFormCoverUrl] = useState("https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80");
  const [formCopyright, setFormCopyright] = useState<CopyrightStatus>("public_domain");
  const [formLicenseDetails, setFormLicenseDetails] = useState("");
  const [formChapterTitle, setFormChapterTitle] = useState("Chapter 1: Opening");
  const [formChapterText, setFormChapterText] = useState("");

  const resetForm = () => {
    setFormBookId("");
    setFormTitle("");
    setFormOriginalTitle("");
    setFormAuthor("");
    setFormTranslator("");
    setFormPublisher("");
    setFormCountry("Bangladesh & India");
    setFormOriginalLang("Bengali");
    setFormTargetLang("English & World Languages");
    setFormGenre("World Literature");
    setFormTags("");
    setFormDescription("");
    setFormCoverUrl("https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80");
    setFormCopyright("public_domain");
    setFormLicenseDetails("Public Domain worldwide");
    setFormChapterTitle("Chapter 1: Opening");
    setFormChapterText("");
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (book: Book) => {
    setFormBookId(book.id);
    setFormTitle(book.title);
    setFormOriginalTitle(book.originalTitle);
    setFormAuthor(book.author);
    setFormTranslator(book.translator || "");
    setFormPublisher(book.publisher || "");
    setFormCountry(book.country);
    setFormOriginalLang(book.originalLanguage);
    setFormTargetLang(book.targetLanguage);
    setFormGenre(book.genre);
    setFormTags(book.tags.join(", "));
    setFormDescription(book.description);
    setFormCoverUrl(book.coverUrl);
    setFormCopyright(book.copyrightStatus);
    setFormLicenseDetails(book.licenseDetails || "");
    setFormChapterTitle(book.chapters?.[0]?.title || "Chapter 1");
    setFormChapterText(book.chapters?.[0]?.originalText || "");
    setIsEditModalOpen(true);
  };

  const handleSaveNewBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formAuthor.trim()) return;

    const newId = `nbm-book-${Date.now()}`;
    const wordCount = formChapterText.trim().split(/\s+/).filter(Boolean).length;

    const initialChapters: Chapter[] = formChapterText.trim()
      ? [
          {
            id: `ch-${Date.now()}-1`,
            bookId: newId,
            chapterNumber: 1,
            title: formChapterTitle.trim() || "Chapter 1",
            originalText: formChapterText.trim(),
            translatedText: "",
            translationStatus: "pending",
            wordCount,
          },
        ]
      : [];

    const newBook: Book = {
      id: newId,
      title: formTitle.trim(),
      originalTitle: formOriginalTitle.trim() || formTitle.trim(),
      author: formAuthor.trim(),
      translator: formTranslator.trim() || undefined,
      publisher: formPublisher.trim() || undefined,
      country: formCountry.trim(),
      originalLanguage: formOriginalLang.trim(),
      targetLanguage: formTargetLang.trim(),
      genre: formGenre.trim(),
      tags: formTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      description: formDescription.trim(),
      coverUrl: formCoverUrl.trim(),
      copyrightStatus: formCopyright,
      licenseDetails: formLicenseDetails.trim() || undefined,
      chaptersCount: initialChapters.length || 1,
      hasAudio: false,
      hasVideo: false,
      hasSubtitles: false,
      status: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chapters: initialChapters,
    };

    const updated = [newBook, ...books];
    onSaveBooks(updated);
    setIsAddModalOpen(false);
    resetForm();
    showNotice(`বই "${newBook.title}" সফলভাবে লাইব্রেরিতে যুক্ত হয়েছে।`);
  };

  const handleSaveEditedBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBookId) return;

    const updated = books.map((b) => {
      if (b.id === formBookId) {
        const existingChapters = b.chapters || [];
        const updatedChapters = existingChapters.length > 0
          ? [
              {
                ...existingChapters[0],
                title: formChapterTitle.trim() || existingChapters[0].title,
                originalText: formChapterText.trim() || existingChapters[0].originalText,
                wordCount: formChapterText.trim().split(/\s+/).filter(Boolean).length,
              },
              ...existingChapters.slice(1),
            ]
          : formChapterText.trim()
          ? [
              {
                id: `ch-${Date.now()}-1`,
                bookId: b.id,
                chapterNumber: 1,
                title: formChapterTitle.trim() || "Chapter 1",
                originalText: formChapterText.trim(),
                translationStatus: "pending" as const,
                wordCount: formChapterText.trim().split(/\s+/).filter(Boolean).length,
              },
            ]
          : [];

        const updatedBook: Book = {
          ...b,
          title: formTitle.trim(),
          originalTitle: formOriginalTitle.trim() || formTitle.trim(),
          author: formAuthor.trim(),
          translator: formTranslator.trim() || undefined,
          publisher: formPublisher.trim() || undefined,
          country: formCountry.trim(),
          originalLanguage: formOriginalLang.trim(),
          targetLanguage: formTargetLang.trim(),
          genre: formGenre.trim(),
          tags: formTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          description: formDescription.trim(),
          coverUrl: formCoverUrl.trim(),
          copyrightStatus: formCopyright,
          licenseDetails: formLicenseDetails.trim() || undefined,
          chaptersCount: updatedChapters.length || b.chaptersCount,
          chapters: updatedChapters,
          updatedAt: new Date().toISOString(),
        };

        if (selectedBook && selectedBook.id === b.id) {
          setSelectedBook(updatedBook);
        }
        return updatedBook;
      }
      return b;
    });

    onSaveBooks(updated);
    setIsEditModalOpen(false);
    resetForm();
    showNotice(`বই "${formTitle}" সফলভাবে আপডেট হয়েছে।`);
  };

  const handleDeleteBookConfirmed = () => {
    if (!bookToDelete) return;
    const updated = books.filter((b) => b.id !== bookToDelete.id);
    onSaveBooks(updated);
    if (selectedBook?.id === bookToDelete.id) {
      setSelectedBook(null);
    }
    showNotice(`বই "${bookToDelete.title}" লাইব্রেরি থেকে মোছা হয়েছে।`);
    setBookToDelete(null);
  };

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Filter and Sort Pipeline
  const filteredBooks = useMemo(() => {
    return books
      .filter((b) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          !q ||
          b.title.toLowerCase().includes(q) ||
          b.originalTitle.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.country.toLowerCase().includes(q) ||
          b.genre.toLowerCase().includes(q) ||
          b.tags.some((t) => t.toLowerCase().includes(q));

        const matchesLang =
          filterLang === "all" || b.originalLanguage.toLowerCase() === filterLang.toLowerCase();
        const matchesCopyright = filterCopyright === "all" || b.copyrightStatus === filterCopyright;

        return matchesSearch && matchesLang && matchesCopyright;
      })
      .sort((a, b) => {
        if (sortBy === "title") return a.title.localeCompare(b.title);
        if (sortBy === "author") return a.author.localeCompare(b.author);
        if (sortBy === "chapters") return b.chaptersCount - a.chaptersCount;
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      });
  }, [books, searchQuery, filterLang, filterCopyright, sortBy]);

  // Export handlers
  const handleExportSingleJson = (book: Book) => {
    downloadTextFile(
      JSON.stringify(book, null, 2),
      `${book.title.replace(/\s+/g, "_")}_book_metadata.json`,
      "application/json"
    );
  };

  const handleExportAllBooks = () => {
    const payload = {
      archive: "NBM Audio & Book Studio Library",
      totalBooks: books.length,
      exportedAt: new Date().toISOString(),
      books,
    };
    downloadTextFile(
      JSON.stringify(payload, null, 2),
      `nbm_library_master_archive_${new Date().toISOString().slice(0, 10)}.json`,
      "application/json"
    );
    showNotice("সম্পূর্ণ লাইব্রেরির JSON ফাইল ডাউনলোড শুরু হয়েছে।");
  };

  // Import JSON handler
  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        let importedList: Book[] = [];

        if (Array.isArray(parsed)) {
          importedList = parsed;
        } else if (parsed.books && Array.isArray(parsed.books)) {
          importedList = parsed.books;
        } else if (parsed.title && parsed.author) {
          importedList = [parsed as Book];
        }

        if (importedList.length === 0) {
          showNotice("ত্রুটি: ফাইলে কোনো বৈধ বই পাওয়া যায়নি।");
          return;
        }

        // Merge with unique IDs
        const existingIds = new Set(books.map((b) => b.id));
        const cleanImported = importedList.map((item, idx) => ({
          ...item,
          id: existingIds.has(item.id) ? `imported-${Date.now()}-${idx}` : item.id || `nbm-${Date.now()}-${idx}`,
          chaptersCount: item.chaptersCount || item.chapters?.length || 1,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));

        const merged = [...cleanImported, ...books];
        onSaveBooks(merged);
        showNotice(`${cleanImported.length}টি বই সফলভাবে লাইব্রেরিতে ইমপোর্ট হয়েছে।`);
      } catch (err) {
        showNotice("ত্রুটি: ফাইলটি সঠিক JSON ফরম্যাটে নেই।");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Action Notice Toast */}
      {actionNotice && (
        <div className="fixed top-20 right-6 z-50 bg-[#17211B] border border-[#2D5A3F] text-[#71E69C] px-4 py-3 rounded-md shadow-2xl flex items-center gap-2 text-xs font-medium animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-[#50B876] shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#B88746]">
            <Library className="w-4 h-4" />
            <span className="font-semibold uppercase tracking-wider">Archival Digital Repository</span>
            <span aria-hidden="true">·</span>
            <span>Non-Volatile Library Storage</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-[#F4EFE6]">Audio & Book Library</h1>
          <p className="text-xs text-[#8F9AA9] mt-0.5 font-editorial text-sm">
            বই সংরক্ষণ, নতুন বই যোগ, তথ্য সম্পাদনা, চ্যাপ্টার তালিকা, এবং পূর্ণাঙ্গ JSON ইমপোর্ট ও এক্সপোর্ট।
          </p>
        </div>

        {/* Action Controls: Add Book, Import JSON, Export Library */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12] text-xs font-semibold rounded flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Book (বই যোগ করুন)</span>
          </button>

          <label className="px-3 py-2 bg-[#181D26] hover:bg-[#222938] text-[#D8CFBF] border border-[#2A3447] text-xs font-medium rounded flex items-center gap-1.5 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-[#B88746]" />
            <span>Import JSON</span>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleImportJsonFile}
              className="hidden"
            />
          </label>

          <button
            onClick={handleExportAllBooks}
            className="px-3 py-2 bg-[#181D26] hover:bg-[#222938] text-[#D8CFBF] border border-[#2A3447] text-xs font-medium rounded flex items-center gap-1.5 transition-colors"
            title="Export all books to JSON"
          >
            <Download className="w-3.5 h-3.5 text-[#B88746]" />
            <span>Export Library</span>
          </button>
        </div>
      </div>

      {/* Filter, Search & Sort Bar */}
      <div className="bg-[#12151C] border border-[#202735] p-4 rounded-md space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#637085] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, author, country, genre, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0D0F14] border border-[#232B3B] rounded pl-9 pr-4 py-2 text-xs text-[#EDE8DE] placeholder-[#5A6578] focus:border-[#B88746] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={filterLang}
              onChange={(e) => setFilterLang(e.target.value)}
              className="bg-[#0D0F14] border border-[#232B3B] rounded px-3 py-2 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
            >
              <option value="all">All Languages</option>
              <option value="Bengali">বাংলা (Bengali)</option>
              <option value="English">English</option>
              <option value="Japanese">Japanese</option>
              <option value="Russian">Russian</option>
              <option value="French">French</option>
              <option value="Arabic">Arabic</option>
            </select>

            <select
              value={filterCopyright}
              onChange={(e) => setFilterCopyright(e.target.value)}
              className="bg-[#0D0F14] border border-[#232B3B] rounded px-3 py-2 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
            >
              <option value="all">All Copyright Status</option>
              <option value="public_domain">Public Domain</option>
              <option value="licensed">Licensed</option>
              <option value="in_copyright">In Copyright</option>
            </select>

            <div className="flex items-center gap-1.5 bg-[#0D0F14] border border-[#232B3B] rounded px-2.5 py-1 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#B88746]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs text-[#EDE8DE] focus:outline-none"
              >
                <option value="recent">Recently Added</option>
                <option value="title">Title (A-Z)</option>
                <option value="author">Author (A-Z)</option>
                <option value="chapters">Chapters Count</option>
              </select>
            </div>

            <div className="flex items-center bg-[#0D0F14] p-1 rounded border border-[#232B3B]">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === "grid" ? "bg-[#B88746] text-[#0D0F12]" : "text-[#7F8D9E] hover:text-[#EDE8DE]"
                }`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === "list" ? "bg-[#B88746] text-[#0D0F12]" : "text-[#7F8D9E] hover:text-[#EDE8DE]"
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#7F8D9E] pt-1">
          <span>Showing {filteredBooks.length} of {books.length} books</span>
          <span>Stored locally in browser database</span>
        </div>
      </div>

      {/* Books Display */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredBooks.map((book) => (
            <div
              key={book.id}
              onClick={() => setSelectedBook(book)}
              className="group cursor-pointer bg-[#12151C] hover:bg-[#161B24] border border-[#202735] hover:border-[#38455C] rounded-md overflow-hidden transition-all duration-200 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="relative aspect-[3/4] bg-[#0E1015] overflow-hidden">
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0E1015] via-transparent to-transparent" />
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-[#0E1015]/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-[#E0D7C6] border border-[#283244]">
                    {book.country}
                  </div>
                </div>

                <div className="p-4 pt-1 space-y-1">
                  <div className="text-xs text-[#B88746] font-editorial truncate">{book.originalTitle}</div>
                  <h3 className="text-sm font-semibold text-[#EDE8DE] line-clamp-1">{book.title}</h3>
                  <div className="text-xs text-[#8F9AA9]">{book.author}</div>
                  <p className="text-xs text-[#7F8D9E] line-clamp-2 mt-2 leading-relaxed">
                    {book.description}
                  </p>
                </div>
              </div>

              <div className="p-4 pt-0">
                <div className="pt-3 border-t border-[#1C2230] flex items-center justify-between text-[11px] text-[#6E7A8E]">
                  <span>{book.chaptersCount} Chapters</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditModal(book);
                      }}
                      className="p-1 hover:text-[#B88746]"
                      title="Edit Book Details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setBookToDelete(book);
                      }}
                      className="p-1 hover:text-[#E66262]"
                      title="Delete Book"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#12151C] border border-[#202735] rounded-md overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-[#0E1015] text-[#7F8D9E] uppercase font-mono text-[10px] border-b border-[#202735]">
              <tr>
                <th className="p-3 pl-4">Title & Author</th>
                <th className="p-3">Origin / Language</th>
                <th className="p-3">Chapters</th>
                <th className="p-3">Copyright</th>
                <th className="p-3 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B212D]">
              {filteredBooks.map((book) => (
                <tr
                  key={book.id}
                  onClick={() => setSelectedBook(book)}
                  className="hover:bg-[#161B24] cursor-pointer transition-colors"
                >
                  <td className="p-3 pl-4">
                    <div className="font-semibold text-[#EDE8DE]">{book.title}</div>
                    <div className="text-[#8F9AA9] text-[11px]">{book.author}</div>
                  </td>
                  <td className="p-3 text-[#A8B4C7]">
                    <div>{book.country}</div>
                    <div className="text-[11px] text-[#6A7688]">{book.originalLanguage}</div>
                  </td>
                  <td className="p-3 font-mono text-[#D8CFBF]">{book.chaptersCount}</td>
                  <td className="p-3">
                    {book.copyrightStatus === "public_domain" ? (
                      <span className="text-[#50B876] font-mono text-[11px] flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Public Domain
                      </span>
                    ) : (
                      <span className="text-[#D49842] font-mono text-[11px] flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {book.copyrightStatus}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right pr-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(book);
                        }}
                        className="px-2.5 py-1 bg-[#181D26] hover:bg-[#222938] text-[#EDE8DE] rounded border border-[#283244] text-[11px]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setBookToDelete(book);
                        }}
                        className="p-1 hover:text-[#E66262] text-[#7F8D9E]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Book Detail Drawer Modal */}
      {selectedBook && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end animate-fadeIn">
          <div className="w-full max-w-xl bg-[#0E1116] border-l border-[#242C3D] h-full overflow-y-auto p-6 space-y-6 text-xs manuscript-paper">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2636]">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#B88746]">
                Archive Catalog Record
              </span>
              <button
                onClick={() => setSelectedBook(null)}
                className="p-1 rounded text-[#7F8D9E] hover:text-[#EDE8DE]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Book Cover and Title Header */}
            <div className="flex gap-4">
              <div className="w-24 aspect-[3/4] rounded overflow-hidden border border-[#242C3D] shrink-0">
                <img src={selectedBook.coverUrl} alt={selectedBook.title} className="w-full h-full object-cover" />
              </div>
              <div className="space-y-1">
                <div className="text-[#B88746] font-editorial text-sm">{selectedBook.originalTitle}</div>
                <h2 className="text-base font-bold text-[#F4EFE6] font-display">{selectedBook.title}</h2>
                <div className="text-[#A8B4C7]">By {selectedBook.author}</div>
                {selectedBook.translator && (
                  <div className="text-[#8F9AA9] text-[11px]">Translator: {selectedBook.translator}</div>
                )}
                <div className="text-[#6E7B8E] text-[11px]">
                  {selectedBook.country} · Original Language: {selectedBook.originalLanguage}
                </div>
              </div>
            </div>

            {/* Overview & Metadata */}
            <div className="space-y-2">
              <div className="font-semibold text-[#EDE8DE]">Synopsis:</div>
              <p className="text-[#A8B4C7] font-editorial leading-relaxed text-[13px]">
                {selectedBook.description || "No synopsis recorded yet."}
              </p>
            </div>

            {/* Copyright & Source Reference */}
            <div className="bg-[#12151C] border border-[#202735] p-3.5 rounded space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-[#7F8D9E]">Copyright Clearance:</span>
                <span className={selectedBook.copyrightStatus === "public_domain" ? "text-[#50B876]" : "text-[#D49842]"}>
                  {selectedBook.licenseDetails || selectedBook.copyrightStatus}
                </span>
              </div>
              {selectedBook.pdfSourceRef && (
                <div className="flex justify-between">
                  <span className="text-[#7F8D9E]">Source PDF Archival:</span>
                  <span className="text-[#EDE8DE] truncate max-w-xs">{selectedBook.pdfSourceRef}</span>
                </div>
              )}
            </div>

            {/* Chapters */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-[#EDE8DE]">Chapter Audiobooks & Narration:</div>
                <span className="text-[11px] text-[#7F8D9E] font-mono">
                  {selectedBook.chapters?.length || 0} chapters
                </span>
              </div>

              {selectedBook.chapters && selectedBook.chapters.length > 0 ? (
                <div className="space-y-2">
                  {selectedBook.chapters.map((ch) => (
                    <div
                      key={ch.id}
                      className="bg-[#12151C] border border-[#202735] p-3 rounded flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="font-medium text-[#EDE8DE]">{ch.title}</div>
                        <div className="text-[11px] text-[#6E7B8E] font-mono">
                          {ch.wordCount} words · Status: {ch.translationStatus}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (ch.originalText) {
                              onSendToVoice(ch.originalText, ch.title);
                              setSelectedBook(null);
                            }
                          }}
                          className="p-1.5 bg-[#181D26] hover:bg-[#222938] text-[#B88746] rounded border border-[#273042]"
                          title="Narrate in AI Voice Studio"
                        >
                          <Headphones className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (ch.originalText) {
                              onSendToTranslation(ch.originalText, ch.title, selectedBook.originalLanguage);
                              setSelectedBook(null);
                            }
                          }}
                          className="px-2.5 py-1 bg-[#181D26] hover:bg-[#222938] text-[#D8CFBF] rounded border border-[#273042] text-[11px]"
                        >
                          Translate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[#6E7B8E] italic">No chapters populated yet. Click Edit to add text.</div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-[#1F2636] flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleExportSingleJson(selectedBook)}
                className="flex-1 py-2 bg-[#181D26] hover:bg-[#222938] text-[#D8CFBF] border border-[#283244] rounded flex items-center justify-center gap-1.5 transition-colors"
              >
                <FileJson className="w-3.5 h-3.5 text-[#B88746]" />
                <span>Export Book JSON</span>
              </button>
              <button
                onClick={() => {
                  handleOpenEditModal(selectedBook);
                  setSelectedBook(null);
                }}
                className="flex-1 py-2 bg-[#181D26] hover:bg-[#222938] text-[#D8CFBF] border border-[#283244] rounded flex items-center justify-center gap-1.5 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#B88746]" />
                <span>Edit Details</span>
              </button>
              <button
                onClick={() => {
                  onOpenBook(selectedBook);
                  setSelectedBook(null);
                }}
                className="w-full py-2 bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12] font-semibold rounded flex items-center justify-center gap-1.5 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Open in Manuscript Workspace</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Book Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12151C] border border-[#252E3E] rounded-md max-w-2xl w-full p-6 space-y-4 text-xs manuscript-paper max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#222B3B] pb-3">
              <h3 className="text-base font-bold text-[#F4EFE6] font-display">
                {isAddModalOpen ? "Add New Book to Library (নতুন বই যোগ করুন)" : "Edit Book Details (বইয়ের তথ্য সম্পাদনা)"}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="text-[#7F8D9E] hover:text-[#EDE8DE]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={isAddModalOpen ? handleSaveNewBook : handleSaveEditedBook} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#8F9AA9] mb-1">Book Title (English/Main): *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Crime and Punishment"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-[#0D0F14] border border-[#232B3B] rounded p-2 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#8F9AA9] mb-1">Original Title (বাংলা বা মূল লিপি):</label>
                  <input
                    type="text"
                    placeholder="e.g. অপরাধ ও শাস্তি / Преступление и наказание"
                    value={formOriginalTitle}
                    onChange={(e) => setFormOriginalTitle(e.target.value)}
                    className="w-full bg-[#0D0F14] border border-[#232B3B] rounded p-2 text-[#EDE8DE] font-editorial focus:border-[#B88746] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#8F9AA9] mb-1">Author: *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fyodor Dostoevsky / রবীন্দ্রনাথ ঠাকুর"
                    value={formAuthor}
                    onChange={(e) => setFormAuthor(e.target.value)}
                    className="w-full bg-[#0D0F14] border border-[#232B3B] rounded p-2 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#8F9AA9] mb-1">Translator / Editor:</label>
                  <input
                    type="text"
                    placeholder="e.g. Constance Garnett / ননী ভৌমিক"
                    value={formTranslator}
                    onChange={(e) => setFormTranslator(e.target.value)}
                    className="w-full bg-[#0D0F14] border border-[#232B3B] rounded p-2 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#8F9AA9] mb-1">Country / Region of Origin:</label>
                  <input
                    type="text"
                    placeholder="e.g. Russia, Bangladesh, Japan, France"
                    value={formCountry}
                    onChange={(e) => setFormCountry(e.target.value)}
                    className="w-full bg-[#0D0F14] border border-[#232B3B] rounded p-2 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#8F9AA9] mb-1">Original Language:</label>
                  <input
                    type="text"
                    placeholder="e.g. Russian, Bengali, Japanese, French"
                    value={formOriginalLang}
                    onChange={(e) => setFormOriginalLang(e.target.value)}
                    className="w-full bg-[#0D0F14] border border-[#232B3B] rounded p-2 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#8F9AA9] mb-1">Genre / Literary Movement:</label>
                  <input
                    type="text"
                    placeholder="e.g. Psychological Realism, Romanticism"
                    value={formGenre}
                    onChange={(e) => setFormGenre(e.target.value)}
                    className="w-full bg-[#0D0F14] border border-[#232B3B] rounded p-2 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#8F9AA9] mb-1">Copyright Clearance:</label>
                  <select
                    value={formCopyright}
                    onChange={(e) => setFormCopyright(e.target.value as CopyrightStatus)}
                    className="w-full bg-[#0D0F14] border border-[#232B3B] rounded p-2 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                  >
                    <option value="public_domain">Verified Public Domain</option>
                    <option value="licensed">Licensed Translation</option>
                    <option value="in_copyright">In Copyright (Fair Use / Educational)</option>
                    <option value="pending_verification">Pending Verification</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#8F9AA9] mb-1">Cover Image URL:</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={formCoverUrl}
                  onChange={(e) => setFormCoverUrl(e.target.value)}
                  className="w-full bg-[#0D0F14] border border-[#232B3B] rounded p-2 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#8F9AA9] mb-1">Description / Synopsis:</label>
                <textarea
                  rows={3}
                  placeholder="Book overview, plot context, and thematic significance..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-[#0D0F14] border border-[#232B3B] rounded p-2.5 text-[#EDE8DE] font-editorial focus:border-[#B88746] focus:outline-none resize-none"
                />
              </div>

              {/* Initial Chapter Text */}
              <div className="pt-2 border-t border-[#202735] space-y-2">
                <span className="font-semibold text-[#EDE8DE] block">
                  Manuscript Chapter 1 Excerpt / Full Text:
                </span>
                <input
                  type="text"
                  placeholder="Chapter Title (e.g. Chapter I: The Garret)"
                  value={formChapterTitle}
                  onChange={(e) => setFormChapterTitle(e.target.value)}
                  className="w-full bg-[#0D0F14] border border-[#232B3B] rounded p-2 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                />
                <textarea
                  rows={4}
                  placeholder="Paste chapter text here. This can be directly translated or sent to audio narration..."
                  value={formChapterText}
                  onChange={(e) => setFormChapterText(e.target.value)}
                  className="w-full bg-[#0D0F14] border border-[#232B3B] rounded p-2.5 text-[#EDE8DE] font-editorial focus:border-[#B88746] focus:outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-[#202735] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2 bg-[#181D26] hover:bg-[#222938] text-[#8F9AA9] rounded border border-[#273042]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12] font-semibold rounded flex items-center gap-1.5 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isAddModalOpen ? "Save Book to Library" : "Update Book Details"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {bookToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181D24] border border-[#3C2424] rounded-md max-w-sm w-full p-6 space-y-4 text-xs manuscript-paper">
            <div className="flex items-center gap-2 text-[#E66262]">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-[#F4EFE6]">বই মোছার নিশ্চিতকরণ</h3>
            </div>
            <p className="text-[#C9BFAD] leading-relaxed">
              আপনি কি নিশ্চিত যে <span className="font-semibold text-[#EDE8DE]">"{bookToDelete.title}"</span> বইটি লাইব্রেরি থেকে মুছে ফেলতে চান? এটি স্থায়ীভাবে মুছে যাবে।
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setBookToDelete(null)}
                className="px-3 py-1.5 bg-[#202732] hover:bg-[#2A3444] text-[#EDE8DE] rounded border border-[#2F3A4C]"
              >
                বাতিল করুন
              </button>
              <button
                onClick={handleDeleteBookConfirmed}
                className="px-3 py-1.5 bg-[#E66262] hover:bg-[#F27272] text-white font-semibold rounded"
              >
                মুছে ফেলুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
