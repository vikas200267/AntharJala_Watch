package com.antharjala.watch.data.local.dao

import androidx.room.*
import com.antharjala.watch.data.local.entity.BorewellRecordEntity
import kotlinx.coroutines.flow.Flow

/**
 * DAO for borewell record operations.
 * Property 6: Sync Prioritization by Age (oldest first)
 */
@Dao
interface BorewellDao {
    
    /**
     * Insert a new borewell record.
     * Returns the ID of the inserted record.
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(record: BorewellRecordEntity): Long
    
    /**
     * Update an existing record.
     */
    @Update
    suspend fun update(record: BorewellRecordEntity)
    
    /**
     * Delete a record.
     */
    @Delete
    suspend fun delete(record: BorewellRecordEntity)
    
    /**
     * Get all pending sync records ordered by timestamp (oldest first).
     * Property 6: Sync Prioritization by Age
     */
    @Query("SELECT * FROM borewell_records WHERE sync_pending = 1 ORDER BY timestamp ASC")
    suspend fun getPendingSyncRecords(): List<BorewellRecordEntity>
    
    /**
     * Get pending sync records as Flow for reactive updates.
     */
    @Query("SELECT * FROM borewell_records WHERE sync_pending = 1 ORDER BY timestamp ASC")
    fun getPendingSyncRecordsFlow(): Flow<List<BorewellRecordEntity>>
    
    /**
     * Get count of pending sync records.
     */
    @Query("SELECT COUNT(*) FROM borewell_records WHERE sync_pending = 1")
    suspend fun getPendingSyncCount(): Int
    
    /**
     * Get count of pending sync records as Flow.
     */
    @Query("SELECT COUNT(*) FROM borewell_records WHERE sync_pending = 1")
    fun getPendingSyncCountFlow(): Flow<Int>
    
    /**
     * Update sync status for a record.
     * Property 8: Sync Success Clears Pending Flag
     */
    @Query("UPDATE borewell_records SET sync_pending = :pending WHERE id = :id")
    suspend fun updateSyncStatus(id: Long, pending: Boolean)
    
    /**
     * Increment retry count for a record.
     */
    @Query("UPDATE borewell_records SET retry_count = retry_count + 1 WHERE id = :id")
    suspend fun incrementRetryCount(id: Long)
    
    /**
     * Get all records (for debugging/testing).
     */
    @Query("SELECT * FROM borewell_records ORDER BY timestamp DESC")
    suspend fun getAllRecords(): List<BorewellRecordEntity>
    
    /**
     * Delete all synced records older than specified timestamp.
     * Used for cleanup to prevent database bloat.
     */
    @Query("DELETE FROM borewell_records WHERE sync_pending = 0 AND created_at < :timestamp")
    suspend fun deleteOldSyncedRecords(timestamp: Long)
    
    /**
     * Get records with high retry count (for manual review).
     */
    @Query("SELECT * FROM borewell_records WHERE retry_count >= :threshold ORDER BY timestamp DESC")
    suspend fun getHighRetryRecords(threshold: Int = 5): List<BorewellRecordEntity>
}
