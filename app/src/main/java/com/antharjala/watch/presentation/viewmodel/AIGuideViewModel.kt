package com.antharjala.watch.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.antharjala.watch.data.repository.AIRepository
import com.antharjala.watch.domain.model.AIRecommendation
import com.antharjala.watch.domain.model.WaterPrediction
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AIGuideUiState(
    val isLoading: Boolean = false,
    val recommendation: AIRecommendation? = null,
    val prediction: WaterPrediction? = null,
    val confidenceScore: Float = 0.5f,
    val riskLevel: String = "medium",
    val error: String? = null
)

@HiltViewModel
class AIGuideViewModel @Inject constructor(
    private val aiRepository: AIRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(AIGuideUiState())
    val uiState: StateFlow<AIGuideUiState> = _uiState.asStateFlow()
    
    fun loadAIRecommendations() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            try {
                val result = aiRepository.getAIRecommendations()
                
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    recommendation = result.recommendation,
                    prediction = result.prediction,
                    confidenceScore = calculateConfidenceScore(result),
                    riskLevel = result.riskLevel
                )
                
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load AI recommendations"
                )
            }
        }
    }
    
    private fun calculateConfidenceScore(result: AIRepository.AIResult): Float {
        // Calculate confidence based on risk level and prediction confidence
        return when (result.riskLevel.lowercase()) {
            "low" -> 0.8f
            "medium" -> 0.6f
            "high" -> 0.4f
            "critical" -> 0.2f
            else -> 0.5f
        }
    }
}