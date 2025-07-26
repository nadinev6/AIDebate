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
import json
import traceback 
from typing import Optional, AsyncIterator 

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from livekit import rtc
from livekit.agents import JobContext, WorkerOptions, cli
from livekit.agents.voice import Agent, AgentSession
from livekit.plugins import assemblyai, openai, cartesia, silero 
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

class DebateLiveKitAgent(Agent):
    def __init__(self, debate_api_client: DebateAgent):
        super().__init__(
            instructions=(
                "You are a sophisticated AI philosopher engaged in a real-time debate. "
                "Your role is to provide thoughtful, well-reasoned counter-arguments to "
                "the user's positions. Draw upon philosophical traditions and thinkers "
                "to challenge their assumptions. Be respectful but intellectually rigorous. "
                "Keep your responses concise and engaging for spoken conversation."
            ),
            stt=assemblyai.STT(
                api_key=settings.ASSEMBLYAI_API_KEY,
                sample_rate=16000,
            ),
            llm=openai.LLM(
                model=settings.LLM_MODEL,
                api_key=settings.OPENAI_API_KEY
            ),
            # Temporarily use OpenAI TTS to test if the issue is with Cartesia
            tts=openai.TTS(
                api_key=settings.OPENAI_API_KEY,
                model="tts-1",
                voice="alloy",
            ),
            # Original Cartesia config (commented out for testing):
            # tts=cartesia.TTS(
            #     api_key=settings.CARTESIA_API_KEY,
            #     model="sonic-2.0",
            #     voice="c99d36f3-5ffd-4253-803a-535c1bc9c306",
            #     language="en",
            # ),
            vad=silero.VAD.load()
        )
        
        self.debate_api_client = debate_api_client

    async def on_enter(self):
        """Called when the agent enters the room"""
        logger.info("Agent entered the room")
        
        # Send initial greeting
        initial_message = (
            "Welcome to the AI Debate Arena! I'm your philosophical opponent. "
            "Present your argument, and I'll challenge it with reasoned counter-arguments."
        )
        
        # Generate initial reply to start the conversation
        self.session.generate_reply(initial_message)

    async def on_user_speech_committed(self, user_msg):
        """Called when user speech is transcribed and committed"""
        user_utterance = user_msg.content.strip()
        logger.info(f"User said: {user_utterance}")

        if user_utterance:
            try:
                # Generate RAG-enhanced counter-argument
                counter_argument = await self.debate_api_client.generate_counter_argument(user_utterance)
                logger.info(f"RAG generated counter-argument: {counter_argument}")
                
                # Limit response length to avoid TTS issues
                if len(counter_argument) > 500:
                    counter_argument = counter_argument[:500] + "..."
                    logger.info("Truncated response for TTS stability")
                
                # Send the counter-argument as agent's response
                self.session.generate_reply(counter_argument)
                
                # Send text via data channel for frontend display if needed
                await self._send_agent_text_data_channel(counter_argument)

            except Exception as e:
                logger.error(f"Error processing user speech: {e}")
                fallback_response = "I need a moment to consider your argument more carefully."
                self.session.generate_reply(fallback_response)

    async def _send_agent_text_data_channel(self, text: str):
        """Helper to send text responses via data channel to frontend"""
        try:
            if hasattr(self, 'session') and self.session and self.session.room:
                data_payload = json.dumps({
                    "type": "agent_text",
                    "content": text
                }).encode('utf-8')
                await self.session.room.local_participant.publish_data(
                    data_payload,
                    kind=rtc.DataPacket_Kind.RELIABLE
                )
                logger.info(f"Sent agent text via data channel: {text[:50]}...")
        except Exception as e:
            logger.error(f"Failed to send agent text via data channel: {e}")


async def entrypoint(ctx: JobContext):
    """Main entrypoint for the LiveKit agent"""
    logger.info(f"Job assigned for room: {ctx.room.name}")
    
    # Initialize RAG API client
    debate_api_client = DebateAgent()
    await debate_api_client.initialize()

    try:
        # Create agent session
        session = AgentSession()
        
        # Create agent instance
        agent = DebateLiveKitAgent(debate_api_client)
        
        # Start the agent session
        await session.start(
            agent=agent,
            room=ctx.room
        )
        
        logger.info("Agent session started successfully")
        
    except Exception as e:
        logger.error(f"Error in LiveKit agent entrypoint: {e}")
        traceback.print_exc()
        raise
    finally:
        logger.info("LiveKit agent is cleaning up...")
        await debate_api_client.cleanup()


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
    
    missing_vars = [var for var in required_vars if not getattr(settings, var, None)]
    if missing_vars:
        logger.error(f"Missing required environment variables: {missing_vars}")
        sys.exit(1)
    
    # Run the agent
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
        )
    )