package com.antharjala.watch.data.local.dao

import androidx.room.*
import com.antharjala.watch.data.local.entity.CachedHeatmapTile

/**
 * DAO for heatmap cache operations.
 */
@Dao
interface HeatmapCacheDao {
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(tile: CachedHeatmapTile)
    
    @Query("SELECT * FROM heatmap_cache WHERE tileKey = :key")
    suspend fun getTile(key: String): CachedHeatmapTile?
    
    @Query("DELETE FROM heatmap_cache WHERE expires_at < :currentTime")
    suspend fun deleteExpired(currentTime: Long = System.currentTimeMillis())
    
    @Query("DELETE FROM heatmap_cache")
    suspend fun clearAll()
}
