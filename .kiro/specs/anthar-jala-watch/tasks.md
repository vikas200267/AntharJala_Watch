# Implementation Plan: Anthar-Jala Watch

## Overview

This implementation plan breaks down the Anthar-Jala Watch groundwater monitoring platform into discrete coding tasks. The system consists of an Android mobile application (Kotlin), AWS serverless backend (Python Lambda functions), and integrations with external services (Gemini AI, Open-Meteo, NASA GLDAS, Firebase, FCM, Play Integrity).

The implementation follows a layered approach: infrastructure setup, core data models, Android app components, Lambda processors, security layer, visualization, alerts, AI recommendations, and testing. Each task builds incrementally, with checkpoints to validate functionality before proceeding.

## Tasks

### Phase 1: Infrastructure and Core Setup

- [ ] 1. Set up AWS infrastructure and DynamoDB tables
  - Create DynamoDB table `BorewellRecords` with partition key `geohash` (String) and sort key `timestamp` (Number)
  - Create GSI `userId-timestamp-index` and `suspicious-timestamp-index`
  - Create DynamoDB table `Alerts` with partition key `geohash` and sort key `alertTimestamp`
  - Create DynamoDB table `Recommendations` with partition key `geohash` and sort key `generatedAt`
  - Create DynamoDB table `Configuration` with partition key `environment` and sort key `configKey`
  - Configure on-demand billing, point-in-time recovery, and TTL (5 years) on `createdAt` field
  - Create S3 bucket for export files with lifecycle policy (24-hour deletion)
  - Set up AWS Systems Manager Parameter Store with configuration values
  - _Requirements: 4.5, 8.4, 10.8, 15.6, 20.1, 20.2_

- [ ] 2. Set up Android project structure with Clean Architecture
  - Create Android project with Jetpack Compose, minimum SDK 24
  - Configure Gradle dependencies: Compose, Room, WorkManager, Retrofit, Hilt, Kotest
  - Set up module structure: app, data, domain, presentation
  - Configure Hilt for dependency injection
  - Set up Room database with version 1 schema
  - _Requirements: 1.1, 1.6, 2.1_

- [ ] 3. Configure Firebase and external service integrations
  - Set up Firebase project and add Android app
  - Configure Firebase Authentication with phone number sign-in
  - Set up Firebase Cloud Messaging (FCM) for push notifications
  - Configure Play Integrity API in Google Cloud Console
  - Obtain API keys for Gemini AI, Open-Meteo, NASA GLDAS
  - Store API keys in AWS Secrets Manager
  - _Requirements: 3.1, 5.1, 9.1, 10.5, 11.2, 12.1, 13.1_


### Phase 2: Core Data Models and Utilities

- [ ] 4. Implement geohash conversion and validation utilities
  - [ ] 4.1 Create `GeohashConverter` class with encode and decode methods
    - Implement `encode(lat: Double, lon: Double, precision: Int): String` using base32 encoding
    - Implement `decode(geohash: String): Pair<Double, Double>` to convert back to coordinates
    - _Requirements: 1.3, 14.1, 14.2_
  
  - [ ]* 4.2 Write property test for geohash conversion correctness
    - **Property 1: Geohash Conversion Correctness**
    - **Validates: Requirements 1.3, 14.2**
    - Test that any valid GPS coordinates produce valid 6-character geohash within 1.2km accuracy
  
  - [ ] 4.3 Create `GeohashValidator` for format validation
    - Implement validation for 6-character length and valid base32 characters
    - _Requirements: 4.1, 14.2_
  
  - [ ]* 4.4 Write property test for geohash format validation
    - **Property 11: Geohash Format Validation**
    - **Validates: Requirements 4.1**

- [ ] 5. Implement input validation utilities
  - [ ] 5.1 Create `BorewellInputValidator` class
    - Implement `validateDepth(depth: Double): ValidationResult` for range [0, 500]
    - Implement `validateYield(yield: Double): ValidationResult` for range [0, 50000]
    - Implement `validateTimestamp(timestamp: Long): ValidationResult` for 7-day window
    - _Requirements: 1.4, 1.5, 4.2, 17.1_
  
  - [ ]* 5.2 Write property tests for input validation
    - **Property 3: Depth Input Validation**
    - **Property 4: Yield Input Validation**
    - **Validates: Requirements 1.4, 1.5, 17.1**
  
  - [ ] 5.3 Create `TextSanitizer` for text input sanitization
    - Remove special characters, limit to 500 characters
    - Escape special characters for AI prompts
    - _Requirements: 17.2, 17.5_
  
  - [ ]* 5.4 Write property tests for text sanitization
    - **Property 46: Text Input Sanitization**
    - **Property 47: Special Character Escaping**
    - **Validates: Requirements 17.2, 17.5**

- [ ] 6. Implement Android Room database entities and DAOs
  - [ ] 6.1 Create `BorewellRecordEntity` with all fields
    - Define entity with id, depth, yield, geohash, timestamp, syncPending, retryCount, createdAt
    - _Requirements: 1.6, 1.7_
  
  - [ ] 6.2 Create `BorewellDao` with CRUD operations
    - Implement insert, update, delete, query methods
    - Add query for pending sync records ordered by timestamp
    - _Requirements: 1.6, 2.7_
  
  - [ ] 6.3 Create `CachedHeatmapTile` entity and DAO
    - Define entity with tileKey, data (JSON), cachedAt, expiresAt
    - Implement cache expiration query (30 minutes)
    - _Requirements: 6.8_
  
  - [ ]* 6.4 Write unit tests for Room database operations
    - Test insert, update, delete, query operations
    - Test sync pending queries and ordering


### Phase 3: Android Authentication Module

- [ ] 7. Implement Firebase phone authentication
  - [ ] 7.1 Create `AuthRepository` interface and implementation
    - Implement `sendOtp(phoneNumber: String): Result<String>` using Firebase Auth
    - Implement `verifyOtp(verificationId: String, code: String): Result<User>`
    - Implement `getAuthToken(): String?` from Android Keystore
    - Implement `logout()` to clear token
    - _Requirements: 13.2, 13.4, 13.5, 13.7_
  
  - [ ] 7.2 Create `TokenManager` for secure JWT storage
    - Store JWT in Android Keystore with encryption
    - Implement auto-refresh logic (refresh 5 minutes before expiration)
    - _Requirements: 13.5, 13.6_
  
  - [ ]* 7.3 Write property tests for token management
    - **Property 36: Token Auto-Refresh**
    - **Property 37: Token Clearing on Logout**
    - **Validates: Requirements 13.6, 13.7**
  
  - [ ] 7.3 Create `AuthViewModel` for authentication UI state
    - Manage phone number input, OTP input, loading states
    - Implement 3-attempt limit with 5-minute cooldown
    - _Requirements: 13.1, 13.3, 13.8_
  
  - [ ] 7.4 Create authentication Compose UI screens
    - Phone number input screen with country code selector
    - OTP input screen with resend functionality
    - Error handling and loading indicators
    - _Requirements: 13.1, 13.3_
  
  - [ ]* 7.5 Write unit tests for authentication flow
    - Test OTP send, verify, token storage, logout
    - Test cooldown period after 3 failed attempts

- [ ] 8. Checkpoint - Verify authentication and database setup
  - Ensure all tests pass, ask the user if questions arise.


### Phase 4: Android Data Collection Module

- [ ] 9. Implement borewell data collection UI and logic
  - [ ] 9.1 Create `BorewellInputViewModel` with validation
    - Manage depth and yield input state
    - Implement real-time validation using `BorewellInputValidator`
    - Handle submission with online/offline detection
    - _Requirements: 1.1, 1.4, 1.5_
  
  - [ ] 9.2 Create `LocationService` for GPS coordinate retrieval
    - Request location permissions
    - Get current GPS coordinates with accuracy check
    - Convert GPS to geohash using `GeohashConverter`
    - _Requirements: 1.3, 14.1_
  
  - [ ]* 9.3 Write property test for GPS privacy protection
    - **Property 38: GPS Privacy Protection**
    - **Validates: Requirements 14.1, 14.3, 14.6**
    - Verify no raw lat/lon in transmitted or stored data
  
  - [ ] 9.4 Create `BorewellRepository` implementation
    - Implement `submitBorewell()` for online submission with Play Integrity token
    - Implement `saveBorewellOffline()` for offline storage with sync pending flag
    - _Requirements: 1.6, 1.7, 5.1_
  
  - [ ]* 9.5 Write property tests for offline storage
    - **Property 5: Offline Storage with Sync Flag**
    - **Validates: Requirements 1.6, 1.7**
  
  - [ ] 9.6 Create borewell input Compose UI screen
    - Input fields for depth (meters) and yield (liters/hour)
    - Real-time validation with inline error messages
    - Display geohash-based approximate location on map
    - Submit button with loading state
    - Confirmation message after successful submission
    - _Requirements: 1.1, 1.4, 1.5, 1.8, 14.4_
  
  - [ ]* 9.7 Write unit tests for data collection flow
    - Test validation, online submission, offline storage
    - Test confirmation message display

- [ ] 10. Implement Play Integrity API integration
  - [ ] 10.1 Create `PlayIntegrityManager` for token generation
    - Implement `generateIntegrityToken(): String` using Play Integrity API
    - Handle API unavailability gracefully
    - _Requirements: 5.1_
  
  - [ ] 10.2 Add Play Integrity token to API requests
    - Include token in request headers for borewell submissions
    - _Requirements: 5.1_
  
  - [ ]* 10.3 Write property test for token inclusion
    - **Property 59: Play Integrity Token Inclusion**
    - **Validates: Requirements 5.1**


### Phase 5: Android Offline Sync Module

- [ ] 11. Implement WorkManager-based synchronization
  - [ ] 11.1 Create `SyncWorker` with exponential backoff
    - Implement `doWork()` to sync pending records
    - Query pending records ordered by timestamp (oldest first)
    - Implement exponential backoff: delay(n) = 30 * 2^(n-1) seconds
    - Update sync pending flag on success
    - Increment retry count on failure, notify user after 5 attempts
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.7_
  
  - [ ]* 11.2 Write property tests for sync behavior
    - **Property 6: Sync Prioritization by Age**
    - **Property 7: Exponential Backoff Timing**
    - **Property 8: Sync Success Clears Pending Flag**
    - **Validates: Requirements 2.2, 2.3, 2.7**
  
  - [ ] 11.3 Create `SyncManager` interface and implementation
    - Implement `scheduleSyncWork()` to schedule WorkManager job
    - Implement `getSyncStatus(): Flow<SyncStatus>` for UI updates
    - Implement `forceSyncNow()` for manual sync trigger
    - _Requirements: 2.1, 2.6_
  
  - [ ] 11.4 Add sync status indicator to UI
    - Display sync progress in app bar
    - Show pending count and last sync time
    - _Requirements: 2.6_
  
  - [ ]* 11.5 Write unit tests for sync worker
    - Test sync success, failure, retry logic
    - Test transaction-based sync operations

- [ ] 12. Checkpoint - Verify data collection and sync
  - Ensure all tests pass, ask the user if questions arise.


### Phase 6: API Gateway and Lambda Data Processor

- [ ] 13. Set up API Gateway with security configuration
  - Create REST API in AWS API Gateway
  - Configure Firebase JWT authorizer for authentication
  - Set up usage plans with rate limiting (100 requests/user/hour)
  - Configure CORS for mobile app origins only
  - Enable request validation with JSON schemas
  - Configure HTTPS-only enforcement
  - _Requirements: 3.1, 3.3, 3.5, 3.8_

- [ ] 14. Implement Lambda Data Processor function
  - [ ] 14.1 Create Lambda handler for borewell data processing
    - Parse and validate request payload
    - Load configuration from Parameter Store
    - _Requirements: 4.5, 20.1_
  
  - [ ] 14.2 Implement Play Integrity token validation
    - Validate token with Play Integrity API
    - Check device integrity verdict (MEETS_DEVICE_INTEGRITY or MEETS_BASIC_INTEGRITY)
    - Check app licensing status (LICENSED)
    - Cache validation results for 1 hour
    - Handle API unavailability (allow with manual review flag)
    - _Requirements: 5.2, 5.4, 5.5, 5.6, 5.7_
  
  - [ ]* 14.3 Write property tests for Play Integrity validation
    - **Property 60: Device Integrity Verdict Validation**
    - **Property 61: App Licensing Verification**
    - **Validates: Requirements 5.4, 5.5**
  
  - [ ] 14.4 Implement geohash and timestamp validation
    - Validate geohash format (6 characters, valid base32)
    - Validate timestamp within 7 days of current time
    - _Requirements: 4.1, 4.2_
  
  - [ ]* 14.5 Write property tests for validation logic
    - **Property 11: Geohash Format Validation**
    - **Property 12: Stale Data Rejection**
    - **Validates: Requirements 4.1, 4.2**
  
  - [ ] 14.6 Implement anti-spoofing check
    - Convert geohash to coordinates
    - Get IP geolocation from request context
    - Calculate distance between geohash location and IP location
    - Flag as suspicious if distance > 500km
    - _Requirements: 4.3, 4.4_
  
  - [ ]* 14.7 Write property test for anti-spoofing
    - **Property 13: Anti-Spoofing Flag**
    - **Validates: Requirements 4.4**
  
  - [ ] 14.8 Implement DynamoDB storage
    - Store record with partition key = geohash, sort key = timestamp
    - Include all fields: recordId, depth, yield, userId, waterStressLevel, suspicious, ipRegion
    - Compute and store water stress level for region
    - Return HTTP 201 with record ID on success
    - Return HTTP 500 on storage failure
    - _Requirements: 4.5, 4.6, 4.7, 4.8_
  
  - [ ] 14.9 Implement water stress level computation
    - Calculate normalized depth and yield
    - Apply formula: stress = (1 - normalized_depth) * 0.6 + (1 - normalized_yield) * 0.4
    - _Requirements: 4.6, 6.3_
  
  - [ ]* 14.10 Write property test for water stress computation
    - **Property 14: Water Stress Level Computation**
    - **Validates: Requirements 6.3**
  
  - [ ] 14.11 Implement error handling and logging
    - Handle validation errors (HTTP 400)
    - Handle suspicious activity (HTTP 403)
    - Handle database errors (HTTP 500)
    - Log all errors with request metadata
    - _Requirements: 3.6, 3.7, 17.7_
  
  - [ ]* 14.12 Write unit tests for Lambda handler
    - Test successful submission, validation failures, storage errors
    - Test error response formats

- [ ] 15. Create API Gateway endpoints
  - [ ] 15.1 Create POST /api/v1/borewell endpoint
    - Connect to Data Processor Lambda
    - Configure request/response schemas
    - _Requirements: 4.5_
  
  - [ ] 15.2 Implement request validation at API Gateway
    - Validate JWT token (HTTP 401 if missing/invalid)
    - Validate payload schema (HTTP 400 if invalid)
    - Check rate limits (HTTP 429 if exceeded)
    - _Requirements: 3.2, 3.4, 3.5, 3.6_
  
  - [ ]* 15.3 Write property tests for API Gateway validation
    - **Property 9: Unauthenticated Request Rejection**
    - **Property 10: Malformed Payload Rejection**
    - **Validates: Requirements 3.1, 3.5**

- [ ] 16. Checkpoint - Verify data submission flow end-to-end
  - Ensure all tests pass, ask the user if questions arise.


### Phase 7: Heatmap Visualization

- [ ] 17. Implement heatmap data aggregation Lambda
  - [ ] 17.1 Create Lambda handler for heatmap data queries
    - Accept bounds (lat/lon) as query parameters
    - Query DynamoDB for records within bounds
    - Group records by geohash
    - _Requirements: 6.1_
  
  - [ ] 17.2 Implement geohash clustering and averaging
    - Calculate average depth and yield for each geohash
    - Count samples per geohash
    - _Requirements: 6.2_
  
  - [ ]* 17.3 Write property test for geohash averaging
    - **Property 15: Geohash Cluster Averaging**
    - **Validates: Requirements 6.2**
  
  - [ ] 17.4 Implement water stress calculation for clusters
    - Apply water stress formula to averaged values
    - _Requirements: 6.3_
  
  - [ ] 17.5 Implement tile-based rendering for large datasets
    - Use tile rendering when region has > 1000 data points
    - _Requirements: 6.7_
  
  - [ ]* 17.6 Write unit tests for heatmap aggregation
    - Test clustering, averaging, stress calculation
    - Test tile-based rendering logic

- [ ] 18. Create GET /api/v1/heatmap endpoint
  - Connect to heatmap aggregation Lambda
  - Configure query parameter validation
  - _Requirements: 6.1_

- [ ] 19. Implement Android heatmap visualization
  - [ ] 19.1 Create `HeatmapViewModel` for data management
    - Fetch aggregated data from API
    - Manage loading and error states
    - Implement auto-refresh every 5 minutes when in foreground
    - _Requirements: 6.1, 6.6_
  
  - [ ] 19.2 Create `HeatmapDataSource` implementation
    - Implement `fetchAggregatedData()` with bounds
    - Implement caching with 30-minute expiration
    - _Requirements: 6.1, 6.8_
  
  - [ ] 19.3 Create `HeatmapRenderer` with Google Maps SDK
    - Display intensity gradient (green = low stress, red = high stress)
    - Implement tap handler to show popup with details
    - Display average depth, yield, and sample count in popup
    - _Requirements: 6.4, 6.5_
  
  - [ ] 19.4 Create heatmap Compose UI screen
    - Integrate Google Maps with heatmap overlay
    - Add refresh button and auto-refresh indicator
    - Handle loading and error states
    - _Requirements: 6.4, 6.6_
  
  - [ ]* 19.5 Write unit tests for heatmap UI logic
    - Test data fetching, caching, refresh logic
    - Test popup display on tap

- [ ] 20. Checkpoint - Verify heatmap visualization
  - Ensure all tests pass, ask the user if questions arise.


### Phase 8: Historical Data and Export

- [ ] 21. Implement historical data query Lambda
  - [ ] 21.1 Create Lambda handler for historical queries
    - Accept geohash, startDate, endDate, limit as parameters
    - Query DynamoDB with partition key and timestamp range
    - Sort results by timestamp descending
    - Implement pagination with 1000 record limit per request
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [ ]* 21.2 Write property test for historical data sorting
    - **Property 16: Historical Data Sorting**
    - **Validates: Requirements 7.3**
  
  - [ ] 21.3 Implement statistical summary computation
    - Calculate min, max, average, median for depth and yield
    - _Requirements: 7.6_
  
  - [ ]* 21.4 Write property test for statistical summaries
    - **Property 17: Statistical Summary Correctness**
    - **Validates: Requirements 7.6**
  
  - [ ] 21.5 Optimize query performance
    - Ensure queries complete within 2 seconds for 1-year range
    - _Requirements: 7.7_
  
  - [ ]* 21.6 Write unit tests for historical queries
    - Test query with various date ranges
    - Test pagination logic

- [ ] 22. Create GET /api/v1/history endpoint
  - Connect to historical query Lambda
  - Configure query parameter validation
  - _Requirements: 7.1_

- [ ] 23. Implement export generation Lambda
  - [ ] 23.1 Create Lambda handler for export requests
    - Accept geohashes, startDate, endDate, format (CSV/JSON) as parameters
    - Validate request (max 100,000 records)
    - Query DynamoDB for specified geohashes and date range
    - _Requirements: 15.1, 15.2, 15.7_
  
  - [ ] 23.2 Implement data aggregation for export
    - Aggregate by geohash and time period
    - Compute statistical summaries
    - _Requirements: 15.3, 15.4_
  
  - [ ]* 23.3 Write property tests for export aggregation
    - **Property 41: Export Data Aggregation**
    - **Property 42: Export Statistical Summaries**
    - **Validates: Requirements 15.3, 15.4**
  
  - [ ] 23.4 Implement CSV and JSON export generation
    - Generate file in requested format
    - Upload to S3 bucket with unique filename
    - Generate signed URL with 1-hour expiration
    - _Requirements: 15.2, 15.5, 15.6_
  
  - [ ]* 23.5 Write property test for signed URL generation
    - **Property 43: Signed URL Generation**
    - **Validates: Requirements 15.5, 15.6**
  
  - [ ] 23.6 Optimize export performance
    - Complete generation within 30 seconds for up to 10,000 records
    - _Requirements: 15.8_
  
  - [ ]* 23.7 Write unit tests for export generation
    - Test CSV and JSON formats
    - Test S3 upload and signed URL generation

- [ ] 24. Create POST /api/v1/export endpoint
  - Connect to export generation Lambda
  - Configure request validation
  - _Requirements: 15.1_


### Phase 9: Alert Detection and Notifications

- [ ] 25. Implement Alert Scheduler Lambda
  - [ ] 25.1 Create Lambda handler for alert detection
    - Query DynamoDB for all geohash regions with data in last 30 days
    - Process regions in batches of 50
    - _Requirements: 8.1, 8.2_
  
  - [ ] 25.2 Implement depth comparison logic
    - Calculate average depth for days 1-7 (recent)
    - Calculate average depth for days 8-30 (baseline)
    - Compute percentage decrease: (baseline - recent) / baseline * 100
    - _Requirements: 8.3_
  
  - [ ]* 25.3 Write property test for alert depth comparison
    - **Property 18: Alert Depth Comparison**
    - **Validates: Requirements 8.3**
  
  - [ ] 25.4 Implement alert threshold checking
    - Load threshold from configuration (default 15%)
    - Create alert record when threshold exceeded
    - _Requirements: 8.4, 20.2_
  
  - [ ]* 25.5 Write property test for alert triggering
    - **Property 19: Alert Threshold Triggering**
    - **Validates: Requirements 8.4**
  
  - [ ] 25.6 Implement affected user identification
    - Query users who submitted data in affected geohash (last 30 days)
    - _Requirements: 8.5_
  
  - [ ]* 25.7 Write property test for user identification
    - **Property 20: Alert User Identification**
    - **Validates: Requirements 8.5**
  
  - [ ] 25.8 Implement FCM notification payload creation
    - Include geohash, depth change percentage, timestamp, recommended actions
    - Send payload to FCM notifier
    - _Requirements: 8.6, 8.7_
  
  - [ ]* 25.9 Write property test for notification payload
    - **Property 21: Alert Notification Payload Completeness**
    - **Validates: Requirements 8.6, 8.7**
  
  - [ ] 25.10 Implement alert logging
    - Store alert records in DynamoDB Alerts table
    - Log all alert events for audit trail
    - _Requirements: 8.4, 8.8_
  
  - [ ]* 25.11 Write unit tests for alert scheduler
    - Test depth comparison, threshold checking, user identification
    - Test alert creation and logging

- [ ] 26. Set up EventBridge cron schedule
  - Create EventBridge rule with cron expression `cron(0 2 * * ? *)` (2 AM daily)
  - Connect to Alert Scheduler Lambda
  - _Requirements: 8.1_

- [ ] 27. Implement FCM notification service
  - [ ] 27.1 Create FCM notifier Lambda function
    - Parse alert payload
    - Format notification with title, body, data fields
    - Set high priority for immediate delivery
    - Include deep link to heatmap view centered on affected geohash
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [ ]* 27.2 Write property test for notification formatting
    - **Property 22: Notification Formatting Completeness**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
  
  - [ ] 27.3 Implement notification delivery with retry
    - Send to all device tokens for affected users
    - Retry up to 3 times with 1-minute intervals on failure
    - _Requirements: 9.2, 9.5_
  
  - [ ] 27.4 Implement invalid token removal
    - Remove device tokens after permanent delivery failure
    - _Requirements: 9.6_
  
  - [ ]* 27.5 Write property test for token removal
    - **Property 23: Invalid Token Removal**
    - **Validates: Requirements 9.6**
  
  - [ ] 27.6 Implement notification status tracking
    - Store delivery status in DynamoDB
    - _Requirements: 9.7_
  
  - [ ]* 27.7 Write property test for status tracking
    - **Property 24: Notification Status Tracking**
    - **Validates: Requirements 9.7**
  
  - [ ]* 27.8 Write unit tests for FCM notifier
    - Test notification formatting, delivery, retry, token removal

- [ ] 28. Implement Android notification handling
  - [ ] 28.1 Create FCM service in Android app
    - Handle incoming notifications
    - Display in system tray with alert icon
    - _Requirements: 9.8_
  
  - [ ] 28.2 Implement deep link navigation
    - Parse deep link from notification data
    - Navigate to heatmap view centered on affected geohash
    - _Requirements: 9.4_
  
  - [ ]* 28.3 Write unit tests for notification handling
    - Test notification display and deep link navigation

- [ ] 29. Checkpoint - Verify alert and notification system
  - Ensure all tests pass, ask the user if questions arise.


### Phase 10: AI Recommendation Engine

- [ ] 30. Implement weather data integration
  - [ ] 30.1 Create weather API client for Open-Meteo
    - Implement `fetchWeatherData(lat, lon, startDate, endDate)` method
    - Parse daily precipitation, temperature, evapotranspiration
    - _Requirements: 11.2, 11.3_
  
  - [ ] 30.2 Implement weather data aggregation
    - Calculate total rainfall for period
    - Calculate average temperature
    - _Requirements: 11.4_
  
  - [ ]* 30.3 Write property test for weather aggregation
    - **Property 30: Weather Data Aggregation**
    - **Validates: Requirements 11.4**
  
  - [ ] 30.4 Implement weather data caching
    - Cache data for each geohash region for 24 hours
    - Use cached data when API unavailable
    - _Requirements: 11.5, 11.6_
  
  - [ ] 30.5 Implement fallback for API unavailability
    - Generate recommendations without weather context if no cache
    - Notify user of missing weather data
    - _Requirements: 11.7_
  
  - [ ]* 30.6 Write unit tests for weather integration
    - Test API calls, aggregation, caching, fallback

- [ ] 31. Implement satellite data integration
  - [ ] 31.1 Create satellite API client for NASA GLDAS
    - Implement `fetchSatelliteData(lat, lon, startDate, endDate)` method
    - Parse soil moisture and groundwater storage anomaly
    - _Requirements: 12.1, 12.2_
  
  - [ ] 31.2 Implement satellite data normalization
    - Normalize values to [0, 1] scale
    - _Requirements: 12.3_
  
  - [ ]* 31.3 Write property test for data normalization
    - **Property 31: Satellite Data Normalization**
    - **Validates: Requirements 12.3**
  
  - [ ] 31.4 Implement satellite data caching
    - Cache data for each geohash region for 7 days
    - _Requirements: 12.4_
  
  - [ ] 31.5 Implement rate limit handling
    - Queue requests to respect API rate limits
    - _Requirements: 12.5_
  
  - [ ] 31.6 Implement nearest grid point fallback
    - Use nearest available data within 50km if no data for exact coordinates
    - _Requirements: 12.6_
  
  - [ ] 31.7 Include data source timestamp in metadata
    - Store timestamp of source data in recommendation
    - _Requirements: 12.7_
  
  - [ ]* 31.8 Write property test for metadata timestamp
    - **Property 32: Recommendation Metadata Timestamp**
    - **Validates: Requirements 12.7**
  
  - [ ]* 31.9 Write unit tests for satellite integration
    - Test API calls, normalization, caching, fallback

- [ ] 32. Implement Recommendation Engine Lambda
  - [ ] 32.1 Create Lambda handler for recommendation requests
    - Accept geohash as parameter
    - Fetch recent borewell data from DynamoDB (last 30 days)
    - Convert geohash to lat/lon coordinates
    - _Requirements: 10.1, 11.1_
  
  - [ ]* 32.2 Write property test for geohash to coordinate conversion
    - **Property 29: Geohash to Coordinate Conversion**
    - **Validates: Requirements 11.1**
  
  - [ ] 32.3 Orchestrate multi-source data collection
    - Fetch weather data (90 days)
    - Fetch satellite data
    - _Requirements: 10.2, 10.3_
  
  - [ ] 32.4 Construct AI prompt with all data sources
    - Include borewell depth, yield, sample count
    - Include rainfall, temperature
    - Include soil moisture, groundwater anomaly
    - Include region characteristics
    - _Requirements: 10.4_
  
  - [ ]* 32.5 Write property test for prompt data completeness
    - **Property 25: AI Prompt Data Completeness**
    - **Validates: Requirements 10.4**
  
  - [ ] 32.6 Implement Gemini API integration
    - Send structured request with output schema
    - Request at least 3 recharge techniques
    - Set 30-second timeout
    - _Requirements: 10.5, 10.6, 10.9_
  
  - [ ]* 32.7 Write property test for minimum techniques
    - **Property 26: Minimum Recommendation Techniques**
    - **Validates: Requirements 10.6**
  
  - [ ] 32.8 Implement response validation and parsing
    - Validate JSON schema with required fields
    - Parse unstructured text if needed
    - Ensure each technique has name, description, cost, steps
    - _Requirements: 10.7, 18.2, 18.4_
  
  - [ ]* 32.9 Write property tests for response validation
    - **Property 49: AI Response Schema Validation**
    - **Property 50: Unstructured Response Parsing**
    - **Property 51: Minimum Implementation Steps**
    - **Validates: Requirements 18.2, 18.4, 18.5**
  
  - [ ] 32.10 Store recommendation in DynamoDB
    - Store with partition key = geohash, sort key = generatedAt
    - Include all techniques and data source metadata
    - _Requirements: 10.8_
  
  - [ ]* 32.11 Write property test for recommendation storage
    - **Property 27: Recommendation Storage with Keys**
    - **Validates: Requirements 10.8**
  
  - [ ] 32.12 Implement error handling for AI API
    - Return cached recommendations if API unavailable
    - Implement exponential backoff for retries
    - Handle timeouts and rate limits
    - _Requirements: 10.9_
  
  - [ ]* 32.13 Write unit tests for recommendation engine
    - Test data collection, prompt construction, API integration
    - Test response parsing, storage, error handling

- [ ] 33. Create POST /api/v1/recommendations endpoint
  - Connect to Recommendation Engine Lambda
  - Configure request validation
  - _Requirements: 10.1_

- [ ] 34. Implement Android recommendations UI
  - [ ] 34.1 Create `RecommendationsViewModel`
    - Fetch recommendations from API
    - Manage loading and error states
    - Handle feedback (helpful/not helpful votes)
    - _Requirements: 10.10, 18.8_
  
  - [ ] 34.2 Create recommendations Compose UI screen
    - Display techniques with visual hierarchy
    - Show technique name, description, cost, implementation steps
    - Use headings and bullet points for readability
    - Provide save for offline viewing option
    - Add helpful/not helpful feedback buttons
    - _Requirements: 10.10, 18.6, 18.7, 18.8_
  
  - [ ]* 34.3 Write property test for recommendation display
    - **Property 28: Recommendation Display Completeness**
    - **Validates: Requirements 10.10**
  
  - [ ]* 34.4 Write unit tests for recommendations UI
    - Test data fetching, display, feedback handling

- [ ] 35. Checkpoint - Verify AI recommendation system
  - Ensure all tests pass, ask the user if questions arise.


### Phase 11: Security and Input Validation

- [ ] 36. Implement comprehensive input validation
  - [ ] 36.1 Enhance API Gateway schema validation
    - Define JSON schemas for all endpoints
    - Reject requests with invalid schemas
    - _Requirements: 3.5, 17.3_
  
  - [ ] 36.2 Implement malicious input detection
    - Check for SQL keywords (SELECT, DROP, INSERT, UPDATE, DELETE)
    - Check for HTML script tags
    - Check for shell command characters (;, |, &, $)
    - Reject inputs containing malicious patterns
    - _Requirements: 17.6_
  
  - [ ]* 36.3 Write property test for malicious input rejection
    - **Property 48: Malicious Input Rejection**
    - **Validates: Requirements 17.6**
  
  - [ ] 36.4 Implement parameterized DynamoDB queries
    - Use parameterized queries for all database operations
    - _Requirements: 17.4_
  
  - [ ] 36.5 Log validation violations
    - Log all rejected inputs with request metadata
    - _Requirements: 17.7_
  
  - [ ]* 36.6 Write unit tests for input validation
    - Test numeric range validation, text sanitization
    - Test malicious input detection

- [ ] 37. Implement GPS field rejection at API Gateway
  - [ ] 37.1 Add validation rule to reject lat/lon fields
    - Reject requests containing "latitude", "longitude", "lat", "lon" fields
    - Return HTTP 400 with error message
    - _Requirements: 14.7_
  
  - [ ]* 37.2 Write property test for GPS field rejection
    - **Property 40: GPS Field Rejection**
    - **Validates: Requirements 14.7**

- [ ] 38. Implement geohash precision enforcement
  - [ ] 38.1 Add validation for geohash precision
    - Verify all geohashes are exactly 6 characters
    - Reject submissions with different precision levels
    - _Requirements: 14.2_
  
  - [ ]* 38.2 Write property test for precision enforcement
    - **Property 39: Geohash Precision Enforcement**
    - **Validates: Requirements 14.2**


### Phase 12: Configuration Management and Utilities

- [ ] 39. Implement configuration management system
  - [ ] 39.1 Create configuration loader for Lambda functions
    - Load configuration from AWS Systems Manager Parameter Store
    - Cache configuration values for 5 minutes
    - Support environment-specific values (dev, staging, prod)
    - _Requirements: 20.1, 20.2, 20.3, 20.5_
  
  - [ ]* 39.2 Write property tests for configuration management
    - **Property 56: Configuration Completeness**
    - **Property 57: Environment-Specific Configuration**
    - **Validates: Requirements 20.2, 20.5**
  
  - [ ] 39.3 Implement configuration validation
    - Validate all loaded values (no negative numbers, valid URLs, in-range thresholds)
    - Use predefined defaults for invalid values
    - _Requirements: 20.6_
  
  - [ ]* 39.4 Write property test for invalid configuration defaults
    - **Property 58: Invalid Configuration Defaults**
    - **Validates: Requirements 20.6**
  
  - [ ] 39.5 Implement configuration reload on change
    - Reload values after cache expiration
    - _Requirements: 20.4_
  
  - [ ] 39.6 Log configuration load events
    - Log all configuration loads for audit trail
    - _Requirements: 20.7_
  
  - [ ]* 39.7 Write unit tests for configuration management
    - Test loading, caching, validation, defaults

- [ ] 40. Implement pretty printer for borewell records
  - [ ] 40.1 Create pretty printer function
    - Format borewell records as human-readable text
    - Include labeled fields: depth (meters), yield (L/h), geohash, timestamp
    - Format timestamp in ISO 8601 with timezone
    - Round numeric values to 2 decimal places
    - _Requirements: 19.2, 19.3, 19.4, 19.5_
  
  - [ ]* 40.2 Write property tests for pretty printer
    - **Property 52: Pretty Printer Field Completeness**
    - **Property 53: ISO 8601 Timestamp Formatting**
    - **Property 54: Numeric Precision Rounding**
    - **Property 55: Pretty Printer Round-Trip**
    - **Validates: Requirements 19.2, 19.3, 19.4, 19.5, 19.7**
  
  - [ ] 40.3 Use pretty printer in Android app
    - Display record details using pretty printer output
    - _Requirements: 19.6_
  
  - [ ]* 40.4 Write unit tests for pretty printer
    - Test formatting, round-trip parsing

- [ ] 41. Checkpoint - Verify security and utilities
  - Ensure all tests pass, ask the user if questions arise.


### Phase 13: System Monitoring and Health Checks

- [ ] 42. Implement health check system
  - [ ] 42.1 Create health check Lambda function
    - Expose health check endpoint
    - Verify DynamoDB connectivity
    - Verify AI Engine API availability
    - Verify Weather API connectivity
    - Verify Satellite API connectivity
    - _Requirements: 16.1, 16.2, 16.3, 16.4_
  
  - [ ]* 42.2 Write property test for health check dependencies
    - **Property 44: Health Check Dependency Verification**
    - **Validates: Requirements 16.2, 16.3, 16.4**
  
  - [ ] 42.3 Implement health check response logic
    - Return HTTP 200 when all dependencies healthy
    - Return HTTP 503 with failure details when any dependency fails
    - _Requirements: 16.5, 16.6_
  
  - [ ] 42.4 Implement health check monitoring
    - Send notification to administrators after 3 consecutive failures
    - _Requirements: 16.7_
  
  - [ ]* 42.5 Write unit tests for health check
    - Test all dependency checks, response codes
    - Test failure notification logic

- [ ] 43. Implement CloudWatch metrics and alarms
  - [ ] 43.1 Publish custom CloudWatch metrics
    - Publish request count, latency, error rate for all Lambda functions
    - _Requirements: 16.8_
  
  - [ ] 43.2 Create CloudWatch alarms
    - Error rate alarm (> 5% over 5 minutes)
    - Latency alarm (p99 > 2 seconds)
    - DynamoDB throttling alarm
    - Failed health check alarm (3 consecutive failures)
    - _Requirements: 16.8_
  
  - [ ] 43.3 Configure alarm notifications
    - Send notifications to SNS topic for administrator alerts
    - _Requirements: 16.7_
  
  - [ ]* 43.4 Write unit tests for metrics publishing
    - Test metric data format and publishing

- [ ] 44. Implement structured logging
  - [ ] 44.1 Configure structured logging for all Lambda functions
    - Use JSON format with correlation IDs
    - Set appropriate log levels (DEBUG for dev, INFO for staging, WARN/ERROR for prod)
    - Never log sensitive data (JWT tokens, raw GPS, phone numbers)
    - _Requirements: 3.7_
  
  - [ ] 44.2 Configure log retention
    - 30 days for application logs
    - 90 days for security logs
    - _Requirements: 3.7_
  
  - [ ]* 44.3 Write unit tests for logging
    - Test log format, correlation IDs
    - Verify no sensitive data in logs


### Phase 14: Integration and End-to-End Testing

- [ ] 45. Implement integration tests for API endpoints
  - [ ]* 45.1 Write integration tests for POST /api/v1/borewell
    - Test successful submission with valid data
    - Test authentication failures (HTTP 401)
    - Test rate limiting (HTTP 429)
    - Test validation failures (HTTP 400)
    - Test Play Integrity validation
  
  - [ ]* 45.2 Write integration tests for GET /api/v1/heatmap
    - Test data aggregation and clustering
    - Test water stress calculation
    - Test tile-based rendering
  
  - [ ]* 45.3 Write integration tests for GET /api/v1/history
    - Test query with various date ranges
    - Test pagination
    - Test statistical summaries
  
  - [ ]* 45.4 Write integration tests for POST /api/v1/export
    - Test CSV and JSON export generation
    - Test S3 upload and signed URL
    - Test export limits
  
  - [ ]* 45.5 Write integration tests for POST /api/v1/recommendations
    - Test multi-source data collection
    - Test AI API integration
    - Test response parsing and storage

- [ ] 46. Implement Android instrumentation tests
  - [ ]* 46.1 Write instrumentation tests for Room database
    - Test all DAO operations
    - Test database migrations
  
  - [ ]* 46.2 Write instrumentation tests for WorkManager sync
    - Test sync worker execution
    - Test retry logic and exponential backoff
  
  - [ ]* 46.3 Write UI tests for critical user flows
    - Test authentication flow (phone number, OTP)
    - Test borewell data submission (online and offline)
    - Test heatmap visualization
    - Test recommendations display

- [ ] 47. Implement end-to-end tests
  - [ ]* 47.1 Write E2E test for data submission flow
    - User authenticates → submits borewell data → data appears in heatmap
  
  - [ ]* 47.2 Write E2E test for offline sync flow
    - User submits data offline → network restored → data syncs → appears in heatmap
  
  - [ ]* 47.3 Write E2E test for alert flow
    - Multiple submissions show depth drop → alert triggered → notification delivered
  
  - [ ]* 47.4 Write E2E test for recommendations flow
    - User requests recommendations → AI generates response → recommendations displayed
  
  - [ ]* 47.5 Write E2E test for export flow
    - User requests export → file generated → signed URL returned → file downloadable

- [ ] 48. Checkpoint - Verify all integration and E2E tests
  - Ensure all tests pass, ask the user if questions arise.


### Phase 15: Performance Optimization and Security Hardening

- [ ] 49. Optimize Lambda function performance
  - [ ] 49.1 Implement connection pooling for DynamoDB
    - Reuse DynamoDB client connections across invocations
    - Configure appropriate connection pool sizes
  
  - [ ] 49.2 Optimize cold start times
    - Minimize Lambda package sizes
    - Use Lambda layers for shared dependencies
    - Configure provisioned concurrency for critical functions
  
  - [ ] 49.3 Implement caching strategies
    - Cache Play Integrity validation results (1 hour)
    - Cache weather data (24 hours)
    - Cache satellite data (7 days)
    - Cache configuration (5 minutes)
  
  - [ ]* 49.4 Write performance tests
    - Test Lambda execution times under load
    - Verify query performance (< 2 seconds for 1-year range)
    - Verify export generation (< 30 seconds for 10,000 records)

- [ ] 50. Implement security hardening measures
  - [ ] 50.1 Configure IAM roles with least privilege
    - Create separate IAM roles for each Lambda function
    - Grant only necessary permissions for DynamoDB, S3, Secrets Manager
  
  - [ ] 50.2 Enable encryption at rest
    - Enable DynamoDB encryption with AWS KMS
    - Enable S3 bucket encryption
  
  - [ ] 50.3 Enable encryption in transit
    - Enforce HTTPS-only for all API endpoints
    - Use TLS 1.2+ for all external API calls
  
  - [ ] 50.4 Implement API key rotation
    - Set up automatic rotation for external API keys in Secrets Manager
  
  - [ ]* 50.5 Run security vulnerability scan
    - Scan all dependencies for known vulnerabilities
    - Update vulnerable packages

- [ ] 51. Optimize Android app performance
  - [ ] 51.1 Implement efficient data loading
    - Use pagination for large data sets
    - Implement lazy loading for heatmap tiles
  
  - [ ] 51.2 Optimize battery usage
    - Use WorkManager constraints (network, battery)
    - Batch sync operations
    - Reduce location updates frequency
  
  - [ ] 51.3 Optimize memory usage
    - Implement proper lifecycle management for ViewModels
    - Clear cached data when memory pressure detected
  
  - [ ]* 51.4 Run performance profiling
    - Profile app startup time
    - Profile memory usage
    - Profile network usage


### Phase 16: Deployment and Documentation

- [ ] 52. Set up CI/CD pipeline
  - [ ] 52.1 Configure GitHub Actions workflow
    - Run linters (ktlint, pylint)
    - Run unit tests with coverage reporting
    - Run property-based tests (100 iterations)
    - Run integration tests
    - Build Android APK
    - Package Lambda functions
    - Run security vulnerability scanning
  
  - [ ] 52.2 Configure deployment to staging
    - Deploy Lambda functions to staging environment
    - Deploy API Gateway configuration
    - Run E2E tests against staging
  
  - [ ] 52.3 Configure deployment to production
    - Require manual approval for production deployment
    - Deploy with blue-green deployment strategy
    - Monitor CloudWatch alarms post-deployment
  
  - [ ] 52.4 Set up automated rollback
    - Configure automatic rollback on alarm triggers

- [ ] 53. Create deployment documentation
  - [ ] 53.1 Document infrastructure setup
    - AWS account setup and IAM configuration
    - DynamoDB table creation and configuration
    - API Gateway setup and security configuration
    - Lambda function deployment process
  
  - [ ] 53.2 Document Android app deployment
    - Build and signing configuration
    - Play Store submission process
    - Firebase and Play Integrity setup
  
  - [ ] 53.3 Document configuration management
    - Parameter Store configuration values
    - Environment-specific settings
    - API key management and rotation
  
  - [ ] 53.4 Document monitoring and alerting
    - CloudWatch metrics and alarms
    - Log aggregation and analysis
    - Incident response procedures

- [ ] 54. Create user documentation
  - [ ] 54.1 Create user guide for Android app
    - Authentication and account setup
    - Submitting borewell data
    - Viewing heatmap and historical data
    - Understanding recommendations
    - Managing notifications
  
  - [ ] 54.2 Create API documentation
    - API endpoint specifications
    - Authentication requirements
    - Request/response formats
    - Error codes and handling
    - Rate limits and quotas

- [ ] 55. Final checkpoint - Complete system verification
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all 61 correctness properties are tested
  - Verify all requirements are covered by implementation
  - Verify deployment documentation is complete


## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties across all inputs (100+ iterations each)
- Unit tests validate specific examples, edge cases, and integration points
- The implementation uses Kotlin for Android (Jetpack Compose, Room, WorkManager) and Python for Lambda functions
- All 61 correctness properties from the design document are covered by property-based tests
- Integration and E2E tests verify complete user flows and system behavior
- Security is implemented at multiple layers: Firebase Auth, Play Integrity, API Gateway validation, input sanitization
- Performance optimizations include caching, connection pooling, and efficient data loading
- The system is designed for offline-first operation with automatic synchronization
- Privacy is protected through geohash-based location obfuscation (no raw GPS coordinates stored or transmitted)

## Implementation Order Rationale

1. **Phase 1-2**: Infrastructure and core utilities provide the foundation for all other components
2. **Phase 3-5**: Android app core functionality (auth, data collection, sync) enables data submission
3. **Phase 6**: Backend data processing enables storage and retrieval of submitted data
4. **Phase 7-8**: Visualization and historical data provide value to users from collected data
5. **Phase 9**: Alerts add proactive monitoring capabilities
6. **Phase 10**: AI recommendations provide actionable intelligence
7. **Phase 11-12**: Security hardening and utilities ensure production readiness
8. **Phase 13**: Monitoring enables operational visibility
9. **Phase 14**: Integration testing validates complete system behavior
10. **Phase 15**: Performance optimization and security hardening prepare for scale
11. **Phase 16**: Deployment and documentation enable production launch

Each phase builds on previous phases, with checkpoints to validate functionality before proceeding to dependent components.
