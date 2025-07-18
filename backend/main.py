"""
AI Debate Partner - FastAPI Backend with RAG
Enhanced with Retrieval-Augmented Generation for philosophical debates
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import uvicorn
import os
import logging
import time
import json
from typing import List, Dict, Any, Optional
import uuid

# RAG and AI imports
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.schema.runnable import RunnablePassthrough
from langchain.schema.output_parser import StrOutputParser

# LiveKit imports
from livekit import AccessToken, VideoGrant
from livekit.protocol import Room

from config import settings

# Configure logging
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="AI Debate Partner API",
    description="Real-time AI debate partner with voice integration, philosophical knowledge base and RAG",
    version="2.0.0"
)

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (frontend)
if os.path.exists("../frontend"):
    app.mount("/static", StaticFiles(directory="../frontend"), name="static")

# Global variables for RAG components
vectorstore = None
embeddings = None
llm = None
rag_chain = None
active_voice_sessions = {}  # Track active voice sessions

# Performance logging configuration
PERFORMANCE_LOG_FILE = "backend/performance_logs.jsonl"

def log_performance_metrics(response_time: float, confidence: float, user_message: str, success: bool = True, error_message: str = None):
    """Log performance metrics to filesystem"""
    try:
        log_entry = {
            "timestamp": time.time(),
            "datetime": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),
            "response_time_seconds": round(response_time, 3),
            "confidence_score": round(confidence, 3) if confidence else None,
            "message_length": len(user_message),
            "success": success,
            "error": error_message
        }
        
        # Ensure the backend directory exists
        os.makedirs(os.path.dirname(PERFORMANCE_LOG_FILE), exist_ok=True)
        
        # Append to JSONL file (JSON Lines format for easy parsing)
        with open(PERFORMANCE_LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(json.dumps(log_entry) + '\n')
            
    except Exception as e:
        logger.error(f"Failed to log performance metrics: {str(e)}")

# Data models for API requests/responses
class DebateMessage(BaseModel):
    content: str
    user_id: str = "default"

class DebateResponse(BaseModel):
    response: str
    confidence: float
    sources: List[str] = []
    retrieved_docs: List[Dict[str, Any]] = []

class VoiceSessionRequest(BaseModel):
    room_name: Optional[str] = Field(default=None, description="Room name for the voice session")
    user_identity: str = Field(..., description="User identity for the session")
    participant_name: Optional[str] = Field(default=None, description="Display name for the participant")

class VoiceSessionResponse(BaseModel):
    token: str
    room_name: str
    livekit_url: str
    session_id: str
    expires_at: int

class VoiceSessionStatus(BaseModel):
    session_id: str
    room_name: str
    status: str  # "active", "inactive", "expired"
    created_at: int
    expires_at: int

def initialize_rag():
    """Initialize RAG components on startup"""
    global vectorstore, embeddings, llm, rag_chain
    
    try:
        logger.info("Initializing RAG components...")
        
        # Check if OpenAI API key is available
        if not settings.OPENAI_API_KEY:
            logger.warning("OpenAI API key not found. RAG functionality will be limited.")
            return False
        
        # Initialize embeddings
        logger.info(f"Loading embeddings model: {settings.EMBEDDING_MODEL}")
        embeddings = HuggingFaceEmbeddings(model_name=settings.EMBEDDING_MODEL)
        
        # Load FAISS vector store
        if os.path.exists(f"backend/{settings.VECTOR_STORE_PATH}"):
            logger.info(f"Loading FAISS vector store from: {settings.VECTOR_STORE_PATH}")
            vectorstore = FAISS.load_local(
                f"backend/{settings.VECTOR_STORE_PATH}", 
                embeddings,
                allow_dangerous_deserialization=True
            )
            logger.info(f"Vector store loaded successfully with {vectorstore.index.ntotal} documents")
        else:
            logger.error(f"FAISS vector store not found at: {settings.VECTOR_STORE_PATH}")
            logger.error("Please run 'python backend/prepare_knowledge_base.py' first")
            return False
        
        # Initialize OpenAI LLM
        logger.info(f"Initializing OpenAI LLM: {settings.LLM_MODEL}")
        llm = ChatOpenAI(
            model=settings.LLM_MODEL,
            temperature=settings.TEMPERATURE,
            max_tokens=settings.MAX_TOKENS,
            openai_api_key=settings.OPENAI_API_KEY
        )
        
        # Create RAG prompt template
        rag_prompt = PromptTemplate(
            template="""You are an expert philosophical debate opponent. Your role is to challenge the user's argument with well-reasoned counter-arguments based on established philosophical positions.

Context from philosophical knowledge base:
{context}

User's argument: {question}

Instructions:
1. Analyze the user's argument carefully
2. Use the provided philosophical context to construct a strong counter-argument
3. Reference specific philosophical concepts, thinkers, or schools of thought when relevant
4. Be intellectually rigorous but accessible
5. Challenge assumptions and point out potential weaknesses
6. Maintain a respectful but assertive debate tone
7. Keep your response focused and under 200 words

Your counter-argument:""",
            input_variables=["context", "question"]
        )
        
        # Create RAG chain using LCEL
        def format_docs(docs):
            return "\n\n".join([doc.page_content for doc in docs])
        
        rag_chain = (
            {
                "context": vectorstore.as_retriever(search_kwargs={"k": 3}) | format_docs,
                "question": RunnablePassthrough()
            }
            | rag_prompt
            | llm
            | StrOutputParser()
        )
        
        logger.info("RAG chain initialized successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize RAG: {str(e)}")
        return False

def generate_livekit_token(room_name: str, identity: str, name: Optional[str] = None) -> str:
    """Generate a LiveKit access token for a participant"""
    if not settings.LIVEKIT_API_KEY or not settings.LIVEKIT_API_SECRET:
        raise HTTPException(status_code=500, detail="LiveKit credentials not configured")
    
    token = AccessToken(settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET)
    token.with_identity(identity)
    token.with_name(name or identity)
    token.with_grants(VideoGrant(
        room_join=True,
        room=room_name,
        can_publish=True,
        can_subscribe=True,
        can_publish_data=True
    ))
    
    # Set token to expire in 1 hour
    token.with_ttl(settings.VOICE_SESSION_TIMEOUT)
    
    return token.to_jwt()

def cleanup_expired_sessions():
    """Clean up expired voice sessions"""
    current_time = int(time.time())
    expired_sessions = [
        session_id for session_id, session in active_voice_sessions.items()
        if session["expires_at"] < current_time
    ]
    
    for session_id in expired_sessions:
        del active_voice_sessions[session_id]
        logger.info(f"Cleaned up expired session: {session_id}")

@app.on_event("startup")
async def startup_event():
    """Initialize RAG components when the app starts"""
    success = initialize_rag()
    if success:
        logger.info("AI Debate Partner backend started successfully with RAG")
    else:
        logger.warning("AI Debate Partner backend started with limited functionality")
    logger.info("Voice integration endpoints ready for Sprint 3")

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "AI Debate Partner API with RAG is running", 
        "version": "2.0.0",
        "rag_enabled": rag_chain is not None,
        "voice_enabled": bool(settings.LIVEKIT_API_KEY and settings.LIVEKIT_API_SECRET)
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "service": "ai-debate-partner",
        "rag_status": "enabled" if rag_chain is not None else "disabled",
        "voice_status": "enabled" if settings.LIVEKIT_API_KEY and settings.LIVEKIT_API_SECRET else "disabled"
    }

# Main debate endpoint with RAG
@app.post("/api/debate/test")
async def debate_with_rag(message: DebateMessage):
    """
    Enhanced debate endpoint powered by RAG
    """
    start_time = time.time()
    response_confidence = 0.0
    
    try:
        logger.info(f"Received debate message: {message.content[:100]}...")
        
        if not rag_chain:
            # Fallback response if RAG is not available
            logger.warning("RAG not available, using fallback response")
            response_time = time.time() - start_time
            response_confidence = 0.3
            
            # Log performance metrics for fallback
            log_performance_metrics(
                response_time=response_time,
                confidence=response_confidence,
                user_message=message.content,
                success=False,
                error_message="RAG not available"
            )
            
            response = DebateResponse(
                response="I understand your point, but I need my philosophical knowledge base to provide a proper counter-argument. Please ensure the system is properly configured with OpenAI API key and knowledge base.",
                confidence=response_confidence,
                sources=["system_fallback"]
            )
            return response
        
        # Use RAG chain to generate response
        logger.info("Generating RAG response...")
        rag_start_time = time.time()
        response = rag_chain.invoke(message.content)
        rag_end_time = time.time()
        rag_response_time = rag_end_time - rag_start_time
        
        # Get retrieved documents for transparency
        retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
        retrieved_docs = retriever.invoke(message.content)
        
        # Extract sources from retrieved documents
        sources = []
        doc_info = []
        for doc in retrieved_docs:
            if hasattr(doc, 'metadata') and 'source' in doc.metadata:
                source = os.path.basename(doc.metadata['source'])
                if source not in sources:
                    sources.append(source)
                
                doc_info.append({
                    "source": source,
                    "content_preview": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content
                })
        
        # Calculate total response time and set confidence
        total_response_time = time.time() - start_time
        response_confidence = 0.85  # High confidence for RAG responses
        
        logger.info(f"Generated response with {len(sources)} sources")
        logger.info(f"RAG response time: {rag_response_time:.3f}s, Total response time: {total_response_time:.3f}s")
        
        # Log performance metrics for successful response
        log_performance_metrics(
            response_time=total_response_time,
            confidence=response_confidence,
            user_message=message.content,
            success=True
        )
        
        debate_response = DebateResponse(
            response=response,
            confidence=response_confidence,
            sources=sources,
            retrieved_docs=doc_info
        )
        return debate_response
        
    except Exception as e:
        # Calculate response time for error case
        error_response_time = time.time() - start_time
        
        logger.error(f"Error in debate endpoint: {str(e)}")
        
        # Log performance metrics for error case
        log_performance_metrics(
            response_time=error_response_time,
            confidence=0.0,
            user_message=message.content,
            success=False,
            error_message=str(e)
        )
        
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Knowledge base endpoints
@app.get("/api/knowledge/topics")
async def get_topics():
    """
    Get available philosophical topics from knowledge base
    """
    try:
        if not vectorstore:
            return {"topics": [], "message": "Knowledge base not available"}
        
        # This is a simplified implementation
        # In a more sophisticated version, you might extract topics from metadata
        topics = [
            "Free Will",
            "Determinism", 
            "Compatibilism",
            "Consciousness",
            "Utilitarianism",
            "Deontology",
            "Justice",
            "Empiricism",
            "Rationalism"
        ]
        
        return {
            "topics": topics,
            "total_documents": vectorstore.index.ntotal if vectorstore else 0
        }
        
    except Exception as e:
        logger.error(f"Error getting topics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/knowledge/search")
async def search_knowledge(query: str, limit: int = 5):
    """
    Search the knowledge base directly
    """
    try:
        if not vectorstore:
            raise HTTPException(status_code=503, detail="Knowledge base not available")
        
        # Perform similarity search
        docs = vectorstore.similarity_search(query, k=limit)
        
        results = []
        for doc in docs:
            results.append({
                "content": doc.page_content,
                "metadata": doc.metadata,
                "source": os.path.basename(doc.metadata.get('source', 'unknown'))
            })
        
        return {
            "query": query,
            "results": results,
            "total_found": len(results)
        }
        
    except Exception as e:
        logger.error(f"Error searching knowledge base: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Voice session endpoints (Sprint 3)
@app.post("/api/voice/start-session", response_model=VoiceSessionResponse)
async def start_voice_session(request: VoiceSessionRequest):
    """
    Start a new voice debate session with LiveKit
    """
    try:
        # Clean up expired sessions first
        cleanup_expired_sessions()
        
        # Check if we've reached the maximum number of concurrent sessions
        if len(active_voice_sessions) >= settings.MAX_CONCURRENT_SESSIONS:
            raise HTTPException(
                status_code=429, 
                detail="Maximum number of concurrent voice sessions reached"
            )
        
        # Generate room name if not provided
        room_name = request.room_name or f"debate-{uuid.uuid4().hex[:8]}"
        
        # Generate session ID
        session_id = str(uuid.uuid4())
        
        # Generate LiveKit token
        token = generate_livekit_token(
            room_name=room_name,
            identity=request.user_identity,
            name=request.participant_name
        )
        
        # Calculate expiration time
        expires_at = int(time.time()) + settings.VOICE_SESSION_TIMEOUT
        
        # Store session info
        active_voice_sessions[session_id] = {
            "room_name": room_name,
            "user_identity": request.user_identity,
            "participant_name": request.participant_name,
            "created_at": int(time.time()),
            "expires_at": expires_at,
            "status": "active"
        }
        
        logger.info(f"Created voice session {session_id} for user {request.user_identity} in room {room_name}")
        
        return VoiceSessionResponse(
            token=token,
            room_name=room_name,
            livekit_url=settings.LIVEKIT_URL or "wss://your-livekit-server.com",
            session_id=session_id,
            expires_at=expires_at
        )
        
    except Exception as e:
        logger.error(f"Error starting voice session: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start voice session: {str(e)}")

@app.get("/api/voice/session/{session_id}", response_model=VoiceSessionStatus)
async def get_voice_session_status(session_id: str):
    """
    Get the status of a voice session
    """
    try:
        cleanup_expired_sessions()
        
        if session_id not in active_voice_sessions:
            raise HTTPException(status_code=404, detail="Voice session not found")
        
        session = active_voice_sessions[session_id]
        return VoiceSessionStatus(
            session_id=session_id,
            room_name=session["room_name"],
            status=session["status"],
            created_at=session["created_at"],
            expires_at=session["expires_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting voice session status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/voice/session/{session_id}")
async def end_voice_session(session_id: str):
    """
    End a voice session
    """
    try:
        if session_id not in active_voice_sessions:
            raise HTTPException(status_code=404, detail="Voice session not found")
        
        session = active_voice_sessions[session_id]
        del active_voice_sessions[session_id]
        
        logger.info(f"Ended voice session {session_id} in room {session['room_name']}")
        
        return {"message": "Voice session ended successfully", "session_id": session_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ending voice session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/voice/sessions")
async def list_active_sessions():
    """
    List all active voice sessions (for debugging/monitoring)
    """
    try:
        cleanup_expired_sessions()
        
        sessions = []
        for session_id, session in active_voice_sessions.items():
            sessions.append(VoiceSessionStatus(
                session_id=session_id,
                room_name=session["room_name"],
                status=session["status"],
                created_at=session["created_at"],
                expires_at=session["expires_at"]
            ))
        
        return {
            "active_sessions": sessions,
            "total_count": len(sessions)
        }
        
    except Exception as e:
        logger.error(f"Error listing active sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Performance metrics endpoint
@app.get("/api/performance/metrics")
async def get_performance_metrics(limit: int = 100):
    """
    Get recent performance metrics from log file
    """
    try:
        if not os.path.exists(PERFORMANCE_LOG_FILE):
            return {"metrics": [], "message": "No performance data available"}
        
        metrics = []
        with open(PERFORMANCE_LOG_FILE, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            # Get the last 'limit' lines
            recent_lines = lines[-limit:] if len(lines) > limit else lines
            
            for line in recent_lines:
                try:
                    metric = json.loads(line.strip())
                    metrics.append(metric)
                except json.JSONDecodeError:
                    continue
        
        # Calculate some basic statistics
        if metrics:
            successful_metrics = [m for m in metrics if m.get('success', False)]
            avg_response_time = sum(m['response_time_seconds'] for m in successful_metrics) / len(successful_metrics) if successful_metrics else 0
            avg_confidence = sum(m['confidence_score'] for m in successful_metrics if m['confidence_score']) / len([m for m in successful_metrics if m['confidence_score']]) if successful_metrics else 0
            success_rate = len(successful_metrics) / len(metrics) * 100
            
            stats = {
                "total_requests": len(metrics),
                "successful_requests": len(successful_metrics),
                "success_rate_percent": round(success_rate, 2),
                "average_response_time_seconds": round(avg_response_time, 3),
                "average_confidence_score": round(avg_confidence, 3)
            }
        else:
            stats = {}
        
        return {
            "metrics": metrics,
            "statistics": stats,
            "total_entries": len(metrics)
        }
        
    except Exception as e:
        logger.error(f"Error retrieving performance metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info" if settings.DEBUG else "warning"
    )