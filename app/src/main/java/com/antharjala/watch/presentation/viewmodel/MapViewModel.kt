package com.antharjala.watch.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.antharjala.watch.data.remote.ApiService
import com.antharjala.watch.data.remote.GeohashCluster
import com.antharjala.watch.data.remote.RegionStatisticsResponse
import com.antharjala.watch.core.utils.GeohashConverter
import com.antharjala.watch.core.utils.LocationService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel for MapScreen.
 * Handles heatmap data, region statistics, and map interactions.
 */
@HiltViewModel
class MapViewModel @Inject constructor(
    private val apiService: ApiService,
    private val locationService: LocationService,
    private val geohashConverter: GeohashConverter
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(MapUiState())
    val uiState: StateFlow<MapUiState> = _uiState.asStateFlow()
    
    private val _heatmapData = MutableStateFlow<List<GeohashCluster>>(emptyList())
    val heatmapData: StateFlow<List<GeohashCluster>> = _heatmapData.asStateFlow()
    
    private val _regionStats = MutableStateFlow<RegionStatisticsResponse?>(null)
    val regionStats: StateFlow<RegionStatisticsResponse?> = _regionStats.asStateFlow()
    
    init {
        loadInitialData()
    }
    
    private fun loadInitialData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            try {
                // Get current location
                val location = locationService.getCurrentLocation()
                if (location != null) {
                    val geohash = geohashConverter.encode(location.latitude, location.longitude, 6)
                    loadHeatmapData(geohash)
                    loadRegionStatistics(geohash)
                } else {
                    // Use default location (Bangalore area)
                    val defaultGeohash = "tdr3u6"
                    loadHeatmapData(defaultGeohash)
                    loadRegionStatistics(defaultGeohash)
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "Failed to load map data: ${e.message}"
                )
            }
        }
    }
    
    fun loadHeatmapData(centerGeohash: String) {
        viewModelScope.launch {
            try {
                // Create bounds around the center geohash
                val bounds = createBoundsFromGeohash(centerGeohash)
                val response = apiService.getHeatmapData(bounds)
                
                if (response.isSuccessful) {
                    val clusters = response.body()?.clusters ?: emptyList()
                    _heatmapData.value = clusters
                    
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = null,
                        lastUpdated = System.currentTimeMillis()
                    )
                } else {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = "Failed to load heatmap: ${response.message()}"
                    )
                }
            } catch (e: Exception) {
                _heatmapData.value = getDefaultHeatmapData()
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "Using offline data: ${e.message}"
                )
            }
        }
    }
    
    fun loadRegionStatistics(geohash: String) {
        viewModelScope.launch {
            try {
                val response = apiService.getRegionStatistics(geohash)
                
                if (response.isSuccessful) {
                    _regionStats.value = response.body()
                } else {
                    _regionStats.value = getDefaultRegionStats(geohash)
                }
            } catch (e: Exception) {
                _regionStats.value = getDefaultRegionStats(geohash)
            }
        }
    }
    
    fun refreshData() {
        loadInitialData()
    }
    
    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
    
    private fun createBoundsFromGeohash(geohash: String): String {
        // Create a bounding box around the geohash
        // Format: "lat1,lng1,lat2,lng2"
        val decoded = geohashConverter.decode(geohash)
        val lat = decoded.first
        val lng = decoded.second
        
        // Create ~10km radius bounds
        val latDelta = 0.09 // ~10km
        val lngDelta = 0.09
        
        return "${lat - latDelta},${lng - lngDelta},${lat + latDelta},${lng + lngDelta}"
    }
    
    private fun getDefaultHeatmapData(): List<GeohashCluster> {
        return listOf(
            GeohashCluster(
                geohash = "tdr3u6",
                avgDepth = 45.5,
                avgYield = 1200.0,
                sampleCount = 15,
                waterStressLevel = 0.3
            ),
            GeohashCluster(
                geohash = "tdr3u7",
                avgDepth = 52.0,
                avgYield = 980.0,
                sampleCount = 8,
                waterStressLevel = 0.5
            ),
            GeohashCluster(
                geohash = "tdr3u5",
                avgDepth = 38.2,
                avgYield = 1450.0,
                sampleCount = 22,
                waterStressLevel = 0.2
            )
        )
    }
    
    private fun getDefaultRegionStats(geohash: String): RegionStatisticsResponse {
        return RegionStatisticsResponse(
            region = com.antharjala.watch.data.remote.RegionInfo(
                geohash = geohash,
                radius = 10,
                totalBorewells = 45
            ),
            statistics = com.antharjala.watch.data.remote.RegionStats(
                avgDepth = 45.5,
                avgYield = 1200.0,
                waterStressLevel = 0.3,
                riskLevel = "Low"
            ),
            trends = com.antharjala.watch.data.remote.RegionTrends(
                depthTrend = "stable",
                yieldTrend = "improving",
                trendConfidence = 0.75
            ),
            timestamp = System.currentTimeMillis()
        )
    }
}

/**
 * UI state for MapScreen.
 */
data class MapUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val lastUpdated: Long = 0L
)