package com.antharjala.watch.core.security

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.util.concurrent.ConcurrentHashMap

/**
 * Client-side rate limiter to prevent API abuse.
 * SECURITY: Prevents excessive API calls that could lead to account suspension.
 */
class RateLimiter(
    private val maxRequests: Int = 10,
    private val windowMillis: Long = 60_000  // 1 minute
) {
    private val requestTimestamps = ConcurrentHashMap<String, MutableList<Long>>()
    private val mutex = Mutex()
    
    /**
     * Check if request is allowed.
     * 
     * @param key Unique key for the operation (e.g., "submit_borewell")
     * @return true if allowed, false if rate limit exceeded
     */
    suspend fun isAllowed(key: String): Boolean = mutex.withLock {
        val now = System.currentTimeMillis()
        val timestamps = requestTimestamps.getOrPut(key) { mutableListOf() }
        
        // Remove old timestamps outside the window
        timestamps.removeAll { it < now - windowMillis }
        
        // Check if limit exceeded
        if (timestamps.size >= maxRequests) {
            return false
        }
        
        // Add current timestamp
        timestamps.add(now)
        return true
    }
    
    /**
     * Get remaining requests in current window.
     */
    suspend fun getRemainingRequests(key: String): Int = mutex.withLock {
        val now = System.currentTimeMillis()
        val timestamps = requestTimestamps[key] ?: return maxRequests
        
        // Remove old timestamps
        timestamps.removeAll { it < now - windowMillis }
        
        return maxRequests - timestamps.size
    }
    
    /**
     * Get time until next request is allowed (in milliseconds).
     * Returns 0 if request is allowed now.
     */
    suspend fun getTimeUntilNextRequest(key: String): Long = mutex.withLock {
        val now = System.currentTimeMillis()
        val timestamps = requestTimestamps[key] ?: return 0
        
        // Remove old timestamps
        timestamps.removeAll { it < now - windowMillis }
        
        if (timestamps.size < maxRequests) {
            return 0
        }
        
        // Calculate time until oldest timestamp expires
        val oldestTimestamp = timestamps.minOrNull() ?: return 0
        return (oldestTimestamp + windowMillis) - now
    }
    
    /**
     * Reset rate limit for a key.
     */
    suspend fun reset(key: String) = mutex.withLock {
        requestTimestamps.remove(key)
    }
}
