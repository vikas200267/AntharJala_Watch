package com.antharjala.watch.domain.model

/**
 * User domain model.
 */
data class User(
    val id: String,
    val phoneNumber: String,
    val displayName: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)
