"use client";

import { Mic } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";


interface AIVoiceInputProps {
  onStart?: () => void;
  onStop?: (duration: number) => void;
  visualizerBars?: number;
  demoMode?: boolean;
  demoInterval?: number;
  className?: string;
  // Added prop to receive mic active status from App.tsx (which gets it from useLiveKitAudio)
  isMicActive: boolean;
  // Added prop to indicate if connection is in progress
  isConnecting: boolean;
}

export function AIVoiceInput({
  onStart,
  onStop,
  visualizerBars = 48,
  demoMode = false,
  demoInterval = 3000,
  className,
  isMicActive,
  isConnecting,
}: AIVoiceInputProps) {
  const [time, setTime] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [isDemo, setIsDemo] = useState(demoMode);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Timer management based on isMicActive prop
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isMicActive) {
      intervalId = setInterval(() => {
        setTime((t) => t + 1);
      }, 1000);
    } else {
      setTime(0);
    }

    return () => clearInterval(intervalId);
  }, [isMicActive]);

  // This demo mode logic is fine for its intended purpose.
  useEffect(() => {
    if (!isDemo) return;

    let timeoutId: NodeJS.Timeout;
    const runAnimation = () => {
      // Demo mode doesn't need to trigger actual start/stop
      timeoutId = setTimeout(() => {
        timeoutId = setTimeout(runAnimation, 1000);
      }, demoInterval);
    };

    const initialTimeout = setTimeout(runAnimation, 100);
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(initialTimeout);
    };
  }, [isDemo, demoInterval]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleClick = () => {
    if (isDemo) {
      setIsDemo(false);
    } else {
      // Directly call the appropriate callback based on current mic state
      if (isMicActive) {
        onStop?.(time);
      } else {
        onStart?.();
      }
    }
  };

  return (
    <div className={cn("w-full py-4", className)}>
      <div className="relative max-w-xl w-full mx-auto flex items-center flex-col gap-2">
        <button
          className={cn(
            "group w-16 h-16 rounded-xl flex items-center justify-center transition-colors",
            // Use `isMicActive` prop here for UI state.
            // Also consider `isConnecting` for a "connecting" visual state.
            isMicActive || isConnecting
              ? "bg-none" // Or a specific connecting style
              : "bg-none hover:bg-black/10 dark:hover:bg-white/10"
          )}
          type="button"
          onClick={handleClick}
          // Disable button while connecting to prevent multiple clicks
          disabled={isConnecting}
        >
          {/* Use `isConnecting` for a loading spinner, then `isMicActive` for active state */}
          {isConnecting ? (
            <div
              className="w-6 h-6 rounded-sm animate-spin bg-black dark:bg-white cursor-pointer pointer-events-auto"
              style={{ animationDuration: "1s" }} // Faster spin for connecting
            />
          ) : isMicActive ? (
            // This spinner should probably be a "recording" indicator, not a "loading" spinner.
            // A pulsating mic icon or a different animation might be more appropriate.
            <div
              className="w-6 h-6 rounded-sm animate-spin bg-black dark:bg-white cursor-pointer pointer-events-auto"
              style={{ animationDuration: "3s" }}
            />
          ) : (
            <Mic className="w-6 h-6 text-black/70 dark:text-white/70" />
          )}
        </button>

        <span
          className={cn(
            "font-mono text-sm transition-opacity duration-300",
            // Use `isMicActive` here
            isMicActive
              ? "text-black/70 dark:text-white/70"
              : "text-black/30 dark:text-white/30"
          )}
        >
          {formatTime(time)}
        </span>

        <div className="h-4 w-64 flex items-center justify-center gap-0.5">
          {[...Array(visualizerBars)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-0.5 rounded-full transition-all duration-300",
                // Use `isMicActive` here
                isMicActive
                  ? "bg-black/50 dark:bg-white/50 animate-pulse"
                  : "bg-black/10 dark:bg-white/10 h-1"
              )}
              style={
                // Use `isMicActive` here
                isMicActive && isClient
                  ? {
                      height: `${20 + Math.random() * 80}%`,
                      animationDelay: `${i * 0.05}s`,
                    }
                  : undefined
              }
            />
          ))}
        </div>

        <p className="h-4 text-xs text-black/70 dark:text-white/70">
          {/* Update text based on `isConnecting` and `isMicActive` */}
          {isConnecting ? "Connecting..." : isMicActive ? "Listening..." : "Click to speak"}
        </p>
      </div>
    </div>
  );
}