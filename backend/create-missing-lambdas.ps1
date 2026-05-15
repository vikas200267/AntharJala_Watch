# Create Missing Lambda Functions
param(
    [string]$Region = "us-east-1"
)

$ROLE_ARN = "arn:aws:iam::260932761099:role/anthar-jala-watch-lambda-role-prod"

# Functions to create
$functionsToCreate = @(
    @{Name="anthar-jala-stream-processor"; Path="lambda/stream-processor"; Handler="index.handler"; Runtime="nodejs18.x"},
    @{Name="anthar-jala-websocket-handler"; Path="lambda/websocket-handler"; Handler="index.handler"; Runtime="nodejs18.x"},
    @{Name="anthar-jala-analytics-engine"; Path="lambda/analytics-engine"; Handler="index.handler"; Runtime="nodejs18.x"},
    @{Name="anthar-jala-ai-realtime-engine"; Path="lambda/ai-realtime-engine"; Handler="index.handler"; Runtime="nodejs18.x"}
)

Write-Host "Creating missing Lambda functions..." -ForegroundColor Cyan
Write-Host ""

foreach ($func in $functionsToCreate) {
    $functionName = $func.Name
    $functionPath = $func.Path
    $handler = $func.Handler
    $runtime = $func.Runtime
    
    Write-Host "Creating: $functionName" -ForegroundColor Yellow
    
    # Check if directory exists
    if (-not (Test-Path $functionPath)) {
        Write-Host "  Error: Directory not found: $functionPath" -ForegroundColor Red
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
        
        # Create Lambda function
        Write-Host "  Creating Lambda function in AWS..." -ForegroundColor Gray
        
        aws lambda create-function `
            --function-name $functionName `
            --runtime $runtime `
            --role $ROLE_ARN `
            --handler $handler `
            --zip-file fileb://$zipFile `
            --timeout 30 `
            --memory-size 512 `
            --region $Region `
            --environment "Variables={NODE_ENV=production}" `
            --output json | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Success: $functionName created" -ForegroundColor Green
        } else {
            Write-Host "  Error: Failed to create $functionName" -ForegroundColor Red
        }
        
        # Cleanup
        if (Test-Path $zipFile) {
            Remove-Item $zipFile -Force
        }
        
    } catch {
        Write-Host "  Error: $_" -ForegroundColor Red
    } finally {
        Pop-Location
    }
    
    Write-Host ""
}

Write-Host "Done!" -ForegroundColor Green
