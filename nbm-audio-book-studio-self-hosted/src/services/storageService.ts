import { Book, ProjectRecord, EditorialReview, ReaderReview, OCRJob } from "../types";

const BOOKS_KEY = "nbm_studio_books_v1";
const PROJECTS_KEY = "nbm_studio_projects_v1";
const EDITORIAL_REVIEWS_KEY = "nbm_studio_editorial_reviews_v1";
const READER_REVIEWS_KEY = "nbm_studio_reader_reviews_v1";
const OCR_JOBS_KEY = "nbm_studio_ocr_jobs_v1";

export const INITIAL_BOOKS: Book[] = [
  {
    id: "nbm-book-001",
    title: "Gitanjali (Song Offerings)",
    originalTitle: "গীতাঞ্জলি",
    alternateTitles: ["গীতাঞ্জলি শতবার্ষিকী সংস্করণ", "Gitanjali: A Collection of Prose Translations"],
    author: "Rabindranath Tagore",
    translator: "Rabindranath Tagore (Self-translation with W.B. Yeats intro)",
    publisher: "Indian Publishing House / Macmillan London",
    country: "Bangladesh & India",
    originalLanguage: "Bengali",
    targetLanguage: "English & World Languages",
    genre: "Mystic Poetry & Philosophy",
    tags: ["Nobel Prize 1913", "Classics", "Audiobook Ready", "Public Domain"],
    description: "The seminal collection of 103 prose poems in English, adapted from Tagore's Bengali originals. A lyrical meditation on the infinite, mortality, and the dawn of consciousness.",
    coverUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
    copyrightStatus: "public_domain",
    licenseDetails: "Public Domain worldwide (Author passed 1941, >70 years pma)",
    pdfSourceRef: "tagore_gitanjali_1912_archival.pdf",
    chaptersCount: 4,
    audioDurationSeconds: 1420,
    hasAudio: true,
    hasVideo: true,
    hasSubtitles: true,
    status: "completed",
    createdAt: "2026-09-15T10:00:00Z",
    updatedAt: "2026-10-20T14:30:00Z",
    chapters: [
      {
        id: "c1",
        bookId: "nbm-book-001",
        chapterNumber: 1,
        title: "Song I: Thou hast made me endless",
        originalText: "Thou hast made me endless, such is thy pleasure. This frail vessel thou emptiest again and again, and fillest it ever with fresh life.\n\nThis little flute of a reed thou hast carried over hills and dales, and hast breathed through it melodies eternally new.\n\nAt the immortal touch of thy hands my little heart loses its limits in joy and gives birth to utterance ineffable.",
        translatedText: "আমার মাথা নত করে দাও হে তোমার চরণধূলার তলে।\nসকল অহংকার হে আমার ডুবাও চোখের জলে।\nনিজেরে করিতে গৌরব দান নিজেরে কেবলি করি অপমান,\nআপনারে শুধু ঘেরিয়া ঘেরিয়া ঘুরে মরি পলে পলে।",
        translationStatus: "approved",
        audioUrl: "",
        audioDuration: 180,
        wordCount: 78,
      },
      {
        id: "c2",
        bookId: "nbm-book-001",
        chapterNumber: 2,
        title: "Song II: When thou commandest me to sing",
        originalText: "When thou commandest me to sing it seems that my heart would break with pride; and I look to thy face, and tears come to my eyes.\n\nAll that is harsh and dissonant in my life melts into one sweet harmony — and my adoration spreads wings like a glad bird on its flight across the sea.",
        translatedText: "তুমি যখন গান গাহিতে আদেশ কর, গর্বে বুক ফাটিয়া যাইতে চায়; আমি তোমার মুখের পানে তাকাই, আর নয়নে অশ্রু ভরিয়া ওঠে।",
        translationStatus: "approved",
        audioDuration: 210,
        wordCount: 84,
      },
    ],
  },
  {
    id: "nbm-book-002",
    title: "Rashomon and In a Grove",
    originalTitle: "羅生門 (Rashōmon)",
    alternateTitles: ["In a Bamboo Grove", "藪の中"],
    author: "Ryunosuke Akutagawa",
    translator: "Takashi Kojima / Studio Team",
    publisher: "Shinshicho",
    country: "Japan",
    originalLanguage: "Japanese",
    targetLanguage: "Bengali & English",
    genre: "Psychological Realism & Mystery",
    tags: ["Japanese Literature", "Kyoto", "Cinema Classic"],
    description: "Akutagawa's unsettling masterwork interrogating morality in a decaying Kyoto. Features multi-perspective testimonies that question the very nature of absolute truth.",
    coverUrl: "https://images.unsplash.com/photo-1528164344705-475426879c0d?w=600&auto=format&fit=crop&q=80",
    copyrightStatus: "public_domain",
    licenseDetails: "Aozora Bunko Public Domain (Author died 1927)",
    pdfSourceRef: "akutagawa_rashomon_scanned.pdf",
    chaptersCount: 3,
    audioDurationSeconds: 2280,
    hasAudio: true,
    hasVideo: false,
    hasSubtitles: true,
    status: "review_required",
    createdAt: "2026-10-02T08:15:00Z",
    updatedAt: "2026-10-23T16:45:00Z",
    chapters: [
      {
        id: "ak-1",
        bookId: "nbm-book-002",
        chapterNumber: 1,
        title: "Chapter I: Beneath the Eaves of Rashomon",
        originalText: "It was a chilly evening beneath the colossal eaves of Rashomon gate. A lone servant, discharged by his master, sat waiting for the rain to cease. Below him, the desolate city of Kyoto lay abandoned to crows and forgotten ruins.\n\nOn the stone steps sat only this man in a washed-out blue kimono, nursing a pimple on his right cheek.",
        translatedText: "রাশোমোন ফটকের বিশাল কার্নিশের নিচে তখন এক হিমেল সন্ধ্যা নেমে এসেছে। মনিবের কাছ থেকে বিতাড়িত এক নিঃসঙ্গ চাকর বসে অপেক্ষা করছিল কখন বৃষ্টি থামবে। তার নিচে কিয়োটোর প্রাচীন নগরী তখন কাক আর পরিত্যক্ত ধ্বংসস্তূপের দখলে।",
        translationStatus: "review_required",
        wordCount: 120,
      },
    ],
  },
  {
    id: "nbm-book-003",
    title: "Crime and Punishment (Volume I)",
    originalTitle: "Преступление и наказание",
    alternateTitles: ["অপরাধ ও শাস্তি"],
    author: "Fyodor Dostoevsky",
    translator: "Constance Garnett / Nani Bhowmik",
    publisher: "The Russian Messenger",
    country: "Russia",
    originalLanguage: "Russian",
    targetLanguage: "Bengali",
    genre: "Philosophical Fiction & Psychological Drama",
    tags: ["Dostoevsky", "St. Petersburg", "Masterpiece"],
    description: "Rodion Raskolnikov tests his theory of the extraordinary human being against conscience, despair, and divine grace in 19th-century St. Petersburg.",
    coverUrl: "https://images.unsplash.com/photo-1463320726281-696a485928c7?w=600&auto=format&fit=crop&q=80",
    copyrightStatus: "public_domain",
    licenseDetails: "Global Public Domain",
    pdfSourceRef: "dostoevsky_part1_scan.pdf",
    chaptersCount: 7,
    audioDurationSeconds: 4120,
    hasAudio: false,
    hasVideo: false,
    hasSubtitles: false,
    status: "processing",
    createdAt: "2026-10-12T11:20:00Z",
    updatedAt: "2026-10-24T09:10:00Z",
    chapters: [
      {
        id: "dp-1",
        bookId: "nbm-book-003",
        chapterNumber: 1,
        title: "Part I: Chapter 1 - The Garret in S. Place",
        originalText: "On an exceptionally hot evening early in July a young man came out of the garret in which he lodged in S. Place and walked slowly, as though in hesitation, towards K. bridge.",
        translatedText: "জুলাই মাসের এক অস্বাভাবিক উত্তপ্ত সন্ধ্যায় এস গলির চিলেকোঠার কামরা থেকে বেরিয়ে এল এক তরুণ। যেন খানিকটা দ্বিধান্বিতভাবে ধীর পায়ে সে এগিয়ে চলল কে সেতুর দিকে।",
        translationStatus: "approved",
        wordCount: 95,
      },
    ],
  },
];

export const INITIAL_PROJECTS: ProjectRecord[] = [
  {
    id: "proj-101",
    name: "Gitanjali Centenary Bengali-English Audio Manuscript",
    category: "Audiobook Production",
    status: "completed",
    progressPercent: 100,
    currentStep: "Master Audio Verified & Packaged",
    totalSteps: 6,
    logs: [
      { timestamp: "2026-10-20 10:00", level: "info", message: "Source manuscript loaded (103 poems)" },
      { timestamp: "2026-10-20 11:30", level: "info", message: "Side-by-side translation memory aligned" },
      { timestamp: "2026-10-20 14:15", level: "success", message: "Narration chunks merged and loudness normalized (-16 LUFS target)" },
      { timestamp: "2026-10-20 14:30", level: "success", message: "Master publication archive generated" },
    ],
    fileManifest: [
      { name: "gitanjali_master.wav", size: "32.4 MB", type: "Audio Master" },
      { name: "gitanjali_subtitles.srt", size: "48 KB", type: "Subtitles" },
      { name: "gitanjali_metadata.json", size: "12 KB", type: "Studio Manifest" },
    ],
    lastModified: "2026-10-20T14:30:00Z",
    createdAt: "2026-10-15T10:00:00Z",
  },
  {
    id: "proj-102",
    name: "Akutagawa Rashomon Historical Scan OCR & Bengali Dub",
    category: "OCR & Digitization",
    status: "review_required",
    progressPercent: 68,
    currentStep: "Human Review of Page 4 Low-Confidence Archaic Kanji",
    totalSteps: 5,
    logs: [
      { timestamp: "2026-10-23 14:00", level: "info", message: "Scanned PDF page batches uploaded" },
      { timestamp: "2026-10-23 14:02", level: "info", message: "Gemini Vision OCR extraction executed for 6 pages" },
      { timestamp: "2026-10-23 16:40", level: "warn", message: "Page 4 contains smudged ink marginalia. Marked for manual review." },
    ],
    fileManifest: [
      { name: "rashomon_p1_p6_scan.pdf", size: "8.6 MB", type: "Source PDF" },
      { name: "rashomon_extracted_text.json", size: "24 KB", type: "Raw OCR JSON" },
    ],
    lastModified: "2026-10-23T16:45:00Z",
    createdAt: "2026-10-22T09:00:00Z",
  },
  {
    id: "proj-103",
    name: "Crime and Punishment: Part 1 Chapter 1-3 Bengali Translation",
    category: "Translation",
    status: "processing",
    progressPercent: 45,
    currentStep: "Chunk 4 of 8 translating via Natural Literary engine",
    totalSteps: 8,
    logs: [
      { timestamp: "2026-10-24 08:30", level: "info", message: "Translation project initiated with Russian classic preset" },
      { timestamp: "2026-10-24 09:10", level: "info", message: "Character glossary locked: Raskolnikov, Alyona Ivanovna, Marmeladov" },
    ],
    fileManifest: [
      { name: "dostoevsky_part1.txt", size: "112 KB", type: "Original Russian Source" },
      { name: "glossary_st_petersburg.json", size: "4 KB", type: "Translation Memory" },
    ],
    lastModified: "2026-10-24T09:10:00Z",
    createdAt: "2026-10-24T08:00:00Z",
  },
];

export const INITIAL_EDITORIAL_REVIEWS: EditorialReview[] = [
  {
    id: "rev-001",
    bookId: "nbm-book-001",
    bookTitle: "Gitanjali (Song Offerings)",
    author: "Rabindranath Tagore",
    genre: "Mystic Poetry & Philosophy",
    spoilerFreeOverview: "রবীন্দ্রনাথ ঠাকুরের গীতাঞ্জলি শুধু একটি কাব্যসংকলন নয়, এটি মানবজীবনের ক্লান্তি, আশা, সমর্পণ ও পরম শক্তির সঙ্গে এক নিঃশব্দ কথোপকথন। প্রকৃতির প্রতিটি ঋতুর বর্ণচ্ছটার সাথে মানুষের অন্তর্জগতের নিবিড় মিলনের সুর এতে ধ্বনিত।",
    literaryAnalysis: "গীতাঞ্জলির প্রধান শক্তি এর সহজতা ও অনাড়ম্বর আধ্যাত্মিকতা। মধ্যযুগীয় বৈষ্ণব পদাবলী এবং বাউল গানের যে সুরধারা বাংলার মাটিতে প্রবহমান, রবীন্দ্রনাথ তাকে আন্তর্জাতিক কাব্যভাষার শীর্ষ বিন্দুতে পৌঁছে দিয়েছেন। আত্মাকে এক বাঁশের বাঁশির সাথে তুলনা করে শিল্পী নিজেকে দেবতার লীলাসঙ্গী হিসেবে নিবেদন করেন।",
    strengths: [
      "অনবদ্য রূপক ও সুরময় বাংলা ছন্দের জাদু",
      "ব্যক্তিগত দুঃখবোধকে বিশ্বপ্রেম ও সৃষ্টিশীলতায় রূপান্তরের শক্তি",
      "সার্বজনীন আবেদন যা যেকোনো দেশের ও যুগের মানুষকে স্পর্শ করে",
    ],
    weaknessesOrCaveats: [
      "প্রতীচ্যের পাঠকের জন্য ইংরেজি অনুবাদে মূল বাংলা ছন্দের সূক্ষ্ম সুর কিছুটা অপরিবর্তিত থাকে",
      "আধুনিক দ্রুতগতির পাঠককে ধীর আত্মমগ্ন পাঠের প্রস্তুতি নিতে হবে",
    ],
    audienceSuitability: "সাহিত্যপ্রেমী, দার্শনিক মননের পাঠক, কবিতার শিক্ষার্থী এবং আত্মানুসন্ধানী যেকোনো মানুষ।",
    discussionQuestions: [
      "রবীন্দ্রনাথ কীভাবে অহংকার ও আত্মমর্যাদার মধ্যে পার্থক্য তৈরি করেছেন?",
      "গীতাঞ্জলির গানে মৃত্যুর রূপ কীভাবে ভীতির বদলে এক পরম মিলনের উৎসবে রূপ নেয়?",
      "বাংলা মূল গানের সুর এবং ইংরেজি গদ্য অনুবাদের মধ্যে কী ধরনের অনুভূতিগত পার্থক্য ঘটে?",
    ],
    socialMediaPost: "‘আমার মাথা নত করে দাও হে তোমার চরণধূলার তলে...’ — রবীন্দ্রনাথের নোবেলজয়ী অমর সৃষ্টি ‘গীতাঞ্জলি’-র পূর্ণাঙ্গ পাঠ ও সুরলহরী এখন আমাদের স্টুডিওতে। #Gitanjali #Tagore #BengaliLiterature",
    shortReview: "গীতাঞ্জলি বাংলা ভাষার এক শ্রেষ্ঠ গর্ব। প্রতিটি লাইনে মানবাত্মার গভীরতম মুক্তির সুর ধ্বনিত হয়।",
    language: "bn",
    isDraft: false,
    isApprovedByEditor: true,
    updatedAt: "2026-10-20T12:00:00Z",
  },
];

export const INITIAL_READER_REVIEWS: ReaderReview[] = [
  {
    id: "rr-001",
    bookId: "nbm-book-001",
    reviewerName: "Shamsul Huq",
    reviewerRole: "verified_reader",
    rating: 5,
    title: "অমর সৃষ্টি, পাঠ ও আবৃত্তি দুটোই অনন্য",
    content: "গীতাঞ্জলির প্রতিটি গান মনকে এক পরম শান্তিতে ভরিয়ে দেয়। এই স্টুডিওতে পাশাপাশি বাংলা ও ইংরেজি পাঠ দেখার অভিজ্ঞতা দুর্দান্ত।",
    spoilerWarning: false,
    helpfulVotes: 14,
    moderationStatus: "approved",
    createdAt: "2026-10-18T16:20:00Z",
  },
  {
    id: "rr-002",
    bookId: "nbm-book-002",
    reviewerName: "Farzana Karim",
    reviewerRole: "community",
    rating: 5,
    title: "The Rashomon dilemma still haunts the modern world",
    content: "The side-by-side Japanese historical notes and translation helped me appreciate Akutagawa's sharp irony. Highly recommended.",
    spoilerWarning: false,
    helpfulVotes: 9,
    moderationStatus: "approved",
    createdAt: "2026-10-21T11:45:00Z",
  },
];

// Helper functions for persistent storage
export function loadBooks(): Book[] {
  try {
    const raw = localStorage.getItem(BOOKS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as Book[] : [];
  } catch {
    return [];
  }
}

export function saveBooks(books: Book[]): void {
  try {
    localStorage.setItem(BOOKS_KEY, JSON.stringify(books));
  } catch (err) {
    console.error("Failed to save books to storage:", err);
  }
}

export function loadProjects(): ProjectRecord[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as ProjectRecord[] : [];
  } catch {
    return [];
  }
}

export function saveProjects(projects: ProjectRecord[]): void {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  } catch (err) {
    console.error("Failed to save projects to storage:", err);
  }
}

export function loadEditorialReviews(): EditorialReview[] {
  try {
    const raw = localStorage.getItem(EDITORIAL_REVIEWS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as EditorialReview[] : [];
  } catch {
    return [];
  }
}

export function saveEditorialReviews(reviews: EditorialReview[]): void {
  try {
    localStorage.setItem(EDITORIAL_REVIEWS_KEY, JSON.stringify(reviews));
  } catch (err) {
    console.error("Failed to save editorial reviews:", err);
  }
}

export function loadReaderReviews(): ReaderReview[] {
  try {
    const raw = localStorage.getItem(READER_REVIEWS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as ReaderReview[] : [];
  } catch {
    return [];
  }
}

export function saveReaderReviews(reviews: ReaderReview[]): void {
  try {
    localStorage.setItem(READER_REVIEWS_KEY, JSON.stringify(reviews));
  } catch (err) {
    console.error("Failed to save reader reviews:", err);
  }
}

export function loadOCRJobs(): OCRJob[] {
  try {
    const raw = localStorage.getItem(OCR_JOBS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveOCRJobs(jobs: OCRJob[]): void {
  try {
    localStorage.setItem(OCR_JOBS_KEY, JSON.stringify(jobs));
  } catch (err) {
    console.error("Failed to save OCR jobs:", err);
  }
}
