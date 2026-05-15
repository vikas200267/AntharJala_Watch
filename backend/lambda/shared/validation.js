/**
 * Shared Validation Utilities
 * Input validation and suspicious pattern detection
 */

/**
 * Validate borewell data
 * @param {number} depth - Depth in meters
 * @param {number} yieldValue - Yield in liters/hour
 * @param {string} geohash - Geohash string
 * @param {number} timestamp - Unix timestamp
 * @returns {Object} Validation result
 */
function validateBorewellData(depth, yieldValue, geohash, timestamp) {
    // Depth validation
    if (typeof depth !== 'number' || isNaN(depth)) {
        return { valid: false, error: 'Depth must be a number' };
    }
    if (depth < 0) {
        return { valid: false, error: 'Depth cannot be negative' };
    }
    if (depth > 610) {
        return { valid: false, error: 'Depth exceeds maximum (610m)' };
    }
    
    // Yield validation
    if (typeof yieldValue !== 'number' || isNaN(yieldValue)) {
        return { valid: false, error: 'Yield must be a number' };
    }
    if (yieldValue < 0) {
        return { valid: false, error: 'Yield cannot be negative' };
    }
    if (yieldValue > 50000) {
        return { valid: false, error: 'Yield exceeds maximum (50000 L/h)' };
    }
    
    // Geohash validation
    if (typeof geohash !== 'string' || !/^[0-9a-z]{6}$/.test(geohash)) {
        return { valid: false, error: 'Invalid geohash format' };
    }
    
    // Timestamp validation
    if (typeof timestamp !== 'number' || isNaN(timestamp)) {
        return { valid: false, error: 'Timestamp must be a number' };
    }
    const now = Date.now();
    if (timestamp > now + 60000) {
        return { valid: false, error: 'Timestamp is in the future' };
    }
    if (timestamp < now - 86400000) {
        return { valid: false, error: 'Timestamp is too old (>24h)' };
    }
    
    return { valid: true };
}

/**
 * Detect suspicious patterns in data
 * @param {number} depth - Depth in meters
 * @param {number} yieldValue - Yield in liters/hour
 * @returns {Object} Suspicion analysis
 */
function detectSuspiciousPattern(depth, yieldValue) {
    const suspicions = [];
    
    // Check for unrealistic combinations
    if (depth < 10 && yieldValue > 10000) {
        suspicions.push('Very high yield for shallow depth');
    }
    
    if (depth > 300 && yieldValue < 100) {
        suspicions.push('Very low yield for deep borewell');
    }
    
    // Check for round numbers (possible fake data)
    if (depth % 10 === 0 && yieldValue % 1000 === 0) {
        suspicions.push('Suspiciously round numbers');
    }
    
    // Check for extreme values
    if (depth > 500) {
        suspicions.push('Extremely deep borewell');
    }
    
    if (yieldValue > 30000) {
        suspicions.push('Extremely high yield');
    }
    
    // Determine suspicion level
    let level = 'none';
    if (suspicions.length === 1) level = 'low';
    if (suspicions.length === 2) level = 'medium';
    if (suspicions.length >= 3) level = 'high';
    
    return {
        level,
        reason: suspicions.join('; ') || null,
        flags: suspicions
    };
}

module.exports = {
    validateBorewellData,
    detectSuspiciousPattern
};
