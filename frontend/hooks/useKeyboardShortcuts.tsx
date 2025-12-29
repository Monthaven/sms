/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import { useEffect, useCallback, useRef } from "react";

type ShortcutHandler = () => void;

interface Shortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean; // Command key on Mac
  handler: ShortcutHandler;
  description?: string;
  allowInInput?: boolean; // Allow shortcut even when focused on input
}

interface UseKeyboardShortcutsOptions {
  shortcuts: Shortcut[];
  enabled?: boolean;
}

/**
 * Hook for managing keyboard shortcuts
 * 
 * @example
 * ```tsx
 * useKeyboardShortcuts({
 *   shortcuts: [
 *     { key: "m", handler: toggleMute, description: "Toggle mute" },
 *     { key: "h", handler: toggleHold, description: "Toggle hold" },
 *     { key: "Escape", handler: endCall, description: "End call" },
 *     { key: "c", ctrl: true, handler: startCall, description: "Start call" },
 *   ],
 *   enabled: isCallActive,
 * });
 * ```
 */
export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Check if we're in an input element
      const target = event.target as HTMLElement;
      const isInInput = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
        target.isContentEditable;

      for (const shortcut of shortcuts) {
        // Skip if in input and not allowed
        if (isInInput && !shortcut.allowInInput) continue;

        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const altMatches = shortcut.alt ? event.altKey : !event.altKey;
        const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;

        if (keyMatches && ctrlMatches && altMatches && shiftMatches) {
          event.preventDefault();
          event.stopPropagation();
          shortcut.handler();
          return;
        }
      }
    },
    [enabled, shortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Common call shortcuts configuration
 */
export function getCallShortcuts(handlers: {
  toggleMute?: () => void;
  toggleHold?: () => void;
  endCall?: () => void;
  startCall?: () => void;
  dropVoicemail?: () => void;
  transfer?: () => void;
  sendDtmf?: (digit: string) => void;
}): Shortcut[] {
  const shortcuts: Shortcut[] = [];

  if (handlers.toggleMute) {
    shortcuts.push({
      key: "m",
      handler: handlers.toggleMute,
      description: "Toggle mute",
    });
  }

  if (handlers.toggleHold) {
    shortcuts.push({
      key: "h",
      handler: handlers.toggleHold,
      description: "Toggle hold",
    });
  }

  if (handlers.endCall) {
    shortcuts.push({
      key: "Escape",
      handler: handlers.endCall,
      description: "End call",
      allowInInput: true,
    });
  }

  if (handlers.startCall) {
    shortcuts.push({
      key: "c",
      ctrl: true,
      handler: handlers.startCall,
      description: "Start call",
      allowInInput: true,
    });
  }

  if (handlers.dropVoicemail) {
    shortcuts.push({
      key: "v",
      handler: handlers.dropVoicemail,
      description: "Drop voicemail",
    });
  }

  if (handlers.transfer) {
    shortcuts.push({
      key: "t",
      handler: handlers.transfer,
      description: "Transfer call",
    });
  }

  // DTMF shortcuts for dialpad digits
  if (handlers.sendDtmf) {
    for (let i = 0; i <= 9; i++) {
      shortcuts.push({
        key: i.toString(),
        handler: () => handlers.sendDtmf!(i.toString()),
        description: `Send DTMF ${i}`,
      });
    }
    shortcuts.push({
      key: "*",
      shift: true,
      handler: () => handlers.sendDtmf!("*"),
      description: "Send DTMF *",
    });
    shortcuts.push({
      key: "#",
      shift: true,
      handler: () => handlers.sendDtmf!("#"),
      description: "Send DTMF #",
    });
  }

  return shortcuts;
}

/**
 * Common SMS shortcuts configuration
 */
export function getSmsShortcuts(handlers: {
  send?: () => void;
  openTemplate?: () => void;
  focus?: () => void;
  nextContact?: () => void;
  prevContact?: () => void;
}): Shortcut[] {
  const shortcuts: Shortcut[] = [];

  if (handlers.send) {
    shortcuts.push({
      key: "Enter",
      ctrl: true,
      handler: handlers.send,
      description: "Send message",
      allowInInput: true,
    });
  }

  if (handlers.openTemplate) {
    shortcuts.push({
      key: "t",
      ctrl: true,
      handler: handlers.openTemplate,
      description: "Open templates",
    });
  }

  if (handlers.focus) {
    shortcuts.push({
      key: "/",
      handler: handlers.focus,
      description: "Focus message input",
    });
  }

  if (handlers.nextContact) {
    shortcuts.push({
      key: "ArrowDown",
      alt: true,
      handler: handlers.nextContact,
      description: "Next contact",
      allowInInput: true,
    });
  }

  if (handlers.prevContact) {
    shortcuts.push({
      key: "ArrowUp",
      alt: true,
      handler: handlers.prevContact,
      description: "Previous contact",
      allowInInput: true,
    });
  }

  return shortcuts;
}

/**
 * Navigation shortcuts configuration
 */
export function getNavShortcuts(handlers: {
  goToQueue?: () => void;
  goToContacts?: () => void;
  goToCalls?: () => void;
  goToDashboard?: () => void;
  search?: () => void;
}): Shortcut[] {
  const shortcuts: Shortcut[] = [];

  if (handlers.goToQueue) {
    shortcuts.push({
      key: "q",
      alt: true,
      handler: handlers.goToQueue,
      description: "Go to queue",
    });
  }

  if (handlers.goToContacts) {
    shortcuts.push({
      key: "c",
      alt: true,
      handler: handlers.goToContacts,
      description: "Go to contacts",
    });
  }

  if (handlers.goToCalls) {
    shortcuts.push({
      key: "l",
      alt: true,
      handler: handlers.goToCalls,
      description: "Go to calls",
    });
  }

  if (handlers.goToDashboard) {
    shortcuts.push({
      key: "d",
      alt: true,
      handler: handlers.goToDashboard,
      description: "Go to dashboard",
    });
  }

  if (handlers.search) {
    shortcuts.push({
      key: "k",
      ctrl: true,
      handler: handlers.search,
      description: "Search",
      allowInInput: true,
    });
  }

  return shortcuts;
}

/**
 * ShortcutsHelp component to display available shortcuts
 */
export function ShortcutsHelpContent({ shortcuts }: { shortcuts: Shortcut[] }) {
  const formatKey = (shortcut: Shortcut) => {
    const parts: string[] = [];
    if (shortcut.ctrl) parts.push("Ctrl");
    if (shortcut.alt) parts.push("Alt");
    if (shortcut.shift) parts.push("Shift");
    if (shortcut.meta) parts.push("⌘");
    parts.push(shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key);
    return parts.join(" + ");
  };

  return (
    <div className="space-y-2">
      {shortcuts.filter(s => s.description).map((shortcut, i) => (
        <div key={i} className="flex justify-between items-center text-sm">
          <span className="text-slate-400">{shortcut.description}</span>
          <kbd className="px-2 py-1 bg-slate-800 rounded text-xs font-mono text-slate-300">
            {formatKey(shortcut)}
          </kbd>
        </div>
      ))}
    </div>
  );
}
