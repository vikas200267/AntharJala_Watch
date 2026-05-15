/**
 * Shared Authentication Utilities
 * Used by all Lambda functions for JWT and Play Integrity validation
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (singleton)
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

/**
 * Validate Firebase JWT token
 * @param {string} token - JWT token from Authorization header
 * @returns {Promise<Object|null>} User object or null if invalid
 */
async function validateJWT(token) {
    try {
        initializeFirebase();
        const decodedToken = await admin.auth().verifyIdToken(token);
        return {
            uid: decodedToken.uid,
            phoneNumber: decodedToken.phone_number,
            email: decodedToken.email
        };
    } catch (error) {
        console.error('JWT validation failed:', error.message);
        return null;
    }
}

/**
 * Validate Play Integrity token
 * @param {string} token - Play Integrity token from client
 * @returns {Promise<boolean>} True if valid, false otherwise
 */
async function validatePlayIntegrity(token) {
    try {
        // In production, verify with Google Play Integrity API
        // For now, basic validation
        if (!token || token.length < 100) {
            return false;
        }
        
        // TODO: Implement actual Play Integrity verification
        // https://developer.android.com/google/play/integrity/verdict
        
        return true;
    } catch (error) {
        console.error('Play Integrity validation failed:', error.message);
        return false;
    }
}

module.exports = {
    validateJWT,
    validatePlayIntegrity
};
