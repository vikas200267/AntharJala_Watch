/**
 * Lambda Function: Alert Detector
 * Purpose: Scheduled job to detect water stress and send alerts
 * Runs every hour via CloudWatch Events
 * 
 * Flow:
 * 1. Get all active geohashes (with recent data)
 * 2. For each geohash, calculate trend
 * 3. Detect significant drops (>15%)
 * 4. Create alert records
 * 5. Send notifications via SNS/FCM
 */
require('dotenv').config();
const AWS = require('aws-sdk');
const { getAverageDepth } = require('../shared/metrics');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const sns = new AWS.SNS();

const TABLE_NAME = process.env.BOREWELL_TABLE || process.env.BOREWELL_LOGS_TABLE;
const ALERTS_TABLE = process.env.ALERTS_TABLE;
const ALERT_TOPIC_ARN = process.env.SNS_TOPIC_ARN || process.env.ALERT_TOPIC_ARN;

exports.handler = async (event) => {
    console.log('Alert detector started');
    
    try {
        // 1. Get all active geohashes (with data in last 7 days)
        const activeGeohashes = await getActiveGeohashes();
        console.log(`Found ${activeGeohashes.length} active geohashes`);
        
        const alerts = [];
        
        // 2. Check each geohash for water stress
        for (const geohash of activeGeohashes) {
            try {
                // Get recent average (last 7 days)
                const recentAvg = await getAverageDepth(geohash, 7);
                
                // Get baseline average (days 8-30)
                const baselineAvg = await getAverageDepth(geohash, 23, 7);
                
                if (!recentAvg || !baselineAvg) {
                    continue; // Not enough data
                }
                
                // Calculate drop percentage
                const dropPercentage = ((baselineAvg - recentAvg) / baselineAvg) * 100;
                
                // Check if significant drop
                if (dropPercentage > 15) {
                    const alert = {
                        alertId: `${geohash}-${Date.now()}`,
                        geohash,
                        type: 'WATER_LEVEL_DROP',
                        severity: dropPercentage > 30 ? 'critical' : 'warning',
                        dropPercentage: Math.round(dropPercentage * 10) / 10,
                        recentAvgDepth: Math.round(recentAvg * 10) / 10,
                        baselineAvgDepth: Math.round(baselineAvg * 10) / 10,
                        timestamp: Date.now(),
                        status: 'active'
                    };
                    
                    alerts.push(alert);
                    
                    // Store alert
                    await storeAlert(alert);
                    
                    // Send notification
                    await sendNotification(alert);
                }
                
            } catch (error) {
                console.error(`Error processing geohash ${geohash}:`, error);
            }
        }
        
        console.log(`Generated ${alerts.length} alerts`);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Alert detection completed',
                geohashesChecked: activeGeohashes.length,
                alertsGenerated: alerts.length,
                alerts: alerts.map(a => ({
                    geohash: a.geohash,
                    severity: a.severity,
                    dropPercentage: a.dropPercentage
                }))
            })
        };
        
    } catch (error) {
        console.error('Error in alert detector:', error);
        throw error;
    }
};

/**
 * Get all geohashes with recent activity
 */
async function getActiveGeohashes() {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    // Scan for recent records (in production, use GSI)
    const result = await dynamodb.scan({
        TableName: TABLE_NAME,
        FilterExpression: '#ts > :sevenDaysAgo',
        ExpressionAttributeNames: {
            '#ts': 'timestamp'
        },
        ExpressionAttributeValues: {
            ':sevenDaysAgo': sevenDaysAgo
        },
        ProjectionExpression: 'geohash'
    }).promise();
    
    // Get unique geohashes
    const geohashes = [...new Set(result.Items.map(item => item.geohash))];
    return geohashes;
}

/**
 * Store alert in DynamoDB
 */
async function storeAlert(alert) {
    await dynamodb.put({
        TableName: ALERTS_TABLE,
        Item: {
            ...alert,
            ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days
        }
    }).promise();
}

/**
 * Send notification via SNS
 */
async function sendNotification(alert) {
    const message = {
        default: JSON.stringify(alert),
        GCM: JSON.stringify({
            notification: {
                title: alert.severity === 'critical' 
                    ? '🚨 Critical Water Alert' 
                    : '⚠️ Water Level Warning',
                body: `Water depth dropped ${alert.dropPercentage}% in your area`
            },
            data: {
                type: 'WATER_STRESS_ALERT',
                geohash: alert.geohash,
                severity: alert.severity,
                dropPercentage: alert.dropPercentage.toString()
            }
        })
    };
    
    await sns.publish({
        TopicArn: ALERT_TOPIC_ARN,
        Message: JSON.stringify(message),
        MessageStructure: 'json',
        Subject: `Water Alert: ${alert.geohash}`
    }).promise();
    
    console.log(`Notification sent for ${alert.geohash}`);
}
