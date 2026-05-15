package com.antharjala.watch.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for heatmap tile caching.
 * Requirement 6.8: Cache heatmap tiles for 30 minutes
 */
@Entity(tableName = "heatmap_cache")
data class CachedHeatmapTile(
    @PrimaryKey
    val tileKey: String,
    
    @ColumnInfo(name = "data")
    val data: String, // JSON serialized
    
    @ColumnInfo(name = "cached_at")
    val cachedAt: Long,
    
    @ColumnInfo(name = "expires_at")
    val expiresAt: Long
) {
    companion object {
        const val CACHE_DURATION_MS = 30 * 60 * 1000L // 30 minutes
        
        fun create(tileKey: String, data: String): CachedHeatmapTile {
            val now = System.currentTimeMillis()
            return CachedHeatmapTile(
                tileKey = tileKey,
                data = data,
                cachedAt = now,
                expiresAt = now + CACHE_DURATION_MS
            )
        }
    }
    
    fun isExpired(): Boolean = System.currentTimeMillis() > expiresAt
}
