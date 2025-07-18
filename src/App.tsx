import React, { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, MessageSquare, Sparkles, Download, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatInput, TypingDots, ActionButton } from '@/components/ui/chat-input';
import { AIVoiceInput } from '@/components/ui/ai-voice-input';

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
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [voiceSession, setVoiceSession] = useState<VoiceSession | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [inputFocused, setInputFocused] = useState(false);

  // Refs for DOM access
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  // API configuration
  const apiBaseUrl = 'http://localhost:8000';

  // Check server connection on component mount
  useEffect(() => {
    checkServerConnection();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    // Delay scroll to allow framer-motion animation to complete
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 300); // Match the duration of the message animation
    
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

  const startVoiceSession = async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the test stream

      // Generate a unique user identity
      const userIdentity = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Start voice session with backend
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const sessionData = await response.json();
      setVoiceSession(sessionData);
      setIsVoiceActive(true);

      addMessage(
        `Voice session started! Room: ${sessionData.room_name}. The AI philosopher is ready to debate.`,
        'ai'
      );

    } catch (error) {
      console.error('Error starting voice session:', error);
      addMessage(
        `Failed to start voice session: ${error.message}. Please check your microphone permissions and try again.`,
        'ai'
      );
    }
  };

  const endVoiceSession = async () => {
    try {
      if (voiceSession) {
        // End session with backend
        const response = await fetch(
          `${apiBaseUrl}/api/voice/session/${voiceSession.session_id}`,
          {
            method: 'DELETE'
          }
        );

        if (!response.ok) {
          console.warn('Failed to end session on backend, continuing with cleanup');
        }
      }

      setIsVoiceActive(false);
      setVoiceSession(null);
      addMessage('Voice session ended.', 'ai');

    } catch (error) {
      console.error('Error ending voice session:', error);
      addMessage(`Error ending voice session: ${error.message}`, 'ai');
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

    // Format the conversation
    const transcript = messages.map(message => {
      const timestamp = formatTime(message.timestamp);
      const speaker = message.sender === 'user' ? 'You' : 'AI Opponent';
      let content = `[${timestamp}] ${speaker}: ${message.content}`;
      
      // Add metadata if available
      if (message.metadata?.sources && message.metadata.sources.length > 0) {
        content += `\n  Sources: ${message.metadata.sources.join(', ')}`;
      }
      if (message.metadata?.confidence) {
        content += `\n  Confidence: ${(message.metadata.confidence * 100).toFixed(0)}%`;
      }
      
      return content;
    }).join('\n\n');

    // Add header
    const header = `AI Debate Partner - Conversation Transcript\nExported: ${new Date().toLocaleString()}\n${'='.repeat(50)}\n\n`;
    const fullTranscript = header + transcript;

    // Create and download file
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
      {/* Atmospheric background effects */}
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
            {isConnected ? (
              <Wifi className="w-5 h-5 text-violet-400" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-400" />
            )}
            <span className={`font-medium ${isConnected ? 'text-violet-400' : 'text-red-400'}`}>
              {connectionStatus}
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
          <AIVoiceInput
            onStart={startVoiceSession}
            onStop={endVoiceSession}
            demoMode={false}
            className="backdrop-blur-2xl bg-white/[0.02] rounded-2xl border border-white/[0.05] py-8"
          />
        </motion.div>

        {/* Chat History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <div 
            ref={chatHistoryRef}
            className="h-96 overflow-y-auto space-y-4 p-6 rounded-2xl backdrop-blur-2xl bg-white/[0.02] border border-white/[0.05]"
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
                          <span>Confidence: {(message.metadata.confidence * 100).toFixed(0)}%</span>
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
            icon={isVoiceActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            label={isVoiceActive ? 'End Voice Session' : 'Start Voice Debate'}
            onClick={isVoiceActive ? endVoiceSession : startVoiceSession}
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

      {/* Mouse-following glow effect */}
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

      {/* Typing indicator overlay */}
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