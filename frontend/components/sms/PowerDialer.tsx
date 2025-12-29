"use client";

/**
 * PROPRIETARY — Always Improving LLC
 * Power Dialer Component - Auto-dial through a list
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { 
  Play, 
  Pause, 
  SkipForward, 
  Phone, 
  PhoneOff,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
} from "lucide-react";

interface Contact {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  status?: string;
}

interface DialerStats {
  total: number;
  dialed: number;
  connected: number;
  noAnswer: number;
  skipped: number;
}

interface PowerDialerProps {
  contacts: Contact[];
  onCall: (contact: Contact) => Promise<void>;
  onComplete: (stats: DialerStats) => void;
  className?: string;
}

export function PowerDialer({ 
  contacts, 
  onCall, 
  onComplete,
  className,
}: PowerDialerProps) {
  const [queue, setQueue] = useState<Contact[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [callInProgress, setCallInProgress] = useState(false);
  const [stats, setStats] = useState<DialerStats>({
    total: 0,
    dialed: 0,
    connected: 0,
    noAnswer: 0,
    skipped: 0,
  });
  const [settings, setSettings] = useState({
    autoAdvanceDelay: 5, // seconds after call ends
    maxRingTime: 30, // seconds before considering no answer
    skipDnc: true,
  });
  const [showSettings, setShowSettings] = useState(false);
  
  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);

  // Initialize queue
  useEffect(() => {
    setQueue(contacts);
    setStats(prev => ({ ...prev, total: contacts.length }));
  }, [contacts]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current);
      }
    };
  }, []);

  const currentContact = queue[currentIndex];
  const progress = queue.length > 0 ? (currentIndex / queue.length) * 100 : 0;

  const dialNext = useCallback(async () => {
    if (currentIndex >= queue.length) {
      // Queue complete
      setIsRunning(false);
      onComplete(stats);
      return;
    }

    if (isPaused || callInProgress) return;

    const contact = queue[currentIndex];
    
    setCallInProgress(true);
    setStats(prev => ({ ...prev, dialed: prev.dialed + 1 }));

    try {
      await onCall(contact);
      setStats(prev => ({ ...prev, connected: prev.connected + 1 }));
    } catch (error) {
      console.error("Call failed:", error);
      setStats(prev => ({ ...prev, noAnswer: prev.noAnswer + 1 }));
    } finally {
      setCallInProgress(false);
      
      // Auto-advance after delay
      if (isRunning && !isPaused) {
        autoAdvanceTimer.current = setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
        }, settings.autoAdvanceDelay * 1000);
      }
    }
  }, [currentIndex, queue, isPaused, callInProgress, isRunning, onCall, onComplete, stats, settings.autoAdvanceDelay]);

  // Auto-dial when running and not on a call
  useEffect(() => {
    if (isRunning && !isPaused && !callInProgress && currentIndex < queue.length) {
      dialNext();
    }
  }, [isRunning, isPaused, callInProgress, currentIndex, queue.length, dialNext]);

  function startDialer() {
    setIsRunning(true);
    setIsPaused(false);
  }

  function pauseDialer() {
    setIsPaused(true);
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
    }
  }

  function resumeDialer() {
    setIsPaused(false);
  }

  function skipContact() {
    setStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
    setCurrentIndex(prev => prev + 1);
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
    }
  }

  function stopDialer() {
    setIsRunning(false);
    setIsPaused(false);
    setCallInProgress(false);
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
    }
  }

  return (
    <div className={cn("bg-white dark:bg-gray-900 rounded-xl shadow-lg", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold">Power Dialer</h2>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>{currentIndex} of {queue.length} contacts</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm">Auto-advance delay (seconds)</label>
              <input
                type="number"
                min={1}
                max={30}
                value={settings.autoAdvanceDelay}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  autoAdvanceDelay: parseInt(e.target.value) || 5 
                }))}
                className="w-16 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm">Max ring time (seconds)</label>
              <input
                type="number"
                min={10}
                max={60}
                value={settings.maxRingTime}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  maxRingTime: parseInt(e.target.value) || 30 
                }))}
                className="w-16 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>
        </div>
      )}

      {/* Current Contact */}
      {currentContact && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 mb-1">Now Calling</div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-lg">
                {currentContact.firstName} {currentContact.lastName}
              </div>
              <div className="text-gray-500">{currentContact.phone}</div>
            </div>
            {callInProgress && (
              <div className="flex items-center gap-2 text-green-500">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm">Dialing...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="p-4 grid grid-cols-4 gap-2 border-b border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.dialed}
          </div>
          <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
            <Phone className="w-3 h-3" />
            Dialed
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-500">
            {stats.connected}
          </div>
          <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Connected
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-500">
            {stats.noAnswer}
          </div>
          <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
            <XCircle className="w-3 h-3" />
            No Answer
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-400">
            {stats.skipped}
          </div>
          <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
            <SkipForward className="w-3 h-3" />
            Skipped
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 flex items-center justify-center gap-3">
        {!isRunning ? (
          <button
            onClick={startDialer}
            disabled={queue.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white 
                       rounded-full hover:bg-green-600 disabled:opacity-50 
                       disabled:cursor-not-allowed transition-colors"
          >
            <Play className="w-5 h-5" />
            Start Dialer
          </button>
        ) : (
          <>
            {isPaused ? (
              <button
                onClick={resumeDialer}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white 
                           rounded-full hover:bg-green-600 transition-colors"
              >
                <Play className="w-5 h-5" />
                Resume
              </button>
            ) : (
              <button
                onClick={pauseDialer}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white 
                           rounded-full hover:bg-yellow-600 transition-colors"
              >
                <Pause className="w-5 h-5" />
                Pause
              </button>
            )}

            <button
              onClick={skipContact}
              disabled={callInProgress}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white 
                         rounded-full hover:bg-gray-600 disabled:opacity-50 transition-colors"
            >
              <SkipForward className="w-5 h-5" />
              Skip
            </button>

            <button
              onClick={stopDialer}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white 
                         rounded-full hover:bg-red-600 transition-colors"
            >
              <PhoneOff className="w-5 h-5" />
              Stop
            </button>
          </>
        )}
      </div>

      {/* Queue Preview */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Users className="w-4 h-4" />
          <span>Up Next</span>
        </div>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {queue.slice(currentIndex + 1, currentIndex + 6).map((contact, i) => (
            <div 
              key={contact.id}
              className="flex items-center justify-between text-sm py-1"
            >
              <span className="text-gray-600 dark:text-gray-400">
                {contact.firstName} {contact.lastName}
              </span>
              <span className="text-gray-400 text-xs">
                #{currentIndex + i + 2}
              </span>
            </div>
          ))}
          {queue.length > currentIndex + 6 && (
            <div className="text-xs text-gray-400 text-center py-1">
              +{queue.length - currentIndex - 6} more
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
