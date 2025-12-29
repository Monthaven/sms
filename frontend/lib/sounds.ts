/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

/**
 * Sound playback utilities for alerts and notifications
 */

export type SoundType = 
  | "ring"
  | "message" 
  | "reminder"
  | "alert"
  | "success"
  | "error"
  | "call_end"
  | "dtmf";

// Sound file paths
const SOUND_FILES: Record<SoundType, string> = {
  ring: "/sounds/ring.mp3",
  message: "/sounds/message.mp3",
  reminder: "/sounds/reminder.mp3",
  alert: "/sounds/alert.mp3",
  success: "/sounds/success.mp3",
  error: "/sounds/error.mp3",
  call_end: "/sounds/call-end.mp3",
  dtmf: "/sounds/dtmf.mp3",
};

// Audio element cache
const audioCache = new Map<SoundType, HTMLAudioElement>();

// Volume settings
let globalVolume = 1.0;
let muted = false;

/**
 * Initialize audio elements
 */
function getAudio(type: SoundType): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;

  if (!audioCache.has(type)) {
    const audio = new Audio(SOUND_FILES[type]);
    audio.preload = "auto";
    audioCache.set(type, audio);
  }

  return audioCache.get(type) || null;
}

/**
 * Play a sound effect
 */
export function playSound(type: SoundType, options?: { volume?: number; loop?: boolean }): void {
  if (typeof window === "undefined" || muted) return;

  const audio = getAudio(type);
  if (!audio) return;

  try {
    // Reset if already playing
    audio.pause();
    audio.currentTime = 0;
    
    // Set options
    audio.volume = (options?.volume ?? 1.0) * globalVolume;
    audio.loop = options?.loop ?? false;

    // Play
    audio.play().catch((err) => {
      // Autoplay policy may block - ignore
      console.debug("Sound playback blocked:", err);
    });
  } catch (err) {
    console.error("Failed to play sound:", err);
  }
}

/**
 * Stop a looping sound
 */
export function stopSound(type: SoundType): void {
  const audio = audioCache.get(type);
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    audio.loop = false;
  }
}

/**
 * Stop all sounds
 */
export function stopAllSounds(): void {
  audioCache.forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
    audio.loop = false;
  });
}

/**
 * Set global volume (0.0 - 1.0)
 */
export function setVolume(volume: number): void {
  globalVolume = Math.max(0, Math.min(1, volume));
  // Update all cached audio elements
  audioCache.forEach((audio) => {
    audio.volume = globalVolume;
  });
}

/**
 * Get current volume
 */
export function getVolume(): number {
  return globalVolume;
}

/**
 * Mute/unmute all sounds
 */
export function setMuted(isMuted: boolean): void {
  muted = isMuted;
  if (muted) {
    stopAllSounds();
  }
}

/**
 * Check if muted
 */
export function isMuted(): boolean {
  return muted;
}

/**
 * Preload all sounds
 */
export function preloadSounds(): void {
  if (typeof window === "undefined") return;

  Object.keys(SOUND_FILES).forEach((type) => {
    getAudio(type as SoundType);
  });
}

/**
 * Play DTMF tone for a specific digit
 */
export function playDtmfTone(digit: string): void {
  // For now, use generic DTMF sound
  // Could enhance with Web Audio API for actual DTMF frequencies
  playSound("dtmf", { volume: 0.3 });
}

// DTMF frequencies for reference (Hz)
export const DTMF_FREQUENCIES: Record<string, [number, number]> = {
  "1": [697, 1209],
  "2": [697, 1336],
  "3": [697, 1477],
  "4": [770, 1209],
  "5": [770, 1336],
  "6": [770, 1477],
  "7": [852, 1209],
  "8": [852, 1336],
  "9": [852, 1477],
  "*": [941, 1209],
  "0": [941, 1336],
  "#": [941, 1477],
  "A": [697, 1633],
  "B": [770, 1633],
  "C": [852, 1633],
  "D": [941, 1633],
};

/**
 * Generate DTMF tone using Web Audio API
 */
export function generateDtmfTone(digit: string, duration = 150): void {
  if (typeof window === "undefined" || muted) return;

  const frequencies = DTMF_FREQUENCIES[digit];
  if (!frequencies) return;

  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    
    const [lowFreq, highFreq] = frequencies;
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator1.frequency.value = lowFreq;
    oscillator2.frequency.value = highFreq;
    oscillator1.type = "sine";
    oscillator2.type = "sine";

    gainNode.gain.value = globalVolume * 0.3;

    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator1.start();
    oscillator2.start();

    setTimeout(() => {
      oscillator1.stop();
      oscillator2.stop();
      audioContext.close();
    }, duration);
  } catch (err) {
    // Fallback to pre-recorded sound
    playSound("dtmf", { volume: 0.3 });
  }
}
