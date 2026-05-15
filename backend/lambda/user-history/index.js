/**
 * Lambda Function: User History
 * Purpose: Fetch user's borewell submission history
 * 
 * Flow:
 * 1. Validate JWT token
 * 2. Parse query parameters (pagination, filters)
 * 3. Query user's records from DynamoDB
 * 4. Return paginated results
 */
require('dotenv').config();
const AWS = require('aws-sdk');
const { validateJWT } = require('../shared/auth');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.BOREWELL_TABLE || process.env.BOREWELL_LOGS_TABLE;

exports.handler = async (event) => {
    console.log('User history request:', JSON.stringify(event, null, 2));
    
    try {
        // 1. Validate JWT token
        const token = event.headers.Authorization?.replace('Bearer ', '');
        if (!token) {
            return errorResponse(401, 'Missing authorization token');
        }
        
        const user = await validateJWT(token);
        if (!user) {
            return errorResponse(401, 'Invalid authorization token');
        }
        
        // 2. Parse query parameters
        const {
            limit = '20',
            lastKey,
            startDate,
            endDate
        } = event.queryStringParameters || {};
        
        const queryLimit = Math.min(parseInt(limit), 100); // Max 100 records
        
        // 3. Build query parameters
        const queryParams = {
            TableName: TABLE_NAME,
            IndexName: 'UserIdIndex',
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': user.uid
            },
            Limit: queryLimit,
            ScanIndexForward: false // Most recent first
        };
        
        // Add date filter if provided
        if (startDate || endDate) {
            let filterExpression = '';
            if (startDate) {
                queryParams.ExpressionAttributeValues[':startDate'] = parseInt(startDate);
                filterExpression += '#ts >= :startDate';
            }
            if (endDate) {
                queryParams.ExpressionAttributeValues[':endDate'] = parseInt(endDate);
                if (filterExpression) filterExpression += ' AND ';
                filterExpression += '#ts <= :endDate';
            }
            queryParams.FilterExpression = filterExpression;
            queryParams.ExpressionAttributeNames = { '#ts': 'timestamp' };
        }
        
        // Add pagination
        if (lastKey) {
            try {
                queryParams.ExclusiveStartKey = JSON.parse(
                    Buffer.from(lastKey, 'base64').toString('utf-8')
                );
            } catch (error) {
                return errorResponse(400, 'Invalid pagination key');
            }
        }
        
        // 4. Execute query
        const result = await dynamodb.query(queryParams).promise();
        
        // 5. Format response
        const records = result.Items.map(item => ({
            recordId: item.recordId,
            geohash: item.geohash,
            depth: item.depth,
            yield: item.yield,
            waterStressLevel: item.waterStressLevel,
            timestamp: item.timestamp,
            suspicious: item.suspicious || false,
            createdAt: item.createdAt
        }));
        
        // 6. Prepare pagination key
        let nextKey = null;
        if (result.LastEvaluatedKey) {
            nextKey = Buffer.from(
                JSON.stringify(result.LastEvaluatedKey)
            ).toString('base64');
        }
        
        // 7. Calculate summary statistics
        const summary = calculateSummary(records);
        
        return successResponse({
            records,
            summary,
            pagination: {
                hasMore: !!result.LastEvaluatedKey,
                nextKey,
                count: records.length
            },
            timestamp: Date.now()
        });
        
    } catch (error) {
        console.error('Error fetching user history:', error);
        return errorResponse(500, 'Internal server error');
    }
};

/**
 * Calculate summary statistics
 */
function calculateSummary(records) {
    if (records.length === 0) {
        return {
            totalRecords: 0,
            avgDepth: 0,
            avgYield: 0,
            avgWaterStress: 0
        };
    }
    
    const totalDepth = records.reduce((sum, r) => sum + r.depth, 0);
    const totalYield = records.reduce((sum, r) => sum + r.yield, 0);
    const totalStress = records.reduce((sum, r) => sum + (r.waterStressLevel || 0), 0);
    
    return {
        totalRecords: records.length,
        avgDepth: Math.round((totalDepth / records.length) * 10) / 10,
        avgYield: Math.round(totalYield / records.length),
        avgWaterStress: Math.round((totalStress / records.length) * 100) / 100,
        dateRange: {
            earliest: Math.min(...records.map(r => r.timestamp)),
            latest: Math.max(...records.map(r => r.timestamp))
        }
    };
}

function successResponse(data) {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify(data)
    };
}

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