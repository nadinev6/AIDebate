"""
AI Debate Partner - Configuration Management
Sprint 1: Basic configuration setup
Future Sprints: Will expand with API keys and service configurations
"""

from pydantic_settings import BaseSettings
from typing import Optional
import logging

class Settings(BaseSettings):
    # Server configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    
    # API Keys (Sprint 2+)
    OPENAI_API_KEY: Optional[str] = None
    ASSEMBLYAI_API_KEY: Optional[str] = None
    
    # LiveKit Configuration (Sprint 3+)
    LIVEKIT_API_KEY: Optional[str] = None
    LIVEKIT_API_SECRET: Optional[str] = None
    LIVEKIT_URL: Optional[str] = None
    
    # Cartesia TTS Configuration (Sprint 3+)
    CARTESIA_API_KEY: Optional[str] = None
    CARTESIA_VOICE_ID: str = "griffin"  # Default to Griffin voice
    
    # Knowledge base configuration (Sprint 2+)
    KNOWLEDGE_BASE_PATH: str = "knowledge_base"
    VECTOR_STORE_PATH: str = "faiss_index"
    
    # Model configuration (Sprint 2+)
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    LLM_MODEL: str = "gpt-3.5-turbo"
    MAX_TOKENS: int = 500
    TEMPERATURE: float = 0.7
    
    # Voice Session Configuration (Sprint 3+)
    VOICE_SESSION_TIMEOUT: int = 3600  # 1 hour in seconds
    MAX_CONCURRENT_SESSIONS: int = 10

     # Added Cartesia:
    CARTESIA_API: str
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "forbid"

# Global settings instance
settings = Settings()

# Configure logging
logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)