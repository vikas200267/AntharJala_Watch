package com.antharjala.watch.di

import android.content.Context
import androidx.room.Room
import androidx.work.WorkManager
import com.antharjala.watch.core.network.NetworkMonitor
import com.antharjala.watch.core.security.PlayIntegrityManager
import com.antharjala.watch.core.security.TokenManager
import com.antharjala.watch.core.utils.LocationService
import com.antharjala.watch.data.local.BorewellDatabase
import com.antharjala.watch.data.local.dao.BorewellDao
import com.antharjala.watch.data.local.dao.HeatmapCacheDao
import com.antharjala.watch.data.repository.*
import com.google.firebase.auth.FirebaseAuth
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt dependency injection module.
 */
@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    
    /**
     * Provide Room database.
     */
    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): BorewellDatabase {
        return Room.databaseBuilder(
            context,
            BorewellDatabase::class.java,
            BorewellDatabase.DATABASE_NAME
        )
            .fallbackToDestructiveMigration()
            .build()
    }
    
    /**
     * Provide BorewellDao.
     */
    @Provides
    @Singleton
    fun provideBorewellDao(database: BorewellDatabase): BorewellDao {
        return database.borewellDao()
    }
    
    /**
     * Provide HeatmapCacheDao.
     */
    @Provides
    @Singleton
    fun provideHeatmapCacheDao(database: BorewellDatabase): HeatmapCacheDao {
        return database.heatmapCacheDao()
    }
    
    /**
     * Provide Firebase Auth.
     */
    @Provides
    @Singleton
    fun provideFirebaseAuth(): FirebaseAuth {
        return FirebaseAuth.getInstance()
    }
    
    /**
     * Provide TokenManager.
     */
    @Provides
    @Singleton
    fun provideTokenManager(@ApplicationContext context: Context): TokenManager {
        return TokenManager(context)
    }
    
    /**
     * Provide WorkManager.
     */
    @Provides
    @Singleton
    fun provideWorkManager(@ApplicationContext context: Context): WorkManager {
        return WorkManager.getInstance(context)
    }
    
    /**
     * Provide LocationService.
     */
    @Provides
    @Singleton
    fun provideLocationService(@ApplicationContext context: Context): LocationService {
        return LocationService(context)
    }
    
    /**
     * Provide NetworkMonitor.
     */
    @Provides
    @Singleton
    fun provideNetworkMonitor(@ApplicationContext context: Context): NetworkMonitor {
        return NetworkMonitor(context)
    }
    
    /**
     * Provide PlayIntegrityManager.
     */
    @Provides
    @Singleton
    fun providePlayIntegrityManager(@ApplicationContext context: Context): PlayIntegrityManager {
        return PlayIntegrityManager(context)
    }
    
    /**
     * Provide AuthRepository.
     */
    @Provides
    @Singleton
    fun provideAuthRepository(
        firebaseAuth: FirebaseAuth,
        tokenManager: TokenManager
    ): AuthRepository {
        return AuthRepositoryImpl(firebaseAuth, tokenManager)
    }
    
    /**
     * Provide BorewellRepository.
     */
    @Provides
    @Singleton
    fun provideBorewellRepository(
        @ApplicationContext context: Context,
        borewellDao: BorewellDao,
        apiService: com.antharjala.watch.data.remote.ApiService,
        tokenManager: TokenManager,
        workManager: WorkManager,
        networkMonitor: NetworkMonitor,
        playIntegrityManager: PlayIntegrityManager
    ): BorewellRepository {
        return BorewellRepositoryImpl(
            context,
            borewellDao,
            apiService,
            tokenManager,
            workManager,
            networkMonitor,
            playIntegrityManager
        )
    }
    
    /**
     * Provide AIRepository.
     */
    @Provides
    @Singleton
    fun provideAIRepository(
        apiService: com.antharjala.watch.data.remote.ApiService,
        database: BorewellDatabase
    ): AIRepository {
        return AIRepositoryImpl(apiService, database)
    }
    
    /**
     * Provide ConnectionTestRepository.
     */
    @Provides
    @Singleton
    fun provideConnectionTestRepository(
        apiService: com.antharjala.watch.data.remote.ApiService,
        networkMonitor: NetworkMonitor
    ): ConnectionTestRepository {
        return ConnectionTestRepository(apiService, networkMonitor)
    }
    
    /**
     * Provide Gson for JSON parsing.
     */
    @Provides
    @Singleton
    fun provideGson(): com.google.gson.Gson {
        return com.google.gson.GsonBuilder()
            .setLenient()
            .create()
    }
}
