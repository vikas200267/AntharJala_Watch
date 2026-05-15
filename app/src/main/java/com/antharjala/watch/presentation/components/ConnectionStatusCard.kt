package com.antharjala.watch.presentation.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun ConnectionStatusCard(
    isOnline: Boolean,
    isBackendConnected: Boolean,
    pendingSyncCount: Int,
    onTestConnection: () -> Unit,
    onForceSync: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(
            containerColor = when {
                !isOnline -> Color(0xFFFFEBEE)
                !isBackendConnected -> Color(0xFFFFF3E0)
                pendingSyncCount > 0 -> Color(0xFFE3F2FD)
                else -> Color(0xFFE8F5E8)
            }
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Connection Status",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                
                IconButton(
                    onClick = onTestConnection,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Refresh,
                        contentDescription = "Test connection",
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Network Status
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = if (isOnline) Icons.Default.Wifi else Icons.Default.WifiOff,
                    contentDescription = null,
                    tint = if (isOnline) Color(0xFF4CAF50) else Color(0xFFD32F2F),
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = if (isOnline) "Network: Online" else "Network: Offline",
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Backend Status
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = if (isBackendConnected) Icons.Default.Cloud else Icons.Default.CloudOff,
                    contentDescription = null,
                    tint = if (isBackendConnected) Color(0xFF4CAF50) else Color(0xFFFF9800),
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = if (isBackendConnected) "Backend: Connected" else "Backend: Disconnected",
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Sync Status
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = if (pendingSyncCount == 0) Icons.Default.CloudDone else Icons.Default.CloudSync,
                        contentDescription = null,
                        tint = if (pendingSyncCount == 0) Color(0xFF4CAF50) else Color(0xFF2196F3),
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (pendingSyncCount == 0) "All synced" else "$pendingSyncCount pending",
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                
                if (pendingSyncCount > 0 && isOnline && isBackendConnected) {
                    TextButton(
                        onClick = onForceSync
                    ) {
                        Text("Sync Now")
                    }
                }
            }
        }
    }
}