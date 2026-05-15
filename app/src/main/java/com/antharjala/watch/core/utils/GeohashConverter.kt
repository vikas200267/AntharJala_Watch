package com.antharjala.watch.core.utils

import kotlin.math.floor

/**
 * Geohash converter for privacy-preserving location encoding.
 * Converts GPS coordinates to geohash with precision level 6 (~1.2km x 0.6km resolution).
 * 
 * Property 1: Geohash Conversion Correctness
 * Property 39: Geohash Precision Enforcement
 */
object GeohashConverter {
    
    private const val BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"
    private const val PRECISION = 6
    
    /**
     * Encode GPS coordinates to geohash with precision level 6.
     * 
     * @param latitude Latitude in range [-90, 90]
     * @param longitude Longitude in range [-180, 180]
     * @param precision Geohash precision (default 6)
     * @return 6-character geohash string
     */
    fun encode(latitude: Double, longitude: Double, precision: Int = PRECISION): String {
        require(latitude in -90.0..90.0) { "Latitude must be in range [-90, 90]" }
        require(longitude in -180.0..180.0) { "Longitude must be in range [-180, 180]" }
        
        var lat = latitude
        var lon = longitude
        var latMin = -90.0
        var latMax = 90.0
        var lonMin = -180.0
        var lonMax = 180.0
        
        val geohash = StringBuilder()
        var isEven = true
        var bit = 0
        var ch = 0
        
        while (geohash.length < precision) {
            if (isEven) {
                val mid = (lonMin + lonMax) / 2
                if (lon > mid) {
                    ch = ch or (1 shl (4 - bit))
                    lonMin = mid
                } else {
                    lonMax = mid
                }
            } else {
                val mid = (latMin + latMax) / 2
                if (lat > mid) {
                    ch = ch or (1 shl (4 - bit))
                    latMin = mid
                } else {
                    latMax = mid
                }
            }
            
            isEven = !isEven
            
            if (bit < 4) {
                bit++
            } else {
                geohash.append(BASE32[ch])
                bit = 0
                ch = 0
            }
        }
        
        return geohash.toString()
    }
    
    /**
     * Decode geohash to approximate GPS coordinates.
     * 
     * @param geohash 6-character geohash string
     * @return Pair of (latitude, longitude)
     */
    fun decode(geohash: String): Pair<Double, Double> {
        require(geohash.length == PRECISION) { "Geohash must be exactly $PRECISION characters" }
        require(geohash.all { it in BASE32 }) { "Invalid geohash characters" }
        
        var latMin = -90.0
        var latMax = 90.0
        var lonMin = -180.0
        var lonMax = 180.0
        var isEven = true
        
        for (char in geohash) {
            val cd = BASE32.indexOf(char)
            
            for (mask in arrayOf(16, 8, 4, 2, 1)) {
                if (isEven) {
                    if ((cd and mask) != 0) {
                        lonMin = (lonMin + lonMax) / 2
                    } else {
                        lonMax = (lonMin + lonMax) / 2
                    }
                } else {
                    if ((cd and mask) != 0) {
                        latMin = (latMin + latMax) / 2
                    } else {
                        latMax = (latMin + latMax) / 2
                    }
                }
                isEven = !isEven
            }
        }
        
        val latitude = (latMin + latMax) / 2
        val longitude = (lonMin + lonMax) / 2
        
        return Pair(latitude, longitude)
    }
    
    /**
     * Validate geohash format.
     * 
     * @param geohash String to validate
     * @return true if valid geohash format
     */
    fun isValid(geohash: String): Boolean {
        return geohash.length == PRECISION && geohash.all { it in BASE32 }
    }
    
    /**
     * Calculate approximate distance between two coordinates using Haversine formula.
     * Used for validation in property tests.
     * 
     * @return Distance in meters
     */
    fun haversineDistance(
        lat1: Double, lon1: Double,
        lat2: Double, lon2: Double
    ): Double {
        val R = 6371000.0 // Earth radius in meters
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2)
        val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return R * c
    }
}
