import React, { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, MessageSquare, Sparkles, Download, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatInput, TypingDots, ActionButton } from '@/components/ui/chat-input';
import { AIVoiceInput } from '@/components/ui/ai-voice-input';
import { useLiveKitAudio } from "@/hooks/useLiveKitAudio";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  metadata?: {
    confidence?: number;
    sources?: string[];
    retrieved_docs?: Array<{
      source: string;
      content_preview: string;
    }>;
  };
}

interface VoiceSession {
  token: string;
  room_name: string;
  livekit_url: string;
  session_id: string;
  expires_at: number;
}

function App() {
  // Destructure functions from the hook inside the component
  // This ensures they are part of the component's render cycle
  const {
    connectToRoom,
    startMic,
    stopMic,
    disconnect,
    // It's good practice to explicitly destructure all used values from the hook
    // even if some are not directly used in the component's render, but rather in effects or handlers.
    isMicActive: liveKitIsMicActive, // Get current mic status from the hook
    isLiveKitConnected, // Get LiveKit connection status from the hook
    micError, // Get any mic errors from the hook
  } = useLiveKitAudio();

  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isConnected, setIsConnected] = useState(false); // Your backend connection status
  // const [isVoiceActive, setIsVoiceActive] = useState(false); // This will now be derived from liveKitIsMicActive + isLiveKitConnected
  const [isTyping, setIsTyping] = useState(false);
  const [voiceSession, setVoiceSession] = useState<VoiceSession | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [inputFocused, setInputFocused] = useState(false);

  // Refs for DOM access
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  // API configuration
  const apiBaseUrl = 'http://localhost:8000'; // DO NOT CHANGE: User constraint

  // Check server connection on component mount
  useEffect(() => {
    checkServerConnection();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [messages, isTyping]);

  // Mouse tracking for glow effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Monitor micError from LiveKit hook
  useEffect(() => {
    if (micError) {
      // Consider adding a more prominent error display for mic errors,
      // as they directly impact the voice functionality.
      addMessage('Microphone error: ' + micError.message, 'ai');
    }
  }, [micError]);


  const checkServerConnection = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/health`);
      const data = await response.json();

      if (data.status === 'healthy') {
        setIsConnected(true);
        setConnectionStatus('Connected to server');
      } else {
        setIsConnected(false);
        setConnectionStatus('Server unhealthy');
      }
    } catch (error) {
      console.error('Connection check failed:', error);
      setIsConnected(false);
      setConnectionStatus('Server offline');
    }
  };

  const scrollToBottom = () => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const addMessage = (content: string, sender: 'user' | 'ai', metadata?: any) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      sender,
      timestamp: new Date(),
      metadata
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const sendMessage = async () => {
    const message = messageInput.trim();
    if (!message) return;

    if (!isConnected) {
      addMessage('Please wait for server connection...', 'ai');
      return;
    }

    // Clear input and add user message
    setMessageInput('');
    addMessage(message, 'user');

    try {
      // Show typing indicator
      setIsTyping(true);

      // Send to backend API
      const response = await fetch(`${apiBaseUrl}/api/debate/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message,
          user_id: 'default'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Hide typing indicator and add AI response
      setIsTyping(false);
      addMessage(data.response, 'ai', data);

    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      addMessage('Sorry, I encountered an error. Please try again.', 'ai');
    }
  };

  // MODIFIED: This function now coordinates backend session AND LiveKit connection
  const handleStartVoiceInteraction = async () => {
    if (!isConnected) {
      addMessage('Cannot start voice session: Server is not connected.', 'ai');
      return;
    }

    // This check is good to prevent redundant calls.
    if (liveKitIsMicActive) {
      addMessage('Voice session is already active.', 'ai');
      return;
    }

    try {
      // Step 1: Request microphone permission (handled by startMic internally, but good to ensure)
      // This `getUserMedia` call is redundant if `startMic` in `useLiveKitAudio` already handles it.
      // If `startMic` handles it, this can be removed to avoid requesting permission twice or
      // creating and stopping a stream unnecessarily.
      // REVIEW COMMENT: This `getUserMedia` call is indeed redundant if `useLiveKitAudio`'s `startMic` already handles it.
      // It's better to let the hook manage microphone access consistently. Removing this line would simplify the flow.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the test stream immediately

      // Step 2: Generate a unique user identity
      const userIdentity = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Step 3: Start voice session with backend to get LiveKit token
      const response = await fetch(`${apiBaseUrl}/api/voice/start-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_identity: userIdentity,
          participant_name: 'Debate Participant'
        })
      });

      if (!response.ok) {
        // More specific error handling for backend response might be beneficial,
        // e.g., checking for 429 (Too Many Requests) from the backend.
        // REVIEW COMMENT: Good point. Adding specific error handling for different HTTP status codes (e.g., 400, 429, 500)
        // would provide more informative user feedback and allow for different recovery strategies.
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const sessionData = await response.json();
      setVoiceSession(sessionData);

      // Step 4: Connect to LiveKit room using token from backend
      // It's important to await this connection before attempting to start the mic.
      await connectToRoom(sessionData.livekit_url, sessionData.token, sessionData.room_name);

      // Step 5: Start the microphone and publish to LiveKit
      // This is the crucial line that was missing before
      await startMic(); // Ensure `startMic` handles potential errors (e.g., mic not found, permission denied) gracefully.

      // setIsVoiceActive(true); // No longer needed, derived from LiveKit hook

      addMessage(
        `Voice session started! Room: ${sessionData.room_name}. The AI philosopher is ready to debate.`,
        'ai'
      );

    } catch (error: any) { // Explicitly type error as 'any' or 'unknown' and then narrow
      console.error('Error starting voice session:', error);
      addMessage(
        `Failed to start voice session: ${error.message}. Please check your microphone permissions and try again.`,
        'ai'
      );
      // Ensure we clean up if an error occurs during start-up
      // This cleanup logic is good. It ensures a consistent state even if part of the setup fails.
      // REVIEW COMMENT: The cleanup logic here is good. It attempts to reset the state even if an error occurs mid-process.
      // However, `liveKitIsMicActive` and `isLiveKitConnected` are state variables from the hook.
      // If `connectToRoom` or `startMic` fail, these might not have been updated to `true` yet,
      // making the `if (liveKitIsMicActive)` and `if (isLiveKitConnected)` checks potentially redundant or misleading
      // in the context of an *initial* failure. It's safer to call `stopMic()` and `disconnect()` unconditionally
      // in the catch block if the goal is to ensure a clean state after any failure during startup.
      if (liveKitIsMicActive) stopMic(); // This might be redundant if `startMic` failed and mic wasn't active.
      if (isLiveKitConnected) disconnect(); // This might be redundant if `connectToRoom` failed.
      setVoiceSession(null);
    }
  };

  // MODIFIED: This function now coordinates LiveKit disconnection and backend session end
  const handleStopVoiceInteraction = async () => {
    // This check is robust.
    if (!liveKitIsMicActive && !isLiveKitConnected) {
      addMessage('No active voice session to end.', 'ai');
      return;
    }
    try {
      // Step 1: Stop microphone and disconnect from LiveKit
      // Order matters: stopMic first to unpublish, then disconnect from the room.
      stopMic(); // Stop publishing audio
      disconnect(); // Disconnect from the room

      // Step 2: End session with backend
      if (voiceSession) {
        const response = await fetch(
          `${apiBaseUrl}/api/voice/session/${voiceSession.session_id}`,
          {
            method: 'DELETE'
          }
        );

        if (!response.ok) {
          // It's good to log a warning here, as the frontend state is cleaned up
          // regardless of backend success, but the backend might still think the session is active.
          console.warn('Failed to end session on backend, continuing with cleanup');
        }
      }

      // setIsVoiceActive(false); // No longer needed
      setVoiceSession(null); // Reset voice session state
      addMessage('Voice session ended.', 'ai');

    } catch (error: any) { // Explicitly type error as 'any' or 'unknown' and then narrow
      console.error('Error ending voice session:', error);
      addMessage(`Error ending voice session: ${error.message}`, 'ai');
      // Consider if any state needs to be reverted here if the error occurs during cleanup.
      // For example, if `disconnect()` fails, `isLiveKitConnected` might still be true.
      // REVIEW COMMENT: This catch block is important. If `stopMic()` or `disconnect()` throw errors,
      // the `voiceSession` state might not be correctly reset. It's good practice to ensure `setVoiceSession(null)`
      // is called regardless of errors in the `try` block, perhaps in a `finally` block or after the `try-catch`.
    }
  };


  const handleAttachFile = () => {
    const mockFileName = `transcript-${Math.floor(Math.random() * 1000)}.txt`;
    setAttachments(prev => [...prev, mockFileName]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const exportTranscript = () => {
    if (messages.length === 0) {
      alert('No conversation to export!');
      return;
    }

    const transcript = messages.map(message => {
      const timestamp = formatTime(message.timestamp);
      const speaker = message.sender === 'user' ? 'You' : 'AI Opponent';
      let content = `[${timestamp}] ${speaker}: ${message.content}`;

      if (message.metadata?.sources && message.metadata.sources.length > 0) {
        content += `\n   Sources: ${message.metadata.sources.join(', ')}`;
      }
      if (message.metadata?.confidence) {
        content += `\n   Confidence: ${(message.metadata.confidence * 100).toFixed(0)}%`;
      }

      return content;
    }).join('\n\n');

    const header = `AI Debate Partner - Conversation Transcript\nExported: ${new Date().toLocaleString()}\n${'='.repeat(50)}\n\n`;
    const fullTranscript = header + transcript;

    const blob = new Blob([fullTranscript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debate-transcript-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Theme Toggle is commented out */}

      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse delay-700" />
        <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-fuchsia-500/10 rounded-full mix-blend-normal filter blur-[96px] animate-pulse delay-1000" />
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-block mb-4"
          >
            <h1 className="text-4xl font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white/90 to-white/40 pb-1">
              How can I challenge your thinking today?
            </h1>
            <motion.div
              className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "100%", opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            />
          </motion.div>
          <motion.p
            className="text-sm text-white/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Present your argument and engage with philosophical counter-arguments
          </motion.p>
        </motion.div>

        {/* Connection Status */}
        <motion.div
          className="mb-6 backdrop-blur-2xl bg-white/[0.02] rounded-lg border border-white/[0.05] p-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3">
            {isConnected && isLiveKitConnected ? ( // Consider overall connectivity
              <Wifi className="w-5 h-5 text-violet-400" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-400" />
            )}
            <span className={`font-medium ${isConnected && isLiveKitConnected ? 'text-violet-400' : 'text-red-400'}`}>
              {connectionStatus} {isLiveKitConnected ? ' & LiveKit Connected' : ' & LiveKit Disconnected'}
            </span>
          </div>
        </motion.div>

        {/* Voice Input Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          {/*
            Pass LiveKit-specific functions and state to AIVoiceInput.
            AIVoiceInput should use `startMic` when it needs to begin recording
            and `stopMic` when it needs to stop.
            The `onStart` and `onStop` props on AIVoiceInput will now trigger
            our combined voice interaction functions.
          */}
          <AIVoiceInput
            onStart={handleStartVoiceInteraction} // This will now handle both backend session and LiveKit mic start
            onStop={handleStopVoiceInteraction}   // This will now handle both LiveKit mic stop and backend session end
            isMicActive={liveKitIsMicActive}      // Pass LiveKit's mic status
            // This `isConnecting` logic seems a bit complex. It might be simpler to derive it
            // directly from `isLiveKitConnected` and `liveKitIsMicActive` or add a dedicated
            // `isConnecting` state in `useLiveKitAudio` if the connection process is asynchronous.
            // REVIEW COMMENT: The `isConnecting` logic here is indeed complex and potentially fragile.
            // `isLiveKitConnected === false && liveKitIsMicActive === false && voiceSession !== null`
            // This attempts to infer a "connecting" state. A more robust approach would be to:
            // 1. Add a dedicated `isConnecting` state within `useLiveKitAudio` that is set to `true` when `connectToRoom` is called and `false` when it resolves or rejects.
            // 2. Pass that explicit `isConnecting` state from the hook to `AIVoiceInput`.
            // This would make the state management clearer and less prone to subtle bugs.
            isConnecting={isLiveKitConnected === false && liveKitIsMicActive === false && voiceSession !== null} // Adjust logic if needed
            demoMode={false}
            className="backdrop-blur-2xl bg-white/[0.02] rounded-2xl border border-white/[0.05] py-8"
          />
        </motion.div>

        {/* Chat History (rest of this section remains unchanged) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <div
            ref={chatHistoryRef}
            className="h-96 overflow-y-auto space-y-4 p-6 rounded-2xl backdrop-blur-2xl bg-white/[0.02] border border-white/[0.1]"
          >
            {messages.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-violet-500/10 flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white/90 mb-2">Ready for Philosophical Debate</h3>
                  <p className="text-white/60 mb-1">Present your argument, and I'll challenge it with reasoned counter-arguments.</p>
                  <p className="text-sm text-violet-400 font-medium">Voice and text input available</p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <motion.div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={`max-w-[80%] rounded-2xl p-4 ${
                    message.sender === 'user'
                      ? 'bg-white text-black'
                      : 'bg-white/[0.05] text-white/90 border border-white/[0.1]'
                  }`}>
                    <div className="mb-2">{message.content}</div>
                    <div className="text-xs opacity-70 flex items-center gap-2">
                      <span>{message.sender === 'user' ? 'You' : 'AI Philosopher'}</span>
                      <span>•</span>
                      <span>{formatTime(message.timestamp)}</span>
                      {message.metadata?.confidence && (
                        <>
                          <span>•</span>
                          <span>Confidence: ${(message.metadata.confidence * 100).toFixed(0)}%</span>
                        </>
                      )}
                    </div>
                    {message.sender === 'ai' && message.metadata?.sources && message.metadata.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/[0.1]">
                        <details className="text-sm">
                          <summary className="cursor-pointer text-violet-400 font-medium hover:text-violet-300">
                            📚 Philosophical Sources ({message.metadata.sources.length})
                          </summary>
                          <ul className="mt-2 space-y-1 text-white/60">
                            {message.metadata.sources.map((source, index) => (
                              <li key={index} className="text-xs">• {source}</li>
                            ))}
                          </ul>
                        </details>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}

            {/* Typing Indicator */}
            {isTyping && (
              <motion.div
                className="flex justify-start"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="bg-white/[0.05] text-white/90 rounded-2xl p-4 border border-white/[0.1]">
                  <div className="flex items-center gap-3">
                    <TypingDots />
                    <span className="text-sm text-white/60">AI is thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Chat Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <ChatInput
            value={messageInput}
            onChange={setMessageInput}
            onSend={sendMessage}
            onAttachFile={handleAttachFile}
            attachments={attachments}
            onRemoveAttachment={removeAttachment}
            isTyping={isTyping}
            disabled={!isConnected}
            placeholder="Present your philosophical argument..."
          />
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <ActionButton
            icon={<Download className="w-4 h-4" />}
            label="Export Transcript"
            onClick={exportTranscript}
          />
          <ActionButton
            // Use liveKitIsMicActive for the button's state
            icon={liveKitIsMicActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            label={liveKitIsMicActive ? 'End Voice Session' : 'Start Voice Debate'}
            // This logic is good, directly toggling based on the LiveKit mic status.
            onClick={liveKitIsMicActive ? handleStopVoiceInteraction : handleStartVoiceInteraction}
          />
        </motion.div>

        {/* Footer */}
        <motion.div
          className="text-center text-sm text-white/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <p>Powered by AssemblyAI, OpenAI, and LiveKit | Built for AssemblyAI Hackathon</p>
        </motion.div>
      </div>

      {/* Mouse-following glow effect and Typing indicator overlay remain unchanged */}
      <AnimatePresence>
        {inputFocused && (
          <motion.div
            className="fixed w-[50rem] h-[50rem] rounded-full pointer-events-none z-0 opacity-[0.02] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 blur-[96px]"
            animate={{
              x: mousePosition.x - 400,
              y: mousePosition.y - 400,
            }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 150,
              mass: 0.5,
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTyping && (
          <motion.div
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 backdrop-blur-2xl bg-white/[0.02] rounded-full px-4 py-2 shadow-lg border border-white/[0.05] z-50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-7 rounded-full bg-white/[0.05] flex items-center justify-center text-center">
                <span className="text-xs font-medium text-white/90 mb-0.5">AI</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/70">
                <span>Thinking</span>
                <TypingDots />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;