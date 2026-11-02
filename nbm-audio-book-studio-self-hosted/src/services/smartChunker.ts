/**
 * Smart Literary Sentence & Paragraph Chunker
 * Ensures no text block exceeds ~40 words / ~250 characters,
 * preventing Gemini TTS from truncating audio at the 25-30s unary limit.
 * Preserves Bengali Unicode characters, dāri (।), quotation marks, and commas.
 */

export interface TextChunkItem {
  index: number;
  text: string;
  wordCount: number;
  charCount: number;
}

/**
 * Splits literary prose or poetry into safe, bite-sized narration chunks.
 * Target chunk size: 30-45 words (~15-25 seconds of natural speech).
 */
export function splitTextIntoNarrationChunks(
  rawText: string,
  maxWords: number = 42
): TextChunkItem[] {
  if (!rawText || !rawText.trim()) return [];

  // 1. First split by major paragraph boundaries
  const initialParagraphs = rawText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Merge standalone bracketed cues into following paragraph so they never form empty speech chunks
  const rawParagraphs: string[] = [];
  for (let i = 0; i < initialParagraphs.length; i++) {
    const current = initialParagraphs[i];
    if (/^\[[^\]]+\]$/.test(current) && i + 1 < initialParagraphs.length) {
      initialParagraphs[i + 1] = `${current}\n${initialParagraphs[i + 1]}`;
    } else {
      rawParagraphs.push(current);
    }
  }

  const chunks: string[] = [];

  for (const para of rawParagraphs) {
    const paraWords = para.split(/\s+/).filter(Boolean);

    // If paragraph is already within limit, keep it as is
    if (paraWords.length <= maxWords) {
      chunks.push(para);
      continue;
    }

    // 2. Otherwise split on Bengali sentence terminators: । (dari), !, ?, or single newline (with or without space)
    const sentences = para
      .split(/(?<=[।!?\n])\s*/)
      .map((s) => s.trim())
      .filter(Boolean);

    let currentGroup: string[] = [];
    let currentWordCount = 0;

    for (const sentence of sentences) {
      const sentenceWords = sentence.split(/\s+/).filter(Boolean);

      // If this single sentence is still larger than maxWords, break at clauses or words
      if (sentenceWords.length > maxWords) {
        // Flush previous accumulated group
        if (currentGroup.length > 0) {
          chunks.push(currentGroup.join(" "));
          currentGroup = [];
          currentWordCount = 0;
        }

        // Sub-split sentence on commas, semicolons, dashes, colons
        const clauses = sentence
          .split(/(?<=[,;—–:])\s*/)
          .map((c) => c.trim())
          .filter(Boolean);

        let clauseGroup: string[] = [];
        let clauseWords = 0;

        for (const clause of clauses) {
          const cw = clause.split(/\s+/).filter(Boolean).length;
          if (cw > maxWords) {
            // If even a clause exceeds maxWords, split strictly by words so no word is dropped
            if (clauseGroup.length > 0) {
              chunks.push(clauseGroup.join(" "));
              clauseGroup = [];
              clauseWords = 0;
            }
            const words = clause.split(/\s+/).filter(Boolean);
            for (let w = 0; w < words.length; w += maxWords) {
              chunks.push(words.slice(w, w + maxWords).join(" "));
            }
          } else if (clauseWords + cw > maxWords && clauseGroup.length > 0) {
            chunks.push(clauseGroup.join(" "));
            clauseGroup = [clause];
            clauseWords = cw;
          } else {
            clauseGroup.push(clause);
            clauseWords += cw;
          }
        }

        if (clauseGroup.length > 0) {
          chunks.push(clauseGroup.join(" "));
        }
      } else {
        // Normal sentence accumulation
        if (currentWordCount + sentenceWords.length > maxWords && currentGroup.length > 0) {
          chunks.push(currentGroup.join(" "));
          currentGroup = [sentence];
          currentWordCount = sentenceWords.length;
        } else {
          currentGroup.push(sentence);
          currentWordCount += sentenceWords.length;
        }
      }
    }

    if (currentGroup.length > 0) {
      chunks.push(currentGroup.join(" "));
    }
  }

  return chunks.map((text, idx) => ({
    index: idx + 1,
    text,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    charCount: text.length,
  }));
}
