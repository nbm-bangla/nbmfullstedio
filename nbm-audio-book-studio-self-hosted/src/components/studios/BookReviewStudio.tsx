import React, { useState } from "react";
import {
  BookMarked,
  Sparkles,
  Star,
  CheckCircle2,
  AlertTriangle,
  ThumbsUp,
  MessageSquare,
  ShieldCheck,
  Send,
  RefreshCw,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import { EditorialReview, ReaderReview, Book } from "../../types";
import { callGeminiReview } from "../../services/apiClient";

interface BookReviewStudioProps {
  books: Book[];
  editorialReviews: EditorialReview[];
  readerReviews: ReaderReview[];
  onSaveEditorialReview: (review: EditorialReview) => void;
  onSaveReaderReview: (review: ReaderReview) => void;
}

export const BookReviewStudio: React.FC<BookReviewStudioProps> = ({
  books,
  editorialReviews,
  readerReviews,
  onSaveEditorialReview,
  onSaveReaderReview,
}) => {
  const [activeTab, setActiveTab] = useState<"editorial" | "reader">("editorial");
  const [selectedBookId, setSelectedBookId] = useState<string>(books[0]?.id || "");
  const currentBook = books.find((b) => b.id === selectedBookId) || books[0];

  // Editorial Review State
  const currentEditorial = editorialReviews.find((r) => r.bookId === selectedBookId) || editorialReviews[0];
  const [isGeneratingEditorial, setIsGeneratingEditorial] = useState(false);
  const [editorialLang, setEditorialLang] = useState<"bn" | "en">("bn");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Reader Review Form State
  const [reviewerName, setReviewerName] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewContent, setReviewContent] = useState("");
  const [hasSpoiler, setHasSpoiler] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const bookReaderReviews = readerReviews.filter((r) => r.bookId === selectedBookId);
  const filteredReaderReviews = bookReaderReviews.filter((r) => r.moderationStatus === "approved");
  const pendingReaderReviews = bookReaderReviews.filter((r) => r.moderationStatus === "pending");

  // Rating Distribution Calculation
  const ratingCounts = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: filteredReaderReviews.filter((r) => r.rating === stars).length,
  }));
  const averageRating =
    filteredReaderReviews.length > 0
      ? Math.round(
          (filteredReaderReviews.reduce((sum, r) => sum + r.rating, 0) / filteredReaderReviews.length) * 10
        ) / 10
      : 0;

  const handleGenerateEditorialDraft = async () => {
    if (!currentBook) return;
    setReviewError(null);
    setIsGeneratingEditorial(true);

    try {
      const res = await callGeminiReview(
        currentBook.title,
        currentBook.author,
        currentBook.genre,
        currentBook.description,
        editorialLang
      );

      const newReview: EditorialReview = {
        id: `rev-${Date.now()}`,
        bookId: currentBook.id,
        bookTitle: currentBook.title,
        author: currentBook.author,
        genre: currentBook.genre,
        spoilerFreeOverview: res.spoilerFreeOverview || "",
        literaryAnalysis: res.literaryAnalysis || "",
        strengths: res.strengths || [],
        weaknessesOrCaveats: res.weaknessesOrCaveats || [],
        audienceSuitability: res.audienceSuitability || "",
        discussionQuestions: res.discussionQuestions || [],
        socialMediaPost: res.socialMediaPost || "",
        shortReview: res.shortReview || "",
        language: editorialLang,
        isDraft: true,
        isApprovedByEditor: false,
        updatedAt: new Date().toISOString(),
      };

      onSaveEditorialReview(newReview);
    } catch (err) {
      console.error("Editorial review generation error:", err);
      setReviewError(err instanceof Error ? err.message : "Could not generate the editorial draft. Check the AI API configuration and try again.");
    } finally {
      setIsGeneratingEditorial(false);
    }
  };

  const handleApproveEditorial = () => {
    if (!currentEditorial) return;
    onSaveEditorialReview({
      ...currentEditorial,
      isDraft: false,
      isApprovedByEditor: true,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleMarkHelpful = (review: ReaderReview) => {
    onSaveReaderReview({ ...review, helpfulVotes: review.helpfulVotes + 1 });
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(label);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleSubmitReaderReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTitle.trim() || !reviewContent.trim() || !reviewerName.trim()) return;

    const newReview: ReaderReview = {
      id: `rr-${Date.now()}`,
      bookId: selectedBookId,
      reviewerName: reviewerName.trim(),
      reviewerRole: "community",
      rating,
      title: reviewTitle.trim(),
      content: reviewContent.trim(),
      spoilerWarning: hasSpoiler,
      helpfulVotes: 0,
      moderationStatus: "pending",
      createdAt: new Date().toISOString(),
    };

    onSaveReaderReview(newReview);
    setReviewTitle("");
    setReviewContent("");
    setReviewerName("");
    setRating(5);
    setHasSpoiler(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#B88746]">
            <BookMarked className="w-4 h-4" />
            <span className="font-semibold uppercase tracking-wider">Literary Criticism & Community</span>
            <span aria-hidden="true">·</span>
            <span>Unbiased Editorial Standards</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-[#F4EFE6]">Book Review Studio</h1>
          <p className="text-xs text-[#8F9AA9] mt-0.5 font-editorial text-sm">
            Scholarly editorial evaluations (marked as Drafts until editor sign-off) and authentic reader review moderations.
          </p>
        </div>

        {/* Book Selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#7F8D9E]">Target Book:</span>
          <select
            value={selectedBookId}
            onChange={(e) => setSelectedBookId(e.target.value)}
            className="bg-[#12151C] border border-[#242C3D] rounded px-3 py-1.5 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
          >
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title} ({b.author})
              </option>
            ))}
          </select>
        </div>
      </div>

      {books.length === 0 && (
        <div className="p-5 bg-[#171B23] border border-[#343D4F] rounded-md text-sm text-[#C4CBD6]">
          Add a book to your Library before creating or collecting book reviews.
        </div>
      )}

      {/* Feature Tabs: Editorial vs Reader Reviews */}
      <div className="flex items-center gap-2 border-b border-[#202735] pb-2">
        <button
          onClick={() => setActiveTab("editorial")}
          className={`px-4 py-2 rounded-t text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === "editorial"
              ? "bg-[#181D26] text-[#F5EFE6] border-b-2 border-[#B88746]"
              : "text-[#8692A6] hover:text-[#EDE8DE]"
          }`}
        >
          <BookMarked className="w-4 h-4 text-[#B88746]" />
          <span>Editorial Literary Review (Scholarly)</span>
        </button>

        <button
          onClick={() => setActiveTab("reader")}
          className={`px-4 py-2 rounded-t text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === "reader"
              ? "bg-[#181D26] text-[#F5EFE6] border-b-2 border-[#B88746]"
              : "text-[#8692A6] hover:text-[#EDE8DE]"
          }`}
        >
          <MessageSquare className="w-4 h-4 text-[#B88746]" />
          <span>Reader Reviews & Ratings ({bookReaderReviews.length})</span>
        </button>
      </div>

      {/* Tab A: Editorial Literary Review */}
      {activeTab === "editorial" && (
        <div className="space-y-6">
          <div className="bg-[#12151C] border border-[#202735] p-5 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#EDE8DE]">
                  Editorial Critique: {currentBook?.title}
                </h3>
                {currentEditorial?.isDraft ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#D49842]/40 bg-[#D49842]/10 text-[#E0C07F]">
                    DRAFT (Requires Human Approval)
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#50B876]/40 bg-[#50B876]/10 text-[#50B876] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    APPROVED EDITORIAL REVIEW
                  </span>
                )}
              </div>
              <p className="text-xs text-[#7F8D9E] font-editorial">
                Author: {currentBook?.author} · Country: {currentBook?.country} · Genre: {currentBook?.genre}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={editorialLang}
                onChange={(e) => setEditorialLang(e.target.value as "bn" | "en")}
                className="bg-[#0D0F14] border border-[#232B3A] rounded px-3 py-1.5 text-xs text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
              >
                <option value="bn">বাংলা (Bengali Critical Prose)</option>
                <option value="en">English (Scholarly Critique)</option>
              </select>

              <button
                onClick={handleGenerateEditorialDraft}
                disabled={isGeneratingEditorial || !currentBook}
                className="px-4 py-2 bg-[#B88746] hover:bg-[#C99654] disabled:opacity-50 text-[#0D0F12] text-xs font-semibold rounded flex items-center gap-1.5 transition-colors"
              >
                {isGeneratingEditorial ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Manuscript...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Editorial Draft</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {reviewError && <div role="alert" className="p-3 bg-[#2A1919] border border-[#653737] text-[#F3A5A5] text-xs rounded">{reviewError}</div>}

          {currentEditorial ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Main Analysis Column */}
              <div className="lg:col-span-8 space-y-6">
                {/* Overview */}
                <div className="bg-[#12151C] border border-[#202735] p-6 rounded-md space-y-3 manuscript-paper">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-[#B88746]">
                      01. Spoiler-Free Literary Overview
                    </h4>
                    <button
                      onClick={() => handleCopy(currentEditorial.spoilerFreeOverview, "overview")}
                      className="text-xs text-[#7F8D9E] hover:text-[#EDE8DE]"
                    >
                      {copiedSection === "overview" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="text-xs font-editorial text-[14px] leading-relaxed text-[#DCD5C8]">
                    {currentEditorial.spoilerFreeOverview}
                  </p>
                </div>

                {/* Literary Analysis */}
                <div className="bg-[#12151C] border border-[#202735] p-6 rounded-md space-y-3 manuscript-paper">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-[#B88746]">
                      02. In-Depth Thematic & Stylistic Analysis
                    </h4>
                    <button
                      onClick={() => handleCopy(currentEditorial.literaryAnalysis, "analysis")}
                      className="text-xs text-[#7F8D9E] hover:text-[#EDE8DE]"
                    >
                      {copiedSection === "analysis" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="text-xs font-editorial text-[14px] leading-relaxed text-[#DCD5C8] whitespace-pre-wrap">
                    {currentEditorial.literaryAnalysis}
                  </p>
                </div>

                {/* Strengths & Weaknesses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#12151C] border border-[#202735] p-5 rounded-md space-y-3">
                    <h5 className="text-xs font-semibold text-[#50B876] uppercase tracking-wider">
                      Strengths & Craftsmanship
                    </h5>
                    <ul className="space-y-2 text-xs text-[#B9C5D8] font-editorial text-[13px]">
                      {currentEditorial.strengths.map((s, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-[#50B876] mt-0.5">·</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-[#12151C] border border-[#202735] p-5 rounded-md space-y-3">
                    <h5 className="text-xs font-semibold text-[#D49842] uppercase tracking-wider">
                      Literary Caveats / Reader Suitability
                    </h5>
                    <ul className="space-y-2 text-xs text-[#B9C5D8] font-editorial text-[13px]">
                      {currentEditorial.weaknessesOrCaveats.map((w, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-[#D49842] mt-0.5">·</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Discussion Prompts */}
                {currentEditorial.discussionQuestions.length > 0 && (
                  <div className="bg-[#12151C] border border-[#202735] p-5 rounded-md space-y-3">
                    <h5 className="text-xs font-semibold text-[#E5D7B7] uppercase tracking-wider">
                      Book Club & Reading Discussion Questions
                    </h5>
                    <ol className="space-y-2 text-xs text-[#CBD4E2] font-editorial text-[13px] list-decimal pl-4">
                      {currentEditorial.discussionQuestions.map((q, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {q}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>

              {/* Sidebar Column: Approval, Formats & Social Copy */}
              <div className="lg:col-span-4 space-y-4">
                {/* Approval Action */}
                <div className="bg-[#141822] border border-[#232C3E] p-5 rounded-md space-y-3">
                  <h4 className="text-xs font-semibold text-[#EDE8DE]">Editorial Moderation</h4>
                  <p className="text-xs text-[#7F8D9E]">
                    AI-generated assessments are drafts. Confirm human review to designate as approved publication.
                  </p>
                  <button
                    onClick={handleApproveEditorial}
                    disabled={!currentEditorial.isDraft}
                    className={`w-full py-2.5 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                      currentEditorial.isDraft
                        ? "bg-[#50B876] hover:bg-[#5DC785] text-[#0D0F12]"
                        : "bg-[#1E2533] text-[#7F8D9E] cursor-default"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{currentEditorial.isDraft ? "Approve & Mark Official Review" : "Officially Approved"}</span>
                  </button>
                </div>

                {/* Short Review */}
                <div className="bg-[#12151C] border border-[#202735] p-4 rounded-md space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#EDE8DE]">1-Paragraph Short Blurb</span>
                    <button
                      onClick={() => handleCopy(currentEditorial.shortReview, "short")}
                      className="text-[11px] text-[#B88746] hover:underline"
                    >
                      {copiedSection === "short" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="text-xs text-[#A8B4C7] font-editorial leading-relaxed">
                    {currentEditorial.shortReview}
                  </p>
                </div>

                {/* Social Media Post */}
                <div className="bg-[#12151C] border border-[#202735] p-4 rounded-md space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#EDE8DE]">Social Media Card Copy</span>
                    <button
                      onClick={() => handleCopy(currentEditorial.socialMediaPost, "social")}
                      className="text-[11px] text-[#B88746] hover:underline"
                    >
                      {copiedSection === "social" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="text-xs text-[#A8B4C7] font-editorial leading-relaxed bg-[#0E1015] p-3 rounded border border-[#1E2535]">
                    {currentEditorial.socialMediaPost}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 border border-dashed border-[#202735] rounded-md text-center text-xs text-[#7F8D9E]">
              No editorial draft recorded yet. Click "Generate Editorial Draft" above to begin.
            </div>
          )}
        </div>
      )}

      {/* Tab B: Reader Reviews & Ratings */}
      {activeTab === "reader" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Community Ratings Summary & Review List */}
          <div className="lg:col-span-7 space-y-6">
            {/* Rating Summary Card */}
            <div className="bg-[#12151C] border border-[#202735] p-6 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="text-3xl font-bold font-display text-[#F4EFE6] flex items-center gap-2">
                  <span>{averageRating}</span>
                  <div className="flex items-center text-[#B88746]">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${s <= Math.round(averageRating) ? "fill-current" : "opacity-30"}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-xs text-[#7F8D9E]">
                  Based on {filteredReaderReviews.length} approved reader reviews
                </div>
              </div>

              {/* Distribution bars */}
              <div className="space-y-1.5 w-full sm:w-56 text-xs text-[#8A96A8]">
                {ratingCounts.map(({ stars, count }) => {
                  const pct =
                    filteredReaderReviews.length > 0 ? (count / filteredReaderReviews.length) * 100 : 0;
                  return (
                    <div key={stars} className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="w-6">{stars}★</span>
                      <div className="flex-1 bg-[#1A1F2B] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#B88746] h-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-4 text-right text-[#606B7E]">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* List of Verified Reviews */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-[#EDE8DE] uppercase tracking-wider">
                Community & Reader Submissions
              </h4>

              {pendingReaderReviews.length > 0 && (
                <div role="status" className="p-3 bg-[#201C15] border border-[#55452C] text-[#D8C08C] text-xs rounded">
                  {pendingReaderReviews.length} submission{pendingReaderReviews.length === 1 ? " is" : "s are"} waiting for moderation. Pending entries are hidden from public ratings.
                </div>
              )}

              {filteredReaderReviews.length === 0 ? (
                <div className="p-8 border border-dashed border-[#202735] rounded text-center text-xs text-[#7F8D9E]">
                  No reader reviews submitted for this book yet. Be the first to submit below.
                </div>
              ) : (
                filteredReaderReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="bg-[#12151C] border border-[#202735] p-5 rounded-md space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#EDE8DE]">{rev.reviewerName}</span>
                      </div>
                      <span className="text-[11px] font-mono text-[#6E7A8E]">
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[#B88746]">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${s <= rev.rating ? "fill-current" : "opacity-30"}`}
                        />
                      ))}
                    </div>

                    <h5 className="text-xs font-semibold text-[#E2DACB]">{rev.title}</h5>

                    {rev.spoilerWarning && (
                      <div className="text-[10px] text-[#D49842] font-mono bg-[#D49842]/10 px-2 py-0.5 rounded border border-[#D49842]/30 w-max">
                        Caution: Contains literary spoilers
                      </div>
                    )}

                    <p className="text-xs text-[#A8B4C7] font-editorial leading-relaxed">
                      {rev.content}
                    </p>

                    <div className="pt-2 border-t border-[#1C2230] flex items-center justify-between text-[11px] text-[#6E7A8E]">
                      <button onClick={() => handleMarkHelpful(rev)} className="flex items-center gap-1.5 hover:text-[#EDE8DE]">
                        <ThumbsUp className="w-3 h-3" />
                        <span>Helpful ({rev.helpfulVotes})</span>
                      </button>
                      <span className="text-[#4E586E]">Moderated</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Submit New Reader Review */}
          <div className="lg:col-span-5">
            <div className="bg-[#12151C] border border-[#202735] p-6 rounded-md space-y-4 sticky top-24 manuscript-paper">
              <h4 className="text-xs font-mono uppercase tracking-wider text-[#B88746]">
                Submit Reader Review
              </h4>

              <form onSubmit={handleSubmitReaderReview} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[#8A96A8] mb-1">Your Name or Pen Name:</label>
                  <input
                    type="text"
                    required
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="e.g. Anisul Haque"
                    className="w-full bg-[#0D0F14] border border-[#232B3B] rounded px-3 py-2 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#8A96A8] mb-1">Reviewer Type:</label>
                  <div className="w-full bg-[#0D0F14] border border-[#232B3B] rounded px-3 py-2 text-[#9DA8BC]">Community submission · held for moderation</div>
                </div>

                <div>
                  <label className="block text-[#8A96A8] mb-1">Star Rating (1 - 5):</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setRating(s)}
                        className="text-[#B88746] p-1"
                      >
                        <Star className={`w-5 h-5 ${s <= rating ? "fill-current" : "opacity-30"}`} />
                      </button>
                    ))}
                    <span className="font-mono text-xs text-[#8A96A8] ml-2">{rating} of 5</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[#8A96A8] mb-1">Review Headline:</label>
                  <input
                    type="text"
                    required
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    placeholder="e.g. Lyrical genius that transcends centuries"
                    className="w-full bg-[#0D0F14] border border-[#232B3B] rounded px-3 py-2 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#8A96A8] mb-1">Written Review:</label>
                  <textarea
                    required
                    rows={4}
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    placeholder="Share your experience of the book's pacing, language, and emotional resonance..."
                    className="w-full bg-[#0D0F14] border border-[#232B3B] rounded p-3 text-[#EDE8DE] font-editorial focus:border-[#B88746] focus:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="spoiler"
                    checked={hasSpoiler}
                    onChange={(e) => setHasSpoiler(e.target.checked)}
                    className="accent-[#B88746]"
                  />
                  <label htmlFor="spoiler" className="text-[#8A96A8] cursor-pointer">
                    Flag as containing story spoilers
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={!currentBook}
                  className="w-full py-2.5 bg-[#B88746] hover:bg-[#C99654] disabled:opacity-40 text-[#0D0F12] text-xs font-semibold rounded flex items-center justify-center gap-2 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish Reader Review</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
