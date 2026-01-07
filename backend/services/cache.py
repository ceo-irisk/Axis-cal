"""
Redis caching service for frequently accessed data
Provides caching with automatic invalidation
"""
import json
import logging
from typing import Optional, Any
from datetime import timedelta

logger = logging.getLogger(__name__)

# Global redis client (will be initialized in server.py)
redis_client = None
cache_enabled = False

def init_redis(redis_connection):
    """Initialize Redis client"""
    global redis_client, cache_enabled
    redis_client = redis_connection
    cache_enabled = redis_client is not None
    if cache_enabled:
        logger.info("✅ Redis caching enabled")
    else:
        logger.warning("⚠️  Redis caching disabled (running without cache)")

async def get_cached(key: str) -> Optional[Any]:
    """Get value from cache"""
    if not cache_enabled or not redis_client:
        return None
    
    try:
        value = await redis_client.get(key)
        if value:
            logger.debug(f"Cache HIT: {key}")
            return json.loads(value)
        logger.debug(f"Cache MISS: {key}")
        return None
    except Exception as e:
        logger.error(f"Cache get error for {key}: {str(e)}")
        return None

async def set_cached(key: str, value: Any, expire: int = 3600):
    """Set value in cache with expiration (default 1 hour)"""
    if not cache_enabled or not redis_client:
        return
    
    try:
        await redis_client.setex(
            key,
            expire,
            json.dumps(value, default=str)  # default=str handles datetime objects
        )
        logger.debug(f"Cache SET: {key} (expire: {expire}s)")
    except Exception as e:
        logger.error(f"Cache set error for {key}: {str(e)}")

async def invalidate(key: str):
    """Invalidate (delete) cache entry"""
    if not cache_enabled or not redis_client:
        return
    
    try:
        await redis_client.delete(key)
        logger.info(f"Cache INVALIDATED: {key}")
    except Exception as e:
        logger.error(f"Cache invalidate error for {key}: {str(e)}")

async def invalidate_pattern(pattern: str):
    """Invalidate all keys matching pattern (e.g., 'event_types:*')"""
    if not cache_enabled or not redis_client:
        return
    
    try:
        keys = await redis_client.keys(pattern)
        if keys:
            await redis_client.delete(*keys)
            logger.info(f"Cache INVALIDATED pattern: {pattern} ({len(keys)} keys)")
    except Exception as e:
        logger.error(f"Cache invalidate pattern error for {pattern}: {str(e)}")

# Convenience functions for common cache keys
async def get_event_types():
    """Get cached event types"""
    return await get_cached("event_types")

async def set_event_types(data, expire=3600):
    """Cache event types"""
    await set_cached("event_types", data, expire)

async def invalidate_event_types():
    """Invalidate event types cache"""
    await invalidate("event_types")

async def get_event_statuses():
    """Get cached event statuses"""
    return await get_cached("event_statuses")

async def set_event_statuses(data, expire=3600):
    """Cache event statuses"""
    await set_cached("event_statuses", data, expire)

async def invalidate_event_statuses():
    """Invalidate event statuses cache"""
    await invalidate("event_statuses")

async def get_timezones():
    """Get cached timezones"""
    return await get_cached("timezones")

async def set_timezones(data, expire=7200):  # 2 hours (rarely changes)
    """Cache timezones"""
    await set_cached("timezones", data, expire)

async def invalidate_timezones():
    """Invalidate timezones cache"""
    await invalidate("timezones")

async def get_day_rules():
    """Get cached day rules"""
    return await get_cached("day_rules")

async def set_day_rules(data, expire=3600):
    """Cache day rules"""
    await set_cached("day_rules", data, expire)

async def invalidate_day_rules():
    """Invalidate day rules cache"""
    await invalidate("day_rules")

async def get_survey_questions():
    """Get cached survey questions"""
    return await get_cached("survey_questions")

async def set_survey_questions(data, expire=3600):
    """Cache survey questions"""
    await set_cached("survey_questions", data, expire)

async def invalidate_survey_questions():
    """Invalidate survey questions cache"""
    await invalidate("survey_questions")
