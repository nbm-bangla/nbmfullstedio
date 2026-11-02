import { SubtitleCue } from "../types";

export function formatTimeSrt(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  const pad = (n: number, z = 2) => String(n).padStart(z, "0");
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(millis, 3)}`;
}

export function formatTimeVtt(seconds: number): string {
  return formatTimeSrt(seconds).replace(",", ".");
}

export function parseSrtTimeToSeconds(timeStr: string): number {
  const clean = timeStr.trim().replace(",", ".");
  const parts = clean.split(":");
  if (parts.length === 3) {
    const hrs = parseFloat(parts[0]);
    const mins = parseFloat(parts[1]);
    const secs = parseFloat(parts[2]);
    return hrs * 3600 + mins * 60 + secs;
  }
  return 0;
}

export function parseSrt(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const normalized = content.replace(/^\uFEFF?WEBVTT[^\r\n]*(?:\r?\n)?/i, "").trim();
  const blocks = normalized.split(/\r?\n\r?\n/);

  let fallbackIndex = 1;
  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;

    let timeLineIndex = lines.findIndex((line) => line.includes("-->"));
    let cueIndex = fallbackIndex;

    if (timeLineIndex < 0 || timeLineIndex > 2) continue;
    if (timeLineIndex > 0 && /^\d+$/.test(lines[timeLineIndex - 1])) {
      cueIndex = parseInt(lines[timeLineIndex - 1], 10);
    }

    const timeLine = lines[timeLineIndex];
    if (!timeLine) continue;

    const [startStr, endStr] = timeLine.split("-->").map((s) => s.trim());
    const startTime = parseSrtTimeToSeconds(startStr);
    const endTime = parseSrtTimeToSeconds(endStr);

    const textLines = lines.slice(timeLineIndex + 1);
    const text = textLines.join("\n");

    cues.push({
      id: `cue-${cueIndex}-${Date.now()}`,
      index: cueIndex,
      startTime,
      endTime,
      text,
    });
    fallbackIndex++;
  }

  return cues;
}

export function exportToSrt(cues: SubtitleCue[]): string {
  return cues
    .map((cue, idx) => {
      const start = formatTimeSrt(cue.startTime);
      const end = formatTimeSrt(cue.endTime);
      const text = cue.translatedText ? `${cue.text}\n${cue.translatedText}` : cue.text;
      return `${idx + 1}\n${start} --> ${end}\n${text}\n`;
    })
    .join("\n");
}

export function exportToVtt(cues: SubtitleCue[]): string {
  const body = cues
    .map((cue, idx) => {
      const start = formatTimeVtt(cue.startTime);
      const end = formatTimeVtt(cue.endTime);
      const text = cue.translatedText ? `${cue.text}\n${cue.translatedText}` : cue.text;
      return `${idx + 1}\n${start} --> ${end}\n${text}\n`;
    })
    .join("\n");
  return `WEBVTT\n\n${body}`;
}

export function downloadTextFile(content: string, filename: string, mimeType = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
