package com.antharjala.watch.core.network

import android.util.Log
import com.antharjala.watch.core.security.TokenManager
import com.google.gson.Gson
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import okhttp3.*
import javax.inject.Inject
import javax.inject.Singleton

/**
 * WebSocket Manager for real-time bidirectional communication.
 * Connects to AWS API Gateway WebSocket API for live updates.
 */
@Singleton
class WebSocketManager @Inject constructor(
    private val tokenManager: TokenManager,
    private val okHttpClient: OkHttpClient,
    private val gson: Gson
) {
    companion object {
        private const val TAG = "WebSocketManager"
        // WebSocket API Gateway endpoint - UPDATE THIS after backend deployment
        private const val WS_URL = "wss://your-websocket-id.execute-api.us-east-1.amazonaws.com/prod"
    }
    
    private var webSocket: WebSocket? = null
    
    private val _connectionState = MutableStateFlow<WebSocketState>(WebSocketState.Disconnected)
    val connectionState: StateFlow<WebSocketState> = _connectionState.asStateFlow()
    
    private val _liveHeatmapUpdates = MutableStateFlow<LiveHeatmapUpdate?>(null)
    val liveHeatmapUpdates: StateFlow<LiveHeatmapUpdate?> = _liveHeatmapUpdates.asStateFlow()
    
    private val _liveAlerts = MutableStateFlow<LiveAlert?>(null)
    val liveAlerts: StateFlow<LiveAlert?> = _liveAlerts.asStateFlow()
    
    private val _aiChatMessages = MutableStateFlow<AIChatMessage?>(null)
    val aiChatMessages: StateFlow<AIChatMessage?> = _aiChatMessages.asStateFlow()
    
    /**
     * Connect to WebSocket server.
     */
    fun connect() {
        if (_connectionState.value is WebSocketState.Connected) {
            Log.d(TAG, "Already connected")
            return
        }
        
        val token = tokenManager.getToken()
        if (token == null) {
            Log.e(TAG, "No auth token available")
            _connectionState.value = WebSocketState.Error("Not authenticated")
            return
        }
        
        val wsUrlWithToken = "$WS_URL?token=$token"
        
        val request = Request.Builder()
            .url(wsUrlWithToken)
            .build()
        
        Log.d(TAG, "Connecting to WebSocket...")
        _connectionState.value = WebSocketState.Connecting
        
        webSocket = okHttpClient.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d(TAG, "WebSocket connected")
                _connectionState.value = WebSocketState.Connected
            }
            
            override fun onMessage(webSocket: WebSocket, text: String) {
                Log.d(TAG, "Received message: $text")
                handleMessage(text)
            }
            
            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e(TAG, "WebSocket error: ${t.message}", t)
                _connectionState.value = WebSocketState.Error(t.message ?: "Connection failed")
            }
            
            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket closed: $code - $reason")
                _connectionState.value = WebSocketState.Disconnected
            }
        })
    }
    
    /**
     * Disconnect from WebSocket server.
     */
    fun disconnect() {
        Log.d(TAG, "Disconnecting WebSocket")
        webSocket?.close(1000, "User disconnected")
        webSocket = null
        _connectionState.value = WebSocketState.Disconnected
    }
    
    /**
     * Subscribe to live heatmap updates for a geohash.
     */
    fun subscribeToLiveHeatmap(geohash: String) {
        sendMessage(
            mapOf(
                "action" to "subscribe",
                "subscriptionType" to "LIVE_HEATMAP",
                "geohash" to geohash
            )
        )
    }
    
    /**
     * Subscribe to live alerts for a geohash.
     */
    fun subscribeToAlerts(geohash: String) {
        sendMessage(
            mapOf(
                "action" to "subscribe",
                "subscriptionType" to "LIVE_ALERTS",
                "geohash" to geohash
            )
        )
    }
    
    /**
     * Send AI chat message for streaming response.
     */
    fun sendAIChatMessage(message: String, context: Map<String, Any>) {
        sendMessage(
            mapOf(
                "action" to "aiChat",
                "message" to message,
                "context" to context
            )
        )
    }
    
    /**
     * Unsubscribe from updates.
     */
    fun unsubscribe(type: String, geohash: String) {
        sendMessage(
            mapOf(
                "action" to "unsubscribe",
                "subscriptionType" to type,
                "geohash" to geohash
            )
        )
    }
    
    /**
     * Send message to WebSocket server.
     */
    private fun sendMessage(data: Map<String, Any>) {
        val json = gson.toJson(data)
        val sent = webSocket?.send(json) ?: false
        if (!sent) {
            Log.e(TAG, "Failed to send message: $json")
        } else {
            Log.d(TAG, "Sent message: $json")
        }
    }
    
    /**
     * Handle incoming WebSocket message.
     */
    private fun handleMessage(text: String) {
        try {
            val message = gson.fromJson(text, WebSocketMessage::class.java)
            
            when (message.type) {
                "SUBSCRIPTION_CONFIRMED" -> {
                    Log.d(TAG, "Subscription confirmed: ${message.subscriptionType}")
                }
                
                "LIVE_HEATMAP_UPDATE" -> {
                    val update = gson.fromJson(text, LiveHeatmapUpdate::class.java)
                    _liveHeatmapUpdates.value = update
                }
                
                "LIVE_ALERT" -> {
                    val alert = gson.fromJson(text, LiveAlert::class.java)
                    _liveAlerts.value = alert
                }
                
                "AI_CHAT_CHUNK" -> {
                    val chunk = gson.fromJson(text, AIChatMessage::class.java)
                    _aiChatMessages.value = chunk
                }
                
                "AI_CHAT_COMPLETE" -> {
                    Log.d(TAG, "AI chat response complete")
                }
                
                "MESSAGE" -> {
                    Log.d(TAG, "Received collaborative message")
                }
                
                else -> {
                    Log.w(TAG, "Unknown message type: ${message.type}")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing message: ${e.message}", e)
        }
    }
    
    /**
     * Check if connected.
     */
    fun isConnected(): Boolean {
        return _connectionState.value is WebSocketState.Connected
    }
}

/**
 * WebSocket connection states.
 */
sealed class WebSocketState {
    object Disconnected : WebSocketState()
    object Connecting : WebSocketState()
    object Connected : WebSocketState()
    data class Error(val message: String) : WebSocketState()
}

/**
 * Base WebSocket message.
 */
data class WebSocketMessage(
    val type: String,
    val subscriptionType: String? = null,
    val timestamp: Long
)

/**
 * Live heatmap update message.
 */
data class LiveHeatmapUpdate(
    val type: String,
    val data: HeatmapData,
    val timestamp: Long
)

data class HeatmapData(
    val geohash: String,
    val recentRecords: List<RecentRecord>,
    val avgDepth: Double,
    val avgYield: Double
)

data class RecentRecord(
    val depth: Double,
    val yield: Double,
    val timestamp: Long
)

/**
 * Live alert message.
 */
data class LiveAlert(
    val type: String,
    val alert: AlertData,
    val timestamp: Long
)

data class AlertData(
    val id: String,
    val severity: String,
    val message: String,
    val geohash: String
)

/**
 * AI chat message (streaming).
 */
data class AIChatMessage(
    val type: String,
    val content: String,
    val timestamp: Long
)
