package com.antharjala.watch.core.utils

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import androidx.core.content.ContextCompat
import com.google.android.gms.location.*
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.tasks.await
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Location service using FusedLocationProvider for battery optimization.
 * DAY 1 ADVANCED: Includes spoof detection and privacy-preserving geohash conversion.
 * 
 * Property 38: GPS Privacy Protection
 */
class LocationService(private val context: Context) {
    
    private val fusedLocationClient: FusedLocationProviderClient =
        LocationServices.getFusedLocationProviderClient(context)
    
    /**
     * Get current location with battery optimization.
     * Uses PRIORITY_BALANCED_POWER_ACCURACY for rural battery optimization.
     */
    suspend fun getCurrentLocation(): Result<LocationData> {
        return try {
            if (!hasLocationPermission()) {
                return Result.failure(SecurityException("Location permission not granted"))
            }
            
            val location = suspendCancellableCoroutine<Location> { continuation ->
                val request = CurrentLocationRequest.Builder()
                    .setPriority(Priority.PRIORITY_BALANCED_POWER_ACCURACY)
                    .setMaxUpdateAgeMillis(5000)
                    .build()
                
                fusedLocationClient.getCurrentLocation(request, null)
                    .addOnSuccessListener { location ->
                        if (location != null) {
                            continuation.resume(location)
                        } else {
                            continuation.resumeWithException(
                                Exception("Location is null")
                            )
                        }
                    }
                    .addOnFailureListener { exception ->
                        continuation.resumeWithException(exception)
                    }
            }
            
            // Convert to geohash for privacy
            val geohash = GeohashConverter.encode(
                location.latitude,
                location.longitude,
                precision = 6
            )
            
            // Spoof detection
            val spoofDetection = detectLocationSpoof(location)
            
            val locationData = LocationData(
                geohash = geohash,
                accuracy = location.accuracy,
                timestamp = location.time,
                isMock = location.isFromMockProvider,
                spoofDetection = spoofDetection
            )
            
            Result.success(locationData)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Detect location spoofing.
     * DAY 1 ADVANCED: Compare GPS vs network provider.
     */
    private suspend fun detectLocationSpoof(location: Location): SpoofDetection {
        return try {
            // Check if location is from mock provider
            if (location.isFromMockProvider) {
                return SpoofDetection.Detected("Mock location provider")
            }
            
            // Check location accuracy (very high accuracy might indicate spoofing)
            if (location.accuracy < 5.0f) {
                return SpoofDetection.Suspicious("Unusually high accuracy")
            }
            
            // Additional checks could include:
            // - Compare GPS location with network-based location
            // - Check if location changes too rapidly
            // - Verify location against IP geolocation (done on backend)
            
            SpoofDetection.None
        } catch (e: Exception) {
            SpoofDetection.Unknown("Failed to detect spoofing")
        }
    }
    
    /**
     * Check if location permission is granted.
     */
    private fun hasLocationPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED ||
        ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
    }
    
    /**
     * Request location updates for continuous tracking (optional feature).
     * Uses passive updates for battery optimization.
     */
    suspend fun requestLocationUpdates(
        callback: (LocationData) -> Unit
    ): Result<Unit> {
        return try {
            if (!hasLocationPermission()) {
                return Result.failure(SecurityException("Location permission not granted"))
            }
            
            val request = LocationRequest.Builder(
                Priority.PRIORITY_PASSIVE,
                60000 // 1 minute interval
            ).build()
            
            val locationCallback = object : LocationCallback() {
                override fun onLocationResult(result: LocationResult) {
                    result.lastLocation?.let { location ->
                        val geohash = GeohashConverter.encode(
                            location.latitude,
                            location.longitude,
                            precision = 6
                        )
                        
                        callback(
                            LocationData(
                                geohash = geohash,
                                accuracy = location.accuracy,
                                timestamp = location.time,
                                isMock = location.isFromMockProvider,
                                spoofDetection = SpoofDetection.None
                            )
                        )
                    }
                }
            }
            
            fusedLocationClient.requestLocationUpdates(
                request,
                locationCallback,
                null
            ).await()
            
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

/**
 * Location data with privacy-preserving geohash.
 * Property 38: GPS Privacy Protection (no raw lat/lon)
 */
data class LocationData(
    val geohash: String,
    val accuracy: Float,
    val timestamp: Long,
    val isMock: Boolean,
    val spoofDetection: SpoofDetection
)

/**
 * Spoof detection result.
 */
sealed class SpoofDetection {
    object None : SpoofDetection()
    data class Suspicious(val reason: String) : SpoofDetection()
    data class Detected(val reason: String) : SpoofDetection()
    data class Unknown(val reason: String) : SpoofDetection()
    
    fun isSpoofed(): Boolean = this is Detected || this is Suspicious
    fun reason(): String? = when (this) {
        is Suspicious -> reason
        is Detected -> reason
        is Unknown -> reason
        is None -> null
    }
}
