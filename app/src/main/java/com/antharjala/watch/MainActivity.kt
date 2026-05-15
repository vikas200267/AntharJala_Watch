package com.antharjala.watch

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import com.antharjala.watch.presentation.navigation.MainNavigation
import com.antharjala.watch.presentation.theme.AntharJalaWatchTheme
import com.antharjala.watch.presentation.viewmodel.AuthViewModel
import dagger.hilt.android.AndroidEntryPoint

/**
 * Main activity with enhanced navigation and UI/UX.
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AntharJalaWatchTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    MainApp()
                }
            }
        }
    }
}

@Composable
fun MainApp(
    authViewModel: AuthViewModel = hiltViewModel()
) {
    val authState by authViewModel.authState.collectAsState()
    
    MainNavigation(
        isLoggedIn = authState.isLoggedIn,
        onLogout = {
            authViewModel.logout()
        }
    )
}
