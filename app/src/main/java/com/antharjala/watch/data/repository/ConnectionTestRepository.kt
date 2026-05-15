package com.antharjala.watch.data.repository

import com.antharjala.watch.data.remote.ApiService
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ConnectionTestRepository @Inject constructor(
    private val apiService: ApiService
) {
    
    data class ConnectionStatus(
        val isNetworkAvailable: Boolean,
        val isBackendReachable: Boolean,
        val responseTime: Long,
        val error: String? = null
    )
    
    fun testConnection(): Flow<ConnectionStatus> = flow {
        try {
            val startTime = System.currentTimeMillis()
            
            // Test network connectivity first
            emit(ConnectionStatus(
                isNetworkAvailable = true,
                isBackendReachable = false,
                responseTime = 0,
                error = "Testing backend connection..."
            ))
            
            // Test backend health endpoint
            val response = apiService.healthCheck()
            val responseTime = System.currentTimeMillis() - startTime
            
            if (response.isSuccessful) {
                emit(ConnectionStatus(
                    isNetworkAvailable = true,
                    isBackendReachable = true,
                    responseTime = responseTime
                ))
            } else {
                emit(ConnectionStatus(
                    isNetworkAvailable = true,
                    isBackendReachable = false,
                    responseTime = responseTime,
                    error = "Backend returned ${response.code()}: ${response.message()}"
                ))
            }
            
        } catch (e: Exception) {
            emit(ConnectionStatus(
                isNetworkAvailable = false,
                isBackendReachable = false,
                responseTime = 0,
                error = e.message ?: "Connection test failed"
            ))
        }
    }
    
    suspend fun quickHealthCheck(): Boolean {
        return try {
            val response = apiService.healthCheck()
            response.isSuccessful
        } catch (e: Exception) {
            false
        }
    }
}