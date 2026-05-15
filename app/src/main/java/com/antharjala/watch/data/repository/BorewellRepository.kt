package com.antharjala.watch.data.repository

import com.antharjala.watch.domain.model.BorewellRecord
import kotlinx.coroutines.flow.Flow

/**
 * Borewell repository interface for offline-first data management.
 * Requirements: 1.6, 1.7, 2.1
 */
interface BorewellRepository {
    
    /**
     * Submit borewell data (online or offline).
     * Property 5: Offline Storage with Sync Flag
     * 
     * @param depth Depth in meters
     * @param yield Yield in liters per hour
     * @param geohash Privacy-preserving location
     * @return Result with record ID or error
     */
    suspend fun submitBorewell(
        depth: Double,
        yield: Double,
        geohash: String
    ): Result<String>
    
    /**
     * Save borewell data offline with sync pending flag.
     * 
     * @return Local record ID
     */
    suspend fun saveBorewellOffline(record: BorewellRecord): Long
    
    /**
     * Get pending sync count as Flow.
     */
    fun getPendingSyncCount(): Flow<Int>
    
    /**
     * Get all pending records.
     */
    suspend fun getPendingRecords(): List<BorewellRecord>
    
    /**
     * Force sync now (manual trigger).
     */
    suspend fun forceSyncNow(): Result<Int>
}
