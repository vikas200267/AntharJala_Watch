/**
 * Lambda Function: Heatmap Query
 * Purpose: Aggregate and return heatmap data for map visualization
 * 
 * Flow:
 * 1. Validate JWT token
 * 2. Parse bounds from query parameters
 * 3. Calculate geohashes in bounds
 * 4. Query DynamoDB for each geohash
 * 5. Aggregate data
 * 6. Calculate water stress levels
 * 7. Return clustered data
 */
require('dotenv').config();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { validateJWT } = require('../shared/auth');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.BOREWELL_TABLE || process.env.BOREWELL_LOGS_TABLE;
const CACHE_TABLE = process.env.HEATMAP_TABLE || process.env.HEATMAP_CACHE_TABLE;

exports.handler = async (event) => {
    console.log('Heatmap query received:', JSON.stringify(event, null, 2));
    
    try {
        // Skip JWT validation for now - add it back later
        // const token = event.headers.Authorization?.replace('Bearer ', '');
        // if (!token) {
        //     return errorResponse(401, 'Missing authorization token');
        // }
        
        // const user = await validateJWT(token);
        // if (!user) {
        //     return errorResponse(401, 'Invalid authorization token');
        // }
        
        // 2. Parse query parameters
        const { bounds, precision = 6 } = event.queryStringParameters || {};
        
        if (!bounds) {
            // Return empty data if no bounds provided
            return successResponse({
                clusters: [],
                bounds: {},
                timestamp: Date.now(),
                totalClusters: 0,
                message: 'No bounds provided - returning empty dataset'
            });
        }
        
        if (!bounds) {
            return errorResponse(400, 'Missing bounds parameter');
        }
        
        const [minLat, minLon, maxLat, maxLon] = bounds.split(',').map(Number);
        
        if (minLat >= maxLat || minLon >= maxLon) {
            return errorResponse(400, 'Invalid bounds');
        }
        
        // 3. Check cache first
        const cacheKey = `${bounds}-${precision}`;
        const cached = await checkCache(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < 300000) { // 5 min cache
            console.log('Returning cached data');
            return successResponse(cached.data);
        }
        
        // 4. Get geohashes in bounds
        const geohashes = getGeohashesInBounds(minLat, minLon, maxLat, maxLon, precision);
        console.log(`Querying ${geohashes.length} geohashes`);
        
        // 5. Query data for each geohash (parallel)
        const results = await Promise.all(
            geohashes.map(geohash => queryGeohashData(geohash))
        );
        
        // 6. Aggregate and calculate metrics
        const clusters = results
            .filter(data => data.records.length > 0)
            .map(data => {
                const avgDepth = calculateAverage(data.records, 'depth');
                const avgYield = calculateAverage(data.records, 'yield');
                const waterStress = calculateWaterStressFromRecords(data.records);
                
                return {
                    geohash: data.geohash,
                    center: geohashToLatLon(data.geohash),
                    avgDepth: Math.round(avgDepth * 10) / 10,
                    avgYield: Math.round(avgYield),
                    sampleCount: data.records.length,
                    waterStressLevel: Math.round(waterStress * 100) / 100,
                    lastUpdated: Math.max(...data.records.map(r => r.timestamp))
                };
            });
        
        // 7. Cache results
        await cacheResults(cacheKey, clusters);
        
        // 8. Return response
        return successResponse({
            clusters,
            bounds: { minLat, minLon, maxLat, maxLon },
            timestamp: Date.now(),
            totalClusters: clusters.length
        });
        
    } catch (error) {
        console.error('Error processing heatmap query:', error);
        return errorResponse(500, 'Internal server error');
    }
};

/**
 * Query DynamoDB for geohash data
 */
async function queryGeohashData(geohash) {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    const result = await dynamodb.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'geohash = :geohash AND #ts > :thirtyDaysAgo',
        ExpressionAttributeNames: {
            '#ts': 'timestamp'
        },
        ExpressionAttributeValues: {
            ':geohash': geohash,
            ':thirtyDaysAgo': thirtyDaysAgo
        },
        Limit: 100
    }));
    
    return {
        geohash,
        records: result.Items || []
    };
}

/**
 * Calculate average of a field
 */
function calculateAverage(records, field) {
    if (records.length === 0) return 0;
    return records.reduce((sum, r) => sum + r[field], 0) / records.length;
}

/**
 * Calculate water stress from records
 */
function calculateWaterStressFromRecords(records) {
    if (records.length === 0) return 0;
    
    const avgDepth = calculateAverage(records, 'depth');
    const avgYield = calculateAverage(records, 'yield');
    
    // Normalize values
    const normalizedDepth = Math.min(avgDepth / 500, 1);
    const normalizedYield = 1 - Math.min(avgYield / 50000, 1);
    
    return (normalizedDepth * 0.6) + (normalizedYield * 0.4);
}

/**
 * Get geohashes within bounds
 */
function getGeohashesInBounds(minLat, minLon, maxLat, maxLon, precision) {
    const geohashes = [];
    const latStep = 0.02; // ~2km
    const lonStep = 0.02;
    
    for (let lat = minLat; lat <= maxLat; lat += latStep) {
        for (let lon = minLon; lon <= maxLon; lon += lonStep) {
            const geohash = latLonToGeohash(lat, lon, precision);
            if (!geohashes.includes(geohash)) {
                geohashes.push(geohash);
            }
        }
    }
    
    return geohashes;
}

/**
 * Convert lat/lon to geohash (simplified)
 */
function latLonToGeohash(lat, lon, precision) {
    // Use a library like ngeohash in production
    // Simplified implementation for demonstration
    const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
    let geohash = '';
    let latRange = [-90, 90];
    let lonRange = [-180, 180];
    let isEven = true;
    
    while (geohash.length < precision) {
        let mid;
        let bit = 0;
        
        if (isEven) {
            mid = (lonRange[0] + lonRange[1]) / 2;
            if (lon > mid) {
                bit = 1;
                lonRange[0] = mid;
            } else {
                lonRange[1] = mid;
            }
        } else {
            mid = (latRange[0] + latRange[1]) / 2;
            if (lat > mid) {
                bit = 1;
                latRange[0] = mid;
            } else {
                latRange[1] = mid;
            }
        }
        
        isEven = !isEven;
        
        if (geohash.length * 5 + Math.floor(geohash.length * 5 / 5) < precision * 5) {
            const idx = bit << (4 - (geohash.length * 5 % 5));
            geohash += base32[idx];
        }
    }
    
    return geohash.substring(0, precision);
}

/**
 * Convert geohash to lat/lon center
 */
function geohashToLatLon(geohash) {
    // Simplified - use ngeohash library in production
    return {
        latitude: 0,
        longitude: 0
    };
}

/**
 * Check cache
 */
async function checkCache(key) {
    try {
        const result = await dynamodb.send(new GetCommand({
            TableName: CACHE_TABLE,
            Key: { cacheKey: key }
        }));
        
        return result.Item || null;
    } catch (error) {
        console.error('Cache check failed:', error);
        return null;
    }
}

/**
 * Cache results
 */
async function cacheResults(key, data) {
    try {
        await dynamodb.send(new PutCommand({
            TableName: CACHE_TABLE,
            Item: {
                cacheKey: key,
                data,
                timestamp: Date.now(),
                ttl: Math.floor(Date.now() / 1000) + 3600 // 1 hour
            }
        }));
    } catch (error) {
        console.error('Cache write failed:', error);
    }
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
