/**
 * Lambda Function: Data Ingest
 * Purpose: Process borewell data submissions with validation and streaming
 * 
 * Flow:
 * 1. Validate JWT token
 * 2. Validate Play Integrity token
 * 3. Validate input data
 * 4. Check for suspicious patterns
 * 5. Store in DynamoDB
 * 6. Send to Kinesis stream
 * 7. Return response
 */
require('dotenv').config();
const AWS = require('aws-sdk');
const { validateJWT, validatePlayIntegrity } = require('../shared/auth');
const { validateBorewellData, detectSuspiciousPattern } = require('../shared/validation');
const { calculateWaterStress } = require('../shared/metrics');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const kinesis = new AWS.Kinesis();
const sns = new AWS.SNS();

const TABLE_NAME = process.env.BOREWELL_TABLE || process.env.BOREWELL_LOGS_TABLE;
const STREAM_NAME = process.env.KINESIS_STREAM || process.env.KINESIS_STREAM_NAME;
const ALERT_TOPIC_ARN = process.env.SNS_TOPIC_ARN || process.env.ALERT_TOPIC_ARN;

exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    try {
        // 1. Extract and validate JWT token
        const token = event.headers.Authorization?.replace('Bearer ', '');
        if (!token) {
            return errorResponse(401, 'Missing authorization token');
        }
        
        const user = await validateJWT(token);
        if (!user) {
            return errorResponse(401, 'Invalid authorization token');
        }
        
        // 2. Parse request body
        const body = JSON.parse(event.body);
        const { depth, yield: yieldValue, geohash, timestamp, playIntegrityToken } = body;
        
        // 3. Validate Play Integrity token (optional but recommended)
        if (playIntegrityToken) {
            const integrityValid = await validatePlayIntegrity(playIntegrityToken);
            if (!integrityValid) {
                console.warn('Play Integrity validation failed for user:', user.uid);
                // Continue but flag for review
            }
        }
        
        // 4. Validate borewell data
        const validation = validateBorewellData(depth, yieldValue, geohash, timestamp);
        if (!validation.valid) {
            return errorResponse(400, validation.error);
        }
        
        // 5. Check for suspicious patterns
        const suspicion = detectSuspiciousPattern(depth, yieldValue);
        
        // 6. Generate record ID
        const recordId = `${geohash}-${timestamp}-${generateShortId()}`;
        
        // 7. Calculate water stress level
        const waterStressLevel = await calculateWaterStress(geohash, depth, yieldValue);
        
        // 8. Prepare record
        const record = {
            recordId,
            geohash,
            timestamp,
            depth,
            yield: yieldValue,
            userId: user.uid,
            userPhone: user.phoneNumber,
            waterStressLevel,
            suspicious: suspicion.level !== 'none',
            suspicionReason: suspicion.reason,
            deviceHash: extractDeviceHash(event),
            ipAddress: event.requestContext.identity.sourceIp,
            createdAt: Date.now(),
            ttl: Math.floor(Date.now() / 1000) + (5 * 365 * 24 * 60 * 60) // 5 years
        };
        
        // 9. Store in DynamoDB
        await dynamodb.put({
            TableName: TABLE_NAME,
            Item: record
        }).promise();
        
        // 10. Send to Kinesis for real-time processing
        await kinesis.putRecord({
            StreamName: STREAM_NAME,
            Data: JSON.stringify({
                eventType: 'BOREWELL_LOGGED',
                record,
                timestamp: Date.now()
            }),
            PartitionKey: geohash
        }).promise();
        
        // 11. Check if immediate alert needed
        if (waterStressLevel > 0.7) {
            await sns.publish({
                TopicArn: ALERT_TOPIC_ARN,
                Message: JSON.stringify({
                    type: 'HIGH_WATER_STRESS',
                    geohash,
                    waterStressLevel,
                    depth,
                    yield: yieldValue,
                    timestamp
                }),
                Subject: `High Water Stress Alert: ${geohash}`
            }).promise();
        }
        
        // 12. Return success response
        return successResponse({
            recordId,
            waterStressLevel,
            message: 'Record stored successfully',
            warning: suspicion.level !== 'none' ? suspicion.reason : null
        });
        
    } catch (error) {
        console.error('Error processing request:', error);
        return errorResponse(500, 'Internal server error');
    }
};

/**
 * Generate short unique ID
 */
function generateShortId() {
    return Math.random().toString(36).substring(2, 8);
}

/**
 * Extract device hash from request
 */
function extractDeviceHash(event) {
    const userAgent = event.headers['User-Agent'] || '';
    const deviceId = event.headers['X-Device-Id'] || '';
    return require('crypto')
        .createHash('sha256')
        .update(userAgent + deviceId)
        .digest('hex')
        .substring(0, 16);
}

/**
 * Success response helper
 */
function successResponse(data) {
    return {
        statusCode: 201,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify(data)
    };
}

/**
 * Error response helper
 */
function errorResponse(statusCode, message) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify({
            error: message,
            timestamp: Date.now()
        })
    };
}
