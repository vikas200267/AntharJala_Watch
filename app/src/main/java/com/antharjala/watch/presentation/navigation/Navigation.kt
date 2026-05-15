package com.antharjala.watch.presentation.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.antharjala.watch.presentation.screens.ai_guide.AIGuideScreen
import com.antharjala.watch.presentation.screens.alerts.AlertsScreen
import com.antharjala.watch.presentation.screens.history.HistoryScreen
import com.antharjala.watch.presentation.screens.log.BorewellInputScreen
import com.antharjala.watch.presentation.screens.login.LoginScreen
import com.antharjala.watch.presentation.screens.map.MapScreen

sealed class Screen(val route: String, val title: String, val icon: ImageVector) {
    object Login : Screen("login", "Login", Icons.Default.Login)
    object Map : Screen("map", "Map", Icons.Default.Map)
    object Log : Screen("log", "Log Data", Icons.Default.Add)
    object History : Screen("history", "History", Icons.Default.History)
    object AIGuide : Screen("ai_guide", "AI Guide", Icons.Default.Psychology)
    object Alerts : Screen("alerts", "Alerts", Icons.Default.Warning)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainNavigation(
    isLoggedIn: Boolean,
    onLogout: () -> Unit
) {
    val navController = rememberNavController()
    
    if (!isLoggedIn) {
        LoginScreen(
            onLoginSuccess = {
                // Navigation will be handled by the parent composable
            }
        )
    } else {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { 
                        Text("Anthar-Jala Watch") 
                    },
                    actions = {
                        IconButton(onClick = onLogout) {
                            Icon(
                                imageVector = Icons.Default.Logout,
                                contentDescription = "Logout"
                            )
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer
                    )
                )
            },
            bottomBar = {
                NavigationBar {
                    val navBackStackEntry by navController.currentBackStackEntryAsState()
                    val currentDestination = navBackStackEntry?.destination
                    
                    val items = listOf(
                        Screen.Map,
                        Screen.Log,
                        Screen.History,
                        Screen.AIGuide,
                        Screen.Alerts
                    )
                    
                    items.forEach { screen ->
                        NavigationBarItem(
                            icon = { 
                                Icon(screen.icon, contentDescription = screen.title)
                            },
                            label = { Text(screen.title) },
                            selected = currentDestination?.hierarchy?.any { 
                                it.route == screen.route 
                            } == true,
                            onClick = {
                                navController.navigate(screen.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        )
                    }
                }
            }
        ) { innerPadding ->
            NavHost(
                navController = navController,
                startDestination = Screen.Map.route,
                modifier = Modifier.padding(innerPadding)
            ) {
                composable(Screen.Map.route) {
                    MapScreen()
                }
                composable(Screen.Log.route) {
                    BorewellInputScreen()
                }
                composable(Screen.History.route) {
                    HistoryScreen()
                }
                composable(Screen.AIGuide.route) {
                    AIGuideScreen()
                }
                composable(Screen.Alerts.route) {
                    AlertsScreen()
                }
            }
        }
    }
}