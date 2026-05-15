/**
 * Shared Metrics Utilities
 * Water stress calculation and aggregation
 */
require('dotenv').config();
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.BOREWELL_LOGS_TABLE;

/**
 * Calculate water stress level for a geohash
 * @param {string} geohash - Geohash to analyze
 * @param {number} currentDepth - Current depth reading
 * @param {number} currentYield - Current yield reading
 * @returns {Promise<number>} Water stress level (0-1)
 */
async function calculateWaterStress(geohash, currentDepth, currentYield) {
    try {
        // Get historical data for this geohash (last 30 days)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        
        const result = await dynamodb.query({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'geohash = :geohash AND #ts > :thirtyDaysAgo',
            ExpressionAttributeNames: {
                '#ts': 'timestamp'
            },
            ExpressionAttributeValues: {
                ':geohash': geohash,
                ':thirtyDaysAgo': thirtyDaysAgo
            }
        }).promise();
        
        if (!result.Items || result.Items.length === 0) {
            // No historical data, use normalized current values
            return calculateNormalizedStress(currentDepth, currentYield);
        }
        
        // Calculate historical averages
        const avgDepth = result.Items.reduce((sum, item) => sum + item.depth, 0) / result.Items.length;
        const avgYield = result.Items.reduce((sum, item) => sum + item.yield, 0) / result.Items.length;
        
        // Calculate stress based on deviation from historical average
        const depthIncrease = (currentDepth - avgDepth) / avgDepth;
        const yieldDecrease = (avgYield - currentYield) / avgYield;
        
        // Weighted stress calculation
        const stress = (depthIncrease * 0.6) + (yieldDecrease * 0.4);
        
        // Normalize to 0-1 range
        return Math.min(Math.max(stress, 0), 1);
        
    } catch (error) {
        console.error('Error calculating water stress:', error);
        // Fallback to normalized calculation
        return calculateNormalizedStress(currentDepth, currentYield);
    }
}

/**
 * Calculate normalized water stress without historical data
 * @param {number} depth - Depth in meters
 * @param {number} yieldValue - Yield in liters/hour
 * @returns {number} Water stress level (0-1)
 */
function calculateNormalizedStress(depth, yieldValue) {
    // Normalize depth (higher depth = more stress)
    const normalizedDepth = Math.min(depth / 500, 1);
    
    // Normalize yield (lower yield = more stress)
    const normalizedYield = 1 - Math.min(yieldValue / 50000, 1);
    
    // Weighted average
    return (normalizedDepth * 0.6) + (normalizedYield * 0.4);
}

/**
 * Get average depth for a geohash over a time period
 * @param {string} geohash - Geohash to query
 * @param {number} days - Number of days to look back
 * @param {number} offset - Days to offset from current (for baseline)
 * @returns {Promise<number>} Average depth
 */
async function getAverageDepth(geohash, days, offset = 0) {
    const endTime = Date.now() - (offset * 24 * 60 * 60 * 1000);
    const startTime = endTime - (days * 24 * 60 * 60 * 1000);
    
    const result = await dynamodb.query({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'geohash = :geohash AND #ts BETWEEN :start AND :end',
        ExpressionAttributeNames: {
            '#ts': 'timestamp'
        },
        ExpressionAttributeValues: {
            ':geohash': geohash,
            ':start': startTime,
            ':end': endTime
        }
    }).promise();
    
    if (!result.Items || result.Items.length === 0) {
        return null;
    }
    
    return result.Items.reduce((sum, item) => sum + item.depth, 0) / result.Items.length;
}

module.exports = {
    calculateWaterStress,
    calculateNormalizedStress,
    getAverageDepth
};
