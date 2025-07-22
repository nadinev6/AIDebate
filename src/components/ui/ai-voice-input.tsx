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
  isMicActive, // Destructure the new prop
  isConnecting, // Destructure the new prop
}: AIVoiceInputProps) {
  // `submitted` state here seems to control the internal UI state (listening/not listening)
  // and also triggers `onStart`/`onStop`.
  // It's currently redundant with `isMicActive` passed from `App.tsx`.
  // It would be better to directly use `isMicActive` to control the UI and trigger `onStop`
  // when `isMicActive` becomes false (meaning the mic was stopped externally).
  // The `submitted` state could be removed or renamed to something like `isListeningUI`.
  // REVIEW COMMENT: This `submitted` state is indeed redundant. The `isMicActive` prop from `App.tsx`
  // should be the single source of truth for whether the microphone is active.
  // The `useEffect` below that depends on `submitted` should instead depend on `isMicActive`.
  // The `handleClick` function should directly call `onStart` or `onStop` based on `isMicActive`,
  // and the UI should react to `isMicActive` and `isConnecting`.
  const [submitted, setSubmitted] = useState(false);
  const [time, setTime] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [isDemo, setIsDemo] = useState(demoMode);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // This useEffect currently triggers on `submitted` and `time` changes.
  // If `submitted` is to be controlled by `isMicActive` from props, this logic needs adjustment.
  // For example, if `isMicActive` becomes true, `onStart` should be called.
  // If `isMicActive` becomes false, `onStop` should be called.
  // The `time` state should only update if `isMicActive` is true.
  // REVIEW COMMENT: This `useEffect` is problematic because `submitted` is an internal state
  // that is not directly synchronized with the `isMicActive` prop.
  // It should be refactored to directly use `isMicActive` to trigger `onStart`/`onStop` and manage `time`.
  // Example:
  // useEffect(() => {
  //   let intervalId: NodeJS.Timeout;
  //   if (isMicActive) {
  //     onStart?.(); // This might be called repeatedly if not guarded in onStart itself
  //     intervalId = setInterval(() => {
  //       setTime((t) => t + 1);
  //     }, 1000);
  //   } else {
  //     onStop?.(time);
  //     setTime(0);
  //   }
  //   return () => clearInterval(intervalId);
  // }, [isMicActive, time, onStart, onStop]);
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    // This condition should likely be `if (isMicActive)` instead of `if (submitted)`
    // to truly reflect the external state of the microphone.
    if (submitted) {
      onStart?.();
      intervalId = setInterval(() => {
        setTime((t) => t + 1);
      }, 1000);
    } else {
      // This `onStop` call will be triggered every time `submitted` becomes false,
      // which might happen if the user clicks the button to stop, or if `isMicActive`
      // changes externally. Ensure this doesn't cause unintended side effects.
      onStop?.(time);
      setTime(0);
    }

    return () => clearInterval(intervalId);
  }, [submitted, time, onStart, onStop]); // Dependencies should include `isMicActive` if it drives `submitted`

  // This demo mode logic is fine for its intended purpose.
  useEffect(() => {
    if (!isDemo) return;

    let timeoutId: NodeJS COMMENT: This `useEffect` is fine for its intended demo mode functionality.
    const runAnimation = () => {
      setSubmitted(true);
      timeoutId = setTimeout(() => {
        setSubmitted(false);
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
      setSubmitted(false);
    } else {
      // This is where the internal `submitted` state is toggled.
      // Instead of toggling `submitted`, this should call `onStart` or `onStop` directly.
      // The `isMicActive` prop from `App.tsx` should then update, and the `useEffect` above
      // should react to `isMicActive` to update the UI and call `onStart`/`onStop`.
      // REVIEW COMMENT: This `handleClick` directly toggles `submitted`. This creates a disconnect
      // between the `AIVoiceInput` component's internal state (`submitted`) and the actual microphone
      // status (`isMicActive` from props).
      // The `handleClick` should instead directly call the `onStart` or `onStop` props,
      // and the `AIVoiceInput` component's UI should then *react* to the `isMicActive` prop
      // changing, rather than relying on its own `submitted` state.
      // Example:
      // const handleClick = () => {
      //   if (isDemo) { /* ... demo logic ... */ }
      //   else if (isMicActive) {
      //     onStop?.(time); // Call the prop directly
      //   } else {
      //     onStart?.(); // Call the prop directly
      //   }
      // };
      setSubmitted((prev) => !prev);
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