import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Download, Send, Wifi, WifiOff } from 'lucide-react';

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
    <div className="container">
      {/* Header */}
      <header className="header">
        <h1>🗣️ AI Debate Partner</h1>
        <p className="subtitle">Your Real-Time AI Opponent for Philosophical Arguments</p>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Connection Status */}
        <div className="status-bar">
          <div className="status-indicator">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className="status-text">{connectionStatus}</span>
          </div>
        </div>

        {/* Debate Interface */}
        <div className="debate-container">
          {/* Chat History */}
          <div className="chat-history" ref={chatHistoryRef}>
            {messages.length === 0 ? (
              <div className="welcome-message">
                <h3>Welcome to the AI Debate Arena!</h3>
                <p>Make a claim, and I'll challenge it with philosophical counter-arguments.</p>
                <p><strong>Ready to debate:</strong> Voice and text input available!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`message ${message.sender}`}>
                  <div className="message-content">{message.content}</div>
                  <div className="message-meta">
                    {message.sender === 'user' ? 'You' : 'AI Opponent'} • {formatTime(message.timestamp)}
                    {message.metadata?.confidence && 
                      ` • Confidence: ${(message.metadata.confidence * 100).toFixed(0)}%`
                    }
                    {message.metadata?.sources && message.metadata.sources.length > 0 &&
                      ` • Sources: ${message.metadata.sources.join(', ')}`
                    }
                  </div>
                  {message.sender === 'ai' && message.metadata?.sources && message.metadata.sources.length > 0 && (
                    <div className="message-sources">
                      <details>
                        <summary>📚 Philosophical Sources ({message.metadata.sources.length})</summary>
                        <ul>
                          {message.metadata.sources.map((source, index) => (
                            <li key={index}>{source}</li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  )}
                </div>
              ))
            )}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="typing-indicator">
                <div className="typing-dots">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
                <span>AI is thinking...</span>
              </div>
            )}
          </div>

          {/* Input Controls */}
          <div className="input-section">
            <div className="input-group">
              <textarea
                ref={messageInputRef}
                value={messageInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type your argument here... (e.g., 'The death penalty is morally justified')"
                rows={3}
                className="w-full p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="input-controls">
                <button
                  onClick={sendMessage}
                  disabled={!messageInput.trim() || !isConnected}
                  className="btn btn-primary"
                >
                  <Send className="w-4 h-4" />
                  Send Argument
                </button>
                <button
                  onClick={toggleVoiceSession}
                  className={`btn ${isVoiceActive ? 'btn-voice active' : 'btn-voice'}`}
                >
                  {isVoiceActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {isVoiceActive ? 'End Voice Session' : 'Start Voice Debate'}
                </button>
                <button
                  onClick={exportTranscript}
                  disabled={messages.length === 0}
                  className="btn btn-secondary"
                >
                  <Download className="w-4 h-4" />
                  Export Transcript
                </button>
              </div>
            </div>
          </div>

          {/* Features Preview */}
          <div className="features-preview">
            <h4>Features Available:</h4>
            <ul>
              <li>📚 <strong>RAG-Powered Debates:</strong> ✅ AI responses backed by philosophical knowledge</li>
              <li>🎤 <strong>Voice Integration:</strong> ✅ Real-time voice debate with LiveKit</li>
              <li>💬 <strong>Text Input:</strong> ✅ Alternative text-based debate interface</li>
              <li>📄 <strong>Export Transcript:</strong> ✅ Download complete conversation history</li>
              <li>📱 <strong>Responsive Design:</strong> ✅ Works on desktop and mobile</li>
            </ul>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>Powered by AssemblyAI, OpenAI, and LiveKit | Built for AssemblyAI Hackathon</p>
      </footer>
    </div>
  );
}

export default App;