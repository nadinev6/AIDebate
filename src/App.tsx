import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Download, Send, Wifi, WifiOff, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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

  // Refs for DOM access
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // API configuration
  const apiBaseUrl = 'http://localhost:8000';

  // Check server connection on component mount
  useEffect(() => {
    checkServerConnection();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

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

    // Focus back on input
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.ctrlKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  const toggleVoiceSession = async () => {
    if (isVoiceActive) {
      await endVoiceSession();
    } else {
      await startVoiceSession();
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
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-primary/10 glow-primary">
              <MessageSquare className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              AI Debate Partner
            </h1>
            <div className="p-3 rounded-full bg-accent/10 glow-accent">
              <Sparkles className="w-8 h-8 text-accent" />
            </div>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your Real-Time AI Opponent for Philosophical Arguments
          </p>
        </div>

        {/* Connection Status */}
        <Card className="mb-6 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {isConnected ? (
                <Wifi className="w-5 h-5 text-primary" />
              ) : (
                <WifiOff className="w-5 h-5 text-destructive" />
              )}
              <span className={`font-medium ${isConnected ? 'text-primary' : 'text-destructive'}`}>
                {connectionStatus}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Main Debate Interface */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Debate Arena</CardTitle>
            <CardDescription className="text-center">
              Present your argument and engage with philosophical counter-arguments
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Chat History */}
            <div 
              ref={chatHistoryRef}
              className="h-96 overflow-y-auto space-y-4 p-4 rounded-lg bg-muted/20 border border-border/30"
            >
              {messages.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center glow-primary">
                    <MessageSquare className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-primary mb-2">Welcome to the AI Debate Arena!</h3>
                    <p className="text-muted-foreground mb-1">Make a claim, and I'll challenge it with philosophical counter-arguments.</p>
                    <p className="text-sm text-accent font-medium">Ready to debate: Voice and text input available!</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={`message-enter flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg p-4 ${
                      message.sender === 'user' 
                        ? 'bg-primary text-primary-foreground glow-primary' 
                        : 'bg-secondary text-secondary-foreground border border-border/50'
                    }`}>
                      <div className="mb-2">{message.content}</div>
                      <div className="text-xs opacity-70 flex items-center gap-2">
                        <span>{message.sender === 'user' ? 'You' : 'AI Opponent'}</span>
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
                        <div className="mt-3 pt-3 border-t border-border/30">
                          <details className="text-sm">
                            <summary className="cursor-pointer text-accent font-medium hover:text-accent/80">
                              📚 Philosophical Sources ({message.metadata.sources.length})
                            </summary>
                            <ul className="mt-2 space-y-1 text-muted-foreground">
                              {message.metadata.sources.map((source, index) => (
                                <li key={index} className="text-xs">• {source}</li>
                              ))}
                            </ul>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              
              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-secondary text-secondary-foreground rounded-lg p-4 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="typing-dots">
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                      </div>
                      <span className="text-sm text-muted-foreground">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Controls */}
            <div className="space-y-4">
              <Textarea
                ref={messageInputRef}
                value={messageInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type your argument here... (e.g., 'The death penalty is morally justified')"
                className="min-h-[100px] bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20"
              />
              
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={sendMessage}
                  disabled={!messageInput.trim() || !isConnected}
                  className="flex-1 min-w-[200px] glow-primary"
                  size="lg"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Argument
                </Button>
                
                <Button
                  onClick={toggleVoiceSession}
                  variant={isVoiceActive ? "destructive" : "voice"}
                  size="lg"
                  className={isVoiceActive ? "animate-pulse-glow" : ""}
                >
                  {isVoiceActive ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                  {isVoiceActive ? 'End Voice Session' : 'Start Voice Debate'}
                </Button>
                
                <Button
                  onClick={exportTranscript}
                  disabled={messages.length === 0}
                  variant="outline"
                  size="lg"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Transcript
                </Button>
              </div>
            </div>

            {/* Features Preview */}
            <Card className="bg-muted/10 border-border/30">
              <CardContent className="p-4">
                <h4 className="font-semibold text-accent mb-3">Features Available:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span><strong>RAG-Powered Debates:</strong> ✅ AI responses backed by philosophical knowledge</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent"></div>
                    <span><strong>Voice Integration:</strong> ✅ Real-time voice debate with LiveKit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span><strong>Text Input:</strong> ✅ Alternative text-based debate interface</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent"></div>
                    <span><strong>Export Transcript:</strong> ✅ Download complete conversation history</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>Powered by AssemblyAI, OpenAI, and LiveKit | Built for AssemblyAI Hackathon</p>
        </div>
      </div>
    </div>
  );
}

export default App;