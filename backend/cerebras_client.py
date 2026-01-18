"""
Cerebras AI Client
Handles interactions with Cerebras inference API
"""

import requests
import logging
from typing import List, Dict, Any, Optional
from config import settings

logger = logging.getLogger(__name__)

class CerebrasClient:
    """Client for Cerebras AI inference API"""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.CEREBRAS_API_KEY
        self.base_url = "https://api.cerebras.ai/v1"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    def generate_response(
        self,
        messages: List[Dict[str, str]],
        model: str = "llama3.1-8b",
        temperature: float = 0.7,
        max_tokens: int = 500,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate a response using Cerebras API

        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model name (llama3.1-8b or llama3.1-70b)
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate

        Returns:
            Dict with response data
        """
        if not self.api_key:
            raise ValueError("Cerebras API key not configured")

        endpoint = f"{self.base_url}/chat/completions"

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": kwargs.get("stream", False)
        }

        try:
            logger.info(f"Making Cerebras API request with model: {model}")
            response = requests.post(
                endpoint,
                json=payload,
                headers=self.headers,
                timeout=30
            )
            response.raise_for_status()

            result = response.json()
            logger.info("Cerebras API request successful")

            return {
                "content": result["choices"][0]["message"]["content"],
                "model": result["model"],
                "usage": result.get("usage", {}),
                "finish_reason": result["choices"][0].get("finish_reason")
            }

        except requests.exceptions.RequestException as e:
            logger.error(f"Cerebras API request failed: {str(e)}")
            raise Exception(f"Cerebras API error: {str(e)}")

    def generate_debate_response(
        self,
        user_argument: str,
        context: str = "",
        model: str = "llama3.1-8b",
        temperature: float = 0.7,
        max_tokens: int = 500
    ) -> str:
        """
        Generate a philosophical debate response

        Args:
            user_argument: The user's argument to counter
            context: Optional context from knowledge base
            model: Cerebras model to use
            temperature: Sampling temperature
            max_tokens: Maximum tokens

        Returns:
            Generated counter-argument
        """
        system_prompt = """You are an expert philosophical debate opponent. Your role is to challenge the user's argument with well-reasoned counter-arguments based on established philosophical positions.

Instructions:
1. Analyze the user's argument carefully
2. Use the provided philosophical context to construct a strong counter-argument
3. Reference specific philosophical concepts, thinkers, or schools of thought when relevant
4. Be intellectually rigorous but accessible
5. Challenge assumptions and point out potential weaknesses
6. Maintain a respectful but assertive debate tone
7. Keep your response focused and under 200 words"""

        user_prompt = f"""User's argument: {user_argument}

{f"Philosophical context:\n{context}\n" if context else ""}

Your counter-argument:"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        result = self.generate_response(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens
        )

        return result["content"]

cerebras_client = CerebrasClient()
