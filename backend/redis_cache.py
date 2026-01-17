"""
Redis Caching Layer
Provides optional caching for RAG retrievals and AI responses
"""

import json
import hashlib
import logging
from typing import Optional, Any
from backend.config import settings

logger = logging.getLogger(__name__)

class RedisCache:
    """Redis cache wrapper with fallback when Redis is unavailable"""

    def __init__(self):
        self.client = None
        self.enabled = settings.REDIS_ENABLED

        if self.enabled:
            try:
                import redis
                self.client = redis.Redis(
                    host=settings.REDIS_HOST,
                    port=settings.REDIS_PORT,
                    db=settings.REDIS_DB,
                    decode_responses=True,
                    socket_connect_timeout=2
                )
                self.client.ping()
                logger.info("Redis connection established successfully")
            except ImportError:
                logger.warning("redis-py not installed. Install with: pip install redis")
                self.enabled = False
            except Exception as e:
                logger.warning(f"Redis connection failed: {str(e)}. Caching disabled.")
                self.enabled = False

    def _generate_key(self, prefix: str, data: str) -> str:
        """Generate a cache key from prefix and data"""
        hash_obj = hashlib.md5(data.encode('utf-8'))
        return f"{prefix}:{hash_obj.hexdigest()}"

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.enabled or not self.client:
            return None

        try:
            value = self.client.get(key)
            if value:
                logger.info(f"Cache hit for key: {key}")
                return json.loads(value)
            logger.info(f"Cache miss for key: {key}")
            return None
        except Exception as e:
            logger.error(f"Cache get error: {str(e)}")
            return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache with optional TTL"""
        if not self.enabled or not self.client:
            return False

        try:
            ttl = ttl or settings.REDIS_TTL
            self.client.setex(
                key,
                ttl,
                json.dumps(value)
            )
            logger.info(f"Cache set for key: {key} (TTL: {ttl}s)")
            return True
        except Exception as e:
            logger.error(f"Cache set error: {str(e)}")
            return False

    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if not self.enabled or not self.client:
            return False

        try:
            self.client.delete(key)
            logger.info(f"Cache deleted for key: {key}")
            return True
        except Exception as e:
            logger.error(f"Cache delete error: {str(e)}")
            return False

    def clear(self, pattern: str = "*") -> bool:
        """Clear all keys matching pattern"""
        if not self.enabled or not self.client:
            return False

        try:
            keys = self.client.keys(pattern)
            if keys:
                self.client.delete(*keys)
                logger.info(f"Cache cleared for pattern: {pattern} ({len(keys)} keys)")
            return True
        except Exception as e:
            logger.error(f"Cache clear error: {str(e)}")
            return False

    def get_stats(self) -> dict:
        """Get cache statistics"""
        if not self.enabled or not self.client:
            return {
                "enabled": False,
                "message": "Redis caching is disabled"
            }

        try:
            info = self.client.info()
            return {
                "enabled": True,
                "connected_clients": info.get("connected_clients", 0),
                "used_memory": info.get("used_memory_human", "N/A"),
                "total_keys": self.client.dbsize(),
                "uptime_seconds": info.get("uptime_in_seconds", 0)
            }
        except Exception as e:
            logger.error(f"Cache stats error: {str(e)}")
            return {
                "enabled": False,
                "error": str(e)
            }

    def cache_rag_query(self, query: str) -> str:
        """Generate cache key for RAG query"""
        return self._generate_key("rag", query)

    def cache_debate_response(self, argument: str, context: str) -> str:
        """Generate cache key for debate response"""
        combined = f"{argument}|{context}"
        return self._generate_key("debate", combined)

redis_cache = RedisCache()
