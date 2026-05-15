package com.antharjala.watch.core.security

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Secure token manager using EncryptedSharedPreferences.
 * Property 36: Token Auto-Refresh
 * Property 37: Token Clearing on Logout
 */
class TokenManager(context: Context) {
    
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()
    
    private val encryptedPrefs = EncryptedSharedPreferences.create(
        context,
        PREFS_NAME,
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
    
    private val _tokenState = MutableStateFlow<TokenState>(TokenState.NoToken)
    val tokenState: StateFlow<TokenState> = _tokenState.asStateFlow()
    
    init {
        // Load existing token on initialization
        loadToken()
    }
    
    /**
     * Store JWT token securely.
     * Property 35: Token Storage on Success
     */
    fun storeToken(token: String, expiresAt: Long) {
        encryptedPrefs.edit().apply {
            putString(KEY_TOKEN, token)
            putLong(KEY_EXPIRES_AT, expiresAt)
            putLong(KEY_STORED_AT, System.currentTimeMillis())
            apply()
        }
        _tokenState.value = TokenState.Valid(token, expiresAt)
    }
    
    /**
     * Get current JWT token.
     * Property 36: Token Auto-Refresh (check expiration)
     */
    fun getToken(): String? {
        val token = encryptedPrefs.getString(KEY_TOKEN, null)
        val expiresAt = encryptedPrefs.getLong(KEY_EXPIRES_AT, 0)
        
        if (token != null && expiresAt > 0) {
            val currentTime = System.currentTimeMillis()
            val timeUntilExpiry = expiresAt - currentTime
            
            // Token expired
            if (timeUntilExpiry <= 0) {
                _tokenState.value = TokenState.Expired
                return null
            }
            
            // Token expiring soon (within 5 minutes) - needs refresh
            if (timeUntilExpiry < TOKEN_REFRESH_THRESHOLD) {
                _tokenState.value = TokenState.NeedsRefresh(token, expiresAt)
                return token
            }
            
            _tokenState.value = TokenState.Valid(token, expiresAt)
            return token
        }
        
        _tokenState.value = TokenState.NoToken
        return null
    }
    
    /**
     * Check if token needs refresh (within 5 minutes of expiration).
     * Property 36: Token Auto-Refresh
     */
    fun needsRefresh(): Boolean {
        val expiresAt = encryptedPrefs.getLong(KEY_EXPIRES_AT, 0)
        if (expiresAt == 0L) return false
        
        val currentTime = System.currentTimeMillis()
        val timeUntilExpiry = expiresAt - currentTime
        
        return timeUntilExpiry in 1..TOKEN_REFRESH_THRESHOLD
    }
    
    /**
     * Clear stored token (logout).
     * Property 37: Token Clearing on Logout
     */
    fun clearToken() {
        encryptedPrefs.edit().apply {
            remove(KEY_TOKEN)
            remove(KEY_EXPIRES_AT)
            remove(KEY_STORED_AT)
            remove(KEY_USER_ID)
            apply()
        }
        _tokenState.value = TokenState.NoToken
    }
    
    /**
     * Check if user is authenticated.
     */
    fun isAuthenticated(): Boolean {
        return getToken() != null
    }
    
    /**
     * Get token expiration time.
     */
    fun getExpirationTime(): Long {
        return encryptedPrefs.getLong(KEY_EXPIRES_AT, 0)
    }
    
    /**
     * Get user ID from stored preferences.
     * Used for API calls that require user identification.
     */
    fun getUserId(): String? {
        return encryptedPrefs.getString(KEY_USER_ID, null)
    }
    
    /**
     * Store user ID securely.
     * Called during login process.
     */
    fun storeUserId(userId: String) {
        encryptedPrefs.edit().apply {
            putString(KEY_USER_ID, userId)
            apply()
        }
    }
    
    private fun loadToken() {
        getToken() // This will update the state
    }
    
    companion object {
        private const val PREFS_NAME = "anthar_jala_secure_prefs"
        private const val KEY_TOKEN = "jwt_token"
        private const val KEY_EXPIRES_AT = "expires_at"
        private const val KEY_STORED_AT = "stored_at"
        private const val KEY_USER_ID = "user_id"
        private const val TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000L // 5 minutes
    }
}

/**
 * Token state sealed class for reactive UI updates.
 */
sealed class TokenState {
    object NoToken : TokenState()
    data class Valid(val token: String, val expiresAt: Long) : TokenState()
    data class NeedsRefresh(val token: String, val expiresAt: Long) : TokenState()
    object Expired : TokenState()
}
