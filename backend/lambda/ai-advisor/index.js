/**
 * Lambda Function: AI Advisor
 * Purpose: Gemini AI-powered structured groundwater recommendations
 * 
 * Flow:
 * 1. Validate JWT token
 * 2. Get borewell data and context
 * 3. Fetch weather data (Open-Meteo API)
 * 4. Generate structured AI recommendations using Gemini
 * 5. Return actionable intelligence (not just text)
 */
require('dotenv').config();
const AWS = require('aws-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { validateJWT } = require('../shared/auth');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const TABLE_NAME = process.env.BOREWELL_TABLE || process.env.BOREWELL_LOGS_TABLE;

exports.handler = async (event) => {
    console.log('AI Advisor request:', JSON.stringify(event, null, 2));
    
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
        
        // 2. Parse request
        const { geohash, depth, yield: yieldValue, soilType } = JSON.parse(event.body);
        
        // 3. Get historical context
        const historicalData = await getHistoricalData(geohash);
        
        // 4. Get weather data
        const weatherData = await getWeatherData(geohash);
        
        // 5. Calculate water stress and trends
        const analysis = await analyzeWaterSituation(geohash, depth, yieldValue, historicalData, weatherData);
        
        // 6. Generate AI recommendations
        const recommendations = await generateAIRecommendations({
            depth,
            yield: yieldValue,
            soilType: soilType || 'mixed',
            waterStress: analysis.waterStressLevel,
            rainfallTrend: weatherData.rainfallTrend,
            depthTrend: analysis.depthTrend,
            yieldTrend: analysis.yieldTrend,
            historicalData
        });
        
        // 7. Generate predictive model
        const prediction = await generatePrediction(analysis, weatherData);
        
        return successResponse({
            analysis,
            recommendations,
            prediction,
            weatherContext: weatherData,
            timestamp: Date.now()
        });
        
    } catch (error) {
        console.error('Error in AI advisor:', error);
        return errorResponse(500, 'Internal server error');
    }
};

/**
 * Get historical data for context
 */
async function getHistoricalData(geohash) {
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
        },
        ScanIndexForward: false,
        Limit: 50
    }).promise();
    
    return result.Items || [];
}

/**
 * Get weather data from Open-Meteo API
 */
async function getWeatherData(geohash) {
    try {
        // Convert geohash to lat/lon (simplified)
        const { lat, lon } = geohashToLatLon(geohash);
        
        // Get weather data for last 30 days
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const weatherUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=precipitation_sum,temperature_2m_max,temperature_2m_min&timezone=Asia/Kolkata`;
        
        const response = await fetch(weatherUrl);
        const data = await response.json();
        
        if (!data.daily) {
            throw new Error('Weather data not available');
        }
        
        // Calculate rainfall trend
        const rainfall = data.daily.precipitation_sum;
        const totalRainfall = rainfall.reduce((sum, val) => sum + (val || 0), 0);
        const avgRainfall = totalRainfall / rainfall.length;
        
        let rainfallTrend = 'low';
        if (avgRainfall > 5) rainfallTrend = 'high';
        else if (avgRainfall > 2) rainfallTrend = 'medium';
        
        return {
            totalRainfall: Math.round(totalRainfall * 10) / 10,
            avgRainfall: Math.round(avgRainfall * 10) / 10,
            rainfallTrend,
            avgTemp: Math.round(data.daily.temperature_2m_max.reduce((sum, val) => sum + val, 0) / data.daily.temperature_2m_max.length)
        };
        
    } catch (error) {
        console.error('Weather data error:', error);
        return {
            totalRainfall: 0,
            avgRainfall: 0,
            rainfallTrend: 'low',
            avgTemp: 30
        };
    }
}

/**
 * Analyze water situation with trends
 */
async function analyzeWaterSituation(geohash, currentDepth, currentYield, historicalData, weatherData) {
    if (historicalData.length === 0) {
        return {
            waterStressLevel: calculateNormalizedStress(currentDepth, currentYield),
            depthTrend: 'stable',
            yieldTrend: 'stable',
            confidence: 'low'
        };
    }
    
    // Calculate trends
    const avgDepth = historicalData.reduce((sum, item) => sum + item.depth, 0) / historicalData.length;
    const avgYield = historicalData.reduce((sum, item) => sum + item.yield, 0) / historicalData.length;
    
    const depthChange = ((currentDepth - avgDepth) / avgDepth) * 100;
    const yieldChange = ((currentYield - avgYield) / avgYield) * 100;
    
    return {
        waterStressLevel: calculateWaterStress(currentDepth, currentYield, avgDepth, avgYield),
        depthTrend: depthChange > 10 ? 'increasing' : depthChange < -10 ? 'decreasing' : 'stable',
        yieldTrend: yieldChange > 15 ? 'increasing' : yieldChange < -15 ? 'decreasing' : 'stable',
        depthChange: Math.round(depthChange * 10) / 10,
        yieldChange: Math.round(yieldChange * 10) / 10,
        confidence: historicalData.length > 10 ? 'high' : 'medium'
    };
}

/**
 * Generate structured AI recommendations using Gemini
 */
async function generateAIRecommendations(context) {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        
        const prompt = `You are a professional hydro-geologist and groundwater expert in India.

Input Data:
- Borewell depth: ${context.depth} meters
- Water yield: ${context.yield} liters/hour
- Soil type: ${context.soilType}
- Water stress level: ${context.waterStress} (0-1 scale)
- Rainfall trend: ${context.rainfallTrend}
- Depth trend: ${context.depthTrend}
- Yield trend: ${context.yieldTrend}

Return ONLY valid JSON in this exact format:
{
  "risk_level": "low|medium|high|critical",
  "primary_concern": "brief description",
  "recommended_solution": "main recommendation",
  "immediate_steps": ["step1", "step2", "step3"],
  "materials_needed": ["material1", "material2"],
  "estimated_cost": "₹X,XXX - ₹Y,YYY",
  "time_to_implement": "X days/weeks",
  "expected_improvement": "X% improvement in Y",
  "technical_explanation": "why this solution works",
  "prevention_tips": ["tip1", "tip2", "tip3"]
}

Focus on practical, actionable advice for Indian farmers and communities.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Parse JSON response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Invalid AI response format');
        }
        
        return JSON.parse(jsonMatch[0]);
        
    } catch (error) {
        console.error('AI generation error:', error);
        
        // Fallback structured response
        return generateFallbackRecommendation(context);
    }
}

/**
 * Generate predictive model
 */
async function generatePrediction(analysis, weatherData) {
    // Simple but effective prediction model
    let depthPrediction = 0;
    let yieldPrediction = 0;
    
    // Rainfall impact
    if (weatherData.rainfallTrend === 'low') {
        depthPrediction += 8; // Depth increases (water level drops)
        yieldPrediction -= 15; // Yield decreases
    } else if (weatherData.rainfallTrend === 'high') {
        depthPrediction -= 5; // Depth decreases (water level rises)
        yieldPrediction += 10; // Yield increases
    }
    
    // Trend impact
    if (analysis.depthTrend === 'increasing') {
        depthPrediction += 5;
    } else if (analysis.depthTrend === 'decreasing') {
        depthPrediction -= 3;
    }
    
    if (analysis.yieldTrend === 'decreasing') {
        yieldPrediction -= 10;
    } else if (analysis.yieldTrend === 'increasing') {
        yieldPrediction += 8;
    }
    
    // Water stress impact
    if (analysis.waterStressLevel > 0.7) {
        depthPrediction += 12;
        yieldPrediction -= 20;
    }
    
    return {
        next20Days: {
            depthChange: Math.round(depthPrediction * 10) / 10,
            yieldChange: Math.round(yieldPrediction * 10) / 10,
            confidence: analysis.confidence
        },
        riskLevel: depthPrediction > 15 || yieldPrediction < -25 ? 'high' : 
                  depthPrediction > 8 || yieldPrediction < -15 ? 'medium' : 'low',
        recommendation: depthPrediction > 10 ? 'Start recharge activities immediately' : 
                       depthPrediction > 5 ? 'Monitor closely and prepare recharge' : 
                       'Continue regular monitoring'
    };
}

/**
 * Fallback recommendation when AI fails
 */
function generateFallbackRecommendation(context) {
    const riskLevel = context.waterStress > 0.7 ? 'high' : 
                     context.waterStress > 0.4 ? 'medium' : 'low';
    
    return {
        risk_level: riskLevel,
        primary_concern: "Water stress detected in your area",
        recommended_solution: "Implement rainwater harvesting and recharge pit",
        immediate_steps: [
            "Dig recharge pit near borewell",
            "Install roof water collection",
            "Check for leakages in distribution"
        ],
        materials_needed: ["PVC pipes", "Filter media", "Cement"],
        estimated_cost: "₹15,000 - ₹25,000",
        time_to_implement: "7-10 days",
        expected_improvement: "20-30% improvement in yield",
        technical_explanation: "Recharge pit increases groundwater level",
        prevention_tips: [
            "Regular maintenance of recharge structures",
            "Monitor water usage patterns",
            "Plant trees around water sources"
        ]
    };
}

/**
 * Helper functions
 */
function calculateWaterStress(currentDepth, currentYield, avgDepth, avgYield) {
    const depthStress = (currentDepth - avgDepth) / avgDepth;
    const yieldStress = (avgYield - currentYield) / avgYield;
    return Math.min(Math.max((depthStress * 0.6) + (yieldStress * 0.4), 0), 1);
}

function calculateNormalizedStress(depth, yieldValue) {
    const normalizedDepth = Math.min(depth / 500, 1);
    const normalizedYield = 1 - Math.min(yieldValue / 50000, 1);
    return (normalizedDepth * 0.6) + (normalizedYield * 0.4);
}

function geohashToLatLon(geohash) {
    // Simplified conversion - use proper library in production
    return { lat: 12.9716, lon: 77.5946 }; // Bangalore default
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