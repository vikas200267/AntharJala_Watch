/**
 * Lambda Function: Stream Processor
 * Purpose: Process Kinesis stream events in real-time
 * Triggered by Kinesis Data Stream
 * 
 * Flow:
 * 1. Process batch of Kinesis records
 * 2. Update heatmap cache
 * 3. Check for immediate alerts
 * 4. Archive to S3 (optional)
 */
require('dotenv').config();
const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();
const sns = new AWS.SNS();

const CACHE_TABLE = process.env.HEATMAP_CACHE_TABLE;
const ARCHIVE_BUCKET = process.env.ARCHIVE_BUCKET;
const ALERT_TOPIC_ARN = process.env.ALERT_TOPIC_ARN;

exports.handler = async (event) => {
    console.log(`Processing ${event.Records.length} Kinesis records`);
    
    const processedRecords = [];
    const errors = [];
    
    for (const record of event.Records) {
        try {
            // Decode Kinesis data
            const payload = JSON.parse(
                Buffer.from(record.kinesis.data, 'base64').toString('utf-8')
            );
            
            if (payload.eventType === 'BOREWELL_LOGGED') {
                await processBorewellEvent(payload.record);
                processedRecords.push(payload.record.recordId);
            }
            
        } catch (error) {
            console.error('Error processing record:', error);
            errors.push({
                recordId: record.kinesis.sequenceNumber,
                error: error.message
            });
        }
    }
    
    console.log(`Processed: ${processedRecords.length}, Errors: ${errors.length}`);
    
    return {
        batchItemFailures: errors.map(e => ({ itemIdentifier: e.recordId }))
    };
};

/**
 * Process borewell logging event
 */
async function processBorewellEvent(record) {
    // Update heatmap cache
    await updateHeatmapCache(record);
    
    // Check for immediate alerts
    if (record.waterStressLevel > 0.8) {
        await sendImmediateAlert(record);
    }
    
    // Archive to S3 (for long-term storage)
    await archiveRecord(record);
}

/**
 * Update heatmap cache with new data
 */
async function updateHeatmapCache(record) {
    const cacheKey = `geohash-${record.geohash}`;
    
    try {
        // Get existing cache
        const existing = await dynamodb.get({
            TableName: CACHE_TABLE,
            Key: { cacheKey }
        }).promise();
        
        let cacheData = existing.Item || {
            cacheKey,
            geohash: record.geohash,
            totalRecords: 0,
            sumDepth: 0,
            sumYield: 0,
            lastUpdated: 0
        };
        
        // Update aggregates
        cacheData.totalRecords += 1;
        cacheData.sumDepth += record.depth;
        cacheData.sumYield += record.yield;
        cacheData.avgDepth = cacheData.sumDepth / cacheData.totalRecords;
        cacheData.avgYield = cacheData.sumYield / cacheData.totalRecords;
        cacheData.lastUpdated = record.timestamp;
        cacheData.waterStressLevel = record.waterStressLevel;
        
        // Store updated cache
        await dynamodb.put({
            TableName: CACHE_TABLE,
            Item: {
                ...cacheData,
                ttl: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
            }
        }).promise();
        
    } catch (error) {
        console.error('Error updating heatmap cache:', error);
    }
}

/**
 * Send immediate alert for critical water stress
 */
async function sendImmediateAlert(record) {
    const message = {
        type: 'CRITICAL_WATER_STRESS',
        geohash: record.geohash,
        waterStressLevel: record.waterStressLevel,
        depth: record.depth,
        yield: record.yield,
        timestamp: record.timestamp,
        severity: 'critical'
    };
    
    await sns.publish({
        TopicArn: ALERT_TOPIC_ARN,
        Message: JSON.stringify(message),
        Subject: `CRITICAL: Water Stress Alert ${record.geohash}`
    }).promise();
    
    console.log(`Critical alert sent for ${record.geohash}`);
}

/**
 * Archive record to S3 for long-term storage
 */
async function archiveRecord(record) {
    if (!ARCHIVE_BUCKET) return;
    
    try {
        const date = new Date(record.timestamp);
        const key = `year=${date.getFullYear()}/month=${date.getMonth() + 1}/day=${date.getDate()}/${record.recordId}.json`;
        
        await s3.putObject({
            Bucket: ARCHIVE_BUCKET,
            Key: key,
            Body: JSON.stringify(record),
            ContentType: 'application/json'
        }).promise();
        
    } catch (error) {
        console.error('Error archiving record:', error);
    }
}