# Update all Lambda functions with latest code and environment variables
$ErrorActionPreference = "Stop"

Write-Host "=== Updating Lambda Functions ===" -ForegroundColor Cyan

# Load environment variables from .env file
$envFile = "..\\.env"
if (Test-Path $envFile) {
    Write-Host "Loading environment variables from .env file..." -ForegroundColor Yellow
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            # Remove quotes if present
            $value = $value -replace '^"(.*)"$', '$1'
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

# Define Lambda functions
$lambdaFunctions = @(
    "antharjala-data-ingest",
    "antharjala-stream-processor",
    "antharjala-heatmap-query",
    "antharjala-ai-advisor",
    "antharjala-alert-detector",
    "antharjala-notification-sender",
    "antharjala-user-history",
    "antharjala-websocket-handler",
    "antharjala-analytics-engine",
    "antharjala-ai-realtime-engine"
)

# Create deployment packages and update functions
foreach ($functionName in $lambdaFunctions) {
    Write-Host "`nProcessing $functionName..." -ForegroundColor Green
    
    # Extract the function directory name (remove antharjala- prefix)
    $dirName = $functionName -replace '^antharjala-', ''
    $lambdaDir = "..\\lambda\\$dirName"
    
    if (-not (Test-Path $lambdaDir)) {
        Write-Host "  Directory not found: $lambdaDir - Skipping" -ForegroundColor Yellow
        continue
    }
    
    # Create deployment package
    Write-Host "  Creating deployment package..." -ForegroundColor Cyan
    $zipFile = "$functionName.zip"
    
    # Remove old zip if exists
    if (Test-Path $zipFile) {
        Remove-Item $zipFile -Force
    }
    
    # Create zip file
    Push-Location $lambdaDir
    
    # Check if node_modules exists, if not install dependencies
    if (-not (Test-Path "node_modules")) {
        Write-Host "  Installing dependencies..." -ForegroundColor Yellow
        npm install --production 2>&1 | Out-Null
    }
    
    # Create zip with all files
    Compress-Archive -Path * -DestinationPath "..\\..\\infrastructure\\$zipFile" -Force
    Pop-Location
    
    # Update Lambda function code
    Write-Host "  Updating function code..." -ForegroundColor Cyan
    try {
        aws lambda update-function-code `
            --function-name $functionName `
            --zip-file "fileb://$zipFile" `
            --region us-east-1 2>&1 | Out-Null
        Write-Host "  Code updated successfully" -ForegroundColor Green
    } catch {
        Write-Host "  Failed to update code: $_" -ForegroundColor Red
    }
    
    # Wait for function to be ready
    Start-Sleep -Seconds 2
    
    # Update environment variables
    Write-Host "  Updating environment variables..." -ForegroundColor Cyan
    
    $envVars = @{
        GEMINI_API_KEY = $env:GEMINI_API_KEY
        GOOGLE_MAPS_API_KEY = $env:GOOGLE_MAPS_API_KEY
        FIREBASE_PROJECT_ID = $env:FIREBASE_PROJECT_ID
        FIREBASE_CLIENT_EMAIL = $env:FIREBASE_CLIENT_EMAIL
        FIREBASE_PRIVATE_KEY = $env:FIREBASE_PRIVATE_KEY
        OPENWEATHER_API_KEY = $env:OPENWEATHER_API_KEY
        OPENAI_API_KEY = $env:OPENAI_API_KEY
        DYNAMODB_TABLE = "antharjala-borewell-data"
        KINESIS_STREAM = "antharjala-data-stream"
        SNS_TOPIC_ARN = "arn:aws:sns:us-east-1:260932761099:antharjala-alerts"
        WEBSOCKET_API_ENDPOINT = "wss://your-websocket-api-id.execute-api.us-east-1.amazonaws.com/prod"
    }
    
    # Convert to JSON format for AWS CLI
    $envVarsJson = ($envVars.GetEnumerator() | ForEach-Object { 
        "`"$($_.Key)`":`"$($_.Value)`"" 
    }) -join ","
    $envVarsJson = "{Variables:{$envVarsJson}}"
    
    try {
        aws lambda update-function-configuration `
            --function-name $functionName `
            --environment $envVarsJson `
            --region us-east-1 2>&1 | Out-Null
        Write-Host "  Environment variables updated successfully" -ForegroundColor Green
    } catch {
        Write-Host "  Failed to update environment variables: $_" -ForegroundColor Red
    }
    
    # Clean up zip file
    Remove-Item $zipFile -Force
    
    Write-Host "  $functionName updated!" -ForegroundColor Green
}

Write-Host "`n=== All Lambda Functions Updated ===" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Test the Lambda functions using AWS Console or CLI"
Write-Host "2. Configure API Gateway endpoints"
Write-Host "3. Set up CloudWatch monitoring"
Write-Host "4. Update the Android app with the API endpoints"
