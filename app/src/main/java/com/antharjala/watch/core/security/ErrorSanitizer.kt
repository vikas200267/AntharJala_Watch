package com.antharjala.watch.core.security

import com.antharjala.watch.BuildConfig

/**
 * Sanitizes error messages for production to prevent information disclosure.
 * SECURITY: Prevents exposing internal implementation details.
 */
object ErrorSanitizer {
    
    /**
     * Sanitize error message for user display.
     * In production, returns generic messages.
     * In debug, returns detailed messages.
     */
    fun sanitize(error: Throwable): String {
        return if (BuildConfig.DEBUG) {
            // Debug: Show detailed error
            error.message ?: error.toString()
        } else {
            // Production: Show generic error based on type
            when (error) {
                is java.net.UnknownHostException -> "Network connection failed. Please check your internet connection."
                is java.net.SocketTimeoutException -> "Request timed out. Please try again."
                is javax.net.ssl.SSLException -> "Secure connection failed. Please check your network."
                is java.io.IOException -> "Network error occurred. Please try again."
                else -> "An error occurred. Please try again later."
            }
        }
    }
    
    /**
     * Sanitize error message with custom fallback.
     */
    fun sanitize(error: Throwable, fallback: String): String {
        return if (BuildConfig.DEBUG) {
            error.message ?: error.toString()
        } else {
            fallback
        }
    }
    
    /**
     * Check if error should be reported to crash analytics.
     * Filters out expected errors.
     */
    fun shouldReport(error: Throwable): Boolean {
        return when (error) {
            is java.net.UnknownHostException -> false  // Expected when offline
            is java.net.SocketTimeoutException -> false  // Expected with slow network
            is java.util.concurrent.CancellationException -> false  // Expected when cancelled
            else -> true
        }
    }
}
