/**
 * Lambda Function: WebSocket Handler
 * Purpose: Real-time bidirectional communication
 * 
 * Features:
 * - Live data streaming
 * - Real-time alerts
 * - Collaborative features
 * - Live heatmap updates
 * - Chat with AI in real-time
 */
require('dotenv').config();
const AWS = require('aws-sdk');
const { validateJWT } = require('../shared/auth');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const apiGateway = new AWS.ApiGatewayManagementApi();

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE;
const BOREWELL_TABLE = process.env.BOREWELL_TABLE;

exports.handler = async (event) => {
    const { connectionId, routeKey, domainName, stage } = event.requestContext;
    
    // Initialize API Gateway Management API
    const apigwManagementApi = new AWS.ApiGatewayManagementApi({
        endpoint: `${domainName}/${stage}`
    });
    
    try {
        switch (routeKey) {
            case '$connect':
                return await handleConnect(event, connectionId);
            
            case '$disconnect':
                return await handleDisconnect(connectionId);
            
            case 'subscribe':
                return await handleSubscribe(event, connectionId, apigwManagementApi);
            
            case 'unsubscribe':
                return await handleUnsubscribe(event, connectionId);
            
            case 'sendMessage':
                return await handleSendMessage(event, connectionId, apigwManagementApi);
            
            case 'aiChat':
                return await handleAIChat(event, connectionId, apigwManagementApi);
            
            default:
                return { statusCode: 400, body: 'Unknown route' };
        }
    } catch (error) {
        console.error('WebSocket error:', error);
        return { statusCode: 500, body: 'Internal server error' };
    }
};

/**
 * Handle new WebSocket connection
 */
async function handleConnect(event, connectionId) {
    // Extract JWT from query parameters
    const token = event.queryStringParameters?.token;
    
    if (!token) {
        return { statusCode: 401, body: 'Unauthorized' };
    }
    
    const user = await validateJWT(token);
    if (!user) {
        return { statusCode: 401, body: 'Invalid token' };
    }
    
    // Store connection
    await dynamodb.put({
        TableName: CONNECTIONS_TABLE,
        Item: {
            connectionId,
            userId: user.uid,
            connectedAt: Date.now(),
            subscriptions: [],
            ttl: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
        }
    }).promise();
    
    console.log(`User ${user.uid} connected: ${connectionId}`);
    
    return { statusCode: 200, body: 'Connected' };
}

/**
 * Handle WebSocket disconnection
 */
async function handleDisconnect(connectionId) {
    await dynamodb.delete({
        TableName: CONNECTIONS_TABLE,
        Key: { connectionId }
    }).promise();
    
    console.log(`Connection closed: ${connectionId}`);
    
    return { statusCode: 200, body: 'Disconnected' };
}

/**
 * Handle subscription to real-time updates
 */
async function handleSubscribe(event, connectionId, apigwManagementApi) {
    const body = JSON.parse(event.body);
    const { subscriptionType, geohash } = body;
    
    // Get connection
    const connection = await dynamodb.get({
        TableName: CONNECTIONS_TABLE,
        Key: { connectionId }
    }).promise();
    
    if (!connection.Item) {
        return { statusCode: 404, body: 'Connection not found' };
    }
    
    // Add subscription
    const subscriptions = connection.Item.subscriptions || [];
    subscriptions.push({ type: subscriptionType, geohash, subscribedAt: Date.now() });
    
    await dynamodb.update({
        TableName: CONNECTIONS_TABLE,
        Key: { connectionId },
        UpdateExpression: 'SET subscriptions = :subs',
        ExpressionAttributeValues: {
            ':subs': subscriptions
        }
    }).promise();
    
    // Send confirmation
    await apigwManagementApi.postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify({
            type: 'SUBSCRIPTION_CONFIRMED',
            subscriptionType,
            geohash,
            timestamp: Date.now()
        })
    }).promise();
    
    // Start sending real-time updates
    if (subscriptionType === 'LIVE_HEATMAP') {
        await startLiveHeatmapUpdates(connectionId, geohash, apigwManagementApi);
    }
    
    return { statusCode: 200, body: 'Subscribed' };
}

/**
 * Handle unsubscribe
 */
async function handleUnsubscribe(event, connectionId) {
    const body = JSON.parse(event.body);
    const { subscriptionType, geohash } = body;
    
    const connection = await dynamodb.get({
        TableName: CONNECTIONS_TABLE,
        Key: { connectionId }
    }).promise();
    
    if (!connection.Item) {
        return { statusCode: 404, body: 'Connection not found' };
    }
    
    // Remove subscription
    const subscriptions = (connection.Item.subscriptions || []).filter(
        sub => !(sub.type === subscriptionType && sub.geohash === geohash)
    );
    
    await dynamodb.update({
        TableName: CONNECTIONS_TABLE,
        Key: { connectionId },
        UpdateExpression: 'SET subscriptions = :subs',
        ExpressionAttributeValues: {
            ':subs': subscriptions
        }
    }).promise();
    
    return { statusCode: 200, body: 'Unsubscribed' };
}

/**
 * Handle sending messages (for collaborative features)
 */
async function handleSendMessage(event, connectionId, apigwManagementApi) {
    const body = JSON.parse(event.body);
    const { targetGeohash, message } = body;
    
    // Get sender info
    const sender = await dynamodb.get({
        TableName: CONNECTIONS_TABLE,
        Key: { connectionId }
    }).promise();
    
    if (!sender.Item) {
        return { statusCode: 404, body: 'Connection not found' };
    }
    
    // Find all connections subscribed to this geohash
    const connections = await findSubscribedConnections(targetGeohash);
    
    // Broadcast message
    await Promise.all(connections.map(async (conn) => {
        try {
            await apigwManagementApi.postToConnection({
                ConnectionId: conn.connectionId,
                Data: JSON.stringify({
                    type: 'MESSAGE',
                    from: sender.Item.userId,
                    geohash: targetGeohash,
                    message,
                    timestamp: Date.now()
                })
            }).promise();
        } catch (error) {
            if (error.statusCode === 410) {
                // Connection is stale, remove it
                await dynamodb.delete({
                    TableName: CONNECTIONS_TABLE,
                    Key: { connectionId: conn.connectionId }
                }).promise();
            }
        }
    }));
    
    return { statusCode: 200, body: 'Message sent' };
}

/**
 * Handle real-time AI chat
 */
async function handleAIChat(event, connectionId, apigwManagementApi) {
    const body = JSON.parse(event.body);
    const { message, context } = body;
    
    // Send acknowledgment
    await apigwManagementApi.postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify({
            type: 'AI_CHAT_PROCESSING',
            timestamp: Date.now()
        })
    }).promise();
    
    // Call AI engine with streaming
    const aiResponse = await streamAIResponse(message, context, connectionId, apigwManagementApi);
    
    return { statusCode: 200, body: 'AI response sent' };
}

/**
 * Start sending live heatmap updates
 */
async function startLiveHeatmapUpdates(connectionId, geohash, apigwManagementApi) {
    // This would be called periodically by a separate Lambda
    // For now, send initial data
    const heatmapData = await getLatestHeatmapData(geohash);
    
    await apigwManagementApi.postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify({
            type: 'LIVE_HEATMAP_UPDATE',
            data: heatmapData,
            timestamp: Date.now()
        })
    }).promise();
}

/**
 * Find connections subscribed to a geohash
 */
async function findSubscribedConnections(geohash) {
    const result = await dynamodb.scan({
        TableName: CONNECTIONS_TABLE,
        FilterExpression: 'contains(subscriptions, :geohash)',
        ExpressionAttributeValues: {
            ':geohash': geohash
        }
    }).promise();
    
    return result.Items || [];
}

/**
 * Get latest heatmap data
 */
async function getLatestHeatmapData(geohash) {
    const result = await dynamodb.query({
        TableName: BOREWELL_TABLE,
        KeyConditionExpression: 'geohash = :geohash',
        ExpressionAttributeValues: {
            ':geohash': geohash
        },
        Limit: 10,
        ScanIndexForward: false
    }).promise();
    
    return {
        geohash,
        recentRecords: result.Items,
        avgDepth: calculateAverage(result.Items, 'depth'),
        avgYield: calculateAverage(result.Items, 'yield')
    };
}

/**
 * Stream AI response
 */
async function streamAIResponse(message, context, connectionId, apigwManagementApi) {
    // This would integrate with the AI real-time engine
    // For now, send a mock streaming response
    const words = message.split(' ');
    
    for (const word of words) {
        await apigwManagementApi.postToConnection({
            ConnectionId: connectionId,
            Data: JSON.stringify({
                type: 'AI_CHAT_CHUNK',
                content: word + ' ',
                timestamp: Date.now()
            })
        }).promise();
        
        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    await apigwManagementApi.postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify({
            type: 'AI_CHAT_COMPLETE',
            timestamp: Date.now()
        })
    }).promise();
}

function calculateAverage(data, field) {
    if (!data || data.length === 0) return 0;
    return data.reduce((sum, item) => sum + item[field], 0) / data.length;
}
