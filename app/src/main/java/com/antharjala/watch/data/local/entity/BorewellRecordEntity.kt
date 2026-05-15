package com.antharjala.watch.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for offline borewell record storage.
 * Property 5: Offline Storage with Sync Flag
 */
@Entity(tableName = "borewell_records")
data class BorewellRecordEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    
    @ColumnInfo(name = "depth")
    val depth: Double,
    
    @ColumnInfo(name = "yield")
    val yield: Double,
    
    @ColumnInfo(name = "geohash")
    val geohash: String,
    
    @ColumnInfo(name = "timestamp")
    val timestamp: Long,
    
    @ColumnInfo(name = "sync_pending")
    val syncPending: Boolean = false,
    
    @ColumnInfo(name = "retry_count")
    val retryCount: Int = 0,
    
    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis(),
    
    @ColumnInfo(name = "suspicion_level")
    val suspicionLevel: String? = null,
    
    @ColumnInfo(name = "suspicion_reason")
    val suspicionReason: String? = null
)
