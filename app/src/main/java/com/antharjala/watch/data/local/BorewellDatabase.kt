package com.antharjala.watch.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.antharjala.watch.data.local.dao.BorewellDao
import com.antharjala.watch.data.local.dao.HeatmapCacheDao
import com.antharjala.watch.data.local.entity.BorewellRecordEntity
import com.antharjala.watch.data.local.entity.CachedHeatmapTile

/**
 * Room database for offline-first architecture.
 * Stores pending borewell records and cached heatmap data.
 */
@Database(
    entities = [
        BorewellRecordEntity::class,
        CachedHeatmapTile::class
    ],
    version = 1,
    exportSchema = true
)
abstract class BorewellDatabase : RoomDatabase() {
    abstract fun borewellDao(): BorewellDao
    abstract fun heatmapCacheDao(): HeatmapCacheDao
    
    companion object {
        const val DATABASE_NAME = "anthar_jala_watch.db"
    }
}
