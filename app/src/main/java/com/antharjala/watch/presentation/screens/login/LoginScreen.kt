package com.antharjala.watch.presentation.screens.login

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.antharjala.watch.presentation.viewmodel.AuthUiState
import com.antharjala.watch.presentation.viewmodel.AuthViewModel

/**
 * Login screen with OTP authentication.
 * Requirements: 13.1, 13.3
 * DAY 1: Production-level with auto OTP detection support.
 */
@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val phoneNumber by viewModel.phoneNumber.collectAsState()
    val otpCode by viewModel.otpCode.collectAsState()
    
    // Navigate on success
    LaunchedEffect(uiState) {
        if (uiState is AuthUiState.Success) {
            onLoginSuccess()
        }
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Anthar-Jala Watch",
            style = MaterialTheme.typography.headlineLarge,
            color = MaterialTheme.colorScheme.primary
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        Text(
            text = "Groundwater Monitoring",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        
        Spacer(modifier = Modifier.height(48.dp))
        
        when (uiState) {
            is AuthUiState.Initial, is AuthUiState.Error -> {
                PhoneNumberInput(
                    phoneNumber = phoneNumber,
                    onPhoneNumberChange = viewModel::updatePhoneNumber,
                    onSendOtp = viewModel::sendOtp,
                    isLoading = uiState is AuthUiState.Loading,
                    error = (uiState as? AuthUiState.Error)?.message
                )
            }
            
            is AuthUiState.OtpSent, is AuthUiState.Loading -> {
                OtpInput(
                    otpCode = otpCode,
                    onOtpCodeChange = viewModel::updateOtpCode,
                    onVerifyOtp = viewModel::verifyOtp,
                    onResendOtp = viewModel::resendOtp,
                    isLoading = uiState is AuthUiState.Loading,
                    error = (uiState as? AuthUiState.Error)?.message
                )
            }
            
            is AuthUiState.Success -> {
                CircularProgressIndicator()
            }
        }
    }
}

@Composable
private fun PhoneNumberInput(
    phoneNumber: String,
    onPhoneNumberChange: (String) -> Unit,
    onSendOtp: () -> Unit,
    isLoading: Boolean,
    error: String?
) {
    OutlinedTextField(
        value = phoneNumber,
        onValueChange = onPhoneNumberChange,
        label = { Text("Phone Number") },
        placeholder = { Text("+91 1234567890") },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
        enabled = !isLoading,
        isError = error != null
    )
    
    if (error != null) {
        Text(
            text = error,
            color = MaterialTheme.colorScheme.error,
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.padding(top = 4.dp)
        )
    }
    
    Spacer(modifier = Modifier.height(16.dp))
    
    Button(
        onClick = onSendOtp,
        modifier = Modifier.fillMaxWidth(),
        enabled = !isLoading && phoneNumber.isNotEmpty()
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                color = MaterialTheme.colorScheme.onPrimary
            )
        } else {
            Text("Send OTP")
        }
    }
}

@Composable
private fun OtpInput(
    otpCode: String,
    onOtpCodeChange: (String) -> Unit,
    onVerifyOtp: () -> Unit,
    onResendOtp: () -> Unit,
    isLoading: Boolean,
    error: String?
) {
    Text(
        text = "Enter OTP",
        style = MaterialTheme.typography.titleMedium
    )
    
    Spacer(modifier = Modifier.height(16.dp))
    
    OutlinedTextField(
        value = otpCode,
        onValueChange = onOtpCodeChange,
        label = { Text("OTP Code") },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
        enabled = !isLoading,
        isError = error != null
    )
    
    if (error != null) {
        Text(
            text = error,
            color = MaterialTheme.colorScheme.error,
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.padding(top = 4.dp)
        )
    }
    
    Spacer(modifier = Modifier.height(16.dp))
    
    Button(
        onClick = onVerifyOtp,
        modifier = Modifier.fillMaxWidth(),
        enabled = !isLoading && otpCode.length == 6
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                color = MaterialTheme.colorScheme.onPrimary
            )
        } else {
            Text("Verify OTP")
        }
    }
    
    Spacer(modifier = Modifier.height(8.dp))
    
    TextButton(
        onClick = onResendOtp,
        enabled = !isLoading
    ) {
        Text("Resend OTP")
    }
}
