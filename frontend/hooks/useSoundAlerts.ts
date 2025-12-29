/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import { useCallback, useRef, useEffect } from "react";

type SoundType = 
  | "incoming-call"
  | "outgoing-call"
  | "call-connected"
  | "call-ended"
  | "incoming-message"
  | "outgoing-message"
  | "notification"
  | "error"
  | "success"
  | "dtmf";

// Sound URLs - these can be customized or use Web Audio API tones
const SOUND_URLS: Record<SoundType, string> = {
  "incoming-call": "/sounds/incoming-call.mp3",
  "outgoing-call": "/sounds/outgoing-call.mp3",
  "call-connected": "/sounds/call-connected.mp3",
  "call-ended": "/sounds/call-ended.mp3",
  "incoming-message": "/sounds/message.mp3",
  "outgoing-message": "/sounds/sent.mp3",
  "notification": "/sounds/notification.mp3",
  "error": "/sounds/error.mp3",
  "success": "/sounds/success.mp3",
  "dtmf": "", // Generated via Web Audio API
};

// DTMF frequencies for dual-tone generation
const DTMF_FREQUENCIES: Record<string, [number, number]> = {
  "1": [697, 1209], "2": [697, 1336], "3": [697, 1477],
  "4": [770, 1209], "5": [770, 1336], "6": [770, 1477],
  "7": [852, 1209], "8": [852, 1336], "9": [852, 1477],
  "*": [941, 1209], "0": [941, 1336], "#": [941, 1477],
};

interface UseSoundAlertsOptions {
  enabled?: boolean;
  volume?: number; // 0.0 to 1.0
}

interface SoundAlertsReturn {
  playSound: (type: SoundType, options?: { loop?: boolean; volume?: number }) => void;
  stopSound: (type: SoundType) => void;
  stopAll: () => void;
  playDtmf: (digit: string) => void;
  setVolume: (volume: number) => void;
  setEnabled: (enabled: boolean) => void;
  isPlaying: (type: SoundType) => boolean;
}

// Global audio context for Web Audio API sounds
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

/**
 * Hook for playing sound alerts in the application
 * 
 * @example
 * ```tsx
 * const { playSound, stopSound, playDtmf } = useSoundAlerts();
 * 
 * // Play incoming call sound
 * playSound("incoming-call", { loop: true });
 * 
 * // Stop when answered
 * stopSound("incoming-call");
 * 
 * // Play DTMF tone
 * playDtmf("5");
 * ```
 */
export function useSoundAlerts(options: UseSoundAlertsOptions = {}): SoundAlertsReturn {
  const { enabled: initialEnabled = true, volume: initialVolume = 0.7 } = options;

  const enabledRef = useRef(initialEnabled);
  const volumeRef = useRef(initialVolume);
  const audioElements = useRef<Map<SoundType, HTMLAudioElement>>(new Map());
  const playingRef = useRef<Set<SoundType>>(new Set());

  // Initialize audio elements
  const getAudioElement = useCallback((type: SoundType): HTMLAudioElement | null => {
    if (type === "dtmf") return null; // DTMF uses Web Audio API

    let audio = audioElements.current.get(type);
    if (!audio) {
      const url = SOUND_URLS[type];
      if (!url) return null;

      audio = new Audio(url);
      audio.preload = "auto";
      audioElements.current.set(type, audio);
    }
    return audio;
  }, []);

  // Play a sound
  const playSound = useCallback((
    type: SoundType, 
    options?: { loop?: boolean; volume?: number }
  ) => {
    if (!enabledRef.current) return;

    const audio = getAudioElement(type);
    if (!audio) return;

    audio.loop = options?.loop ?? false;
    audio.volume = (options?.volume ?? volumeRef.current) * volumeRef.current;
    audio.currentTime = 0;

    audio.play()
      .then(() => {
        playingRef.current.add(type);
      })
      .catch((err) => {
        // Autoplay might be blocked - user interaction required
        console.warn(`Sound play failed for ${type}:`, err);
      });

    audio.onended = () => {
      playingRef.current.delete(type);
    };
  }, [getAudioElement]);

  // Stop a specific sound
  const stopSound = useCallback((type: SoundType) => {
    const audio = audioElements.current.get(type);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      playingRef.current.delete(type);
    }
  }, []);

  // Stop all sounds
  const stopAll = useCallback(() => {
    audioElements.current.forEach((audio, type) => {
      audio.pause();
      audio.currentTime = 0;
      playingRef.current.delete(type);
    });
  }, []);

  // Play DTMF tone using Web Audio API
  const playDtmf = useCallback((digit: string) => {
    if (!enabledRef.current) return;

    const frequencies = DTMF_FREQUENCIES[digit];
    if (!frequencies) return;

    const ctx = getAudioContext();
    const [lowFreq, highFreq] = frequencies;
    const duration = 0.15; // 150ms duration

    // Create oscillators for dual-tone
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.value = lowFreq;
    
    osc2.type = "sine";
    osc2.frequency.value = highFreq;

    gainNode.gain.value = volumeRef.current * 0.3; // Lower volume for DTMF

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);

    // Fade out to prevent clicks
    gainNode.gain.setValueAtTime(volumeRef.current * 0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
  }, []);

  // Set volume
  const setVolume = useCallback((volume: number) => {
    volumeRef.current = Math.max(0, Math.min(1, volume));
    // Update all playing audio elements
    audioElements.current.forEach((audio) => {
      audio.volume = volumeRef.current;
    });
  }, []);

  // Set enabled state
  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
    if (!enabled) {
      stopAll();
    }
  }, [stopAll]);

  // Check if a sound is playing
  const isPlaying = useCallback((type: SoundType): boolean => {
    return playingRef.current.has(type);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [stopAll]);

  return {
    playSound,
    stopSound,
    stopAll,
    playDtmf,
    setVolume,
    setEnabled,
    isPlaying,
  };
}

/**
 * Generate a simple tone using Web Audio API (for notification/alert sounds)
 * Useful if MP3 files aren't available
 */
export function playTone(
  frequency: number = 440,
  duration: number = 0.3,
  type: OscillatorType = "sine",
  volume: number = 0.5
): void {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = frequency;

  gain.gain.value = volume;
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + duration);
}

/**
 * Play a success chime (two ascending tones)
 */
export function playSuccessChime(volume: number = 0.4): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // First tone
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.frequency.value = 523.25; // C5
  osc1.type = "sine";
  gain1.gain.value = volume;
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.15);

  // Second tone (higher)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.frequency.value = 659.25; // E5
  osc2.type = "sine";
  gain2.gain.value = volume;
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.1);
  osc2.stop(now + 0.35);
}

/**
 * Play an error tone (descending)
 */
export function playErrorTone(volume: number = 0.4): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 400;
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
  osc.type = "square";
  gain.gain.value = volume * 0.5;
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.3);
}

/**
 * Play a notification blip
 */
export function playNotificationBlip(volume: number = 0.3): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 880; // A5
  osc.type = "sine";
  gain.gain.value = volume;
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}
