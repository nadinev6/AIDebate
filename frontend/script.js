/**
 * AI Debate Partner - Frontend JavaScript
 * Sprint 1: Basic API communication and UI interactions
 * Future Sprints: Will add voice processing, real-time features, and advanced UI
 */

class DebateApp {
    constructor() {
        this.apiBaseUrl = 'http://localhost:8000';
        this.isConnected = false;
        this.currentSession = null;
        this.voiceSession = null;
        this.isVoiceActive = false;
        this.liveKitRoom = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.checkServerConnection();
        
        console.log('AI Debate Partner initialized - Sprint 1');
    }

    initializeElements() {
        // DOM elements
        this.chatHistory = document.getElementById('chatHistory');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.voiceButton = document.getElementById('voiceButton');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.statusDot = this.connectionStatus.querySelector('.status-dot');
        this.statusText = this.connectionStatus.querySelector('.status-text');
    }

    setupEventListeners() {
        // Send button click
        this.sendButton.addEventListener('click', () => this.sendMessage());
        
        // Enter key in textarea (Ctrl+Enter for new line)
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.ctrlKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Voice button (Sprint 3 - now enabled)
        this.voiceButton.addEventListener('click', () => {
            this.toggleVoiceSession();
        });
        
        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
        });
    }

    async checkServerConnection() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/health`);
            const data = await response.json();
            
            if (data.status === 'healthy') {
                this.updateConnectionStatus(true, 'Connected to server');
                this.isConnected = true;
            } else {
                this.updateConnectionStatus(false, 'Server unhealthy');
            }
        } catch (error) {
            console.error('Connection check failed:', error);
            this.updateConnectionStatus(false, 'Server offline');
        }
    }

    updateConnectionStatus(connected, message) {
        this.isConnected = connected;
        this.statusText.textContent = message;
        
        if (connected) {
            this.statusDot.classList.add('connected');
            this.statusDot.style.backgroundColor = 'var(--success-color)';
        } else {
            this.statusDot.classList.remove('connected');
            this.statusDot.style.backgroundColor = 'var(--error-color)';
        }
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        if (!this.isConnected) {
            this.showSprintMessage('Please wait for server connection...');
            return;
        }

        // Clear input and disable send button
        this.messageInput.value = '';
        this.sendButton.disabled = true;
        this.sendButton.textContent = 'Sending...';

        // Add user message to chat
        this.addMessageToChat(message, 'user');

        try {
            // Show typing indicator
            this.showTypingIndicator();

            // Send to backend API
            const response = await fetch(`${this.apiBaseUrl}/api/debate/test`, {
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
            
            // Remove typing indicator
            this.hideTypingIndicator();
            
            // Add AI response to chat
            this.addMessageToChat(data.response, 'ai', data);

        } catch (error) {
            console.error('Error sending message:', error);
            this.hideTypingIndicator();
            this.addMessageToChat('Sorry, I encountered an error. Please try again.', 'ai');
        } finally {
            // Re-enable send button
            this.sendButton.disabled = false;
            this.sendButton.textContent = 'Send Argument';
            this.messageInput.focus();
        }
    }

    addMessageToChat(content, sender, metadata = {}) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;
        
        const metaDiv = document.createElement('div');
        metaDiv.className = 'message-meta';
        
        if (sender === 'user') {
            metaDiv.textContent = `You • ${this.formatTime(new Date())}`;
        } else {
            const confidenceText = metadata.confidence ? 
                ` • Confidence: ${(metadata.confidence * 100).toFixed(0)}%` : '';
            const sourcesText = metadata.sources && metadata.sources.length > 0 ?
                ` • Sources: ${metadata.sources.join(', ')}` : '';
            metaDiv.textContent = `AI Opponent • ${this.formatTime(new Date())}${confidenceText}${sourcesText}`;
        }
        
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(metaDiv);
        
        // Add sources information if available
        if (sender === 'ai' && metadata.sources && metadata.sources.length > 0) {
            const sourcesDiv = document.createElement('div');
            sourcesDiv.className = 'message-sources';
            sourcesDiv.innerHTML = `
                <details>
                    <summary>📚 Philosophical Sources (${metadata.sources.length})</summary>
                    <ul>
                        ${metadata.sources.map(source => `<li>${source}</li>`).join('')}
                    </ul>
                </details>
            `;
            messageDiv.appendChild(sourcesDiv);
        }
        
        // Remove welcome message if it exists
        const welcomeMessage = this.chatHistory.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        this.chatHistory.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typing-indicator';
        
        typingDiv.innerHTML = `
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
            <span>AI is thinking...</span>
        `;
        
        this.chatHistory.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    async toggleVoiceSession() {
        if (this.isVoiceActive) {
            await this.endVoiceSession();
        } else {
            await this.startVoiceSession();
        }
    }

    async startVoiceSession() {
        try {
            this.voiceButton.disabled = true;
            this.voiceButton.textContent = 'Starting...';

            // Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop()); // Stop the test stream

            // Generate a unique user identity
            const userIdentity = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Start voice session with backend
            const response = await fetch(`${this.apiBaseUrl}/api/voice/start-session`, {
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
            this.voiceSession = sessionData;

            // TODO: Initialize LiveKit connection
            // This would require importing the LiveKit client SDK
            // For now, we'll simulate the connection
            await this.initializeLiveKitConnection(sessionData);

            this.isVoiceActive = true;
            this.voiceButton.textContent = '🔴 End Voice Session';
            this.voiceButton.disabled = false;

            this.addMessageToChat(
                `Voice session started! Room: ${sessionData.room_name}. The AI philosopher is ready to debate.`,
                'ai'
            );

        } catch (error) {
            console.error('Error starting voice session:', error);
            this.voiceButton.disabled = false;
            this.voiceButton.textContent = '🎤 Start Voice Debate';
            this.addMessageToChat(
                `Failed to start voice session: ${error.message}. Please check your microphone permissions and try again.`,
                'ai'
            );
        }
    }

    async initializeLiveKitConnection(sessionData) {
        // TODO: This would be implemented with the actual LiveKit client SDK
        // For now, we'll simulate the connection process
        console.log('Initializing LiveKit connection...', sessionData);
        
        // Simulate connection delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('LiveKit connection established (simulated)');
        
        // In a real implementation, this would:
        // 1. Import LiveKit client SDK
        // 2. Create a Room instance
        // 3. Connect using the provided token
        // 4. Set up audio track publishing and subscribing
        // 5. Handle real-time audio streaming
    }

    async endVoiceSession() {
        try {
            this.voiceButton.disabled = true;
            this.voiceButton.textContent = 'Ending...';

            if (this.voiceSession) {
                // End session with backend
                const response = await fetch(
                    `${this.apiBaseUrl}/api/voice/session/${this.voiceSession.session_id}`,
                    {
                        method: 'DELETE'
                    }
                );

                if (!response.ok) {
                    console.warn('Failed to end session on backend, continuing with cleanup');
                }
            }

            // TODO: Disconnect from LiveKit room
            if (this.liveKitRoom) {
                // this.liveKitRoom.disconnect();
                this.liveKitRoom = null;
            }

            this.isVoiceActive = false;
            this.voiceSession = null;
            this.voiceButton.textContent = '🎤 Start Voice Debate';
            this.voiceButton.disabled = false;

            this.addMessageToChat('Voice session ended.', 'ai');

        } catch (error) {
            console.error('Error ending voice session:', error);
            this.voiceButton.disabled = false;
            this.voiceButton.textContent = '🎤 Start Voice Debate';
            this.addMessageToChat(
                `Error ending voice session: ${error.message}`,
                'ai'
            );
        }
    }

    showSprintMessage(message) {
        this.addMessageToChat(message, 'ai');
    }

    formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    scrollToBottom() {
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.debateApp = new DebateApp();
});

// Sprint 3+ Features (Placeholder functions)
class KnowledgeBase {
    // Sprint 2: Handles philosophical knowledge retrieval (implemented)
    static async searchTopics(query) {
        console.log('Knowledge base search implemented in Sprint 2');
        return [];
    }
}

class VoiceHandler {
    // Sprint 3: Handles LiveKit voice integration (in progress)
    static async startVoiceSession() {
        console.log('Voice session implementation in progress');
        return null;
    }
}

class DebateAnalytics {
    // Sprint 5: Will handle debate analysis and improvements
    static trackDebateMetrics(session) {
        console.log('Analytics tracking coming in Sprint 5');
    }
}