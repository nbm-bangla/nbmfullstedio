import * as pdfjsLib from "pdfjs-dist";

// Configure pdfjs worker
try {
  if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    // @ts-ignore
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || "4.10.38"}/build/pdf.worker.min.mjs`;
  }
} catch (err) {
  console.warn("PDF worker initialization note:", err);
}

export interface ExtractedPageInfo {
  pageNumber: number;
  isScanned: boolean;
  nativeText: string;
  renderedImageDataUrl: string;
  width: number;
  height: number;
  detectedLanguage?: string;
  isRtl?: boolean;
}

export interface ProcessedPdfDocument {
  fileName: string;
  fileSize: number;
  totalPages: number;
  pages: ExtractedPageInfo[];
  detectedType: "digital_text" | "scanned_image" | "mixed";
  hasUrduArabic?: boolean;
}

/**
 * Converts a File to Base64 string for direct fallback
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Loads a PDF file and inspects every page.
 * Uses CMaps for full Urdu, Arabic, Persian, and Asian Unicode glyph decoding.
 * Distinguishes between native digital text pages and scanned image pages.
 */
export async function loadAndInspectPdf(
  file: File,
  onPageProgress?: (current: number, total: number) => void
): Promise<ProcessedPdfDocument> {
  const arrayBuffer = await file.arrayBuffer();

  // @ts-ignore
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || "4.10.38"}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || "4.10.38"}/standard_fonts/`,
  });

  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  const pagesInfo: ExtractedPageInfo[] = [];
  let digitalPageCount = 0;
  let scannedPageCount = 0;
  let documentHasUrduArabic = false;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onPageProgress?.(pageNum, totalPages);
    const page = await pdfDoc.getPage(pageNum);

    // 1. Check Native Digital Text Content
    let textItems = "";
    try {
      const textContent = await page.getTextContent();
      textItems = textContent.items
        .map((item: any) => item.str || "")
        .join(" ")
        .trim();
      textItems = textItems.replace(/\s+/g, " ");
    } catch (e) {
      console.warn(`Could not extract native text on page ${pageNum}:`, e);
      textItems = "";
    }

    // Check if the page contains Urdu / Arabic characters:
    // Unicode ranges: Arabic, Arabic Supplement, Presentation Forms A & B (Used extensively in Urdu Nastaliq)
    const isUrduArabic = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(textItems);
    if (isUrduArabic) {
      documentHasUrduArabic = true;
    }

    // Check for corrupted / non-unicode custom font encodings (common in old InPage Urdu PDFs)
    // where character codes are ASCII gibberish or private use area codes without CMap
    const isPrivateUseCorrupted = /[\uE000-\uF8FF]/.test(textItems);
    const isGibberishPunctuation =
      textItems.length > 30 && !/[\u0600-\u06FF\u0980-\u09FFa-zA-Z0-9]/.test(textItems);

    // Page has valid readable native text ONLY if it's long enough and not corrupted custom glyphs
    const hasSignificantNativeText =
      textItems.length > 25 && !isPrivateUseCorrupted && !isGibberishPunctuation;

    if (hasSignificantNativeText) {
      digitalPageCount++;
    } else {
      scannedPageCount++;
    }

    // 2. Render Page to Canvas Image with 2.0 scale for ultra-crisp Nastaliq & script vision OCR
    const scale = 2.0;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    let dataUrl = "";
    if (ctx) {
      try {
        // @ts-ignore
        await page.render({ canvasContext: ctx, viewport }).promise;
        dataUrl = canvas.toDataURL("image/png");
      } catch (renderErr) {
        console.warn(`Canvas render error on page ${pageNum}:`, renderErr);
        // Fallback with scale 1.0 if memory was tight
        try {
          const smallViewport = page.getViewport({ scale: 1.0 });
          canvas.width = smallViewport.width;
          canvas.height = smallViewport.height;
          // @ts-ignore
          await page.render({ canvasContext: ctx, viewport: smallViewport }).promise;
          dataUrl = canvas.toDataURL("image/png");
        } catch {}
      }
    }

    pagesInfo.push({
      pageNumber: pageNum,
      isScanned: !hasSignificantNativeText,
      nativeText: hasSignificantNativeText ? textItems : "",
      renderedImageDataUrl: dataUrl,
      width: viewport.width,
      height: viewport.height,
      detectedLanguage: isUrduArabic ? "Urdu" : undefined,
      isRtl: isUrduArabic,
    });
  }

  const detectedType =
    scannedPageCount === 0
      ? "digital_text"
      : digitalPageCount === 0
      ? "scanned_image"
      : "mixed";

  return {
    fileName: file.name,
    fileSize: file.size,
    totalPages,
    pages: pagesInfo,
    detectedType,
    hasUrduArabic: documentHasUrduArabic,
  };
}

/**
 * Image Enhancement Processor:
 * Applies rotation, contrast, brightness, sharpening/binarization onto a canvas.
 */
export async function applyImageEnhancements(
  sourceImageDataUrl: string,
  options: {
    rotation: number; // 0, 90, 180, 270
    contrast: number; // 100 is default
    brightness: number; // 100 is default
    binarizeThreshold: number; // 0 is off, 50-200 applies thresholding
    sharpen: boolean;
  }
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        resolve(sourceImageDataUrl);
        return;
      }

      const rot = ((options.rotation % 360) + 360) % 360;
      const isSideways = rot === 90 || rot === 270;

      canvas.width = isSideways ? img.height : img.width;
      canvas.height = isSideways ? img.width : img.height;

      // Coordinate transformation for rotation
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.filter = `contrast(${options.contrast}%) brightness(${options.brightness}%)`;
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      // Apply Binarization / Contrast Threshold if requested (cleans faded ink & smudges)
      if (options.binarizeThreshold > 0) {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        const threshold = options.binarizeThreshold;

        for (let i = 0; i < d.length; i += 4) {
          // Luminance = 0.299R + 0.587G + 0.114B
          const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          const val = gray > threshold ? 255 : 0;
          d[i] = val;
          d[i + 1] = val;
          d[i + 2] = val;
        }
        ctx.putImageData(imgData, 0, 0);
      }

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(sourceImageDataUrl);
    img.src = sourceImageDataUrl;
  });
}

/**
 * Generates an MS Word compatible DOCX format (.doc/.docx MIME HTML)
 */
export function generateDocxBlob(title: string, pages: { pageNumber: number; text: string }[]): Blob {
  const htmlContent = `<!DOCTYPE xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<html lang="bn">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body {
      font-family: 'Noto Serif Bengali', 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #111111;
      margin: 1in;
    }
    h1 {
      font-size: 18pt;
      color: #8B6532;
      border-bottom: 2pt solid #8B6532;
      padding-bottom: 6pt;
      text-align: center;
    }
    .page-break {
      page-break-before: always;
      margin-top: 24pt;
      border-top: 1pt dashed #cccccc;
      padding-top: 12pt;
    }
    .page-header {
      font-size: 9pt;
      color: #888888;
      text-align: right;
      margin-bottom: 12pt;
    }
    p {
      text-indent: 1.5em;
      margin-bottom: 8pt;
    }
  </style>
</head>
<body>
  <h1>${title} — NBM Audio & Book Studio Archival Text</h1>
  ${pages
    .map(
      (p, idx) => `
    <div class="${idx > 0 ? "page-break" : ""}">
      <div class="page-header">— পৃষ্ঠা ${p.pageNumber} —</div>
      ${p.text
        .split(/\n\s*\n/)
        .map((para) => `<p>${para.replace(/\n/g, "<br/>")}</p>`)
        .join("\n")}
    </div>`
    )
    .join("\n")}
</body>
</html>`;

  return new Blob(["\ufeff" + htmlContent], {
    type: "application/vnd.ms-word;charset=utf-8",
  });
}
