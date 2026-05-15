package com.antharjala.watch.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.antharjala.watch.data.repository.AuthRepository
import com.antharjala.watch.data.repository.AuthState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel for authentication flow.
 * Requirements: 13.1, 13.3, 13.8
 * DAY 1: Production-level with cooldown period.
 */
@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow<AuthUiState>(AuthUiState.Initial)
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()
    
    private val _phoneNumber = MutableStateFlow("")
    val phoneNumber: StateFlow<String> = _phoneNumber.asStateFlow()
    
    private val _otpCode = MutableStateFlow("")
    val otpCode: StateFlow<String> = _otpCode.asStateFlow()
    
    private var verificationId: String? = null
    private var failedAttempts = 0
    private var cooldownUntil: Long = 0
    
    init {
        // Observe auth state
        viewModelScope.launch {
            authRepository.getAuthState().collect { state ->
                when (state) {
                    is AuthState.Authenticated -> {
                        _uiState.value = AuthUiState.Success
                    }
                    is AuthState.Unauthenticated -> {
                        if (_uiState.value !is AuthUiState.Initial) {
                            _uiState.value = AuthUiState.Initial
                        }
                    }
                    is AuthState.Error -> {
                        _uiState.value = AuthUiState.Error(state.message)
                    }
                    is AuthState.Loading -> {
                        _uiState.value = AuthUiState.Loading
                    }
                }
            }
        }
    }
    
    /**
     * Update phone number.
     */
    fun updatePhoneNumber(number: String) {
        _phoneNumber.value = number
    }
    
    /**
     * Update OTP code.
     */
    fun updateOtpCode(code: String) {
        _otpCode.value = code
    }
    
    /**
     * Send OTP to phone number.
     * Property 33: OTP Request on Phone Submission
     */
    fun sendOtp() {
        // Check cooldown period (Requirement 13.8)
        if (System.currentTimeMillis() < cooldownUntil) {
            val remainingSeconds = (cooldownUntil - System.currentTimeMillis()) / 1000
            _uiState.value = AuthUiState.Error(
                "Too many attempts. Please wait $remainingSeconds seconds."
            )
            return
        }
        
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            
            val result = authRepository.sendOtp(_phoneNumber.value)
            
            result.fold(
                onSuccess = { verId ->
                    verificationId = verId
                    _uiState.value = AuthUiState.OtpSent
                },
                onFailure = { error ->
                    _uiState.value = AuthUiState.Error(
                        error.message ?: "Failed to send OTP"
                    )
                }
            )
        }
    }
    
    /**
     * Verify OTP code.
     * Property 34: OTP Verification Attempt
     * Requirement 13.8: 3-attempt limit with 5-minute cooldown
     */
    fun verifyOtp() {
        val verId = verificationId
        if (verId == null) {
            _uiState.value = AuthUiState.Error("Verification ID not found")
            return
        }
        
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            
            val result = authRepository.verifyOtp(verId, _otpCode.value)
            
            result.fold(
                onSuccess = {
                    failedAttempts = 0
                    _uiState.value = AuthUiState.Success
                },
                onFailure = { error ->
                    failedAttempts++
                    
                    // Implement 3-attempt limit with 5-minute cooldown
                    if (failedAttempts >= 3) {
                        cooldownUntil = System.currentTimeMillis() + (5 * 60 * 1000) // 5 minutes
                        _uiState.value = AuthUiState.Error(
                            "Too many failed attempts. Please wait 5 minutes."
                        )
                    } else {
                        _uiState.value = AuthUiState.Error(
                            error.message ?: "Verification failed. ${3 - failedAttempts} attempts remaining."
                        )
                    }
                }
            )
        }
    }
    
    /**
     * Resend OTP.
     */
    fun resendOtp() {
        sendOtp()
    }
    
    /**
     * Reset state.
     */
    fun resetState() {
        _uiState.value = AuthUiState.Initial
        _phoneNumber.value = ""
        _otpCode.value = ""
        verificationId = null
    }
}

/**
 * Authentication UI state.
 */
sealed class AuthUiState {
    object Initial : AuthUiState()
    object Loading : AuthUiState()
    object OtpSent : AuthUiState()
    object Success : AuthUiState()
    data class Error(val message: String) : AuthUiState()
}
