# AI Debate Partner

*Your Real-Time AI Opponent for Philosophical Arguments*

AI Debate Partner is a real-time, browser-based platform where you can argue your idea and the AI will push back with sharp, curated philosophical counter-arguments. Powered by a structured knowledge base and Retrieval-Augmented Generation (RAG).

The aim was to create an AI opponent that **evolves with you, sharpening its arguments and, in turn, your intellect, the longer you engage.**

## 🚀 Current Status

The project is fully functional, with all core features for real-time, RAG-powered philosophical debates implemented.

## 🏗️ Architecture

# AI Debate Partner

*Your Real-Time AI Opponent for Philosophical Arguments*

AI Debate Partner is a real-time, browser-based platform where you can argue your ideas—and the AI will push back with sharp, curated philosophical counter-arguments. Powered by a structured knowledge base and Retrieval-Augmented Generation (RAG).

The aim was to create an AI opponent that **evolves with you, sharpening its arguments and, in turn, your intellect, the longer you engage.**

## 🚀 Current Status

The project is fully functional, with all core features for real-time, RAG-powered philosophical debates implemented.

## 🏗️ Architecture

ai-debate-partner/
├── backend/                 # Python FastAPI backend
│   ├── main.py             # FastAPI server and routes
│   ├── config.py           # Configuration management
│   ├── agents/             # LiveKit agents for real-time voice
│   ├── requirements.txt    # Python dependencies
│   └── init.py        # Package initialisation
├── frontend/               # HTML/CSS/JavaScript frontend
│   ├── index.html         # Main application page
│   ├── style.css          # Responsive styles
│   ├── script.js          # Frontend logic
│   └── assets/            # Static assets
├── .env.example           # Environment configuration template
└── README.md             # This file

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- `pip` package manager

### Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/ai-debate-partner.git](https://github.com/your-username/ai-debate-partner.git)
    cd ai-debate-partner
    ```

2.  **Set up backend:**
    ```bash
    cd backend
    pip install -r requirements.txt
    ```
    **Important Note for Voice Features:** Ensure you have an updated version of `livekit` and `livekit-vad` installed in your virtual environment. If you encounter issues, consider updating them:
    ```bash
    pip install --upgrade livekit livekit-plugins-vad
    ```

3.  **Configure environment:**
    ```bash
    cp .env.example .env
    # Edit .env with your API keys
    # Add your OpenAI API key: OPENAI_API_KEY=your_key_here
    ```

    **For Voice Features:**
    ```bash
    # Add additional API keys to .env for voice functionality
    LIVEKIT_API_KEY=your_livekit_api_key_here
    LIVEKIT_API_SECRET=your_livekit_api_secret_here
    LIVEKIT_URL=wss://your-livekit-server.com
    ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here
    CARTESIA_API_KEY=your_cartesia_api_key_here
    ```

4.  **Prepare the knowledge base:**
    ```bash
    python backend/prepare_knowledge_base.py
    ```

5.  **Run the application:**

    First, **start the main backend server:**
    ```bash
    cd backend
    python main.py
    ```
    *The server will typically start on `http://localhost:8000`.*

    Second, **in a separate terminal, start the LiveKit debate agent:**
    ```bash
    cd backend
    python agents/debate_agent.py dev
    ```
    *This command runs the debate agent in a development mode.*

6.  **Access the application:**
    - Open your browser to `http://localhost:8000/static/index.html`
    - Or use the development server preview in your IDE

## 🔧 API Endpoints

### Current Endpoints

**Core API:**
- `GET /` - API information
- `GET /health` - Health check
- `POST /api/debate/test` - Main RAG-powered debate endpoint
- `GET /api/knowledge/topics` - Available philosophical topics
- `GET /api/knowledge/search` - Search knowledge base directly

**Voice API:**
- `POST /api/voice/start-session` - Start a voice debate session
- `GET /api/voice/session/{session_id}` - Get voice session status
- `DELETE /api/voice/session/{session_id}` - End a voice session
- `GET /api/voice/sessions` - List active voice sessions

### Performance Analytics

**Real-time Metrics Logging:**
- API response times automatically logged to `backend/performance_logs.jsonl`
- Confidence scores tracked for all AI responses
- Success/failure rates monitored
- JSONL format for easy parsing and analysis

**View Performance Data:**
```bash
# Get recent performance metrics via API
curl http://localhost:8000/api/performance/metrics

# Or view raw log file
cat backend/performance_logs.jsonl

**Metrics Include:**
- Response time (seconds)
- Confidence score (0.0-1.0)
- Message length
- Success/failure status
- Timestamp and error details

- `GET /api/debate/history` - Debate session history

## 🎨 Features

- Clean, modern responsive design
- Real-time server connection status
- Text-based argument input
- Basic API communication
- Mobile-friendly interface
- **📚 RAG-Powered Debates**: AI responses backed by philosophical knowledge base
- **🔍 Source Attribution**: See which philosophical texts inform AI responses
- **🧠 Contextual Arguments**: AI draws from curated philosophical content
- **📖 Knowledge Base Search**: Direct access to philosophical concepts
- 🎤 **Voice Session Management**: Start and manage real-time voice debates
- 🔗 **LiveKit Integration**: Real-time audio streaming infrastructure
- 🎭 **OpenAI/Cartesia TTS**: High-quality "Griffin" philosopher voice
- 🎯 **Speech-to-Text**: AssemblyAI integration for voice input processing
- 🤖 **AI Agent**: LiveKit agent with RAG-powered philosophical responses
- **Audio Playback**: Frontend integration for hearing AI responses
- **Voice Chat History**: Display spoken AI responses in text chat
- 📱 **Mobile App**: Native mobile experience

## 🔧 Technology Stack

**Backend:**
- FastAPI - Modern Python web framework
- Uvicorn - ASGI server
- Pydantic - Data validation
- LangChain - AI/ML orchestration
- LiveKit - Real-time audio/video streaming
- LiveKit Agents - AI agent framework
- FAISS - Vector similarity search

**Frontend:**
- Vanilla HTML/CSS/JavaScript
- Modern CSS Grid and Flexbox
- Responsive design principles
- Real-time API communication

**AI Services:**
- OpenAI GPT models for text generation
- AssemblyAI for speech-to-text
- OpenAI TTS / Cartesia for high-quality text-to-speech (Griffin voice)
- LiveKit for real-time audio streaming
- Sentence Transformers for embeddings
- FAISS for vector similarity search

## 📁 Project Structure Details

### Backend Structure

backend/
├── main.py              # FastAPI application and routes
├── config.py            # Settings and environment management
├── requirements.txt     # Python dependencies
├── agents/              # LiveKit agents for voice interaction
├── tests/               # Unit tests for API endpoints
├── init.py         # Package initialisation
└──
    ├── knowledge_base/  # Markdown knowledge files
    ├── models/         # Data models and schemas
    ├── services/       # Business logic services
    └── utils/          # Utility functions

### Frontend Structure
frontend/
├── index.html          # Main application page
├── style.css           # Responsive styles and animations
├── script.js           # Application logic and API calls
├── assets/            # Static assets (images, icons)
└──
    ├── components/     # Reusable UI components
    └── modules/        # Feature-specific JavaScript modules


## 🚀 Development

### Running in Development Mode

**Backend:**
```bash
cd backend
python main.py
# Server starts on http://localhost:8000



**Voice Agent:**
```bash
python backend/agents/debate_agent.py dev

**Frontend:**
Access via:

- React dev server: `http://localhost:3000` (recommended for development)
- FastAPI static files: `http://localhost:8000/static/index.html`

### Adding New Features

1.  **Backend Features**: Add new routes in `main.py` or create new modules
2.  **Frontend Features**: Update `script.js` and add styling to `style.css`
3.  **Configuration**: Add new environment variables to `.env.example`
4.  **Voice Features**: Extend agents in `backend/agents/` directory

## 🔐 Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=true

# API Keys
OPENAI_API_KEY=your_openai_api_key_here
ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here

# LiveKit Configuration
LIVEKIT_API_KEY=your_livekit_api_key_here
LIVEKIT_API_SECRET=your_livekit_api_secret_here
LIVEKIT_URL=wss://your-livekit-server.com

# Cartesia TTS Configuration
CARTESIA_API_KEY=your_cartesia_api_key_here
CARTESIA_VOICE_ID=griffin

# Knowledge Base Configuration
KNOWLEDGE_BASE_PATH=backend/knowledge_base
VECTOR_STORE_PATH=backend/faiss_index

# Model Configuration
MODEL_NAME=gpt-3.5-turbo
MAX_TOKENS=150
TEMPERATURE=0.7

# Voice Session Configuration
VOICE_SESSION_TIMEOUT=3600
MAX_CONCURRENT_SESSIONS=10

# Database Configuration (Future Feature)
# DATABASE_URL=sqlite:///./debates.db

# Security Configuration (Future Feature)
# SECRET_KEY=your-secret-key-here
# CORS_ORIGINS=["http://localhost:3000", "[https://yourdomain.com](https://yourdomain.com)"]

## 🧪 Testing

Run the test suite:

```bash
cd backend
python -m pytest tests/ -v

## 📝 License

MIT License - Free and open-source

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For questions or issues:
- Open an issue on GitHub
- Check the project documentation
- Review the sprint planning comments in the code

---

**Built for the AssemblyAI Hackathon** 🚀

*Ready to argue? The AI is waiting for your best philosophical challenge!*