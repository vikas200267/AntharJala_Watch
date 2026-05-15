# Update All Lambda Functions with Latest Code and Environment Variables
param(
    [string]$Region = "us-east-1"
)

# Load environment variables from .env file
$envVars = @{}
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            # Remove quotes if present
            $value = $value -replace '^"(.*)"$', '$1'
            $envVars[$key] = $value
        }
    }
}

# Lambda functions to update
$lambdaFunctions = @(
    @{Name="anthar-jala-data-ingest"; Path="lambda/data-ingest"},
    @{Name="anthar-jala-heatmap-query"; Path="lambda/heatmap-query"},
    @{Name="anthar-jala-user-history"; Path="lambda/user-history"},
    @{Name="anthar-jala-ai-advisor"; Path="lambda/ai-advisor"},
    @{Name="anthar-jala-ai-realtime-engine"; Path="lambda/ai-realtime-engine"},
    @{Name="anthar-jala-alert-detector"; Path="lambda/alert-detector"},
    @{Name="anthar-jala-stream-processor"; Path="lambda/stream-processor"},
    @{Name="anthar-jala-notification-sender"; Path="lambda/notification-sender"},
    @{Name="anthar-jala-websocket-handler"; Path="lambda/websocket-handler"},
    @{Name="anthar-jala-analytics-engine"; Path="lambda/analytics-engine"}
)

Write-Host "Updating Lambda functions with latest code and environment variables..." -ForegroundColor Cyan
Write-Host ""

$successCount = 0
$failCount = 0

foreach ($lambda in $lambdaFunctions) {
    $functionName = $lambda.Name
    $functionPath = $lambda.Path
    
    Write-Host "Updating: $functionName" -ForegroundColor Yellow
    
    # Check if directory exists
    if (-not (Test-Path $functionPath)) {
        Write-Host "  Error: Directory not found: $functionPath" -ForegroundColor Red
        $failCount++
        continue
    }
    
    # Change to function directory
    Push-Location $functionPath
    
    try {
        # Install dependencies
        if (Test-Path "package.json") {
            Write-Host "  Installing dependencies..." -ForegroundColor Gray
            npm install --production 2>&1 | Out-Null
        }
        
        # Create deployment package
        Write-Host "  Creating deployment package..." -ForegroundColor Gray
        $zipFile = "function.zip"
        
        if (Test-Path $zipFile) {
            Remove-Item $zipFile -Force
        }
        
        # Create zip file
        if (Test-Path "node_modules") {
            Compress-Archive -Path index.js,node_modules,package.json -DestinationPath $zipFile -Force
        } else {
            Compress-Archive -Path index.js -DestinationPath $zipFile -Force
        }
        
        # Update Lambda function code
        Write-Host "  Updating function code..." -ForegroundColor Gray
        
        aws lambda update-function-code `
            --function-name $functionName `
            --zip-file fileb://$zipFile `
            --region $Region `
            --output json | Out-Null
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  Error: Failed to update code" -ForegroundColor Red
            Pop-Location
            $failCount++
            continue
        }
        
        # Wait for function to be ready
        Start-Sleep -Seconds 2
        
        # Update environment variables
        Write-Host "  Updating environment variables..." -ForegroundColor Gray
        
        $envString = "Variables={"
        $envString += "NODE_ENV=production"
        
        if ($envVars.ContainsKey("GEMINI_API_KEY")) {
            $envString += ",GEMINI_API_KEY=$($envVars['GEMINI_API_KEY'])"
        }
        if ($envVars.ContainsKey("GOOGLE_MAPS_API_KEY")) {
            $envString += ",GOOGLE_MAPS_API_KEY=$($envVars['GOOGLE_MAPS_API_KEY'])"
        }
        if ($envVars.ContainsKey("OPENWEATHER_API_KEY")) {
            $envString += ",OPENWEATHER_API_KEY=$($envVars['OPENWEATHER_API_KEY'])"
        }
        if ($envVars.ContainsKey("OPENAI_API_KEY")) {
            $envString += ",OPENAI_API_KEY=$($envVars['OPENAI_API_KEY'])"
        }
        if ($envVars.ContainsKey("FIREBASE_PROJECT_ID")) {
            $envString += ",FIREBASE_PROJECT_ID=$($envVars['FIREBASE_PROJECT_ID'])"
        }
        
        $envString += "}"
        
        aws lambda update-function-configuration `
            --function-name $functionName `
            --environment $envString `
            --region $Region `
            --output json | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Success: $functionName updated" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "  Warning: Code updated but environment variables may have failed" -ForegroundColor Yellow
            $successCount++
        }
        
        # Cleanup
        if (Test-Path $zipFile) {
            Remove-Item $zipFile -Force
        }
        
    } catch {
        Write-Host "  Error: $_" -ForegroundColor Red
        $failCount++
    } finally {
        Pop-Location
    }
    
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Update Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total: $($lambdaFunctions.Count)" -ForegroundColor White
Write-Host "Success: $successCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red
Write-Host ""

if ($failCount -eq 0) {
    Write-Host "All Lambda functions updated successfully!" -ForegroundColor Green
} else {
    Write-Host "Some updates failed. Check errors above." -ForegroundColor Yellow
}
