package com.antharjala.watch.domain.model

/**
 * Domain model for borewell record.
 */
data class BorewellRecord(
    val id: Long = 0,
    val depth: Double,
    val yield: Double,
    val geohash: String,
    val timestamp: Long,
    val syncPending: Boolean = false,
    val waterStressLevel: Double? = null
)
