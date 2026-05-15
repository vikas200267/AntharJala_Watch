package com.antharjala.watch.data.repository

import com.antharjala.watch.domain.model.AIRecommendation
import com.antharjala.watch.domain.model.WaterAlert
import kotlinx.coroutines.flow.Flow

/**
 * Repository interface for AI-powered features.
 * DAY 3: AI Intelligence Layer
 */
interface AIRepository {
    
    /**
     * Get AI recommendations for user's location.
     * Returns structured recommendations with actionable steps.
     */
    suspend fun getRecommendations(
        geohash: String,
        userId: String,
        currentDepth: Double? = null,
        currentYield: Double? = null
    ): Result<List<AIRecommendation>>
    
    /**
     * Get water level predictions for next 20 days.
     * Uses predictive groundwater model.
     */
    suspend fun getPredictions(
        geohash: String,
        userId: String,
        forecastDays: Int = 20
    ): Result<PredictionResult>
    
    /**
     * Get water confidence score for region.
     * Score from 0.0 (critical) to 1.0 (excellent).
     */
    suspend fun getWaterConfidenceScore(
        geohash: String
    ): Result<Double>
    
    /**
     * Get user alerts with real-time updates.
     * Returns flow for live updates.
     */
    fun getUserAlerts(userId: String): Flow<List<WaterAlert>>
    
    /**
     * Mark alert as read.
     */
    suspend fun markAlertAsRead(alertId: String): Result<Boolean>
    
    /**
     * Get cached recommendations to reduce API calls.
     */
    suspend fun getCachedRecommendations(geohash: String): List<AIRecommendation>
    
    /**
     * Cache recommendations for offline access.
     */
    suspend fun cacheRecommendations(geohash: String, recommendations: List<AIRecommendation>)
}

/**
 * Data class for prediction results.
 */
data class PredictionResult(
    val predictions: List<WaterLevelPrediction>,
    val confidenceLevel: Double,
    val factors: List<PredictionFactor>,
    val summary: String
)

data class WaterLevelPrediction(
    val date: String,
    val predictedDepth: Double,
    val predictedYield: Double,
    val confidence: Double
)

data class PredictionFactor(
    val factor: String,
    val impact: String,
    val weight: Double
)