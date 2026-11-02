import React, { useState, useRef, useEffect } from "react";
import {
  Image as ImageIcon,
  Download,
  Sparkles,
  Layers,
  Upload,
  Eye,
  Type,
  Maximize2,
} from "lucide-react";

export const ThumbnailStudio: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [template, setTemplate] = useState<"archival" | "cinematic" | "minimal">("archival");
  const [titleBn, setTitleBn] = useState<string>("গীতাঞ্জলি শতবার্ষিকী");
  const [titleEn, setTitleEn] = useState<string>("Gitanjali: Song Offerings");
  const [author, setAuthor] = useState<string>("রবীন্দ্রনাথ ঠাকুর (Rabindranath Tagore)");
  const [translator, setTranslator] = useState<string>("অনুবাদ ও সম্পাদনা: এনবিএম স্টুডিও");
  const [narrator, setNarrator] = useState<string>("কণ্ঠ: কোর ও জফির (AI Literary Narration)");
  const [episodeTag, setEpisodeTag] = useState<string>("পূর্ণাঙ্গ অডিওবুক · পর্ব ০১");
  const [bgImage, setBgImage] = useState<string>(
    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1200&auto=format&fit=crop&q=80"
  );
  const [showSafeArea, setShowSafeArea] = useState<boolean>(true);

  // Render Cover on Canvas
  const drawCover = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1920x1080 Thumbnail Canvas
    canvas.width = 1280;
    canvas.height = 720;

    // Background Image
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = bgImage;
    img.onload = () => {
      // Draw background with dark moody grade
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Vignette & Gradient Overlays
      const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
      grad.addColorStop(0, "rgba(10, 12, 16, 0.95)");
      grad.addColorStop(0.55, "rgba(10, 12, 16, 0.75)");
      grad.addColorStop(1, "rgba(10, 12, 16, 0.35)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Decorative Gold Accent Border
      ctx.strokeStyle = "#8B6532";
      ctx.lineWidth = 4;
      ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

      // Inner thin gold frame
      ctx.strokeStyle = "rgba(184, 135, 70, 0.4)";
      ctx.lineWidth = 1;
      ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

      // Episode Tag
      if (episodeTag) {
        ctx.fillStyle = "#B88746";
        ctx.font = "bold 16px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText(episodeTag.toUpperCase(), 70, 100);
      }

      // Bengali Main Title
      ctx.fillStyle = "#FFF9F0";
      ctx.font = "bold 56px 'Noto Serif Bengali', serif";
      ctx.fillText(titleBn, 70, 180);

      // English Subtitle
      ctx.fillStyle = "#E0D7C6";
      ctx.font = "italic 28px 'EB Garamond', serif";
      ctx.fillText(titleEn, 70, 230);

      // Horizontal Divider
      ctx.fillStyle = "#B88746";
      ctx.fillRect(70, 260, 140, 3);

      // Author Name
      ctx.fillStyle = "#D6CABE";
      ctx.font = "24px 'Noto Serif Bengali', serif";
      ctx.fillText(author, 70, 320);

      // Credits / Translator
      if (translator) {
        ctx.fillStyle = "#A8B4C7";
        ctx.font = "18px 'Noto Serif Bengali', serif";
        ctx.fillText(translator, 70, 365);
      }

      // Narrator
      if (narrator) {
        ctx.fillStyle = "#8F9CB0";
        ctx.font = "17px 'Noto Serif Bengali', serif";
        ctx.fillText(narrator, 70, 405);
      }

      // Safe Area Guides (YouTube safe zone)
      if (showSafeArea) {
        ctx.strokeStyle = "rgba(230, 98, 98, 0.4)";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        // 80% safe zone
        const sx = canvas.width * 0.1;
        const sy = canvas.height * 0.1;
        const sw = canvas.width * 0.8;
        const sh = canvas.height * 0.8;
        ctx.strokeRect(sx, sy, sw, sh);
        ctx.setLineDash([]);

        ctx.fillStyle = "rgba(230, 98, 98, 0.7)";
        ctx.font = "12px monospace";
        ctx.fillText("TITLE SAFE AREA (80%)", sx + 10, sy + 20);
      }
    };
  };

  useEffect(() => {
    drawCover();
  }, [template, titleBn, titleEn, author, translator, narrator, episodeTag, bgImage, showSafeArea]);

  const handleDownload = (format: "png" | "jpeg") => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL(`image/${format}`, 0.95);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cover_${titleEn.replace(/\s+/g, "_")}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setBgImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#B88746]">
            <ImageIcon className="w-4 h-4" />
            <span className="font-semibold uppercase tracking-wider">Book Jacket & Thumbnail Studio</span>
            <span aria-hidden="true">·</span>
            <span>Unicode Bengali Typography Engine</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-[#F4EFE6]">Thumbnail & Cover Studio</h1>
          <p className="text-xs text-[#8F9AA9] mt-0.5 font-editorial text-sm">
            Design high-resolution 16:9 YouTube thumbnails and book cover jackets with safe-area guides and rich Bengali typography.
          </p>
        </div>

        {/* Download Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDownload("png")}
            className="px-4 py-2 bg-[#B88746] hover:bg-[#C99654] text-[#0D0F12] text-xs font-semibold rounded flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download High-Res PNG</span>
          </button>
          <button
            onClick={() => handleDownload("jpeg")}
            className="px-3 py-2 bg-[#181D26] hover:bg-[#222938] text-[#D8CFBF] border border-[#2B3547] text-xs font-medium rounded flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JPEG</span>
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Canvas Preview */}
        <div className="lg:col-span-8 space-y-3">
          <div className="bg-[#0B0D11] border border-[#202735] rounded-md p-4 flex items-center justify-center min-h-[420px] overflow-hidden">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-[500px] object-contain rounded shadow-2xl border border-[#1A212E]"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-[#7F8D9E] px-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="safeArea"
                checked={showSafeArea}
                onChange={(e) => setShowSafeArea(e.target.checked)}
                className="accent-[#B88746]"
              />
              <label htmlFor="safeArea" className="cursor-pointer">
                Show Safe-Area Guidelines (YouTube 80% crop preview)
              </label>
            </div>
            <span>Resolution: 1280 × 720 px</span>
          </div>
        </div>

        {/* Right: Typography & Layer Customizer */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#12151C] border border-[#202735] p-5 rounded-md space-y-4 manuscript-paper text-xs">
            <h3 className="font-mono uppercase tracking-wider text-[#B88746]">
              Editable Typography Layers
            </h3>

            <div>
              <label className="block text-[#8F9AA9] mb-1">Bengali Headline (বাংলা শিরোনাম):</label>
              <input
                type="text"
                value={titleBn}
                onChange={(e) => setTitleBn(e.target.value)}
                className="w-full bg-[#0D0F14] border border-[#232B3B] rounded px-3 py-1.5 text-[#EDE8DE] font-editorial text-sm focus:border-[#B88746] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#8F9AA9] mb-1">English Title Subhead:</label>
              <input
                type="text"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                className="w-full bg-[#0D0F14] border border-[#232B3B] rounded px-3 py-1.5 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#8F9AA9] mb-1">Author Credits:</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full bg-[#0D0F14] border border-[#232B3B] rounded px-3 py-1.5 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none font-editorial"
              />
            </div>

            <div>
              <label className="block text-[#8F9AA9] mb-1">Translator / Editor:</label>
              <input
                type="text"
                value={translator}
                onChange={(e) => setTranslator(e.target.value)}
                className="w-full bg-[#0D0F14] border border-[#232B3B] rounded px-3 py-1.5 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none font-editorial"
              />
            </div>

            <div>
              <label className="block text-[#8F9AA9] mb-1">Narrator & Audio Credits:</label>
              <input
                type="text"
                value={narrator}
                onChange={(e) => setNarrator(e.target.value)}
                className="w-full bg-[#0D0F14] border border-[#232B3B] rounded px-3 py-1.5 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none font-editorial"
              />
            </div>

            <div>
              <label className="block text-[#8F9AA9] mb-1">Episode / Badge Tag:</label>
              <input
                type="text"
                value={episodeTag}
                onChange={(e) => setEpisodeTag(e.target.value)}
                className="w-full bg-[#0D0F14] border border-[#232B3B] rounded px-3 py-1.5 text-[#EDE8DE] focus:border-[#B88746] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#8F9AA9] mb-1">Background Image:</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full text-[11px] text-[#7F8D9E] file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:bg-[#1A202C] file:text-[#D8CFBF]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
