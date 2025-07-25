"""
AI Debate Partner - Configuration Management
Sprint 1: Basic configuration setup
Future Sprints: Will expand with API keys and service configurations
"""

from pydantic_settings import BaseSettings
from typing import Optional
from dotenv import load_dotenv
import logging
import os 

# --- DEBUGGING .env LOADING ---
print(f"DEBUG: Current Working Directory: {os.getcwd()}")

# Path from config.py to .env in the project root
# Based on your structure: AIDebate/.env
# and config.py is in AIDebate/backend/
# So from config.py, we go up one level (..) to 'AIDebate/', then find '.env'
dotenv_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env')

print(f"DEBUG: Expected .env path: {dotenv_file_path}")
print(f"DEBUG: Does .env exist at path? {os.path.exists(dotenv_file_path)}")

# Attempt to load the .env file
# The `verbose=True` argument makes python-dotenv print if it found the file or not
loaded_env_status = load_dotenv(dotenv_path=dotenv_file_path, verbose=True)
print(f"DEBUG: load_dotenv status: {loaded_env_status}") # True if loaded, False if not found

# --- Verify contents after loading ---
print(f"DEBUG: LIVEKIT_URL from os.getenv: {os.getenv('LIVEKIT_URL')}")
print(f"DEBUG: LIVEKIT_API_KEY from os.getenv: {os.getenv('LIVEKIT_API_KEY')}")
print(f"DEBUG: LIVEKIT_API_SECRET from os.getenv: {os.getenv('LIVEKIT_API_SECRET')}")
# --- END DEBUG PRINTS ---

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