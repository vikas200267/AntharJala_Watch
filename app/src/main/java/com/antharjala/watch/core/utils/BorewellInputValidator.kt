package com.antharjala.watch.core.utils

/**
 * Input validator for borewell measurements.
 * 
 * Property 3: Depth Input Validation
 * Property 4: Yield Input Validation
 * Property 45: Numeric Input Range Validation
 */
object BorewellInputValidator {
    
    private const val MIN_DEPTH = 0.0
    private const val MAX_DEPTH = 500.0
    private const val MIN_YIELD = 0.0
    private const val MAX_YIELD = 50000.0
    private const val MAX_TIMESTAMP_AGE_DAYS = 7
    
    /**
     * Validate depth value.
     * 
     * @param depth Depth in meters
     * @return ValidationResult with success/error
     */
    fun validateDepth(depth: Double): ValidationResult {
        return when {
            depth < MIN_DEPTH -> ValidationResult.Error("Depth cannot be negative")
            depth > MAX_DEPTH -> ValidationResult.Error("Depth cannot exceed $MAX_DEPTH meters")
            depth.isNaN() || depth.isInfinite() -> ValidationResult.Error("Invalid depth value")
            else -> ValidationResult.Success
        }
    }
    
    /**
     * Validate yield value.
     * 
     * @param yield Yield in liters per hour
     * @return ValidationResult with success/error
     */
    fun validateYield(yield: Double): ValidationResult {
        return when {
            yield < MIN_YIELD -> ValidationResult.Error("Yield cannot be negative")
            yield > MAX_YIELD -> ValidationResult.Error("Yield cannot exceed $MAX_YIELD L/h")
            yield.isNaN() || yield.isInfinite() -> ValidationResult.Error("Invalid yield value")
            else -> ValidationResult.Success
        }
    }
    
    /**
     * Validate timestamp is within acceptable range.
     * Property 12: Stale Data Rejection
     * 
     * @param timestamp Timestamp in milliseconds
     * @return ValidationResult with success/error
     */
    fun validateTimestamp(timestamp: Long): ValidationResult {
        val currentTime = System.currentTimeMillis()
        val maxAge = MAX_TIMESTAMP_AGE_DAYS * 24 * 60 * 60 * 1000L
        
        return when {
            timestamp > currentTime -> ValidationResult.Error("Timestamp cannot be in the future")
            currentTime - timestamp > maxAge -> ValidationResult.Error("Data is too old (> $MAX_TIMESTAMP_AGE_DAYS days)")
            else -> ValidationResult.Success
        }
    }
    
    /**
     * Validate all borewell inputs together.
     * 
     * @return ValidationResult with success or first error encountered
     */
    fun validateBorewellData(
        depth: Double,
        yield: Double,
        timestamp: Long = System.currentTimeMillis()
    ): ValidationResult {
        validateDepth(depth).let { if (it is ValidationResult.Error) return it }
        validateYield(yield).let { if (it is ValidationResult.Error) return it }
        validateTimestamp(timestamp).let { if (it is ValidationResult.Error) return it }
        
        return ValidationResult.Success
    }
    
    /**
     * Edge validation: Detect suspicious patterns.
     * DAY 1 BONUS: Prevents garbage data
     */
    fun detectSuspiciousPattern(depth: Double, yield: Double): SuspicionLevel {
        return when {
            // Extremely deep borewell (> 2000 ft / 610 m)
            depth > 610.0 -> SuspicionLevel.High("Depth exceeds typical borewell range")
            
            // Zero yield repeatedly (should be flagged at application level)
            yield == 0.0 && depth > 0.0 -> SuspicionLevel.Medium("Zero yield with positive depth")
            
            // Unrealistically high yield for shallow depth
            depth < 10.0 && yield > 10000.0 -> SuspicionLevel.Medium("High yield for shallow depth")
            
            else -> SuspicionLevel.None
        }
    }
}

/**
 * Validation result sealed class.
 */
sealed class ValidationResult {
    object Success : ValidationResult()
    data class Error(val message: String) : ValidationResult()
    
    fun isSuccess(): Boolean = this is Success
    fun isError(): Boolean = this is Error
    fun errorMessage(): String? = (this as? Error)?.message
}

/**
 * Suspicion level for edge validation.
 */
sealed class SuspicionLevel {
    object None : SuspicionLevel()
    data class Medium(val reason: String) : SuspicionLevel()
    data class High(val reason: String) : SuspicionLevel()
    
    fun isSuspicious(): Boolean = this !is None
    fun reason(): String? = when (this) {
        is Medium -> reason
        is High -> reason
        is None -> null
    }
}
