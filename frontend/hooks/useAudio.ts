/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

"use client";

import { useRef, useCallback } from "react";
import { playSound, stopSound, setVolume as setSoundVolume, type SoundType } from "@/lib/sounds";

export function useAudio() {
  const currentSound = useRef<SoundType | null>(null);

  const play = useCallback((type: SoundType, options?: { volume?: number; loop?: boolean }) => {
    currentSound.current = type;
    playSound(type, options);
  }, []);

  const stop = useCallback((type?: SoundType) => {
    if (type) {
      stopSound(type);
      if (currentSound.current === type) {
        currentSound.current = null;
      }
    } else if (currentSound.current) {
      stopSound(currentSound.current);
      currentSound.current = null;
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    setSoundVolume(volume);
  }, []);

  return {
    play,
    stop,
    setVolume,
    currentSound: currentSound.current,
  };
}
