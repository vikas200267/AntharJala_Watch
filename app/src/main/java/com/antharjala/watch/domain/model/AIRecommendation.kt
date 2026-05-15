package com.antharjala.watch.domain.model

data class AIRecommendation(
    val riskLevel: String,
    val primaryConcern: String,
    val recommendedSolution: String,
    val immediateSteps: List<String>,
    val materialsNeeded: List<String>,
    val estimatedCost: String,
    val timeToImplement: String,
    val expectedImprovement: String,
    val technicalExplanation: String,
    val preventionTips: List<String>
)

data class WaterPrediction(
    val depthChange: Float,
    val yieldChange: Float,
    val confidence: String,
    val riskLevel: String,
    val recommendation: String
)