# Update all Lambda functions with latest code and environment variables
$ErrorActionPreference = "Continue"

Write-Host "=== Updating Lambda Functions ===" -ForegroundColor Cyan

# Load environment variables from .env file
$envFile = "..\\.env"
$envVars = @{}

if (Test-Path $envFile) {
    Write-Host "Loading environment variables from .env file..." -ForegroundColor Yellow
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            # Remove quotes if present
            $value = $value -replace '^"(.*)"$', '$1'
            $envVars[$key] = $value
        }
    }
}

# Define Lambda functions with their directories
$lambdaFunctions = @{
    "antharjala-data-ingest" = "data-ingest"
    "antharjala-stream-processor" = "stream-processor"
    "antharjala-heatmap-query" = "heatmap-query"
    "antharjala-ai-advisor" = "ai-advisor"
    "antharjala-alert-detector" = "alert-detector"
    "antharjala-notification-sender" = "notification-sender"
    "antharjala-user-history" = "user-history"
    "antharjala-websocket-handler" = "websocket-handler"
    "antharjala-analytics-engine" = "analytics-engine"
    "antharjala-ai-realtime-engine" = "ai-realtime-engine"
}

# Process each Lambda function
foreach ($functionName in $lambdaFunctions.Keys) {
    $dirName = $lambdaFunctions[$functionName]
    $lambdaDir = "..\\lambda\\$dirName"
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Processing: $functionName" -ForegroundColor Green
    Write-Host "Directory: $lambdaDir" -ForegroundColor Gray
    
    if (-not (Test-Path $lambdaDir)) {
        Write-Host "  [SKIP] Directory not found" -ForegroundColor Yellow
        continue
    }
    
    # Check if package.json exists
    $packageJson = Join-Path $lambdaDir "package.json"
    if (Test-Path $packageJson) {
        Write-Host "  [1/4] Installing dependencies..." -ForegroundColor Cyan
        Push-Location $lambdaDir
        
        # Remove node_modules and package-lock.json for clean install
        if (Test-Path "node_modules") {
            Remove-Item "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
        }
        if (Test-Path "package-lock.json") {
            Remove-Item "package-lock.json" -Force -ErrorAction SilentlyContinue
        }
        
        # Install dependencies
        $npmOutput = npm install --omit=dev 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  [ERROR] Failed to install dependencies" -ForegroundColor Red
            Write-Host "  Output: $npmOutput" -ForegroundColor Red
            Pop-Location
            continue
        }
        
        Pop-Location
        Write-Host "  [OK] Dependencies installed" -ForegroundColor Green
    }
    
    # Create deployment package
    Write-Host "  [2/4] Creating deployment package..." -ForegroundColor Cyan
    $zipFile = "$functionName.zip"
    
    # Remove old zip if exists
    if (Test-Path $zipFile) {
        Remove-Item $zipFile -Force
    }
    
    # Create zip file
    Push-Location $lambdaDir
    
    # Use PowerShell's Compress-Archive
    $tempZip = "..\\..\\infrastructure\\$zipFile"
    Compress-Archive -Path * -DestinationPath $tempZip -Force -ErrorAction Stop
    
    Pop-Location
    Write-Host "  [OK] Package created: $zipFile" -ForegroundColor Green
    
    # Update Lambda function code
    Write-Host "  [3/4] Updating function code..." -ForegroundColor Cyan
    $updateResult = aws lambda update-function-code `
        --function-name $functionName `
        --zip-file "fileb://$zipFile" `
        --region us-east-1 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Code updated successfully" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Failed to update code" -ForegroundColor Red
        Write-Host "  Output: $updateResult" -ForegroundColor Red
        Remove-Item $zipFile -Force -ErrorAction SilentlyContinue
        continue
    }
    
    # Wait for function to be ready
    Write-Host "  Waiting for function to be ready..." -ForegroundColor Gray
    Start-Sleep -Seconds 3
    
    # Update environment variables
    Write-Host "  [4/4] Updating environment variables..." -ForegroundColor Cyan
    
    # Build environment variables JSON
    $lambdaEnvVars = @{
        GEMINI_API_KEY = $envVars["GEMINI_API_KEY"]
        GOOGLE_MAPS_API_KEY = $envVars["GOOGLE_MAPS_API_KEY"]
        FIREBASE_PROJECT_ID = $envVars["FIREBASE_PROJECT_ID"]
        FIREBASE_CLIENT_EMAIL = $envVars["FIREBASE_CLIENT_EMAIL"]
        FIREBASE_PRIVATE_KEY = $envVars["FIREBASE_PRIVATE_KEY"]
        OPENWEATHER_API_KEY = $envVars["OPENWEATHER_API_KEY"]
        OPENAI_API_KEY = $envVars["OPENAI_API_KEY"]
        DYNAMODB_TABLE = "antharjala-borewell-data"
        KINESIS_STREAM = "antharjala-data-stream"
        SNS_TOPIC_ARN = "arn:aws:sns:us-east-1:260932761099:antharjala-alerts"
        WEBSOCKET_API_ENDPOINT = "wss://your-websocket-api-id.execute-api.us-east-1.amazonaws.com/prod"
    }
    
    # Create JSON file for environment variables
    $envJsonFile = "env-$functionName.json"
    $envJson = @{
        Variables = $lambdaEnvVars
    } | ConvertTo-Json -Compress
    
    $envJson | Out-File -FilePath $envJsonFile -Encoding utf8 -NoNewline
    
    $envUpdateResult = aws lambda update-function-configuration `
        --function-name $functionName `
        --environment "file://$envJsonFile" `
        --region us-east-1 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Environment variables updated" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Failed to update environment variables" -ForegroundColor Red
        Write-Host "  Output: $envUpdateResult" -ForegroundColor Red
    }
    
    # Clean up
    Remove-Item $zipFile -Force -ErrorAction SilentlyContinue
    Remove-Item $envJsonFile -Force -ErrorAction SilentlyContinue
    
    Write-Host "  [DONE] $functionName updated!" -ForegroundColor Green
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "=== All Lambda Functions Processed ===" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Verify Lambda functions in AWS Console"
Write-Host "2. Test each function with sample events"
Write-Host "3. Configure API Gateway endpoints"
Write-Host "4. Set up CloudWatch monitoring and alarms"
Write-Host "5. Update Android app with API endpoints"
