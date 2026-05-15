package com.antharjala.watch.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.antharjala.watch.domain.model.WaterAlert
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AlertsUiState(
    val isLoading: Boolean = false,
    val alerts: List<WaterAlert> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class AlertsViewModel @Inject constructor() : ViewModel() {
    
    private val _uiState = MutableStateFlow(AlertsUiState())
    val uiState: StateFlow<AlertsUiState> = _uiState.asStateFlow()
    
    fun loadAlerts() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            try {
                // Simulate loading alerts (replace with actual API call)
                val alerts = getDemoAlerts()
                
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    alerts = alerts
                )
                
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load alerts"
                )
            }
        }
    }
    
    private fun getDemoAlerts(): List<WaterAlert> {
        return listOf(
            WaterAlert(
                id = "1",
                title = "Water Level Drop Alert",
                message = "Water depth in your area has increased by 18% in the last 10 days. Low rainfall and high usage detected.",
                severity = "high",
                location = "Your Area (2km radius)",
                timeAgo = "2 hours ago",
                actionRequired = true,
                recommendedAction = "Start recharge activities within 7 days"
            ),
            WaterAlert(
                id = "2",
                title = "Community Water Stress",
                message = "Multiple borewells in the community showing declining yield. Coordinated action recommended.",
                severity = "medium",
                location = "Community Area",
                timeAgo = "1 day ago",
                actionRequired = true,
                recommendedAction = "Attend community meeting on water conservation"
            ),
            WaterAlert(
                id = "3",
                title = "Rainfall Forecast",
                message = "Good rainfall expected in the next 5 days. Prepare recharge structures for maximum benefit.",
                severity = "info",
                location = "Regional Forecast",
                timeAgo = "3 hours ago",
                actionRequired = false,
                recommendedAction = ""
            )
        )
    }
}