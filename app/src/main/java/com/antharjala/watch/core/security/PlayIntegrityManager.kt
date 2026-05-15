package com.antharjala.watch.core.security

import android.content.Context
import com.google.android.play.core.integrity.IntegrityManager
import com.google.android.play.core.integrity.IntegrityManagerFactory
import com.google.android.play.core.integrity.IntegrityTokenRequest
import com.google.android.play.core.integrity.IntegrityTokenResponse
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Play Integrity API manager for device authenticity verification.
 * Property 59: Play Integrity Token Inclusion
 * 
 * Requirements: 5.1, 5.2, 5.4, 5.5, 5.6, 5.7
 */
@Singleton
class PlayIntegrityManager @Inject constructor(
    private val context: Context
) {
    
    private val integrityManager: IntegrityManager = IntegrityManagerFactory.create(context)
    
    // Cache for integrity tokens (1 hour TTL)
    private var cachedToken: CachedToken? = null
    
    /**
     * Generate Play Integrity API token.
     * Property 59: Play Integrity Token Inclusion
     * 
     * @param nonce Optional nonce for request (should be unique per request)
     * @return Result containing token or error
     */
    suspend fun generateIntegrityToken(nonce: String? = null): Result<String> {
        return try {
            // Check cache first (1 hour TTL)
            cachedToken?.let { cached ->
                if (System.currentTimeMillis() - cached.timestamp < TOKEN_CACHE_DURATION) {
                    return Result.success(cached.token)
                }
            }
            
            // Generate new token
            val nonceValue = nonce ?: generateNonce()
            
            val request = IntegrityTokenRequest.builder()
                .setNonce(nonceValue)
                .build()
            
            val response: IntegrityTokenResponse = integrityManager
                .requestIntegrityToken(request)
                .await()
            
            val token = response.token()
            
            // Cache the token
            cachedToken = CachedToken(token, System.currentTimeMillis())
            
            Result.success(token)
        } catch (e: Exception) {
            // Handle API unavailability gracefully
            // Requirement 5.7: Allow submission with manual review flag
            Result.failure(PlayIntegrityException("Play Integrity API unavailable: ${e.message}", e))
        }
    }
    
    /**
     * Get cached token if available and not expired.
     * 
     * @return Cached token or null
     */
    fun getCachedToken(): String? {
        return cachedToken?.let { cached ->
            if (System.currentTimeMillis() - cached.timestamp < TOKEN_CACHE_DURATION) {
                cached.token
            } else {
                null
            }
        }
    }
    
    /**
     * Clear cached token.
     */
    fun clearCache() {
        cachedToken = null
    }
    
    /**
     * Generate a unique nonce for the request.
     * In production, this should be generated server-side and sent to client.
     * 
     * @return Base64-encoded nonce
     */
    private fun generateNonce(): String {
        val timestamp = System.currentTimeMillis()
        val random = (0..999999).random()
        val nonce = "$timestamp-$random"
        return android.util.Base64.encodeToString(
            nonce.toByteArray(),
            android.util.Base64.NO_WRAP
        )
    }
    
    companion object {
        // Cache duration: 1 hour (as per Requirement 5.6)
        private const val TOKEN_CACHE_DURATION = 60 * 60 * 1000L
    }
}

/**
 * Cached token with timestamp.
 */
private data class CachedToken(
    val token: String,
    val timestamp: Long
)

/**
 * Play Integrity exception.
 */
class PlayIntegrityException(
    message: String,
    cause: Throwable? = null
) : Exception(message, cause)
