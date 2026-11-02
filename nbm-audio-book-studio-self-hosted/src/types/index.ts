export type CopyrightStatus = 'public_domain' | 'licensed' | 'in_copyright' | 'pending_verification';

export type JobStatus = 'draft' | 'queued' | 'processing' | 'paused' | 'review_required' | 'completed' | 'failed' | 'cancelled';

export interface Book {
  id: string;
  title: string;
  originalTitle: string;
  alternateTitles?: string[];
  author: string;
  translator?: string;
  publisher?: string;
  country: string;
  originalLanguage: string;
  targetLanguage: string;
  genre: string;
  tags: string[];
  description: string;
  coverUrl: string;
  copyrightStatus: CopyrightStatus;
  licenseDetails?: string;
  pdfSourceRef?: string;
  chaptersCount: number;
  audioDurationSeconds?: number;
  hasAudio: boolean;
  hasVideo: boolean;
  hasSubtitles: boolean;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  chapters?: Chapter[];
  audioFiles?: AudioMetadata[];
}

export interface Chapter {
  id: string;
  bookId: string;
  chapterNumber: number;
  title: string;
  originalText: string;
  translatedText?: string;
  translationStatus: 'pending' | 'processing' | 'review_required' | 'approved' | 'failed';
  audioUrl?: string;
  audioDuration?: number;
  wordCount: number;
}

export interface AudioMetadata {
  id: string;
  fileName: string;
  fileSize: number;
  duration: number;
  sampleRate?: number;
  channels?: number;
  bitrate?: number;
  container: string;
  loudnessPeak?: number;
  silenceDetected?: boolean;
  transcript?: string | null;
  url?: string;
}

export interface AudioClip {
  id: string;
  name: string;
  chapterNumber?: number | null;
  chapterTitle?: string | null;
  duration: number;
  sampleRate: number;
  channels: number;
  fileSize: number;
  format: string;
  trimStart: number;
  trimEnd: number;
  fadeIn: number;
  fadeOut: number;
  volume: number; // 0.0 to 2.0 (default 1.0)
  transcript?: string | null;
  transcriptVersion?: number;
  fileHash?: string;
  peaks?: number[];
  isCached?: boolean;
  storageKey?: string;
}

export interface AudiobookManifestJSON {
  schemaVersion: string;
  manifestType: "AudiobookMasterManifest";
  generatedAt: string;
  book: {
    title: string;
    originalTitle: string | null;
    author: string;
    narrator: string | null;
    language: string;
    genre: string | null;
    country: string | null;
    copyrightStatus: string | null;
  };
  audioProperties: {
    format: string;
    totalDurationSeconds: number;
    totalFileSizeBytes: number;
    sampleRate: number;
    channels: number;
    silenceGapSeconds: number;
    isNormalized: boolean;
  };
  chapters: Array<{
    index: number;
    title: string;
    startTime: number;
    endTime: number;
    duration: number;
    transcript: string | null;
    clipId: string;
  }>;
  clips: Array<{
    id: string;
    name: string;
    duration: number;
    trimStart: number;
    trimEnd: number;
    volume: number;
    fadeIn: number;
    fadeOut: number;
  }>;
  costMetrics: {
    apiCallsCount: number;
    cacheHitsCount: number;
    estimatedCostSavedUsd: number;
  };
}

export interface AudiobookProject {
  id: string;
  title: string;
  bookId?: string | null;
  author: string;
  language: string;
  coverUrl?: string;
  clips: AudioClip[];
  silenceGap: number;
  normalizeVolume: boolean;
  manifestJson?: AudiobookManifestJSON;
  updatedAt: string;
  createdAt: string;
}

export interface VoiceChunk {
  id: string;
  chunkIndex: number;
  chapterTitle?: string;
  text: string;
  textHash: string;
  voiceName: string;
  style: string;
  speed: number;
  model?: string;
  language?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  audioBlobId?: string;
  audioDuration?: number;
  fileSizeBytes?: number;
  isCached?: boolean;
  error?: string | null;
  retryCount: number;
  updatedAt: string;
}

export interface VoiceNarrationProject {
  id: string;
  title: string;
  bookId?: string | null;
  author: string;
  language: string;
  model?: string;
  voiceName: string;
  style: string;
  speed: number;
  chunks: VoiceChunk[];
  maxBudgetUsd: number;
  maxChunksLimit: number;
  totalCharacters: number;
  estimatedCostUsd: number;
  actualCostUsd: number;
  cacheHitsCount: number;
  apiCallsCount: number;
  status: 'draft' | 'queued' | 'processing' | 'paused' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export type WaveformStyle = 'bars' | 'mirrored' | 'line' | 'circular';

export interface VideoClipItem {
  id: string;
  name: string;
  duration: number;
  audioBlobId?: string;
  audioUrl?: string;
  gapAfter: number;
}

export interface VideoProject {
  id: string;
  title: string;
  bookId?: string | null;
  author: string;
  chapterTitle: string;
  subtitleSnippet?: string;
  watermarkText?: string;
  resolution: { width: number; height: number };
  fps: number;
  aspectRatio: '16:9';
  coverBlobId?: string;
  coverUrl?: string;
  useBlurredBackdrop: boolean;
  enableWaveform: boolean;
  waveformStyle: WaveformStyle;
  waveformColor: string;
  waveformHeight: number;
  waveformPosition: 'bottom' | 'center' | 'bottom-right';
  clips: VideoClipItem[];
  totalDuration: number;
  outputFormat: string;
  renderedVideoBlobId?: string;
  renderedAt?: string;
  status: 'draft' | 'rendering' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface OCRPage {
  pageNumber: number;
  originalImageUrl: string;
  extractedText: string;
  editedText: string;
  isApproved: boolean;
  confidence: number;
  detectedScript?: string;
  hasUnreadableRegions: boolean;
  unreadableNotes?: string;
  rotation: number;
  contrast: number;
  brightness: number;
  binarizeThreshold?: number;
  extractionSource: 'native_pdf' | 'gemini_ocr' | 'manual';
  isScanned: boolean;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface OCRJob {
  id: string;
  fileName: string;
  fileSize: number;
  totalPages: number;
  currentPage: number;
  status: JobStatus;
  scriptHint: string;
  readingOrder: 'standard' | 'bidi_rtl' | 'vertical_asian' | 'two_column';
  pages: OCRPage[];
  averageConfidence: number;
  pdfType?: 'digital_text' | 'scanned_image' | 'mixed';
  estimatedCostUsd?: number;
  apiCallCount?: number;
}

export type TranslationMode = 'Faithful/Literal' | 'Natural Literary' | 'Natural Standard' | 'Easy-to-Read' | 'Side-by-Side';

export interface TranslationChunk {
  id: string;
  chunkIndex: number;
  sourceText: string;
  translatedText: string;
  status: 'pending' | 'processing' | 'review_required' | 'approved' | 'completed' | 'failed';
  sourceParagraphCount: number;
  targetParagraphCount: number;
  warningFlags?: string[];
  error?: string;
  cached?: boolean;
  wordCount?: number;
}

export interface QCCheckResult {
  sourceParagraphCount: number;
  targetParagraphCount: number;
  countMatches: boolean;
  suspiciousOmissions: string[];
  characterConsistency: { term: string; count: number; valid: boolean }[];
  missingHeadings: boolean;
  score: number;
  passed: boolean;
}

export interface EditorialReview {
  id: string;
  bookId: string;
  bookTitle: string;
  author: string;
  genre: string;
  spoilerFreeOverview: string;
  literaryAnalysis: string;
  strengths: string[];
  weaknessesOrCaveats: string[];
  audienceSuitability: string;
  discussionQuestions: string[];
  socialMediaPost: string;
  shortReview: string;
  language: 'bn' | 'en';
  isDraft: boolean;
  isApprovedByEditor: boolean;
  updatedAt: string;
}

export interface ReaderReview {
  id: string;
  bookId: string;
  reviewerName: string;
  reviewerRole: 'verified_reader' | 'community' | 'editorial_board';
  rating: number; // 1 to 5
  title: string;
  content: string;
  spoilerWarning: boolean;
  helpfulVotes: number;
  moderationStatus: 'approved' | 'flagged' | 'pending';
  createdAt: string;
}

export interface SubtitleCue {
  id: string;
  index: number;
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string;
  translatedText?: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  category: 'World Literature' | 'OCR & Digitization' | 'Audiobook Production' | 'Translation' | 'Multimedia Video';
  status: JobStatus;
  progressPercent: number;
  currentStep: string;
  totalSteps: number;
  logs: { timestamp: string; level: 'info' | 'warn' | 'error' | 'success'; message: string }[];
  fileManifest: { name: string; size: string; type: string }[];
  lastModified: string;
  createdAt: string;
}

export interface PublishingPackage {
  bookId: string;
  bookTitle: string;
  author: string;
  youtubeTitle: string;
  youtubeDescription: string;
  youtubeTags: string[];
  chapterTimestamps: { time: string; title: string }[];
  thumbnailHeadline: string;
  thumbnailSubhead: string;
  facebookPost: string;
  promotionalCopy: string;
  creditsBlock: string;
  checklist: { id: string; label: string; checked: boolean }[];
  status: 'draft' | 'approved' | 'ready_for_distribution';
}

export interface WorldLiteratureWork {
  id: string;
  title: string;
  bengaliTitle?: string;
  author: string;
  bengaliAuthor?: string;
  country: string;
  region: string;
  originalLanguage: string;
  epoch: string;
  movement: string;
  synopsis: string;
  bengaliSynopsis?: string;
  publicDomain: boolean;
  licenseDetails?: string;
  openSourceUrl?: string;
  sourceAttribution?: string;
  recommendedTranslations: string[];
  sampleText: string;
  coverImage: string;
}
