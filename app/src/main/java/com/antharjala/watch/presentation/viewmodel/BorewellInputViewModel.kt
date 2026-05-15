package com.antharjala.watch.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.antharjala.watch.core.utils.BorewellInputValidator
import com.antharjala.watch.core.utils.LocationService
import com.antharjala.watch.data.repository.BorewellRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel for borewell data input.
 * Requirements: 1.1, 1.4, 1.5, 1.8
 * DAY 1: Real-time validation + offline-first.
 */
@HiltViewModel
class BorewellInputViewModel @Inject constructor(
    private val borewellRepository: BorewellRepository,
    private val locationService: LocationService
) : ViewModel() {
    
    private val _uiState = MutableStateFlow<BorewellInputUiState>(BorewellInputUiState.Initial)
    val uiState: StateFlow<BorewellInputUiState> = _uiState.asStateFlow()
    
    private val _depth = MutableStateFlow("")
    val depth: StateFlow<String> = _depth.asStateFlow()
    
    private val _yield = MutableStateFlow("")
    val yield: StateFlow<String> = _yield.asStateFlow()
    
    private val _depthError = MutableStateFlow<String?>(null)
    val depthError: StateFlow<String?> = _depthError.asStateFlow()
    
    private val _yieldError = MutableStateFlow<String?>(null)
    val yieldError: StateFlow<String?> = _yieldError.asStateFlow()
    
    private val _geohash = MutableStateFlow<String?>(null)
    val geohash: StateFlow<String?> = _geohash.asStateFlow()
    
    private val _pendingSyncCount = MutableStateFlow(0)
    val pendingSyncCount: StateFlow<Int> = _pendingSyncCount.asStateFlow()
    
    init {
        // Observe pending sync count
        viewModelScope.launch {
            borewellRepository.getPendingSyncCount().collect { count ->
                _pendingSyncCount.value = count
            }
        }
        
        // Get current location
        getCurrentLocation()
    }
    
    /**
     * Update depth with real-time validation.
     * Property 3: Depth Input Validation
     */
    fun updateDepth(value: String) {
        _depth.value = value
        
        // Real-time validation
        val depthValue = value.toDoubleOrNull()
        if (depthValue != null) {
            val validation = BorewellInputValidator.validateDepth(depthValue)
            _depthError.value = validation.errorMessage()
        } else if (value.isNotEmpty()) {
            _depthError.value = "Invalid number"
        } else {
            _depthError.value = null
        }
    }
    
    /**
     * Update yield with real-time validation.
     * Property 4: Yield Input Validation
     */
    fun updateYield(value: String) {
        _yield.value = value
        
        // Real-time validation
        val yieldValue = value.toDoubleOrNull()
        if (yieldValue != null) {
            val validation = BorewellInputValidator.validateYield(yieldValue)
            _yieldError.value = validation.errorMessage()
        } else if (value.isNotEmpty()) {
            _yieldError.value = "Invalid number"
        } else {
            _yieldError.value = null
        }
    }
    
    /**
     * Get current location and convert to geohash.
     * Property 38: GPS Privacy Protection
     */
    fun getCurrentLocation() {
        viewModelScope.launch {
            _uiState.value = BorewellInputUiState.LoadingLocation
            
            val result = locationService.getCurrentLocation()
            
            result.fold(
                onSuccess = { locationData ->
                    _geohash.value = locationData.geohash
                    _uiState.value = BorewellInputUiState.LocationReady(locationData.geohash)
                    
                    // Check for spoofing
                    if (locationData.spoofDetection.isSpoofed()) {
                        _uiState.value = BorewellInputUiState.Warning(
                            "Location may be spoofed: ${locationData.spoofDetection.reason()}"
                        )
                    }
                },
                onFailure = { error ->
                    _uiState.value = BorewellInputUiState.Error(
                        error.message ?: "Failed to get location"
                    )
                }
            )
        }
    }
    
    /**
     * Submit borewell data.
     * Property 5: Offline Storage with Sync Flag
     */
    fun submitData() {
        val depthValue = _depth.value.toDoubleOrNull()
        val yieldValue = _yield.value.toDoubleOrNull()
        val geohashValue = _geohash.value
        
        // Validate all inputs
        if (depthValue == null) {
            _depthError.value = "Depth is required"
            return
        }
        
        if (yieldValue == null) {
            _yieldError.value = "Yield is required"
            return
        }
        
        if (geohashValue == null) {
            _uiState.value = BorewellInputUiState.Error("Location not available")
            return
        }
        
        // Validate ranges
        val validation = BorewellInputValidator.validateBorewellData(depthValue, yieldValue)
        if (!validation.isSuccess()) {
            _uiState.value = BorewellInputUiState.Error(
                validation.errorMessage() ?: "Validation failed"
            )
            return
        }
        
        viewModelScope.launch {
            _uiState.value = BorewellInputUiState.Submitting
            
            val result = borewellRepository.submitBorewell(
                depth = depthValue,
                yield = yieldValue,
                geohash = geohashValue
            )
            
            result.fold(
                onSuccess = { recordId ->
                    val isOffline = recordId.startsWith("offline_")
                    _uiState.value = BorewellInputUiState.Success(
                        message = if (isOffline) {
                            "Data saved offline. Will sync when online."
                        } else {
                            "Data submitted successfully!"
                        },
                        isOffline = isOffline
                    )
                    
                    // Reset form
                    resetForm()
                },
                onFailure = { error ->
                    _uiState.value = BorewellInputUiState.Error(
                        error.message ?: "Submission failed"
                    )
                }
            )
        }
    }
    
    /**
     * Force sync pending records.
     */
    fun forceSyncNow() {
        viewModelScope.launch {
            _uiState.value = BorewellInputUiState.Syncing
            
            val result = borewellRepository.forceSyncNow()
            
            result.fold(
                onSuccess = { count ->
                    _uiState.value = BorewellInputUiState.SyncComplete(count)
                },
                onFailure = { error ->
                    _uiState.value = BorewellInputUiState.Error(
                        error.message ?: "Sync failed"
                    )
                }
            )
        }
    }
    
    /**
     * Reset form.
     */
    private fun resetForm() {
        _depth.value = ""
        _yield.value = ""
        _depthError.value = null
        _yieldError.value = null
        getCurrentLocation()
    }
    
    /**
     * Reset state.
     */
    fun resetState() {
        _uiState.value = BorewellInputUiState.Initial
    }
}

/**
 * Borewell input UI state.
 */
sealed class BorewellInputUiState {
    object Initial : BorewellInputUiState()
    object LoadingLocation : BorewellInputUiState()
    data class LocationReady(val geohash: String) : BorewellInputUiState()
    object Submitting : BorewellInputUiState()
    data class Success(val message: String, val isOffline: Boolean) : BorewellInputUiState()
    object Syncing : BorewellInputUiState()
    data class SyncComplete(val count: Int) : BorewellInputUiState()
    data class Warning(val message: String) : BorewellInputUiState()
    data class Error(val message: String) : BorewellInputUiState()
}
