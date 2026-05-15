package com.antharjala.watch.data.repository

import com.antharjala.watch.domain.model.User
import kotlinx.coroutines.flow.Flow

/**
 * Authentication repository interface.
 * Requirements: 13.2, 13.4, 13.5, 13.7
 */
interface AuthRepository {
    
    /**
     * Send OTP to phone number.
     * Property 33: OTP Request on Phone Submission
     * 
     * @param phoneNumber Phone number with country code
     * @return Result with verification ID or error
     */
    suspend fun sendOtp(phoneNumber: String): Result<String>
    
    /**
     * Verify OTP code.
     * Property 34: OTP Verification Attempt
     * 
     * @param verificationId Verification ID from sendOtp
     * @param code OTP code entered by user
     * @return Result with User or error
     */
    suspend fun verifyOtp(verificationId: String, code: String): Result<User>
    
    /**
     * Get current auth token.
     * 
     * @return JWT token or null if not authenticated
     */
    suspend fun getAuthToken(): String?
    
    /**
     * Refresh auth token.
     * Property 36: Token Auto-Refresh
     * 
     * @return Result with new token or error
     */
    suspend fun refreshToken(): Result<String>
    
    /**
     * Logout and clear session.
     * Property 37: Token Clearing on Logout
     */
    suspend fun logout()
    
    /**
     * Check if user is authenticated.
     */
    suspend fun isAuthenticated(): Boolean
    
    /**
     * Get authentication state as Flow.
     */
    fun getAuthState(): Flow<AuthState>
    
    /**
     * Get current user.
     */
    suspend fun getCurrentUser(): User?
}

/**
 * Authentication state.
 */
sealed class AuthState {
    object Unauthenticated : AuthState()
    data class Authenticated(val user: User) : AuthState()
    object Loading : AuthState()
    data class Error(val message: String) : AuthState()
}
