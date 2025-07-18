# AI Debate Partner

*Your Real-Time AI Opponent for Philosophical Arguments*


AI Debate Partner is a real-time, browser-based platform where you can argue your ideas—and the AI will push back with sharp, curated philosophical counter-arguments. Powered by a structured knowledge base and Retrieval-Augmented Generation (RAG).

## 🚀 Current Status: Sprint 1 Complete

**Sprint 1 Features (✅ Complete):**
- ✅ Full-stack project structure (backend + frontend)
- ✅ FastAPI backend with health checks and test endpoints
- ✅ Modern HTML/CSS/JavaScript frontend
- ✅ Basic API communication
- ✅ Responsive design ready for mobile and desktop
- ✅ Configuration management with environment variables
- ✅ Clear project structure for future expansion

**Sprint 2 Features (✅ Complete):**
- ✅ Markdown-based philosophical knowledge base
- ✅ Vector embeddings with FAISS
- ✅ Semantic search for argument retrieval
- ✅ RAG implementation with LangChain
- ✅ Enhanced debate endpoint with real philosophical responses
- ✅ Source attribution and confidence scoring

## 🛠️ Development Roadmap

### Sprint 3: Real-time Voice Integration (🚧 In Progress)
- ✅ LiveKit voice session management
- ✅ Voice session API endpoints with token generation
- ✅ Frontend voice session controls
- ✅ LiveKit agent framework with Cartesia TTS
- 🚧 AssemblyAI speech-to-text integration
- 🚧 Real-time audio streaming
- 🚧 Voice activity detection
- ✅ Unit tests for voice API endpoints

### Sprint 4: Advanced AI Features
- [ ] Context-aware conversation memory
- [ ] Multi-turn debate handling
- [ ] Argument strength analysis
- [ ] Debate style customization
- [ ] Response confidence scoring

### Sprint 5: Polish and Analytics
- [ ] Debate transcription and export
- [ ] User feedback integration
- [ ] Debate session management
- [ ] Production optimizations

## 🏗️ Architecture

```
ai-debate-partner/
├── backend/                 # Python FastAPI backend
│   ├── main.py             # FastAPI server and routes
│   ├── config.py           # Configuration management
│   ├── agents/             # LiveKit agents for real-time voice
│   ├── requirements.txt    # Python dependencies
│   └── __init__.py        # Package initialization
├── frontend/               # HTML/CSS/JavaScript frontend
│   ├── index.html         # Main application page
│   ├── style.css          # Responsive styles
│   ├── script.js          # Frontend logic
│   └── assets/            # Static assets
├── .env.example           # Environment configuration template
└── README.md             # This file
```

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- pip package manager

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/your-username/ai-debate-partner.git
cd ai-debate-partner
```

2. **Set up backend:**
```bash
cd backend
pip install -r requirements.txt
```

3. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your API keys (required for RAG functionality)
# Add your OpenAI API key: OPENAI_API_KEY=your_key_here
```

**For Voice Features (Sprint 3):**
```bash
# Add additional API keys to .env for voice functionality
```

4. **Prepare the knowledge base:**
```bash
python backend/prepare_knowledge_base.py
```

5. **Start the backend server:**
```bash
python main.py
```

**For Voice Features (Sprint 3):**
```bash
# In a separate terminal, start the LiveKit agent
cd backend
python agents/debate_agent.py
```

6. **Access the application:**
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

**Voice API (Sprint 3):**
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
```

**Metrics Include:**
- Response time (seconds)
- Confidence score (0.0-1.0)
- Message length
- Success/failure status
- Timestamp and error details

- `GET /api/debate/history` - Debate session history

## 🎨 Features

### Current (Sprint 2)
- Clean, modern responsive design
- Real-time server connection status
- Text-based argument input
- Basic API communication
- Mobile-friendly interface
- **📚 RAG-Powered Debates**: AI responses backed by philosophical knowledge base
- **🔍 Source Attribution**: See which philosophical texts inform AI responses
- **🧠 Contextual Arguments**: AI draws from curated philosophical content
- **📖 Knowledge Base Search**: Direct access to philosophical concepts

### Sprint 3 (Voice Integration - In Progress)
- 🎤 **Voice Session Management**: Start and manage real-time voice debates
- 🔗 **LiveKit Integration**: Real-time audio streaming infrastructure
- 🎭 **Cartesia TTS**: High-quality "Griffin" philosopher voice

- 📱 **Mobile App**: Native mobile experience

## 🔧 Technology Stack

**Backend:**
- FastAPI - Modern Python web framework
- Uvicorn - ASGI server
- Pydantic - Data validation
- LangChain - AI/ML orchestration (Sprint 2+)
- LiveKit - Real-time audio/video streaming (Sprint 3+)
- LiveKit Agents - AI agent framework (Sprint 3+)
- FAISS - Vector similarity search (Sprint 2+)

**Frontend:**
- Vanilla HTML/CSS/JavaScript
- Modern CSS Grid and Flexbox
- Responsive design principles
- Real-time API communication

**AI Services:**
- OpenAI GPT models for text generation
- AssemblyAI for speech-to-text
- Cartesia for high-quality text-to-speech (Griffin voice)
- LiveKit for real-time audio streaming
- Sentence Transformers for embeddings
- FAISS for vector similarity search

## 📁 Project Structure Details

### Backend Structure
```
backend/
├── main.py              # FastAPI application and routes
├── config.py            # Settings and environment management
├── requirements.txt     # Python dependencies
├── agents/              # LiveKit agents for voice interaction
├── tests/               # Unit tests for API endpoints
├── __init__.py         # Package initialization
└── [Sprint 2+]
    ├── knowledge_base/  # Markdown knowledge files
    ├── models/         # Data models and schemas
    ├── services/       # Business logic services
    └── utils/          # Utility functions
```

### Frontend Structure
```
frontend/
├── index.html          # Main application page
├── style.css           # Responsive styles and animations
├── script.js           # Application logic and API calls
├── assets/            # Static assets (images, icons)
└── [Sprint 3+]
    ├── components/     # Reusable UI components
    └── modules/        # Feature-specific JavaScript modules
```

## 🚀 Development

### Running in Development Mode

**Backend:**
```bash
cd backend
python main.py
# Server starts on http://localhost:8000
```

**Voice Agent (Sprint 3):**
```bash
python backend/agents/debate_agent.py
```

**Frontend:**
Access via: `http://localhost:8000/static/index.html`

### Adding New Features

1. **Backend Features**: Add new routes in `main.py` or create new modules
2. **Frontend Features**: Update `script.js` and add styling to `style.css`
3. **Configuration**: Add new environment variables to `.env.example`
4. **Voice Features**: Extend agents in `backend/agents/` directory

## 🔐 Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=true

# API Keys (Sprint 2+)
OPENAI_API_KEY=your_openai_api_key_here
ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here

# LiveKit Configuration (Sprint 3+)
LIVEKIT_API_KEY=your_livekit_api_key_here
LIVEKIT_API_SECRET=your_livekit_api_secret_here
LIVEKIT_URL=wss://your-livekit-server.com

# Cartesia TTS Configuration (Sprint 3+)
CARTESIA_API_KEY=your_cartesia_api_key_here
CARTESIA_VOICE_ID=griffin

# Knowledge Base Configuration (Sprint 2+)
KNOWLEDGE_BASE_PATH=backend/knowledge_base
VECTOR_STORE_PATH=faiss_index

# Model Configuration (Sprint 2+)
MODEL_NAME=gpt-3.5-turbo
MAX_TOKENS=150
TEMPERATURE=0.7

# Voice Session Configuration (Sprint 3+)
VOICE_SESSION_TIMEOUT=3600
MAX_CONCURRENT_SESSIONS=10

# Database Configuration (Sprint 4+)
DATABASE_URL=sqlite:///./debates.db

# Security Configuration (Sprint 4+)
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=["http://localhost:3000", "https://yourdomain.com"]
```

## 🧪 Testing

Run the test suite:
```bash
cd backend
python -m pytest tests/ -v
```

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