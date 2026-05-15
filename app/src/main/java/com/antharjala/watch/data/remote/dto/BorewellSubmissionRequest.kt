package com.antharjala.watch.data.remote.dto

import com.google.gson.annotations.SerializedName

/**
 * API request DTO for borewell submission.
 * Property 38: GPS Privacy Protection (no lat/lon fields)
 */
data class BorewellSubmissionRequest(
    @SerializedName("depth")
    val depth: Double,
    
    @SerializedName("yield")
    val yield: Double,
    
    @SerializedName("geohash")
    val geohash: String,
    
    @SerializedName("timestamp")
    val timestamp: Long,
    
    @SerializedName("playIntegrityToken")
    val playIntegrityToken: String? = null
)

/**
 * API response DTO for borewell submission.
 */
data class BorewellSubmissionResponse(
    @SerializedName("recordId")
    val recordId: String,
    
    @SerializedName("waterStressLevel")
    val waterStressLevel: Double,
    
    @SerializedName("message")
    val message: String
)
