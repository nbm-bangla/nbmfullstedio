/**
 * Persistent Storage for Audio Studio & Audiobook Projects using IndexedDB.
 * Ensures audio files and buffers survive browser reloads without depending on volatile blob: URLs.
 */

import { AudiobookProject, VoiceNarrationProject, VideoProject } from "../types";

const DB_NAME = "nbm_audio_studio_db";
const DB_VERSION = 3;
const BLOB_STORE = "audio_blobs";
const PROJECT_STORE = "audio_projects";
const VOICE_PROJECT_STORE = "voice_projects";
const VIDEO_PROJECT_STORE = "video_projects";
const TRANSCRIPT_CACHE_KEY = "nbm_transcript_cache_v1";
const TTS_CACHE_KEY = "nbm_tts_cache_v1";

export interface TtsCacheRecord {
  audioBlobId: string;
  durationSeconds: number;
  fileSizeBytes: number;
  voice: string;
  style: string;
  speed: number;
  model?: string;
  language?: string;
  textSnippet: string;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(PROJECT_STORE)) {
        db.createObjectStore(PROJECT_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(VOICE_PROJECT_STORE)) {
        db.createObjectStore(VOICE_PROJECT_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(VIDEO_PROJECT_STORE)) {
        db.createObjectStore(VIDEO_PROJECT_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Stores an Audio Blob permanently in IndexedDB.
 */
export async function saveAudioBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, "readwrite");
    const store = tx.objectStore(BLOB_STORE);
    store.put({ id, blob, updatedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Retrieves an Audio Blob from IndexedDB.
 */
export async function getAudioBlob(id: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, "readonly");
    const store = tx.objectStore(BLOB_STORE);
    const request = store.get(id);
    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.blob : null);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Deletes an Audio Blob from IndexedDB.
 */
export async function deleteAudioBlob(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, "readwrite");
    const store = tx.objectStore(BLOB_STORE);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Stores an Audiobook Project in IndexedDB.
 */
export async function saveAudioProject(project: AudiobookProject): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROJECT_STORE, "readwrite");
    const store = tx.objectStore(PROJECT_STORE);
    store.put(project);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Retrieves all saved Audiobook Projects from IndexedDB.
 */
export async function loadAudioProjects(): Promise<AudiobookProject[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROJECT_STORE, "readonly");
    const store = tx.objectStore(PROJECT_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Deletes an Audiobook Project and its associated blobs.
 */
export async function deleteAudioProject(id: string, clipIds: string[] = []): Promise<void> {
  const db = await openDB();
  for (const clipId of clipIds) {
    try {
      await deleteAudioBlob(clipId);
    } catch {
      // ignore individual clip delete failure
    }
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROJECT_STORE, "readwrite");
    const store = tx.objectStore(PROJECT_STORE);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Computes a deterministic SHA-256 hash for an audio file/blob.
 * Used for cache checking so repeated files never call Speech-to-Text API unnecessarily.
 */
export async function computeFileHash(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  // If file is very large (> 20MB), hash header + middle + tail to be blazing fast
  let bytesToHash: ArrayBuffer;
  if (buffer.byteLength > 20 * 1024 * 1024) {
    const head = new Uint8Array(buffer, 0, 1024 * 512);
    const mid = new Uint8Array(buffer, Math.floor(buffer.byteLength / 2), 1024 * 512);
    const tail = new Uint8Array(buffer, buffer.byteLength - 1024 * 512, 1024 * 512);
    const merged = new Uint8Array(head.length + mid.length + tail.length);
    merged.set(head, 0);
    merged.set(mid, head.length);
    merged.set(tail, head.length + mid.length);
    bytesToHash = merged.buffer;
  } else {
    bytesToHash = buffer;
  }

  const hashBuffer = await crypto.subtle.digest("SHA-256", bytesToHash);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Transcript Cache: Keyed by file SHA-256 hash
 */
export function getCachedTranscript(hash: string): string | null {
  try {
    const raw = localStorage.getItem(TRANSCRIPT_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    return cache[hash] || null;
  } catch {
    return null;
  }
}

export function setCachedTranscript(hash: string, transcript: string): void {
  try {
    const raw = localStorage.getItem(TRANSCRIPT_CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[hash] = transcript;
    localStorage.setItem(TRANSCRIPT_CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.warn("Could not write transcript cache:", err);
  }
}

/**
 * Computes deterministic SHA-256 hash for a TTS chunk based on text and voice parameters.
 */
export async function computeTtsChunkHash(
  text: string,
  voice: string,
  style: string,
  speed: number,
  model: string = "gemini-3.8-flash-lite-tts",
  language: string = "Bengali"
): Promise<string> {
  const normalized = `${model.trim().toLowerCase()}::${language.trim().toLowerCase()}::${voice.trim().toLowerCase()}::${style.trim().toLowerCase()}::${speed.toFixed(2)}::${text.trim()}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function getTtsCacheRecord(hash: string): TtsCacheRecord | null {
  try {
    const raw = localStorage.getItem(TTS_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    return cache[hash] || null;
  } catch {
    return null;
  }
}

export function setTtsCacheRecord(hash: string, record: TtsCacheRecord): void {
  try {
    const raw = localStorage.getItem(TTS_CACHE_KEY);
    const cache: Record<string, TtsCacheRecord> = raw ? JSON.parse(raw) : {};
    cache[hash] = record;
    // Cap cache at 300 entries to prevent localStorage bloat
    const keys = Object.keys(cache);
    if (keys.length > 300) {
      delete cache[keys[0]];
    }
    localStorage.setItem(TTS_CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.warn("Could not write TTS cache record:", err);
  }
}

export function getAllTtsCache(): Record<string, TtsCacheRecord> {
  try {
    const raw = localStorage.getItem(TTS_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function clearTtsCache(): void {
  try {
    localStorage.removeItem(TTS_CACHE_KEY);
  } catch (err) {
    console.warn("Could not clear TTS cache:", err);
  }
}

/**
 * Voice Narration Projects IndexedDB persistence
 */
export async function saveVoiceProject(project: VoiceNarrationProject): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VOICE_PROJECT_STORE, "readwrite");
    const store = tx.objectStore(VOICE_PROJECT_STORE);
    store.put(project);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadVoiceProjects(): Promise<VoiceNarrationProject[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VOICE_PROJECT_STORE, "readonly");
    const store = tx.objectStore(VOICE_PROJECT_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteVoiceProject(id: string, chunkBlobIds: string[] = []): Promise<void> {
  const db = await openDB();
  for (const blobId of chunkBlobIds) {
    try {
      await deleteAudioBlob(blobId);
    } catch {
      // ignore individual blob error
    }
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(VOICE_PROJECT_STORE, "readwrite");
    const store = tx.objectStore(VOICE_PROJECT_STORE);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Video Projects IndexedDB persistence
 */
export async function saveVideoProject(project: VideoProject): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VIDEO_PROJECT_STORE, "readwrite");
    const store = tx.objectStore(VIDEO_PROJECT_STORE);
    store.put(project);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadVideoProjects(): Promise<VideoProject[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VIDEO_PROJECT_STORE, "readonly");
    const store = tx.objectStore(VIDEO_PROJECT_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteVideoProject(id: string, blobIds: string[] = []): Promise<void> {
  const db = await openDB();
  for (const blobId of blobIds) {
    try {
      await deleteAudioBlob(blobId);
    } catch {
      // ignore individual blob error
    }
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(VIDEO_PROJECT_STORE, "readwrite");
    const store = tx.objectStore(VIDEO_PROJECT_STORE);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Narration Generation History & Active Draft Persistence
 */
const NARRATION_HISTORY_KEY = "nbm_narration_history_v1";
const ACTIVE_VOICE_DRAFT_KEY = "nbm_active_voice_draft_v1";

export interface NarrationHistoryItem {
  id: string;
  title: string;
  text: string;
  fullText?: string;
  snippet?: string;
  voice: string;
  model: string;
  language?: string;
  speed?: number;
  durationSeconds: number;
  durationFormatted?: string;
  fileSizeBytes: number;
  audioBlobId: string;
  timestamp: number;
  createdAtFormatted?: string;
}

export interface VoiceDraftData {
  scriptText: string;
  projectTitle?: string;
  authorName?: string;
  voiceName?: string;
  voiceStyle?: string;
  speed?: number;
  silenceGap?: number;
  selectedModel?: string;
  selectedLanguage?: string;
  chunkMode?: string;
  wordLimit?: number;
  activeTab?: string;
  updatedAt?: number;
}

export function saveActiveVoiceDraft(draft: VoiceDraftData): void {
  try {
    localStorage.setItem(ACTIVE_VOICE_DRAFT_KEY, JSON.stringify(draft));
  } catch (e) {
    console.warn("Could not save active voice draft:", e);
  }
}

export function loadActiveVoiceDraft(): any | null {
  try {
    const raw = localStorage.getItem(ACTIVE_VOICE_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearActiveVoiceDraft(): void {
  try {
    localStorage.removeItem(ACTIVE_VOICE_DRAFT_KEY);
  } catch {
    // ignore
  }
}

export async function saveNarrationHistory(item: NarrationHistoryItem): Promise<void> {
  try {
    const existing = await loadNarrationHistory();
    const filtered = existing.filter((h) => h.id !== item.id);
    const updated = [item, ...filtered].slice(0, 100);
    localStorage.setItem(NARRATION_HISTORY_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Could not save narration history:", err);
  }
}

export async function loadNarrationHistory(): Promise<NarrationHistoryItem[]> {
  try {
    const raw = localStorage.getItem(NARRATION_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function deleteNarrationHistoryItem(id: string, audioBlobId?: string): Promise<void> {
  try {
    if (audioBlobId) {
      await deleteAudioBlob(audioBlobId);
    }
    const existing = await loadNarrationHistory();
    const updated = existing.filter((h) => h.id !== id);
    localStorage.setItem(NARRATION_HISTORY_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Could not delete narration history item:", err);
  }
}

export async function clearNarrationHistory(): Promise<void> {
  try {
    const existing = await loadNarrationHistory();
    for (const item of existing) {
      if (item.audioBlobId) {
        try {
          await deleteAudioBlob(item.audioBlobId);
        } catch {
          // ignore
        }
      }
    }
    localStorage.removeItem(NARRATION_HISTORY_KEY);
  } catch (err) {
    console.warn("Could not clear narration history:", err);
  }
}



