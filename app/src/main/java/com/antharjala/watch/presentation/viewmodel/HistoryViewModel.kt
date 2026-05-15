package com.antharjala.watch.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.antharjala.watch.data.remote.ApiService
import com.antharjala.watch.data.remote.UserBorewellRecord
import com.antharjala.watch.data.remote.UserSummary
import com.antharjala.watch.core.security.TokenManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

/**
 * ViewModel for HistoryScreen.
 * Handles user's historical borewell data and analytics.
 */
@HiltViewModel
class HistoryViewModel @Inject constructor(
    private val apiService: ApiService,
    private val tokenManager: TokenManager
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(HistoryUiState())
    val uiState: StateFlow<HistoryUiState> = _uiState.asStateFlow()
    
    private val _userRecords = MutableStateFlow<List<UserBorewellRecord>>(emptyList())
    val userRecords: StateFlow<List<UserBorewellRecord>> = _userRecords.asStateFlow()
    
    private val _userSummary = MutableStateFlow<UserSummary?>(null)
    val userSummary: StateFlow<UserSummary?> = _userSummary.asStateFlow()
    
    init {
        loadUserHistory()
    }
    
    fun loadUserHistory() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            try {
                val userId = tokenManager.getUserId() ?: "default-user"
                val response = apiService.getUserHistory(userId)
                
                if (response.isSuccessful) {
                    val body = response.body()
                    if (body != null) {
                        _userRecords.value = body.records
                        _userSummary.value = body.summary
                        
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = null,
                            lastUpdated = System.currentTimeMillis()
                        )
                    } else {
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = "No data received from server"
                        )
                    }
                } else {
                    // Fallback to default data for demo
                    loadDefaultData()
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = "Using offline data: ${response.message()}"
                    )
                }
            } catch (e: Exception) {
                // Offline fallback
                loadDefaultData()
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "Offline mode: ${e.message}"
                )
            }
        }
    }
    
    fun refreshData() {
        loadUserHistory()
    }
    
    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
    
    fun getRecordsByDateRange(startDate: Long, endDate: Long): List<UserBorewellRecord> {
        return _userRecords.value.filter { record ->
            record.timestamp in startDate..endDate
        }
    }
    
    fun getRecordsByMonth(year: Int, month: Int): List<UserBorewellRecord> {
        val calendar = Calendar.getInstance()
        calendar.set(year, month - 1, 1, 0, 0, 0)
        val startOfMonth = calendar.timeInMillis
        
        calendar.add(Calendar.MONTH, 1)
        calendar.add(Calendar.MILLISECOND, -1)
        val endOfMonth = calendar.timeInMillis
        
        return getRecordsByDateRange(startOfMonth, endOfMonth)
    }
    
    fun getDepthTrend(): List<Pair<String, Double>> {
        return _userRecords.value
            .sortedBy { it.timestamp }
            .map { record ->
                val date = SimpleDateFormat("MMM dd", Locale.getDefault())
                    .format(Date(record.timestamp))
                date to record.depth
            }
    }
    
    fun getYieldTrend(): List<Pair<String, Double>> {
        return _userRecords.value
            .sortedBy { it.timestamp }
            .map { record ->
                val date = SimpleDateFormat("MMM dd", Locale.getDefault())
                    .format(Date(record.timestamp))
                date to record.yield
            }
    }
    
    private fun loadDefaultData() {
        val currentTime = System.currentTimeMillis()
        val dayInMillis = 24 * 60 * 60 * 1000L
        
        _userRecords.value = listOf(
            UserBorewellRecord(
                id = "record-1",
                depth = 45.5,
                yield = 1200.0,
                geohash = "tdr3u6",
                timestamp = currentTime - (7 * dayInMillis),
                syncStatus = "synced"
            ),
            UserBorewellRecord(
                id = "record-2",
                depth = 47.2,
                yield = 1150.0,
                geohash = "tdr3u6",
                timestamp = currentTime - (14 * dayInMillis),
                syncStatus = "synced"
            ),
            UserBorewellRecord(
                id = "record-3",
                depth = 44.8,
                yield = 1280.0,
                geohash = "tdr3u6",
                timestamp = currentTime - (21 * dayInMillis),
                syncStatus = "synced"
            ),
            UserBorewellRecord(
                id = "record-4",
                depth = 46.1,
                yield = 1190.0,
                geohash = "tdr3u6",
                timestamp = currentTime - (28 * dayInMillis),
                syncStatus = "synced"
            ),
            UserBorewellRecord(
                id = "record-5",
                depth = 48.3,
                yield = 1100.0,
                geohash = "tdr3u6",
                timestamp = currentTime - (35 * dayInMillis),
                syncStatus = "synced"
            )
        )
        
        _userSummary.value = UserSummary(
            totalRecords = 5,
            avgDepth = 46.4,
            avgYield = 1184.0,
            lastRecordDate = currentTime - (7 * dayInMillis),
            waterStressTrend = "stable"
        )
    }
}

/**
 * UI state for HistoryScreen.
 */
data class HistoryUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val lastUpdated: Long = 0L
)