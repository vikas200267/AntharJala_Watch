# Requirements Document

## Introduction

Anthar-Jala Watch is a production-grade civic-tech groundwater monitoring platform designed for NGOs and government agencies managing rural groundwater resources. The system enables crowdsourced borewell data collection through an Android application, provides real-time visualization of water stress levels, delivers predictive alerts for declining groundwater levels, and generates AI-powered recharge recommendations using satellite data, weather patterns, and local borewell measurements.

The platform implements a 5-layer architecture: Android mobile application, API Gateway security layer, AWS Lambda processing, DynamoDB storage, and AI/external API integration layer. The system prioritizes user privacy through geohash-based location obfuscation, offline-first operation for rural connectivity, and comprehensive security measures including device integrity verification and anti-spoofing controls.

## Glossary

- **Android_App**: The mobile application built with Jetpack Compose using Clean Architecture pattern
- **API_Gateway**: AWS API Gateway service providing security, throttling, and routing
- **Lambda_Processor**: AWS Lambda functions handling business logic and data processing
- **DynamoDB_Store**: AWS DynamoDB database storing borewell measurements and user data
- **AI_Engine**: Gemini API integration for generating groundwater recharge recommendations
- **Borewell_Record**: A data entry containing depth, yield, timestamp, and geohash location
- **Geohash**: Privacy-preserving location encoding that obscures exact GPS coordinates
- **Heatmap_Renderer**: Google Maps SDK component displaying water stress intensity
- **Sync_Manager**: WorkManager component handling offline-to-online data synchronization
- **Alert_Scheduler**: Lambda cron job detecting groundwater level changes
- **Play_Integrity_Validator**: Google Play Integrity API for device authenticity verification
- **FCM_Notifier**: Firebase Cloud Messaging service for push notifications
- **Weather_API**: Open-Meteo service providing rainfall and climate data
- **Satellite_API**: NASA GLDAS service providing soil moisture and groundwater data
- **Room_Database**: Local SQLite database for offline data storage
- **Water_Stress_Level**: Computed metric indicating groundwater availability in a region
- **Recharge_Recommendation**: AI-generated advice for improving groundwater levels
- **Depth_Drop_Threshold**: 15% decrease in water depth triggering alert notifications

## Requirements

### Requirement 1: Borewell Data Collection

**User Story:** As a rural community member, I want to log borewell depth and yield measurements through my Android phone, so that I can contribute to groundwater monitoring without revealing my exact location.

#### Acceptance Criteria

1. THE Android_App SHALL provide input fields for borewell depth in meters and yield in liters per hour
2. WHEN a user submits borewell data, THE Android_App SHALL capture the current timestamp
3. WHEN a user submits borewell data, THE Android_App SHALL convert GPS coordinates to geohash with precision level 6
4. THE Android_App SHALL validate that depth values are positive numbers between 0 and 500 meters
5. THE Android_App SHALL validate that yield values are positive numbers between 0 and 50000 liters per hour
6. WHEN network connectivity is unavailable, THE Android_App SHALL store Borewell_Record in Room_Database
7. WHEN a Borewell_Record is saved offline, THE Android_App SHALL mark it with sync pending status
8. THE Android_App SHALL display confirmation message after successful data entry

### Requirement 2: Offline-First Data Synchronization

**User Story:** As a user in a rural area with intermittent connectivity, I want my borewell data to be saved locally and synced automatically when internet is available, so that I can log data anytime without losing information.

#### Acceptance Criteria

1. WHEN network connectivity is restored, THE Sync_Manager SHALL automatically initiate synchronization of pending Borewell_Record entries
2. THE Sync_Manager SHALL use exponential backoff strategy with initial delay of 30 seconds for failed sync attempts
3. WHEN synchronization succeeds, THE Sync_Manager SHALL remove the sync pending status from Borewell_Record
4. WHEN synchronization fails after 5 retry attempts, THE Sync_Manager SHALL notify the user of sync failure
5. THE Sync_Manager SHALL preserve data integrity by using transaction-based sync operations
6. WHILE synchronization is in progress, THE Android_App SHALL display sync status indicator
7. THE Sync_Manager SHALL prioritize syncing older Borewell_Record entries first

### Requirement 3: API Gateway Security and Validation

**User Story:** As a system administrator, I want all incoming API requests to be authenticated and validated, so that the platform is protected from unauthorized access and malicious data.

#### Acceptance Criteria

1. THE API_Gateway SHALL require Firebase Authentication JWT token for all data submission endpoints
2. WHEN an unauthenticated request is received, THE API_Gateway SHALL return HTTP 401 status code
3. THE API_Gateway SHALL implement rate limiting of 100 requests per user per hour
4. WHEN rate limit is exceeded, THE API_Gateway SHALL return HTTP 429 status code
5. THE API_Gateway SHALL validate request payload schema before forwarding to Lambda_Processor
6. WHEN payload validation fails, THE API_Gateway SHALL return HTTP 400 status code with error details
7. THE API_Gateway SHALL log all request metadata for security auditing
8. THE API_Gateway SHALL enforce HTTPS-only communication

### Requirement 4: Borewell Data Processing and Storage

**User Story:** As a data analyst, I want borewell submissions to be validated and stored reliably, so that I can trust the data quality for analysis and visualization.

#### Acceptance Criteria

1. WHEN Lambda_Processor receives a Borewell_Record, THE Lambda_Processor SHALL verify geohash format validity
2. THE Lambda_Processor SHALL check that timestamp is within 7 days of current time to prevent stale data
3. THE Lambda_Processor SHALL compare geohash-derived region with IP address region for anti-spoofing
4. IF geohash region and IP region differ by more than 500 kilometers, THEN THE Lambda_Processor SHALL flag the record as suspicious
5. WHEN validation passes, THE Lambda_Processor SHALL store Borewell_Record in DynamoDB_Store with partition key as geohash and sort key as timestamp
6. THE Lambda_Processor SHALL compute and store Water_Stress_Level for the geohash region after each new entry
7. WHEN storage succeeds, THE Lambda_Processor SHALL return HTTP 201 status code with record ID
8. IF storage fails, THEN THE Lambda_Processor SHALL return HTTP 500 status code and log error details

### Requirement 5: Device Integrity Verification

**User Story:** As a security engineer, I want to verify that data submissions come from genuine Android devices, so that the platform is protected from automated bots and spoofed submissions.

#### Acceptance Criteria

1. WHEN Android_App submits data, THE Android_App SHALL include Play Integrity API token in request headers
2. THE Lambda_Processor SHALL validate Play Integrity API token before processing Borewell_Record
3. WHEN Play Integrity validation fails, THE Lambda_Processor SHALL reject the submission with HTTP 403 status code
4. THE Lambda_Processor SHALL verify device integrity verdict is MEETS_DEVICE_INTEGRITY or MEETS_BASIC_INTEGRITY
5. THE Lambda_Processor SHALL verify app licensing status is LICENSED
6. THE Lambda_Processor SHALL cache validation results for 1 hour to reduce API calls
7. WHEN Play Integrity API is unavailable, THE Lambda_Processor SHALL allow submission but flag for manual review

### Requirement 6: Heatmap Visualization

**User Story:** As a groundwater manager, I want to view a color-coded heatmap of water stress levels across regions, so that I can identify areas requiring immediate intervention.

#### Acceptance Criteria

1. THE Heatmap_Renderer SHALL fetch aggregated borewell data grouped by geohash from API_Gateway
2. THE Heatmap_Renderer SHALL compute average depth and yield for each geohash cluster
3. THE Heatmap_Renderer SHALL calculate Water_Stress_Level using formula: stress = (1 - normalized_depth) * 0.6 + (1 - normalized_yield) * 0.4
4. THE Heatmap_Renderer SHALL display intensity gradient from green (low stress) to red (high stress) on Google Maps
5. WHEN a user taps a heatmap region, THE Heatmap_Renderer SHALL display popup with average depth, yield, and sample count
6. THE Heatmap_Renderer SHALL refresh heatmap data every 5 minutes when app is in foreground
7. THE Heatmap_Renderer SHALL use tile-based rendering for regions with more than 1000 data points
8. THE Heatmap_Renderer SHALL cache heatmap tiles for 30 minutes to reduce network usage

### Requirement 7: Historical Data Retrieval

**User Story:** As a researcher, I want to query historical borewell data for specific regions and time periods, so that I can analyze groundwater trends over time.

#### Acceptance Criteria

1. THE API_Gateway SHALL provide endpoint accepting geohash, start date, and end date parameters
2. THE Lambda_Processor SHALL query DynamoDB_Store using geohash partition key and timestamp range
3. THE Lambda_Processor SHALL return Borewell_Record entries sorted by timestamp in descending order
4. THE Lambda_Processor SHALL limit results to 1000 records per request
5. WHEN result count exceeds 1000, THE Lambda_Processor SHALL provide pagination token
6. THE Lambda_Processor SHALL compute statistical summary including min, max, average, and median for depth and yield
7. THE Lambda_Processor SHALL return results within 2 seconds for queries spanning up to 1 year

### Requirement 8: Predictive Alert Detection

**User Story:** As a community leader, I want to receive automatic alerts when groundwater levels drop significantly in my area, so that I can take timely action to address water scarcity.

#### Acceptance Criteria

1. THE Alert_Scheduler SHALL run every 24 hours using AWS EventBridge cron schedule
2. WHEN Alert_Scheduler executes, THE Alert_Scheduler SHALL query DynamoDB_Store for all geohash regions with data from last 30 days
3. FOR each geohash region, THE Alert_Scheduler SHALL compare average depth from last 7 days with average depth from previous 23 days
4. WHEN depth decrease exceeds Depth_Drop_Threshold, THE Alert_Scheduler SHALL create alert record in DynamoDB_Store
5. THE Alert_Scheduler SHALL identify all users who submitted data in the affected geohash region
6. THE Alert_Scheduler SHALL send alert notification to FCM_Notifier with region details and depth change percentage
7. THE Alert_Scheduler SHALL include timestamp of detection and recommended actions in alert payload
8. THE Alert_Scheduler SHALL log all alert events for audit trail

### Requirement 9: Push Notification Delivery

**User Story:** As a user, I want to receive push notifications on my phone when groundwater alerts are issued for my area, so that I stay informed about water availability changes.

#### Acceptance Criteria

1. WHEN FCM_Notifier receives alert payload, THE FCM_Notifier SHALL format notification with title, body, and data fields
2. THE FCM_Notifier SHALL send notification to all device tokens associated with affected users
3. THE FCM_Notifier SHALL set notification priority to high for immediate delivery
4. THE FCM_Notifier SHALL include deep link to heatmap view centered on affected geohash
5. WHEN notification delivery fails, THE FCM_Notifier SHALL retry up to 3 times with 1 minute intervals
6. THE FCM_Notifier SHALL remove invalid device tokens after permanent delivery failure
7. THE FCM_Notifier SHALL track notification delivery status in DynamoDB_Store
8. THE Android_App SHALL display notification in system tray with alert icon

### Requirement 10: AI-Powered Recharge Recommendations

**User Story:** As a farmer, I want to receive personalized recommendations for improving groundwater levels in my area, so that I can implement effective recharge solutions.

#### Acceptance Criteria

1. WHEN a user requests recommendations for a geohash region, THE Lambda_Processor SHALL fetch recent Borewell_Record data for that region
2. THE Lambda_Processor SHALL query Weather_API for rainfall data from last 90 days for the region coordinates
3. THE Lambda_Processor SHALL query Satellite_API for soil moisture and groundwater storage data
4. THE Lambda_Processor SHALL construct prompt for AI_Engine including borewell depth, yield, rainfall, soil moisture, and region characteristics
5. THE Lambda_Processor SHALL send structured request to AI_Engine requesting recharge techniques suitable for local conditions
6. THE AI_Engine SHALL generate Recharge_Recommendation with at least 3 actionable techniques
7. THE Lambda_Processor SHALL parse AI_Engine response and validate recommendation structure
8. THE Lambda_Processor SHALL store Recharge_Recommendation in DynamoDB_Store with geohash and timestamp
9. THE Lambda_Processor SHALL return formatted recommendations to Android_App within 10 seconds
10. THE Android_App SHALL display recommendations with technique name, description, estimated cost, and implementation steps

### Requirement 11: Weather Data Integration

**User Story:** As a hydrologist, I want the system to incorporate local rainfall and climate data, so that AI recommendations account for regional weather patterns.

#### Acceptance Criteria

1. WHEN Lambda_Processor requests weather data, THE Lambda_Processor SHALL convert geohash to latitude and longitude coordinates
2. THE Lambda_Processor SHALL query Weather_API with coordinates and date range parameters
3. THE Weather_API SHALL return daily precipitation, temperature, and evapotranspiration data
4. THE Lambda_Processor SHALL compute total rainfall and average temperature for the requested period
5. THE Lambda_Processor SHALL cache weather data for each geohash region for 24 hours
6. WHEN Weather_API is unavailable, THE Lambda_Processor SHALL use cached data if available
7. IF no cached data exists and Weather_API fails, THEN THE Lambda_Processor SHALL generate recommendations without weather context and notify user

### Requirement 12: Satellite Data Integration

**User Story:** As an environmental scientist, I want the system to use NASA satellite data for soil moisture and groundwater storage, so that recommendations are based on comprehensive environmental data.

#### Acceptance Criteria

1. WHEN Lambda_Processor requests satellite data, THE Lambda_Processor SHALL query Satellite_API with coordinates and date range
2. THE Satellite_API SHALL return soil moisture levels and groundwater storage anomaly data
3. THE Lambda_Processor SHALL normalize satellite data values to 0-1 scale for AI_Engine input
4. THE Lambda_Processor SHALL cache satellite data for each geohash region for 7 days
5. THE Lambda_Processor SHALL handle Satellite_API rate limits by implementing request queuing
6. WHEN Satellite_API returns no data for requested coordinates, THE Lambda_Processor SHALL use nearest available grid point within 50 kilometers
7. THE Lambda_Processor SHALL include data source timestamp in Recharge_Recommendation metadata

### Requirement 13: User Authentication

**User Story:** As a new user, I want to sign up using my phone number with OTP verification, so that I can securely access the platform without creating complex passwords.

#### Acceptance Criteria

1. THE Android_App SHALL provide phone number input field with country code selector
2. WHEN user submits phone number, THE Android_App SHALL request OTP from Firebase Authentication
3. THE Android_App SHALL display OTP input field after successful OTP send
4. WHEN user enters OTP, THE Android_App SHALL verify OTP with Firebase Authentication
5. WHEN OTP verification succeeds, THE Android_App SHALL store Firebase JWT token securely in Android Keystore
6. THE Android_App SHALL automatically refresh JWT token before expiration
7. THE Android_App SHALL provide logout functionality that clears stored JWT token
8. WHEN authentication fails after 3 attempts, THE Android_App SHALL implement 5 minute cooldown period

### Requirement 14: Data Privacy and Geohash Obfuscation

**User Story:** As a privacy-conscious user, I want my exact location to be obscured while still contributing useful data, so that my privacy is protected from potential misuse.

#### Acceptance Criteria

1. THE Android_App SHALL convert GPS coordinates to geohash before any network transmission
2. THE Android_App SHALL use geohash precision level 6 providing approximately 1.2 km x 0.6 km resolution
3. THE Android_App SHALL never store or transmit exact latitude and longitude values
4. THE Android_App SHALL display geohash-based approximate location on map to user for confirmation
5. THE Android_App SHALL allow user to manually adjust geohash by one precision level if desired
6. THE DynamoDB_Store SHALL store only geohash values, never raw GPS coordinates
7. THE API_Gateway SHALL reject any requests containing latitude or longitude fields

### Requirement 15: Data Export and Reporting

**User Story:** As a government official, I want to export aggregated groundwater data in standard formats, so that I can integrate it with other water management systems and generate reports.

#### Acceptance Criteria

1. THE API_Gateway SHALL provide export endpoint accepting geohash list, date range, and format parameters
2. THE Lambda_Processor SHALL support CSV and JSON export formats
3. THE Lambda_Processor SHALL aggregate data by geohash and time period as specified
4. THE Lambda_Processor SHALL include statistical summaries in export output
5. THE Lambda_Processor SHALL generate export file and upload to S3 bucket with signed URL
6. THE Lambda_Processor SHALL return signed URL valid for 1 hour
7. THE Lambda_Processor SHALL limit export to 100000 records per request
8. THE Lambda_Processor SHALL complete export generation within 30 seconds for requests up to 10000 records

### Requirement 16: System Monitoring and Health Checks

**User Story:** As a DevOps engineer, I want automated health monitoring of all system components, so that I can detect and respond to failures quickly.

#### Acceptance Criteria

1. THE Lambda_Processor SHALL expose health check endpoint returning system status
2. THE health check endpoint SHALL verify DynamoDB_Store connectivity
3. THE health check endpoint SHALL verify AI_Engine API availability
4. THE health check endpoint SHALL verify Weather_API and Satellite_API connectivity
5. THE health check endpoint SHALL return HTTP 200 when all dependencies are healthy
6. WHEN any dependency fails, THE health check endpoint SHALL return HTTP 503 with failure details
7. THE Alert_Scheduler SHALL send notification to administrators when health check fails for 3 consecutive attempts
8. THE Lambda_Processor SHALL publish custom CloudWatch metrics for request count, latency, and error rate

### Requirement 17: Input Sanitization and Validation

**User Story:** As a security engineer, I want all user inputs to be sanitized and validated, so that the system is protected from injection attacks and malformed data.

#### Acceptance Criteria

1. THE Android_App SHALL validate all numeric inputs are within acceptable ranges before submission
2. THE Android_App SHALL sanitize text inputs by removing special characters and limiting length to 500 characters
3. THE API_Gateway SHALL validate request payload against JSON schema
4. THE Lambda_Processor SHALL use parameterized queries for all DynamoDB_Store operations
5. THE Lambda_Processor SHALL escape special characters in user inputs before including in AI_Engine prompts
6. THE Lambda_Processor SHALL reject requests containing SQL keywords, script tags, or shell commands
7. WHEN validation fails, THE Lambda_Processor SHALL log the violation with request metadata for security analysis

### Requirement 18: Recommendation Parsing and Formatting

**User Story:** As a user, I want AI recommendations to be clearly formatted and easy to understand, so that I can implement the suggested techniques effectively.

#### Acceptance Criteria

1. THE Lambda_Processor SHALL define structured output schema for AI_Engine responses
2. THE AI_Engine SHALL return recommendations in JSON format with technique name, description, cost estimate, and implementation steps
3. THE Lambda_Processor SHALL validate AI_Engine response against expected schema
4. WHEN AI_Engine returns unstructured text, THE Lambda_Processor SHALL parse and structure the content
5. THE Lambda_Processor SHALL ensure each recommendation includes at least 3 implementation steps
6. THE Android_App SHALL display recommendations with visual hierarchy using headings and bullet points
7. THE Android_App SHALL provide option to save recommendations for offline viewing
8. THE Android_App SHALL allow users to mark recommendations as helpful or not helpful for feedback

### Requirement 19: Pretty Printer for Borewell Records

**User Story:** As a developer, I want a standardized format for displaying borewell records, so that data is consistently presented across different system components.

#### Acceptance Criteria

1. THE Lambda_Processor SHALL implement pretty printer function for Borewell_Record objects
2. THE pretty printer SHALL format output as human-readable text with labeled fields
3. THE pretty printer SHALL include depth in meters, yield in liters per hour, geohash, and timestamp
4. THE pretty printer SHALL format timestamp in ISO 8601 format with timezone
5. THE pretty printer SHALL round numeric values to 2 decimal places
6. THE Android_App SHALL use pretty printer output for displaying record details
7. FOR ALL valid Borewell_Record objects, parsing the pretty printer output SHALL produce an equivalent object

### Requirement 20: Configuration Management

**User Story:** As a system administrator, I want to manage system configuration parameters without code changes, so that I can adjust thresholds and limits based on operational needs.

#### Acceptance Criteria

1. THE Lambda_Processor SHALL load configuration from AWS Systems Manager Parameter Store on initialization
2. THE configuration SHALL include Depth_Drop_Threshold, rate limits, cache durations, and API endpoints
3. THE Lambda_Processor SHALL cache configuration values for 5 minutes
4. WHEN configuration changes, THE Lambda_Processor SHALL reload values after cache expiration
5. THE configuration SHALL support environment-specific values for development, staging, and production
6. THE Lambda_Processor SHALL validate configuration values on load and use defaults for invalid values
7. THE Lambda_Processor SHALL log configuration load events for audit trail

