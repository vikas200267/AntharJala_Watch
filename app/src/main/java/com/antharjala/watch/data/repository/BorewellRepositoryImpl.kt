package com.antharjala.watch.data.repository

import android.content.Context
import androidx.work.*
import com.antharjala.watch.core.network.NetworkMonitor
import com.antharjala.watch.core.security.ErrorSanitizer
import com.antharjala.watch.core.security.PlayIntegrityManager
import com.antharjala.watch.core.security.RateLimiter
import com.antharjala.watch.core.security.TokenManager
import com.antharjala.watch.core.utils.BorewellInputValidator
import com.antharjala.watch.core.utils.SuspicionLevel
import com.antharjala.watch.data.local.dao.BorewellDao
import com.antharjala.watch.data.local.entity.BorewellRecordEntity
import com.antharjala.watch.data.remote.ApiService
import com.antharjala.watch.data.remote.dto.BorewellSubmissionRequest
import com.antharjala.watch.data.worker.SyncWorker
import com.antharjala.watch.domain.model.BorewellRecord
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Offline-first borewell repository implementation.
 * DAY 1 GAME-CHANGER: Works in villages without internet.
 */
@Singleton
class BorewellRepositoryImpl @Inject constructor(
    @ApplicationContext private val context: Context,
    private val borewellDao: BorewellDao,
    private val apiService: ApiService,
    private val tokenManager: TokenManager,
    private val workManager: WorkManager,
    private val networkMonitor: NetworkMonitor,
    private val playIntegrityManager: PlayIntegrityManager
) : BorewellRepository {
    
    // SECURITY: Client-side rate limiter (10 requests per minute)
    private val rateLimiter = RateLimiter(maxRequests = 10, windowMillis = 60_000)
    
    /**
     * Submit borewell data with offline-first approach.
     * Property 5: Offline Storage with Sync Flag
     * SECURITY PATCHED: Rate limiting, error sanitization
     */
    override suspend fun submitBorewell(
        depth: Double,
        yield: Double,
        geohash: String
    ): Result<String> {
        return try {
            // SECURITY: Check rate limit
            if (!rateLimiter.isAllowed("submit_borewell")) {
                val waitTime = rateLimiter.getTimeUntilNextRequest("submit_borewell") / 1000
                return Result.failure(Exception("Rate limit exceeded. Please wait $waitTime seconds."))
            }
            
            // Validate inputs
            val validation = BorewellInputValidator.validateBorewellData(depth, yield)
            if (!validation.isSuccess()) {
                return Result.failure(Exception(validation.errorMessage()))
            }
            
            // Edge validation (DAY 1 BONUS)
            val suspicion = BorewellInputValidator.detectSuspiciousPattern(depth, yield)
            
            val timestamp = System.currentTimeMillis()
            
            // Try online submission first if authenticated
            if (tokenManager.isAuthenticated() && isNetworkAvailable()) {
                try {
                    // Generate Play Integrity token
                    // Property 59: Play Integrity Token Inclusion
                    val integrityTokenResult = playIntegrityManager.generateIntegrityToken()
                    val integrityToken = integrityTokenResult.getOrNull()
                    
                    // If Play Integrity fails, we still allow submission but flag for review
                    // Requirement 5.7: Allow submission with manual review flag
                    
                    val request = BorewellSubmissionRequest(
                        depth = depth,
                        yield = yield,
                        geohash = geohash,
                        timestamp = timestamp,
                        playIntegrityToken = integrityToken
                    )
                    
                    val response = apiService.submitBorewell(request)
                    
                    if (response.isSuccessful && response.body() != null) {
                        // Success - no need to store offline
                        return Result.success(response.body()!!.recordId)
                    }
                } catch (e: Exception) {
                    // SECURITY: Sanitize error message
                    // Network error - fall through to offline storage
                }
            }
            
            // Store offline with sync pending flag
            val entity = BorewellRecordEntity(
                depth = depth,
                yield = yield,
                geohash = geohash,
                timestamp = timestamp,
                syncPending = true,
                suspicionLevel = when (suspicion) {
                    is SuspicionLevel.High -> "HIGH"
                    is SuspicionLevel.Medium -> "MEDIUM"
                    else -> null
                },
                suspicionReason = suspicion.reason()
            )
            
            val recordId = borewellDao.insert(entity)
            
            // Schedule background sync
            scheduleSyncWork()
            
            Result.success("offline_$recordId")
        } catch (e: Exception) {
            // SECURITY: Sanitize error message
            Result.failure(Exception(ErrorSanitizer.sanitize(e, "Failed to submit data")))
        }
    }
    
    /**
     * Save borewell data offline.
     */
    override suspend fun saveBorewellOffline(record: BorewellRecord): Long {
        val entity = BorewellRecordEntity(
            depth = record.depth,
            yield = record.yield,
            geohash = record.geohash,
            timestamp = record.timestamp,
            syncPending = true
        )
        return borewellDao.insert(entity)
    }
    
    /**
     * Get pending sync count as Flow.
     */
    override fun getPendingSyncCount(): Flow<Int> {
        return borewellDao.getPendingSyncCountFlow()
    }
    
    /**
     * Get all pending records.
     */
    override suspend fun getPendingRecords(): List<BorewellRecord> {
        return borewellDao.getPendingSyncRecords().map { entity ->
            BorewellRecord(
                id = entity.id,
                depth = entity.depth,
                yield = entity.yield,
                geohash = entity.geohash,
                timestamp = entity.timestamp,
                syncPending = entity.syncPending
            )
        }
    }
    
    /**
     * Force sync now (manual trigger).
     */
    override suspend fun forceSyncNow(): Result<Int> {
        return try {
            val pendingCount = borewellDao.getPendingSyncCount()
            if (pendingCount > 0) {
                scheduleSyncWork(immediate = true)
            }
            Result.success(pendingCount)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Schedule background sync work.
     * Uses WorkManager with constraints for battery optimization.
     */
    private fun scheduleSyncWork(immediate: Boolean = false) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        
        val syncRequest = if (immediate) {
            OneTimeWorkRequestBuilder<SyncWorker>()
                .setConstraints(constraints)
                .build()
        } else {
            OneTimeWorkRequestBuilder<SyncWorker>()
                .setConstraints(constraints)
                .setInitialDelay(30, TimeUnit.SECONDS)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    30,
                    TimeUnit.SECONDS
                )
                .build()
        }
        
        workManager.enqueueUniqueWork(
            SyncWorker.WORK_NAME,
            ExistingWorkPolicy.REPLACE,
            syncRequest
        )
    }
    
    /**
     * Check network availability using NetworkMonitor.
     */
    private fun isNetworkAvailable(): Boolean {
        return networkMonitor.isNetworkAvailable()
    }
}
