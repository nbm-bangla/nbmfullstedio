/**
 * Web Audio Native Ambience & Soundscape Synthesizer
 * 100% browser-native synthesis with zero external audio assets or broken links.
 * Features: Melancholic Bansuri, Mountain Wind, River Ripples, Tanpura Drone, War Drums.
 * Includes smooth Auto-Ducking when narration voice is active.
 */

import { getAudioContext } from "./audioEngine";

export type AmbienceType =
  | "bansuri"
  | "mountain-wind"
  | "river-waves"
  | "tanpura"
  | "war-drums";

export interface AmbienceTrackInfo {
  id: AmbienceType;
  title: string;
  bengaliName: string;
  description: string;
  mood: string;
}

export const AMBIENCE_TRACKS: AmbienceTrackInfo[] = [
  {
    id: "bansuri",
    title: "Melancholic Bamboo Flute",
    bengaliName: "রাগ ভৈরবী ও দরবারী সুরের বিষণ্ণ বাঁশি",
    description: "কোমল রে ও ধৈবতের করুণ আলাপ, একাকী বাঁশির বিষাদময় সুর",
    mood: "গভীর করুণ ও ভাবালু",
  },
  {
    id: "mountain-wind",
    title: "Mountain Wind & Cold Breeze",
    bengaliName: "ওয়াজিরিস্তান ও নির্জন পাহাড়ের গিরিবাতাস",
    description: "পাথুরে গিরিখাদের দীর্ঘশ্বাস ও শীতল বাতাসের একটানা মর্মর ধ্বনি",
    mood: "নিঃসঙ্গ ও রহস্যময়",
  },
  {
    id: "river-waves",
    title: "River Waves & Water Ripples",
    bengaliName: "ঝিলম নদীর শান্ত কলতান",
    description: "তীরে আছড়ে পড়া মৃদু জলতরঙ্গ ও চঞ্চল স্রোতের শান্ত ছন্দ",
    mood: "প্রশান্ত ও ধ্যানমগ্ন",
  },
  {
    id: "tanpura",
    title: "Classical Indian Tanpura Drone",
    bengaliName: "শাস্ত্রীয় তানপুরা ড্রোন (Sa-Pa-Sa-Sa)",
    description: "সা-পা-সা-সা সুরের অবিরাম অনুনাদ, গম্ভীর সাহিত্যিক আবৃত্তি উপযোগী",
    mood: "শাস্ত্রীয় ও অবিচল",
  },
  {
    id: "war-drums",
    title: "Desert War Drums & Somber Elegy",
    bengaliName: "রণসংগীতের মাদল ও অন্তিম শোকগাথা",
    description: "ধীরলয়ের ভারী মাদল ও দূরবর্তী দামামার গম্ভীর স্পন্দন",
    mood: "নাটকীয় ও ঐতিহাসিক",
  },
];

class AmbienceSynthesizer {
  private activeTrack: AmbienceType | null = null;
  private masterGain: GainNode | null = null;
  private duckGain: GainNode | null = null;
  private activeNodes: { stop: () => void }[] = [];
  private userVolume: number = 0.35;
  private isDucked: boolean = false;
  private timerIds: number[] = [];

  private setupGainTree(ctx: AudioContext) {
    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.userVolume, ctx.currentTime);

      this.duckGain = ctx.createGain();
      this.duckGain.gain.setValueAtTime(1.0, ctx.currentTime);

      this.duckGain.connect(this.masterGain);
      this.masterGain.connect(ctx.destination);
    }
  }

  public getActiveTrack(): AmbienceType | null {
    return this.activeTrack;
  }

  public getUserVolume(): number {
    return this.userVolume;
  }

  public setVolume(volume: number) {
    this.userVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      const ctx = getAudioContext();
      this.masterGain.gain.setTargetAtTime(this.userVolume, ctx.currentTime, 0.05);
    }
  }

  /**
   * Auto-Ducking: When narrator speaks, ambience drops to 18% volume;
   * when narrator pauses or stops, it swells back up smoothly to 100%.
   */
  public setDucking(duck: boolean) {
    this.isDucked = duck;
    if (this.duckGain) {
      const ctx = getAudioContext();
      const targetGain = duck ? 0.18 : 1.0;
      this.duckGain.gain.setTargetAtTime(targetGain, ctx.currentTime, duck ? 0.15 : 0.4);
    }
  }

  public stop() {
    this.timerIds.forEach((id) => window.clearTimeout(id));
    this.timerIds = [];

    this.activeNodes.forEach((n) => {
      try {
        n.stop();
      } catch {
        // ignore
      }
    });
    this.activeNodes = [];
    this.activeTrack = null;
  }

  public play(trackType: AmbienceType) {
    this.stop();
    const ctx = getAudioContext();
    this.setupGainTree(ctx);
    this.activeTrack = trackType;

    switch (trackType) {
      case "bansuri":
        this.startBansuri(ctx);
        break;
      case "mountain-wind":
        this.startMountainWind(ctx);
        break;
      case "river-waves":
        this.startRiverWaves(ctx);
        break;
      case "tanpura":
        this.startTanpura(ctx);
        break;
      case "war-drums":
        this.startWarDrums(ctx);
        break;
    }
  }

  /**
   * 1. Melancholic Bansuri (রাগ ভৈরবী - কোমল রে, কোমল ধা, মা, পা)
   */
  private startBansuri(ctx: AudioContext) {
    if (!this.duckGain) return;

    // Raga Bhairavi scale frequencies (Sa=C4 ~ 261.63Hz)
    // Sa(261.63), Re_komal(277.18), Ga_komal(311.13), Ma(349.23), Pa(392.00), Dha_komal(415.30), Ni_komal(466.16), Sa(523.25)
    const notes = [
      261.63, 277.18, 311.13, 349.23, 392.0, 415.3, 392.0, 349.23, 311.13, 277.18,
      261.63, 196.0, 220.0, 261.63,
    ];

    let noteIdx = 0;
    let isRunning = true;

    const playNextNote = () => {
      if (!isRunning || this.activeTrack !== "bansuri") return;

      const freq = notes[noteIdx % notes.length];
      noteIdx++;

      const osc = ctx.createOscillator();
      const breathNoise = ctx.createBufferSource();
      const breathGain = ctx.createGain();
      const vibrato = ctx.createOscillator();
      const vibratoGain = ctx.createGain();
      const noteGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Flute timbre: pure sine + subtle triangle
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // Vibrato LFO (5.2Hz)
      vibrato.frequency.setValueAtTime(5.2, ctx.currentTime);
      vibratoGain.gain.setValueAtTime(freq * 0.018, ctx.currentTime);
      vibrato.connect(osc.frequency);

      // Breathy sound generator
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      breathNoise.buffer = noiseBuffer;
      breathNoise.loop = true;

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(freq * 1.8, ctx.currentTime);
      filter.Q.setValueAtTime(3.5, ctx.currentTime);

      breathGain.gain.setValueAtTime(0.04, ctx.currentTime);
      breathNoise.connect(filter);
      filter.connect(breathGain);
      breathGain.connect(noteGain);

      // Breath envelope (slow swell and soft release)
      const now = ctx.currentTime;
      const noteDuration = 2.4 + Math.random() * 0.8;
      noteGain.gain.setValueAtTime(0, now);
      noteGain.gain.linearRampToValueAtTime(0.28, now + 0.6);
      noteGain.gain.setTargetAtTime(0.001, now + noteDuration - 0.7, 0.4);

      osc.connect(noteGain);
      noteGain.connect(this.duckGain!);

      osc.start(now);
      vibrato.start(now);
      breathNoise.start(now);

      const stopTime = now + noteDuration;
      osc.stop(stopTime);
      vibrato.stop(stopTime);
      breathNoise.stop(stopTime);

      const nextTimer = window.setTimeout(playNextNote, (noteDuration - 0.4) * 1000);
      this.timerIds.push(nextTimer);
    };

    playNextNote();

    this.activeNodes.push({
      stop: () => {
        isRunning = false;
      },
    });
  }

  /**
   * 2. Mountain Wind (ওয়াজিরিস্তান ও নির্জন পাহাড়ের গিরিবাতাস)
   */
  private startMountainWind(ctx: AudioContext) {
    if (!this.duckGain) return;

    const bufferSize = ctx.sampleRate * 3;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    // Pink noise generation
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    // Sweeping bandpass filter to simulate gusts
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(280, ctx.currentTime);
    filter.Q.setValueAtTime(2.2, ctx.currentTime);

    // LFO for wind gust swelling
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.12, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(240, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.22, ctx.currentTime);

    noise.connect(filter);
    filter.connect(windGain);
    windGain.connect(this.duckGain);

    noise.start();
    lfo.start();

    this.activeNodes.push({
      stop: () => {
        try {
          noise.stop();
          lfo.stop();
        } catch {
          // ignore
        }
      },
    });
  }

  /**
   * 3. River Waves & Ripples (ঝিলম নদীর শান্ত কলতান)
   */
  private startRiverWaves(ctx: AudioContext) {
    if (!this.duckGain) return;

    const bufferSize = ctx.sampleRate * 3;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(650, ctx.currentTime);

    // Wave swell LFO
    const swellLfo = ctx.createOscillator();
    swellLfo.frequency.setValueAtTime(0.22, ctx.currentTime);
    const swellGain = ctx.createGain();
    swellGain.gain.setValueAtTime(0.18, ctx.currentTime);
    swellLfo.connect(swellGain.gain);

    noise.connect(lowpass);
    lowpass.connect(swellGain);
    swellGain.connect(this.duckGain);

    noise.start();
    swellLfo.start();

    this.activeNodes.push({
      stop: () => {
        try {
          noise.stop();
          swellLfo.stop();
        } catch {
          // ignore
        }
      },
    });
  }

  /**
   * 4. Tanpura Drone (Sa-Pa-Sa-Sa: C3, G3, C4, C4)
   */
  private startTanpura(ctx: AudioContext) {
    if (!this.duckGain) return;

    // Sa1=130.81 (C3), Pa=196.00 (G3), Sa2=261.63 (C4), Sa3=261.63 (C4)
    const stringFreqs = [130.81, 196.0, 261.63, 261.63];
    let stringIdx = 0;
    let isRunning = true;

    const pluckString = () => {
      if (!isRunning || this.activeTrack !== "tanpura") return;

      const freq = stringFreqs[stringIdx % stringFreqs.length];
      stringIdx++;

      // Rich harmonic series for genuine Tanpura jawari buzz
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const osc3 = ctx.createOscillator();
      const stringGain = ctx.createGain();

      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(freq, ctx.currentTime);

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(freq * 2, ctx.currentTime);

      osc3.type = "sine";
      osc3.frequency.setValueAtTime(freq * 3, ctx.currentTime);

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1400, ctx.currentTime);

      const now = ctx.currentTime;
      const decayTime = 4.2;

      stringGain.gain.setValueAtTime(0, now);
      stringGain.gain.linearRampToValueAtTime(0.18, now + 0.12);
      stringGain.gain.exponentialRampToValueAtTime(0.001, now + decayTime);

      osc1.connect(filter);
      osc2.connect(filter);
      osc3.connect(filter);
      filter.connect(stringGain);
      stringGain.connect(this.duckGain!);

      osc1.start(now);
      osc2.start(now);
      osc3.start(now);

      osc1.stop(now + decayTime);
      osc2.stop(now + decayTime);
      osc3.stop(now + decayTime);

      const nextTimer = window.setTimeout(pluckString, 1100);
      this.timerIds.push(nextTimer);
    };

    pluckString();

    this.activeNodes.push({
      stop: () => {
        isRunning = false;
      },
    });
  }

  /**
   * 5. Desert War Drums & Somber Elegy (রণসংগীতের মাদল ও অন্তিম শোকগাথা)
   */
  private startWarDrums(ctx: AudioContext) {
    if (!this.duckGain) return;

    let isRunning = true;
    let beat = 0;

    const playDrumHit = () => {
      if (!isRunning || this.activeTrack !== "war-drums") return;

      const now = ctx.currentTime;
      const isAccent = beat % 4 === 0;
      beat++;

      // Drum oscillator (pitch drops rapidly like a real membrane)
      const osc = ctx.createOscillator();
      const drumGain = ctx.createGain();

      const startFreq = isAccent ? 98 : 78;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.45);

      drumGain.gain.setValueAtTime(isAccent ? 0.32 : 0.22, now);
      drumGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(drumGain);
      drumGain.connect(this.duckGain!);

      osc.start(now);
      osc.stop(now + 0.65);

      const interval = isAccent ? 1600 : 800;
      const nextTimer = window.setTimeout(playDrumHit, interval);
      this.timerIds.push(nextTimer);
    };

    playDrumHit();

    this.activeNodes.push({
      stop: () => {
        isRunning = false;
      },
    });
  }
}

export const ambienceSynthesizer = new AmbienceSynthesizer();
