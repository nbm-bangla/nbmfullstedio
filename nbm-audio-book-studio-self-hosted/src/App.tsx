import React, { useState, useEffect } from "react";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { CommandCenter } from "./components/studios/CommandCenter";
import { WorldLiteratureStudio } from "./components/studios/WorldLiteratureStudio";
import { PdfOcrStudio } from "./components/studios/PdfOcrStudio";
import { TranslationStudio } from "./components/studios/TranslationStudio";
import { BookReviewStudio } from "./components/studios/BookReviewStudio";
import { AiVoiceStudio } from "./components/studios/AiVoiceStudio";
import { AudioStudio } from "./components/studios/AudioStudio";
import { VideoStudio } from "./components/studios/VideoStudio";
import { SubtitleStudio } from "./components/studios/SubtitleStudio";
import { ThumbnailStudio } from "./components/studios/ThumbnailStudio";
import { LibraryStudio } from "./components/studios/LibraryStudio";
import { PublishingStudio } from "./components/studios/PublishingStudio";
import { ProjectManagerStudio } from "./components/studios/ProjectManagerStudio";
import { FileConverterStudio } from "./components/studios/FileConverterStudio";
import { SettingsStudio } from "./components/studios/SettingsStudio";

import {
  loadBooks,
  saveBooks,
  loadProjects,
  saveProjects,
  loadEditorialReviews,
  saveEditorialReviews,
  loadReaderReviews,
  saveReaderReviews,
} from "./services/storageService";
import { checkBackendStatus, ApiStatusResponse } from "./services/apiClient";
import { Book, ProjectRecord, EditorialReview, ReaderReview } from "./types";

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>("command-center");
  // Sidebar is closed by default as instructed
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const [books, setBooks] = useState<Book[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [editorialReviews, setEditorialReviews] = useState<EditorialReview[]>([]);
  const [readerReviews, setReaderReviews] = useState<ReaderReview[]>([]);
  const [apiStatus, setApiStatus] = useState<ApiStatusResponse>({
    hasApiKey: false,
    provider: "Checking backend...",
    supportedFeatures: [],
  });

  // Cross-studio handshakes
  const [transferText, setTransferText] = useState<string>("");
  const [transferTitle, setTransferTitle] = useState<string>("");
  const [transferSourceLang, setTransferSourceLang] = useState<string>("English");

  useEffect(() => {
    // Load local storage records
    const b = loadBooks();
    const p = loadProjects();
    const er = loadEditorialReviews();
    const rr = loadReaderReviews();

    setBooks(b);
    setProjects(p);
    setEditorialReviews(er);
    setReaderReviews(rr);

    // Check backend API capabilities
    checkBackendStatus().then(setApiStatus);

    // Close sidebar on Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSaveProjects = (newProjects: ProjectRecord[]) => {
    setProjects(newProjects);
    saveProjects(newProjects);
  };

  const handleSaveBooks = (newBooks: Book[]) => {
    setBooks(newBooks);
    saveBooks(newBooks);
  };

  const handleAddBookToLibrary = (partialBook: Partial<Book>) => {
    const newBook = partialBook as Book;
    const updated = [newBook, ...books];
    setBooks(updated);
    saveBooks(updated);
    setCurrentTab("library");
  };

  const handleSaveEditorialReview = (review: EditorialReview) => {
    const existingIndex = editorialReviews.findIndex((r) => r.id === review.id || r.bookId === review.bookId);
    let updated: EditorialReview[];
    if (existingIndex >= 0) {
      updated = [...editorialReviews];
      updated[existingIndex] = review;
    } else {
      updated = [review, ...editorialReviews];
    }
    setEditorialReviews(updated);
    saveEditorialReviews(updated);
  };

  const handleSaveReaderReview = (review: ReaderReview) => {
    const updated = [review, ...readerReviews.filter((existing) => existing.id !== review.id)];
    setReaderReviews(updated);
    saveReaderReviews(updated);
  };

  // Cross-studio routing dispatches
  const handleSendToTranslation = (text: string, title: string, sourceLang: string) => {
    setTransferText(text);
    setTransferTitle(title);
    setTransferSourceLang(sourceLang);
    setCurrentTab("translation");
  };

  const handleSendToVoice = (text: string, title: string) => {
    setTransferText(text);
    setTransferTitle(title);
    setCurrentTab("ai-voice");
  };

  const handleOpenBook = (book: Book) => {
    if (book.chapters && book.chapters[0]?.originalText) {
      handleSendToTranslation(book.chapters[0].originalText, book.title, book.originalLanguage);
    } else {
      setCurrentTab("library");
    }
  };

  const handleRestoreBackup = (data: {
    books?: Book[];
    projects?: ProjectRecord[];
    editorialReviews?: EditorialReview[];
    readerReviews?: ReaderReview[];
  }) => {
    if (data.books) {
      setBooks(data.books);
      saveBooks(data.books);
    }
    if (data.projects) {
      setProjects(data.projects);
      saveProjects(data.projects);
    }
    if (data.editorialReviews) {
      setEditorialReviews(data.editorialReviews);
      saveEditorialReviews(data.editorialReviews);
    }
    if (data.readerReviews) {
      setReaderReviews(data.readerReviews);
      saveReaderReviews(data.readerReviews);
    }
  };

  const handleRefreshStatus = () => {
    checkBackendStatus().then(setApiStatus);
  };

  const activeJobsCount = projects.filter(
    (p) => p.status === "processing" || p.status === "review_required"
  ).length;

  return (
    <div className="flex h-screen bg-[#0D0F12] text-[#EDE8DE] antialiased selection:bg-[#B88746]/30 overflow-hidden relative">
      {/* Dimmed Backdrop Overlay (Clicking outside closes sidebar) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/65 backdrop-blur-xs z-40 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Flyout Sidebar Menu (Closed by default, slides in on menu toggle) */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activeJobsCount={activeJobsCount}
      />

      {/* Main Studio Viewport (Full width) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          currentTab={currentTab}
          apiStatus={apiStatus}
          onOpenSettings={() => setCurrentTab("settings")}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto paper-surface">
          {currentTab === "command-center" && (
            <CommandCenter
              books={books}
              projects={projects}
              onNavigate={setCurrentTab}
              onOpenBook={handleOpenBook}
            />
          )}

          {currentTab === "world-literature" && (
            <WorldLiteratureStudio
              onSendToTranslation={handleSendToTranslation}
              onSendToVoice={handleSendToVoice}
              onAddToLibrary={handleAddBookToLibrary}
            />
          )}

          {currentTab === "pdf-ocr" && (
            <PdfOcrStudio
              onSendToTranslation={handleSendToTranslation}
              onSendToVoice={handleSendToVoice}
            />
          )}

          {currentTab === "translation" && (
            <TranslationStudio
              initialText={transferText}
              initialTitle={transferTitle}
              initialSourceLang={transferSourceLang}
              onSendToVoice={handleSendToVoice}
              onAddToLibrary={handleAddBookToLibrary}
            />
          )}

          {currentTab === "book-review" && (
            <BookReviewStudio
              books={books}
              editorialReviews={editorialReviews}
              readerReviews={readerReviews}
              onSaveEditorialReview={handleSaveEditorialReview}
              onSaveReaderReview={handleSaveReaderReview}
            />
          )}

          {currentTab === "ai-voice" && (
            <AiVoiceStudio
              initialText={transferText}
              initialTitle={transferTitle}
              books={books}
              onSaveBooks={handleSaveBooks}
              onSendToAudioStudio={() => {
                setCurrentTab("audio-studio");
              }}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === "audio-studio" && (
            <AudioStudio
              books={books}
              onSaveBooks={handleSaveBooks}
              onSendToVoice={handleSendToVoice}
            />
          )}

          {currentTab === "video-studio" && (
            <VideoStudio
              books={books}
              onSaveBooks={handleSaveBooks}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === "subtitle-studio" && <SubtitleStudio />}

          {currentTab === "thumbnail-studio" && <ThumbnailStudio />}

          {currentTab === "library" && (
            <LibraryStudio
              books={books}
              onSaveBooks={handleSaveBooks}
              onOpenBook={handleOpenBook}
              onSendToTranslation={handleSendToTranslation}
              onSendToVoice={handleSendToVoice}
            />
          )}

          {currentTab === "publishing" && <PublishingStudio books={books} />}

          {currentTab === "project-manager" && (
            <ProjectManagerStudio
              projects={projects}
              onSaveProjects={handleSaveProjects}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === "file-converter" && <FileConverterStudio />}

          {currentTab === "settings" && (
            <SettingsStudio
              apiStatus={apiStatus}
              books={books}
              projects={projects}
              editorialReviews={editorialReviews}
              readerReviews={readerReviews}
              onRestoreBackup={handleRestoreBackup}
              onRefreshStatus={handleRefreshStatus}
            />
          )}
        </main>
      </div>
    </div>
  );
}
