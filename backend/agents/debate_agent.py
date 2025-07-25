"""
AI Debate Partner - LiveKit Agent
Sprint 3: Real-time voice debate agent with Cartesia TTS

This agent connects to LiveKit rooms and provides real-time AI debate responses.
It integrates AssemblyAI for speech-to-text, the existing RAG system for generating
philosophical counter-arguments, and Cartesia for text-to-speech.

Usage:
    python backend/agents/debate_agent.py

Note: This agent runs as a separate process from the FastAPI server.
"""

import asyncio
import logging
import os
import sys
from typing import Optional

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from livekit import rtc
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import assemblyai, openai, cartesia
import aiohttp

from config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DebateAgent:
    """
    Real-time AI debate agent that provides philosophical counter-arguments
    """
    
    def __init__(self):
        self.rag_endpoint = "http://localhost:8000/api/debate/test"
        self.session = None
    
    async def initialize(self):
        """Initialize the agent with necessary services"""
        self.session = aiohttp.ClientSession()
        logger.info("Debate agent initialized")
    
    async def cleanup(self):
        """Clean up resources"""
        if self.session:
            await self.session.close()
        logger.info("Debate agent cleaned up")
    
    async def generate_counter_argument(self, user_argument: str) -> str:
        """
        Generate a philosophical counter-argument using the RAG system
        """
        try:
            async with self.session.post(
                self.rag_endpoint,
                json={
                    "content": user_argument,
                    "user_id": "voice_agent"
                },
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get("response", "I need a moment to formulate my response.")
                else:
                    logger.error(f"RAG endpoint returned status {response.status}")
                    return "I'm having trouble accessing my philosophical knowledge right now."
        
        except Exception as e:
            logger.error(f"Error generating counter-argument: {e}")
            return "Let me think about that for a moment..."

async def entrypoint(ctx: JobContext):
    """
    Main entry point for the LiveKit agent
    """
    logger.info(f"Connecting to room {ctx.room.name}")
    
    # Initialize the debate agent
    debate_agent = DebateAgent()
    await debate_agent.initialize()
    
    try:
        # Configure the voice pipeline
        initial_ctx = llm.ChatContext().append(
            role="system",
            text=(
                "You are a sophisticated AI philosopher engaged in a real-time debate. "
                "Your role is to provide thoughtful, well-reasoned counter-arguments to "
                "the user's positions. Draw upon philosophical traditions and thinkers "
                "to challenge their assumptions. Be respectful but intellectually rigorous. "
                "Keep your responses concise and engaging for spoken conversation."
            ),
        )
        
        # Set up the voice pipeline agent
        agent = VoicePipelineAgent(
            vad=rtc.VAD.for_speaking_detection(),  # Voice Activity Detection
            stt=assemblyai.STT(
                api_key=settings.ASSEMBLYAI_API_KEY,
                language="en",
                # Configure for real-time transcription
                sample_rate=16000,
                word_boost=["philosophy", "ethics", "morality", "justice", "consciousness"]
            ),
            llm=openai.LLM(
                model=settings.LLM_MODEL,
                api_key=settings.OPENAI_API_KEY,
                temperature=settings.TEMPERATURE,
                max_tokens=75,  # Shorter responses for voice
            ),
            tts=cartesia.TTS(
                api_key=settings.CARTESIA_API_KEY,
                voice=settings.CARTESIA_VOICE_ID,  # Griffin voice
                model="sonic-english",
                sample_rate=24000,
            ),
            chat_ctx=initial_ctx,
        )
        
        # Custom function to enhance responses with RAG
        original_llm_stream = agent._llm.chat
        
        async def enhanced_llm_stream(chat_ctx, **kwargs):
            """Enhanced LLM stream that incorporates RAG responses"""
            # Get the latest user message
            user_messages = [msg for msg in chat_ctx.messages if msg.role == "user"]
            if user_messages:
                latest_message = user_messages[-1].content
                
                # Generate RAG-enhanced counter-argument
                counter_argument = await debate_agent.generate_counter_argument(latest_message)
                
                # Create enhanced context with RAG response
                enhanced_ctx = chat_ctx.copy()
                enhanced_ctx.append(
                    role="assistant",
                    text=counter_argument
                )
                
                # Use the enhanced response
                return original_llm_stream(enhanced_ctx, **kwargs)
            
            return original_llm_stream(chat_ctx, **kwargs)
        
        # Replace the LLM stream method
        agent._llm.chat = enhanced_llm_stream
        
        # Start the agent
        agent.start(ctx.room)
        
        # Wait for the first participant to connect
        await agent.say("Welcome to the AI Debate Arena! I'm your philosophical opponent. Present your argument, and I'll challenge it with reasoned counter-arguments.", allow_interruptions=True)
        
        logger.info("Debate agent is ready and waiting for participants")
        
        # Keep the agent running
        await agent.aclose()
        
    except Exception as e:
        logger.error(f"Error in debate agent: {e}")
        raise
    finally:
        await debate_agent.cleanup()

if __name__ == "__main__":
    # Validate required environment variables
    required_vars = [
        "LIVEKIT_URL",
        "LIVEKIT_API_KEY", 
        "LIVEKIT_API_SECRET",
        "OPENAI_API_KEY",
        "ASSEMBLYAI_API_KEY",
        "CARTESIA_API_KEY"
    ]
    
    missing_vars = [var for var in required_vars if not getattr(settings, var)]
    if missing_vars:
        logger.error(f"Missing required environment variables: {missing_vars}")
        sys.exit(1)
    
    # Run the agent
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            # Configure the agent to automatically subscribe to audio tracks
            auto_subscribe=AutoSubscribe.AUDIO_ONLY,
        )
    )