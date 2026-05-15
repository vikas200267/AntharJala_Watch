/**
 * Lambda Function: Notification Sender
 * Purpose: Send FCM push notifications to users
 * Triggered by SNS alerts
 * 
 * Flow:
 * 1. Parse SNS message
 * 2. Get affected users by geohash
 * 3. Send FCM notifications
 * 4. Log notification results
 */
require('dotenv').config();
const AWS = require('aws-sdk');
const admin = require('firebase-admin');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const USER_PROFILES_TABLE = process.env.USER_PROFILES_TABLE;

// Initialize Firebase Admin
let firebaseInitialized = false;

function initializeFirebase() {
    if (!firebaseInitialized) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
            })
        });
        firebaseInitialized = true;
    }
}

exports.handler = async (event) => {
    console.log('Notification sender triggered:', JSON.stringify(event, null, 2));
    
    try {
        initializeFirebase();
        
        for (const record of event.Records) {
            if (record.EventSource === 'aws:sns') {
                const message = JSON.parse(record.Sns.Message);
                await processNotification(message);
            }
        }
        
        return { statusCode: 200, message: 'Notifications processed' };
        
    } catch (error) {
        console.error('Error processing notifications:', error);
        throw error;
    }
};

/**
 * Process notification message
 */
async function processNotification(message) {
    console.log('Processing notification:', message);
    
    const { type, geohash, severity } = message;
    
    // Get users in affected area
    const users = await getUsersInGeohash(geohash);
    console.log(`Found ${users.length} users in geohash ${geohash}`);
    
    if (users.length === 0) {
        console.log('No users to notify');
        return;
    }
    
    // Prepare notification content
    const notification = createNotificationContent(message);
    
    // Send to users in batches
    const batchSize = 500; // FCM limit
    for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        await sendBatchNotifications(batch, notification);
    }
}

/**
 * Get users in geohash area
 */
async function getUsersInGeohash(geohash) {
    try {
        // In production, use GSI on geohash
        const result = await dynamodb.scan({
            TableName: USER_PROFILES_TABLE,
            FilterExpression: 'begins_with(lastKnownGeohash, :geohash)',
            ExpressionAttributeValues: {
                ':geohash': geohash.substring(0, 4) // Broader area
            },
            ProjectionExpression: 'userId, fcmToken, notificationPreferences'
        }).promise();
        
        return result.Items.filter(user => 
            user.fcmToken && 
            user.notificationPreferences?.waterAlerts !== false
        );
        
    } catch (error) {
        console.error('Error getting users:', error);
        return [];
    }
}

/**
 * Create notification content based on message type
 */
function createNotificationContent(message) {
    const { type, severity, dropPercentage, waterStressLevel } = message;
    
    let title, body, icon;
    
    switch (type) {
        case 'WATER_LEVEL_DROP':
            title = severity === 'critical' ? '🚨 Critical Water Alert' : '⚠️ Water Level Warning';
            body = `Water depth dropped ${dropPercentage}% in your area`;
            icon = 'water_alert';
            break;
            
        case 'CRITICAL_WATER_STRESS':
            title = '🚨 Critical Water Stress';
            body = `Severe water stress detected (${Math.round(waterStressLevel * 100)}%)`;
            icon = 'water_crisis';
            break;
            
        case 'HIGH_WATER_STRESS':
            title = '⚠️ High Water Stress';
            body = `Elevated water stress in your area`;
            icon = 'water_warning';
            break;
            
        default:
            title = '💧 Water Update';
            body = 'New water information available';
            icon = 'water_info';
    }
    
    return {
        notification: { title, body, icon },
        data: {
            type,
            geohash: message.geohash,
            severity: severity || 'info',
            timestamp: Date.now().toString(),
            clickAction: 'OPEN_MAP'
        },
        android: {
            priority: severity === 'critical' ? 'high' : 'normal',
            notification: {
                channelId: 'water_alerts',
                priority: severity === 'critical' ? 'high' : 'default',
                sound: severity === 'critical' ? 'alert_sound' : 'default'
            }
        }
    };
}

/**
 * Send notifications to batch of users
 */
async function sendBatchNotifications(users, notification) {
    const tokens = users.map(user => user.fcmToken);
    
    try {
        const response = await admin.messaging().sendMulticast({
            tokens,
            ...notification
        });
        
        console.log(`Sent ${response.successCount}/${tokens.length} notifications`);
        
        // Handle failed tokens
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`Failed to send to ${tokens[idx]}:`, resp.error);
                    if (resp.error?.code === 'messaging/registration-token-not-registered') {
                        failedTokens.push(tokens[idx]);
                    }
                }
            });
            
            // Clean up invalid tokens
            if (failedTokens.length > 0) {
                await cleanupInvalidTokens(failedTokens);
            }
        }
        
    } catch (error) {
        console.error('Error sending batch notifications:', error);
    }
}

/**
 * Remove invalid FCM tokens from user profiles
 */
async function cleanupInvalidTokens(invalidTokens) {
    console.log(`Cleaning up ${invalidTokens.length} invalid tokens`);
    
    // In production, implement batch cleanup
    // For now, just log the tokens to clean up
    console.log('Invalid tokens to clean:', invalidTokens);
}