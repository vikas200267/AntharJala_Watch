# ========================================
# API Keys Setup Script (Windows PowerShell)
# ========================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Anthar-Jala Watch - API Keys Setup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Create .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    New-Item -Path ".env" -ItemType File | Out-Null
    Write-Host "Created .env file" -ForegroundColor Green
}

Write-Host "This script will help you configure all required API keys." -ForegroundColor Yellow
Write-Host ""

# Function to add or update environment variable
function Add-EnvVar {
    param(
        [string]$Key,
        [string]$Value
    )
    
    $content = Get-Content ".env" -ErrorAction SilentlyContinue
    $found = $false
    
    $newContent = $content | ForEach-Object {
        if ($_ -match "^$Key=") {
            $found = $true
            "$Key=$Value"
        } else {
            $_
        }
    }
    
    if (-not $found) {
        $newContent += "$Key=$Value"
    }
    
    $newContent | Set-Content ".env"
}

# ========================================
# Essential APIs (Required)
# ========================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "ESSENTIAL APIs (Required for core features)" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Gemini API
Write-Host "1. Google Gemini API Key" -ForegroundColor Yellow
Write-Host "   Get it from: https://makersuite.google.com/app/apikey" -ForegroundColor Gray
Write-Host "   Cost: FREE" -ForegroundColor Green
$GEMINI_KEY = Read-Host "   Enter GEMINI_API_KEY (or press Enter to skip)"
if ($GEMINI_KEY) {
    Add-EnvVar "GEMINI_API_KEY" $GEMINI_KEY
    Write-Host "   ✓ Gemini API key saved" -ForegroundColor Green
} else {
    Write-Host "   ⚠ Skipped - AI features will not work" -ForegroundColor Yellow
}
Write-Host ""

# Google Maps API
Write-Host "2. Google Maps API Key (for Android app)" -ForegroundColor Yellow
Write-Host "   Get it from: https://console.cloud.google.com/google/maps-apis" -ForegroundColor Gray
Write-Host "   Cost: `$200 free credit/month" -ForegroundColor Green
$MAPS_KEY = Read-Host "   Enter GOOGLE_MAPS_API_KEY (or press Enter to skip)"
if ($MAPS_KEY) {
    Add-EnvVar "GOOGLE_MAPS_API_KEY" $MAPS_KEY
    Write-Host "   ✓ Google Maps API key saved" -ForegroundColor Green
} else {
    Write-Host "   ⚠ Skipped - Map features will show placeholder" -ForegroundColor Yellow
}
Write-Host ""

# Firebase
Write-Host "3. Firebase Configuration (for push notifications)" -ForegroundColor Yellow
Write-Host "   Get it from: https://console.firebase.google.com/" -ForegroundColor Gray
Write-Host "   Go to Project Settings → Service Accounts → Generate New Private Key" -ForegroundColor Gray
Write-Host "   Cost: FREE" -ForegroundColor Green
$FIREBASE_PROJECT = Read-Host "   Enter FIREBASE_PROJECT_ID (or press Enter to skip)"
if ($FIREBASE_PROJECT) {
    Add-EnvVar "FIREBASE_PROJECT_ID" $FIREBASE_PROJECT
    
    $FIREBASE_EMAIL = Read-Host "   Enter FIREBASE_CLIENT_EMAIL"
    Add-EnvVar "FIREBASE_CLIENT_EMAIL" $FIREBASE_EMAIL
    
    Write-Host "   Enter FIREBASE_PRIVATE_KEY (paste the entire key):" -ForegroundColor Gray
    $FIREBASE_KEY = Read-Host
    Add-EnvVar "FIREBASE_PRIVATE_KEY" $FIREBASE_KEY
    
    Write-Host "   ✓ Firebase configuration saved" -ForegroundColor Green
} else {
    Write-Host "   ⚠ Skipped - Push notifications will not work" -ForegroundColor Yellow
}
Write-Host ""

# ========================================
# Enhanced AI APIs (Optional but Recommended)
# ========================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "ENHANCED AI APIs (Optional - for better AI)" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Claude API
Write-Host "4. Anthropic Claude API Key" -ForegroundColor Yellow
Write-Host "   Get it from: https://console.anthropic.com/" -ForegroundColor Gray
Write-Host "   Cost: `$5 free credit, then `$3-`$15 per million tokens" -ForegroundColor Green
$CLAUDE_KEY = Read-Host "   Enter ANTHROPIC_API_KEY (or press Enter to skip)"
if ($CLAUDE_KEY) {
    Add-EnvVar "ANTHROPIC_API_KEY" $CLAUDE_KEY
    Write-Host "   ✓ Claude API key saved" -ForegroundColor Green
} else {
    Write-Host "   ⚠ Skipped - Will use only Gemini for AI" -ForegroundColor Yellow
}
Write-Host ""

# OpenAI API
Write-Host "5. OpenAI API Key (GPT-4)" -ForegroundColor Yellow
Write-Host "   Get it from: https://platform.openai.com/api-keys" -ForegroundColor Gray
Write-Host "   Cost: `$5-`$30 per million tokens" -ForegroundColor Green
$OPENAI_KEY = Read-Host "   Enter OPENAI_API_KEY (or press Enter to skip)"
if ($OPENAI_KEY) {
    Add-EnvVar "OPENAI_API_KEY" $OPENAI_KEY
    Write-Host "   ✓ OpenAI API key saved" -ForegroundColor Green
} else {
    Write-Host "   ⚠ Skipped - Will use only Gemini for AI" -ForegroundColor Yellow
}
Write-Host ""

# OpenWeatherMap API
Write-Host "6. OpenWeatherMap API Key (for rainfall forecasts)" -ForegroundColor Yellow
Write-Host "   Get it from: https://openweathermap.org/api" -ForegroundColor Gray
Write-Host "   Cost: FREE tier (1000 calls/day), Paid: `$40/month" -ForegroundColor Green
$WEATHER_KEY = Read-Host "   Enter OPENWEATHER_API_KEY (or press Enter to skip)"
if ($WEATHER_KEY) {
    Add-EnvVar "OPENWEATHER_API_KEY" $WEATHER_KEY
    Write-Host "   ✓ OpenWeatherMap API key saved" -ForegroundColor Green
} else {
    Write-Host "   ⚠ Skipped - Will use only historical weather data" -ForegroundColor Yellow
}
Write-Host ""

# ========================================
# Advanced APIs (Optional)
# ========================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "ADVANCED APIs (Optional - for advanced features)" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# NASA Earthdata
Write-Host "7. NASA Earthdata Token (for soil moisture data)" -ForegroundColor Yellow
Write-Host "   Get it from: https://urs.earthdata.nasa.gov/" -ForegroundColor Gray
Write-Host "   Cost: FREE" -ForegroundColor Green
$NASA_TOKEN = Read-Host "   Enter NASA_EARTHDATA_TOKEN (or press Enter to skip)"
if ($NASA_TOKEN) {
    Add-EnvVar "NASA_EARTHDATA_TOKEN" $NASA_TOKEN
    Write-Host "   ✓ NASA Earthdata token saved" -ForegroundColor Green
} else {
    Write-Host "   ⚠ Skipped - Soil moisture data will be estimated" -ForegroundColor Yellow
}
Write-Host ""

# SageMaker Endpoint
Write-Host "8. AWS SageMaker Endpoint (for ML predictions)" -ForegroundColor Yellow
Write-Host "   Deploy ML model first, then enter endpoint name" -ForegroundColor Gray
Write-Host "   Cost: ~`$0.10/hour for inference" -ForegroundColor Green
$SAGEMAKER_EP = Read-Host "   Enter SAGEMAKER_ENDPOINT (or press Enter to skip)"
if ($SAGEMAKER_EP) {
    Add-EnvVar "SAGEMAKER_ENDPOINT" $SAGEMAKER_EP
    Write-Host "   ✓ SageMaker endpoint saved" -ForegroundColor Green
} else {
    Write-Host "   ⚠ Skipped - Will use AI models for predictions" -ForegroundColor Yellow
}
Write-Host ""

# ========================================
# Summary
# ========================================

Write-Host "=========================================" -ForegroundColor Green
Write-Host "SETUP COMPLETE!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Configuration saved to: .env" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configured APIs:" -ForegroundColor Yellow
Get-Content ".env" | Where-Object { $_ -match "=" } | ForEach-Object {
    $key = ($_ -split "=")[0]
    Write-Host "  ✓ $key" -ForegroundColor Green
}
Write-Host ""

# Count configured vs total
$TOTAL_APIS = 8
$CONFIGURED = (Get-Content ".env" | Where-Object { $_ -match "=" }).Count
Write-Host "Progress: $CONFIGURED/$TOTAL_APIS APIs configured" -ForegroundColor Cyan
Write-Host ""

# Next steps
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Review the .env file:" -ForegroundColor Yellow
Write-Host "   Get-Content .env" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Deploy to AWS Lambda:" -ForegroundColor Yellow
Write-Host "   cd infrastructure\cdk" -ForegroundColor Gray
Write-Host "   npm install" -ForegroundColor Gray
Write-Host "   npx cdk deploy" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Update Android app with Google Maps API key:" -ForegroundColor Yellow
Write-Host "   Edit: app\src\main\AndroidManifest.xml" -ForegroundColor Gray
Write-Host "   Add: <meta-data android:name=`"com.google.android.geo.API_KEY`" android:value=`"YOUR_KEY`"/>" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Install required npm packages in Lambda functions:" -ForegroundColor Yellow
Write-Host "   cd backend\lambda\ai-realtime-engine" -ForegroundColor Gray
Write-Host "   npm install ngeohash @google/generative-ai @anthropic-ai/sdk openai" -ForegroundColor Gray
Write-Host ""

Write-Host "Setup complete! You can now deploy your backend." -ForegroundColor Green
Write-Host ""
