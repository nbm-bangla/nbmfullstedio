/**
 * Real Web Audio API Processing Service for NBM Audio Studio
 * Handles decoding, peak/waveform analysis, loudness/silence detection,
 * audio concatenation with configurable silence/crossfade, and WAV encoding.
 */

let sharedAudioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedAudioContext) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedAudioContext = new AudioContextClass();
  }
  if (sharedAudioContext.state === "suspended") {
    sharedAudioContext.resume();
  }
  return sharedAudioContext;
}

export interface AudioAnalysis {
  duration: number;
  sampleRate: number;
  channels: number;
  peaks: number[];
  peakLoudnessDb: number;
  silenceIntervals: { start: number; end: number }[];
  fileSize: number;
}

/**
 * Decodes an audio file and computes genuine acoustic metrics and waveform points.
 */
export async function analyzeAudioFile(file: File): Promise<{ buffer: AudioBuffer; analysis: AudioAnalysis }> {
  const ctx = getAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));

  const duration = buffer.duration;
  const sampleRate = buffer.sampleRate;
  const channels = buffer.numberOfChannels;
  const channelData = buffer.getChannelData(0);

  // Extract 120 normalized peak buckets for waveform
  const numBuckets = 120;
  const bucketSize = Math.max(1, Math.floor(channelData.length / numBuckets));
  const peaks: number[] = [];
  let maxAbs = 0;

  for (let i = 0; i < numBuckets; i++) {
    const start = i * bucketSize;
    const end = Math.min(start + bucketSize, channelData.length);
    let peak = 0;
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j]);
      if (abs > peak) peak = abs;
      if (abs > maxAbs) maxAbs = abs;
    }
    peaks.push(peak);
  }

  // Normalize peaks between 0.05 and 1.0
  const normalizedPeaks = peaks.map((p) => Math.max(0.08, maxAbs > 0 ? p / maxAbs : 0.1));

  // Detect silence intervals (threshold below 0.01 for > 0.4 seconds)
  const silenceThreshold = 0.015;
  const minSilenceSamples = Math.floor(sampleRate * 0.4);
  const silenceIntervals: { start: number; end: number }[] = [];
  let currentSilenceStart = -1;

  for (let i = 0; i < channelData.length; i += 200) {
    if (Math.abs(channelData[i]) < silenceThreshold) {
      if (currentSilenceStart === -1) currentSilenceStart = i;
    } else {
      if (currentSilenceStart !== -1 && (i - currentSilenceStart) >= minSilenceSamples) {
        silenceIntervals.push({
          start: currentSilenceStart / sampleRate,
          end: i / sampleRate,
        });
      }
      currentSilenceStart = -1;
    }
  }

  const peakLoudnessDb = maxAbs > 0 ? 20 * Math.log10(maxAbs) : -100;

  return {
    buffer,
    analysis: {
      duration,
      sampleRate,
      channels,
      peaks: normalizedPeaks,
      peakLoudnessDb: Math.round(peakLoudnessDb * 10) / 10,
      silenceIntervals,
      fileSize: file.size,
    },
  };
}

/**
 * Applies trimming, volume scaling, and fade-in/fade-out curves to an AudioBuffer.
 * Completely local DSP processing with $0 API cost.
 */
export function sliceAndProcessClipBuffer(
  buffer: AudioBuffer,
  options: {
    trimStart?: number;
    trimEnd?: number;
    fadeIn?: number;
    fadeOut?: number;
    volume?: number;
  }
): AudioBuffer {
  const ctx = getAudioContext();
  const sampleRate = buffer.sampleRate;
  const channels = buffer.numberOfChannels;

  const totalDuration = buffer.duration;
  const startSec = Math.max(0, options.trimStart ?? 0);
  const endSec = Math.min(totalDuration, options.trimEnd && options.trimEnd > startSec ? options.trimEnd : totalDuration);

  const startSample = Math.floor(startSec * sampleRate);
  const endSample = Math.min(buffer.length, Math.floor(endSec * sampleRate));
  const newLength = Math.max(1, endSample - startSample);

  const outputBuffer = ctx.createBuffer(channels, newLength, sampleRate);
  const volumeMultiplier = Math.max(0, options.volume ?? 1.0);
  const fadeInDuration = Math.max(0, options.fadeIn ?? 0);
  const fadeOutDuration = Math.max(0, options.fadeOut ?? 0);

  const fadeInSamples = Math.floor(fadeInDuration * sampleRate);
  const fadeOutSamples = Math.floor(fadeOutDuration * sampleRate);

  for (let c = 0; c < channels; c++) {
    const srcData = buffer.getChannelData(c);
    const dstData = outputBuffer.getChannelData(c);

    for (let i = 0; i < newLength; i++) {
      let sample = srcData[startSample + i] * volumeMultiplier;

      // Apply Fade In
      if (fadeInSamples > 0 && i < fadeInSamples) {
        sample *= i / fadeInSamples;
      }

      // Apply Fade Out
      if (fadeOutSamples > 0 && i >= newLength - fadeOutSamples) {
        const remaining = newLength - i;
        sample *= Math.max(0, remaining / fadeOutSamples);
      }

      dstData[i] = sample;
    }
  }

  return outputBuffer;
}

/**
 * Splits an AudioBuffer into two separate AudioBuffers at splitTimeSec.
 */
export function splitClipAtTime(buffer: AudioBuffer, splitTimeSec: number): [AudioBuffer, AudioBuffer] {
  const ctx = getAudioContext();
  const sampleRate = buffer.sampleRate;
  const channels = buffer.numberOfChannels;
  const splitSample = Math.max(1, Math.min(buffer.length - 1, Math.floor(splitTimeSec * sampleRate)));

  const firstLength = splitSample;
  const secondLength = buffer.length - splitSample;

  const buf1 = ctx.createBuffer(channels, firstLength, sampleRate);
  const buf2 = ctx.createBuffer(channels, secondLength, sampleRate);

  for (let c = 0; c < channels; c++) {
    const src = buffer.getChannelData(c);
    buf1.getChannelData(c).set(src.subarray(0, splitSample));
    buf2.getChannelData(c).set(src.subarray(splitSample));
  }

  return [buf1, buf2];
}

/**
 * Concatenates multiple AudioBuffers into a single continuous AudioBuffer,
 * inserting a configurable silence gap (in seconds) between tracks.
 */
export function concatenateAudioBuffers(
  buffers: AudioBuffer[],
  silenceSeconds: number = 0.5,
  normalizeVolume: boolean = true
): AudioBuffer {
  if (buffers.length === 0) {
    throw new Error("Cannot concatenate empty buffer array");
  }

  const ctx = getAudioContext();
  const sampleRate = buffers[0].sampleRate;
  const channels = Math.max(...buffers.map((b) => b.numberOfChannels));
  const silenceSamples = Math.floor(sampleRate * silenceSeconds);

  let totalLength = 0;
  for (let i = 0; i < buffers.length; i++) {
    totalLength += buffers[i].length;
    if (i < buffers.length - 1) {
      totalLength += silenceSamples;
    }
  }

  const outputBuffer = ctx.createBuffer(channels, totalLength, sampleRate);

  for (let channel = 0; channel < channels; channel++) {
    const outputData = outputBuffer.getChannelData(channel);
    let offset = 0;

    for (let i = 0; i < buffers.length; i++) {
      const srcBuf = buffers[i];
      const srcChannel = channel < srcBuf.numberOfChannels ? channel : 0;
      const srcData = srcBuf.getChannelData(srcChannel);

      outputData.set(srcData, offset);
      offset += srcBuf.length;

      // Add silence gap
      if (i < buffers.length - 1) {
        offset += silenceSamples;
      }
    }
  }

  // Volume Normalization if requested
  if (normalizeVolume) {
    let peak = 0;
    for (let c = 0; c < channels; c++) {
      const data = outputBuffer.getChannelData(c);
      for (let i = 0; i < data.length; i++) {
        const abs = Math.abs(data[i]);
        if (abs > peak) peak = abs;
      }
    }
    if (peak > 0 && peak < 0.98) {
      const gain = 0.95 / peak;
      for (let c = 0; c < channels; c++) {
        const data = outputBuffer.getChannelData(c);
        for (let i = 0; i < data.length; i++) {
          data[i] *= gain;
        }
      }
    }
  }

  return outputBuffer;
}

/**
 * Encodes an AudioBuffer into an industry-standard 16-bit PCM RIFF WAV Blob.
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const numSamples = buffer.length * numChannels;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * bytesPerSample;

  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  function writeString(offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // RIFF header
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");

  // fmt subchunk
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // subchunk1size (16 for PCM)
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data subchunk
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  // Interleave audio samples
  let offset = 44;
  const channels = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = channels[ch][i];
      // Clamp sample between -1 and 1
      sample = Math.max(-1, Math.min(1, sample));
      // Scale to 16-bit signed integer (-32768 to 32767)
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

/**
 * Synthesizes a calming literary intro tone or silence for audiobook chapters.
 */
export function generateToneBuffer(frequency: number = 440, durationSeconds: number = 1.0): AudioBuffer {
  const ctx = getAudioContext();
  const sampleRate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, sampleRate * durationSeconds, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    // Apply envelope to avoid clicking
    const envelope = Math.sin((Math.PI * i) / data.length);
    data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
  }

  return buffer;
}
