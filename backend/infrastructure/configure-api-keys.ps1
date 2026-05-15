# Configure API Keys for Lambda Functions
# Run this after deploying Lambda functions to AWS

param(
    [string]$Region = "ap-south-1",
    [string]$Environment = "dev"
)

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Configure API Keys for Lambda Functions" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Load API keys from .env file
$envFile = Join-Path -Path $PSScriptRoot -ChildPath "..\\.env"

if (-not (Test-Path $envFile)) {
    Write-Host "❌ Error: backend/.env file not found!" -ForegroundColor Red
    Write-Host "Please create backend/.env with your API keys" -ForegroundColor Yellow
    exit 1
}

Write-Host "📄 Reading API keys from backend/.env..." -ForegroundColor Cyan

# Parse .env file
$envVars = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        $envVars[$key] = $value
    }
}

$GEMINI_KEY = $envVars["GEMINI_API_KEY"]
$WEATHER_KEY = $envVars["OPENWEATHER_API_KEY"]
$OPENAI_KEY = $envVars["OPENAI_API_KEY"]

Write-Host "✓ Gemini API Key: $($GEMINI_KEY.Substring(0, 20))..." -ForegroundColor Green
Write-Host "✓ Weather API Key: $($WEATHER_KEY.Substring(0, 10))..." -ForegroundColor Green

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Updating Lambda Functions" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# AI Functions that need Gemini API key
$aiFunctions = @(
    "ai-advisor",
    "ai-realtime-engine",
    "analytics-engine"
)

foreach ($func in $aiFunctions) {
    $functionName = "anthar-jala-$Environment-$func"
    Write-Host "Updating $functionName..." -ForegroundColor Cyan
    
    try {
        aws lambda update-function-configuration `
            --function-name $functionName `
            --environment "Variables={GEMINI_API_KEY=$GEMINI_KEY}" `
            --region $Region `
            --output json | Out-Null
        
        Write-Host "  ✓ Updated $functionName" -ForegroundColor Green
    }
    catch {
        Write-Host "  ❌ Failed to update $functionName" -ForegroundColor Red
        Write-Host "  Error: $_" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds 1
}

# Alert Detector needs Weather API key
Write-Host ""
Write-Host "Updating alert-detector with Weather API..." -ForegroundColor Cyan

try {
    aws lambda update-function-configuration `
        --function-name "anthar-jala-$Environment-alert-detector" `
        --environment "Variables={OPENWEATHER_API_KEY=$WEATHER_KEY}" `
        --region $Region `
        --output json | Out-Null
    
    Write-Host "  ✓ Updated alert-detector" -ForegroundColor Green
}
catch {
    Write-Host "  ❌ Failed to update alert-detector" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ API Keys Configuration Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test Lambda functions with API calls" -ForegroundColor White
Write-Host "2. Check CloudWatch Logs for any errors" -ForegroundColor White
Write-Host "3. Verify AI features work in Android app" -ForegroundColor White
Write-Host ""

# Verify configuration
Write-Host "Verifying configuration..." -ForegroundColor Cyan
Write-Host ""

foreach ($func in $aiFunctions) {
    $functionName = "anthar-jala-$Environment-$func"
    $config = aws lambda get-function-configuration `
        --function-name $functionName `
        --region $Region `
        --query 'Environment.Variables.GEMINI_API_KEY' `
        --output text 2>$null
    
    if ($config) {
        Write-Host "  ✓ $functionName has GEMINI_API_KEY configured" -ForegroundColor Green
    }
    else {
        Write-Host "  ❌ $functionName missing GEMINI_API_KEY" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Done! 🚀" -ForegroundColor Green
