package com.antharjala.watch.data.remote

import com.antharjala.watch.data.remote.dto.BorewellSubmissionRequest
import com.antharjala.watch.data.remote.dto.BorewellSubmissionResponse
import com.antharjala.watch.domain.model.AIRecommendation
import com.antharjala.watch.domain.model.WaterAlert
import retrofit2.Response
import retrofit2.http.*

/**
 * Retrofit API service interface.
 * ENHANCED: Complete backend connectivity with all endpoints.
 * DAY 1 BONUS: Supports compression for low-bandwidth rural areas.
 */
interface ApiService {
    
    /**
     * Health check endpoint for backend connectivity testing.
     * Used by ConnectionTestRepository for monitoring.
     */
    @GET("/health")
    suspend fun healthCheck(): Response<HealthResponse>
    
    /**
     * Submit borewell data.
     * Requirement 4.5: Store borewell record
     */
    @POST("/api/v1/borewell")
    suspend fun submitBorewell(
        @Body request: BorewellSubmissionRequest
    ): Response<BorewellSubmissionResponse>
    
    /**
     * Get heatmap data for bounds.
     * Requirement 6.1: Fetch aggregated heatmap data
     */
    @GET("/api/v1/heatmap")
    suspend fun getHeatmapData(
        @Query("bounds") bounds: String
    ): Response<HeatmapResponse>
    
    /**
     * Get user's historical data.
     * Requirement 7.1: Query historical borewell data
     */
    @GET("/api/v1/user/history")
    suspend fun getUserHistory(
        @Query("userId") userId: String,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null,
        @Query("limit") limit: Int = 100
    ): Response<UserHistoryResponse>
    
    /**
     * Get historical data for region.
     * Requirement 7.1: Query historical borewell data
     */
    @GET("/api/v1/history")
    suspend fun getHistoricalData(
        @Query("geohash") geohash: String,
        @Query("startDate") startDate: String,
        @Query("endDate") endDate: String,
        @Query("limit") limit: Int = 100
    ): Response<HistoricalDataResponse>
    
    /**
     * Get AI recommendations for user's location.
     * Requirement 10.1: Request AI-powered recommendations
     */
    @POST("/api/v1/ai-advisor")
    suspend fun getAIRecommendations(
        @Body request: AIRecommendationRequest
    ): Response<AIRecommendationResponse>
    
    /**
     * Get AI predictions for groundwater levels.
     * DAY 3: Predictive groundwater model
     */
    @POST("/api/v1/ai-advisor/predictions")
    suspend fun getAIPredictions(
        @Body request: AIPredictionRequest
    ): Response<AIPredictionResponse>
    
    /**
     * Get user alerts.
     * Requirement 11.1: Fetch water alerts
     */
    @GET("/api/v1/alerts")
    suspend fun getUserAlerts(
        @Query("userId") userId: String,
        @Query("limit") limit: Int = 50
    ): Response<AlertsResponse>
    
    /**
     * Mark alert as read.
     * Requirement 11.2: Update alert status
     */
    @PUT("/api/v1/alerts/{alertId}/read")
    suspend fun markAlertAsRead(
        @Path("alertId") alertId: String
    ): Response<AlertUpdateResponse>
    
    /**
     * Get region statistics for map display.
     * Used by MapScreen for statistics cards
     */
    @GET("/api/v1/statistics")
    suspend fun getRegionStatistics(
        @Query("geohash") geohash: String,
        @Query("radius") radius: Int = 10
    ): Response<RegionStatisticsResponse>
    
    /**
     * Request data export.
     * Requirement 15.1: Export aggregated data
     */
    @POST("/api/v1/export")
    suspend fun requestExport(
        @Body request: ExportRequest
    ): Response<ExportResponse>
}

// Response DTOs
data class HealthResponse(
    val status: String,
    val timestamp: Long,
    val version: String,
    val services: Map<String, String>
)

data class HeatmapResponse(
    val clusters: List<GeohashCluster>,
    val timestamp: Long
)

data class GeohashCluster(
    val geohash: String,
    val avgDepth: Double,
    val avgYield: Double,
    val sampleCount: Int,
    val waterStressLevel: Double
)

data class UserHistoryResponse(
    val records: List<UserBorewellRecord>,
    val summary: UserSummary,
    val totalRecords: Int,
    val paginationToken: String?
)

data class UserBorewellRecord(
    val id: String,
    val depth: Double,
    val yield: Double,
    val geohash: String,
    val timestamp: Long,
    val syncStatus: String
)

data class UserSummary(
    val totalRecords: Int,
    val avgDepth: Double,
    val avgYield: Double,
    val lastRecordDate: Long,
    val waterStressTrend: String
)

data class HistoricalDataResponse(
    val records: List<BorewellRecord>,
    val statistics: Statistics,
    val paginationToken: String?
)

data class BorewellRecord(
    val depth: Double,
    val yield: Double,
    val timestamp: Long
)

data class Statistics(
    val minDepth: Double,
    val maxDepth: Double,
    val avgDepth: Double,
    val medianDepth: Double,
    val minYield: Double,
    val maxYield: Double,
    val avgYield: Double,
    val medianYield: Double
)

data class AIRecommendationRequest(
    val geohash: String,
    val userId: String,
    val currentDepth: Double? = null,
    val currentYield: Double? = null
)

data class AIRecommendationResponse(
    val recommendations: List<AIRecommendation>,
    val waterConfidenceScore: Double,
    val riskLevel: String,
    val dataSource: DataSource,
    val generatedAt: Long
)

data class AIPredictionRequest(
    val geohash: String,
    val userId: String,
    val forecastDays: Int = 20
)

data class AIPredictionResponse(
    val predictions: List<WaterLevelPrediction>,
    val confidenceLevel: Double,
    val factors: List<PredictionFactor>,
    val generatedAt: Long
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

data class AlertsResponse(
    val alerts: List<WaterAlert>,
    val unreadCount: Int,
    val totalCount: Int
)

data class AlertUpdateResponse(
    val success: Boolean,
    val message: String
)

data class RegionStatisticsResponse(
    val region: RegionInfo,
    val statistics: RegionStats,
    val trends: RegionTrends,
    val timestamp: Long
)

data class RegionInfo(
    val geohash: String,
    val radius: Int,
    val totalBorewells: Int
)

data class RegionStats(
    val avgDepth: Double,
    val avgYield: Double,
    val waterStressLevel: Double,
    val riskLevel: String
)

data class RegionTrends(
    val depthTrend: String, // "improving", "stable", "declining"
    val yieldTrend: String,
    val trendConfidence: Double
)

data class DataSource(
    val borewellCount: Int,
    val rainfall90Days: Double,
    val soilMoisture: Double
)

data class ExportRequest(
    val geohashes: List<String>,
    val startDate: String,
    val endDate: String,
    val format: String
)

data class ExportResponse(
    val exportUrl: String,
    val expiresAt: Long,
    val recordCount: Int
)
