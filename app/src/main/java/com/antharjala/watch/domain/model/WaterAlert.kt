package com.antharjala.watch.domain.model

data class WaterAlert(
    val id: String,
    val title: String,
    val message: String,
    val severity: String, // critical, high, medium, low, info
    val location: String,
    val timeAgo: String,
    val actionRequired: Boolean,
    val recommendedAction: String
)