"use client";

/**
 * PROPRIETARY — Always Improving LLC
 * Recording Player Component - Playback call recordings with QA scoring
 */

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Download,
  Star,
  MessageSquare,
  Clock,
} from "lucide-react";

interface RecordingPlayerProps {
  recordingUrl: string;
  callId: string;
  duration?: number;
  agentName?: string;
  contactName?: string;
  date?: string;
  existingScore?: number;
  onScore?: (callId: string, score: number, notes: string) => Promise<void>;
  className?: string;
}

export function RecordingPlayer({
  recordingUrl,
  callId,
  duration,
  agentName,
  contactName,
  date,
  existingScore,
  onScore,
  className,
}: RecordingPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showScoring, setShowScoring] = useState(false);
  const [score, setScore] = useState(existingScore || 0);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setAudioDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }

  function seek(seconds: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.currentTime + seconds, audioDuration));
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio) return;
    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio) return;
    const vol = parseFloat(e.target.value);
    audio.volume = vol;
    setVolume(vol);
    setIsMuted(vol === 0);
  }

  function toggleMute() {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (isMuted) {
      audio.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  }

  function changePlaybackRate() {
    const audio = audioRef.current;
    if (!audio) return;
    
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    audio.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  }

  async function handleSubmitScore() {
    if (!onScore || score === 0) return;
    
    setSubmitting(true);
    try {
      await onScore(callId, score, notes);
      setShowScoring(false);
    } catch (error) {
      console.error("Score submission failed:", error);
    } finally {
      setSubmitting(false);
    }
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  return (
    <div className={cn("bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Call Recording</h3>
            <div className="text-sm text-gray-500 mt-1">
              {agentName && <span>Agent: {agentName}</span>}
              {contactName && <span> • {contactName}</span>}
              {date && <span> • {date}</span>}
            </div>
          </div>
          {existingScore !== undefined && (
            <div className="flex items-center gap-1 text-yellow-500">
              <Star className="w-5 h-5 fill-current" />
              <span className="font-bold">{existingScore}/100</span>
            </div>
          )}
        </div>
      </div>

      {/* Audio Element */}
      <audio ref={audioRef} src={recordingUrl} preload="metadata" />

      {/* Waveform / Progress */}
      <div className="px-4 py-3">
        <div className="relative">
          <input
            type="range"
            min={0}
            max={audioDuration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none 
                       cursor-pointer [&::-webkit-slider-thumb]:appearance-none 
                       [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                       [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:rounded-full"
          />
          <div 
            className="absolute top-0 left-0 h-2 bg-indigo-500 rounded-full pointer-events-none"
            style={{ width: `${(currentTime / (audioDuration || 1)) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(audioDuration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Skip Back */}
          <button
            onClick={() => seek(-10)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
            title="Back 10s"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="p-3 bg-indigo-500 text-white rounded-full hover:bg-indigo-600"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-0.5" />
            )}
          </button>

          {/* Skip Forward */}
          <button
            onClick={() => seek(10)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
            title="Forward 10s"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Playback Speed */}
          <button
            onClick={changePlaybackRate}
            className="px-2 py-1 text-sm font-medium bg-gray-100 dark:bg-gray-800 
                       rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            {playbackRate}x
          </button>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="p-1">
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-gray-400" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer"
            />
          </div>

          {/* Download */}
          <a
            href={recordingUrl}
            download
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </a>

          {/* Score Button */}
          {onScore && !existingScore && (
            <button
              onClick={() => setShowScoring(!showScoring)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-yellow-100 
                         text-yellow-800 rounded-lg hover:bg-yellow-200"
            >
              <Star className="w-4 h-4" />
              Score
            </button>
          )}
        </div>
      </div>

      {/* Scoring Panel */}
      {showScoring && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <h4 className="font-medium mb-3">QA Score</h4>
          
          {/* Score Slider */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-500">Score</span>
              <span className="text-lg font-bold">{score}/100</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={score}
              onChange={(e) => setScore(parseInt(e.target.value))}
              className={cn(
                "w-full h-2 rounded-full appearance-none cursor-pointer",
                score < 50 && "bg-red-200",
                score >= 50 && score < 75 && "bg-yellow-200",
                score >= 75 && "bg-green-200"
              )}
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Poor</span>
              <span>Needs Work</span>
              <span>Good</span>
              <span>Excellent</span>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm text-gray-500 mb-1">
              <MessageSquare className="w-4 h-4 inline mr-1" />
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add feedback for the agent..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowScoring(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 
                         dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitScore}
              disabled={score === 0 || submitting}
              className="px-4 py-2 text-sm bg-indigo-500 text-white rounded-lg 
                         hover:bg-indigo-600 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Score"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
