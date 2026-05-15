package com.antharjala.watch.presentation.screens.log

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.antharjala.watch.presentation.viewmodel.BorewellInputUiState
import com.antharjala.watch.presentation.viewmodel.BorewellInputViewModel

/**
 * Borewell data input screen.
 * Requirements: 1.1, 1.4, 1.5, 1.8
 * DAY 1: Offline-first with real-time validation.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BorewellInputScreen(
    viewModel: BorewellInputViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val depth by viewModel.depth.collectAsState()
    val yield by viewModel.yield.collectAsState()
    val depthError by viewModel.depthError.collectAsState()
    val yieldError by viewModel.yieldError.collectAsState()
    val geohash by viewModel.geohash.collectAsState()
    val pendingSyncCount by viewModel.pendingSyncCount.collectAsState()
    
    val snackbarHostState = remember { SnackbarHostState() }
    
    // Show success/error messages
    LaunchedEffect(uiState) {
        when (val state = uiState) {
            is BorewellInputUiState.Success -> {
                snackbarHostState.showSnackbar(
                    message = state.message,
                    duration = SnackbarDuration.Short
                )
                viewModel.resetState()
            }
            is BorewellInputUiState.Error -> {
                snackbarHostState.showSnackbar(
                    message = state.message,
                    duration = SnackbarDuration.Long
                )
            }
            is BorewellInputUiState.SyncComplete -> {
                snackbarHostState.showSnackbar(
                    message = "Synced ${state.count} records",
                    duration = SnackbarDuration.Short
                )
                viewModel.resetState()
            }
            else -> {}
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Log Borewell Data") },
                actions = {
                    // Sync indicator
                    if (pendingSyncCount > 0) {
                        IconButton(onClick = { viewModel.forceSyncNow() }) {
                            Badge(
                                content = { Text(pendingSyncCount.toString()) }
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Sync,
                                    contentDescription = "Sync pending records"
                                )
                            }
                        }
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Location status
            LocationStatusCard(
                geohash = geohash,
                uiState = uiState,
                onRefreshLocation = { viewModel.getCurrentLocation() }
            )
            
            // Depth input
            OutlinedTextField(
                value = depth,
                onValueChange = viewModel::updateDepth,
                label = { Text("Borewell Depth (meters)") },
                placeholder = { Text("e.g., 45.5") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                isError = depthError != null,
                supportingText = {
                    if (depthError != null) {
                        Text(
                            text = depthError,
                            color = MaterialTheme.colorScheme.error
                        )
                    } else {
                        Text("Range: 0 - 500 meters")
                    }
                }
            )
            
            // Yield input
            OutlinedTextField(
                value = yield,
                onValueChange = viewModel::updateYield,
                label = { Text("Water Yield (L/h)") },
                placeholder = { Text("e.g., 1200") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                isError = yieldError != null,
                supportingText = {
                    if (yieldError != null) {
                        Text(
                            text = yieldError,
                            color = MaterialTheme.colorScheme.error
                        )
                    } else {
                        Text("Range: 0 - 50,000 L/h")
                    }
                }
            )
            
            Spacer(modifier = Modifier.weight(1f))
            
            // Submit button
            Button(
                onClick = { viewModel.submitData() },
                modifier = Modifier.fillMaxWidth(),
                enabled = uiState !is BorewellInputUiState.Submitting &&
                        depth.isNotEmpty() &&
                        yield.isNotEmpty() &&
                        depthError == null &&
                        yieldError == null &&
                        geohash != null
            ) {
                if (uiState is BorewellInputUiState.Submitting) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Icon(
                    imageVector = Icons.Default.CloudUpload,
                    contentDescription = null
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Submit Data")
            }
            
            // Offline indicator
            if (pendingSyncCount > 0) {
                Text(
                    text = "$pendingSyncCount record(s) pending sync",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.align(Alignment.CenterHorizontally)
                )
            }
        }
    }
}

@Composable
private fun LocationStatusCard(
    geohash: String?,
    uiState: BorewellInputUiState,
    onRefreshLocation: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = when (uiState) {
                is BorewellInputUiState.LocationReady -> MaterialTheme.colorScheme.primaryContainer
                is BorewellInputUiState.Warning -> MaterialTheme.colorScheme.errorContainer
                else -> MaterialTheme.colorScheme.surfaceVariant
            }
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = when (uiState) {
                            is BorewellInputUiState.LocationReady -> MaterialTheme.colorScheme.primary
                            is BorewellInputUiState.Warning -> MaterialTheme.colorScheme.error
                            else -> MaterialTheme.colorScheme.onSurfaceVariant
                        }
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = when (uiState) {
                            is BorewellInputUiState.LoadingLocation -> "Getting location..."
                            is BorewellInputUiState.LocationReady -> "Location ready"
                            is BorewellInputUiState.Warning -> "Location warning"
                            else -> "Location unavailable"
                        },
                        style = MaterialTheme.typography.titleSmall
                    )
                }
                
                if (geohash != null) {
                    Text(
                        text = "Geohash: $geohash",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
                
                if (uiState is BorewellInputUiState.Warning) {
                    Text(
                        text = uiState.message,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
            }
            
            if (uiState !is BorewellInputUiState.LoadingLocation) {
                TextButton(onClick = onRefreshLocation) {
                    Text("Refresh")
                }
            }
        }
    }
}
