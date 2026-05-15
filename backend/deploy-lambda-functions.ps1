# Deploy Lambda Functions to AWS
# This script packages and deploys all Lambda functions

param(
    [string]$Region = "us-east-1",
    [switch]$DryRun = $false
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Anthar-Jala Watch Lambda Deployment  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is installed
Write-Host "Checking AWS CLI..." -ForegroundColor Yellow
$awsVersion = aws --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: AWS CLI not found. Please install AWS CLI first." -ForegroundColor Red
    Write-Host "Download from: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}
Write-Host "Success: AWS CLI found: $awsVersion" -ForegroundColor Green
Write-Host ""

# Check AWS credentials
Write-Host "Checking AWS credentials..." -ForegroundColor Yellow
$awsIdentity = aws sts get-caller-identity 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: AWS credentials not configured." -ForegroundColor Red
    Write-Host "Run: aws configure" -ForegroundColor Yellow
    exit 1
}
Write-Host "Success: AWS credentials configured" -ForegroundColor Green
Write-Host ""

# Lambda functions to deploy
$lambdaFunctions = @(
    @{Name="data-ingest"; Path="lambda/data-ingest"},
    @{Name="heatmap-query"; Path="lambda/heatmap-query"},
    @{Name="user-history"; Path="lambda/user-history"},
    @{Name="ai-advisor"; Path="lambda/ai-advisor"},
    @{Name="ai-realtime-engine"; Path="lambda/ai-realtime-engine"},
    @{Name="alert-detector"; Path="lambda/alert-detector"},
    @{Name="stream-processor"; Path="lambda/stream-processor"},
    @{Name="notification-sender"; Path="lambda/notification-sender"},
    @{Name="websocket-handler"; Path="lambda/websocket-handler"},
    @{Name="analytics-engine"; Path="lambda/analytics-engine"}
)

Write-Host "Found $($lambdaFunctions.Count) Lambda functions to deploy" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "DRY RUN MODE - No actual deployment will occur" -ForegroundColor Yellow
    Write-Host ""
}

# Deploy each Lambda function
$successCount = 0
$failCount = 0

foreach ($lambda in $lambdaFunctions) {
    $functionName = $lambda.Name
    $functionPath = $lambda.Path
    
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    Write-Host "Deploying: $functionName" -ForegroundColor White
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    
    # Check if directory exists
    if (-not (Test-Path $functionPath)) {
        Write-Host "Error: Directory not found: $functionPath" -ForegroundColor Red
        $failCount++
        continue
    }
    
    # Change to function directory
    Push-Location $functionPath
    
    try {
        # Check if package.json exists
        if (Test-Path "package.json") {
            Write-Host "  Installing npm dependencies..." -ForegroundColor Yellow
            if (-not $DryRun) {
                npm install --production 2>&1 | Out-Null
                if ($LASTEXITCODE -ne 0) {
                    Write-Host "  Error: npm install failed" -ForegroundColor Red
                    Pop-Location
                    $failCount++
                    continue
                }
            }
            Write-Host "  Success: Dependencies installed" -ForegroundColor Green
        }
        
        # Create deployment package
        Write-Host "  Creating deployment package..." -ForegroundColor Yellow
        $zipFile = "function.zip"
        
        if (Test-Path $zipFile) {
            Remove-Item $zipFile -Force
        }
        
        if (-not $DryRun) {
            # Create zip file
            if (Test-Path "node_modules") {
                Compress-Archive -Path index.js,node_modules,package.json -DestinationPath $zipFile -Force
            } else {
                Compress-Archive -Path index.js -DestinationPath $zipFile -Force
            }
            
            if (-not (Test-Path $zipFile)) {
                Write-Host "  Error: Failed to create zip file" -ForegroundColor Red
                Pop-Location
                $failCount++
                continue
            }
        }
        Write-Host "  Success: Package created" -ForegroundColor Green
        
        # Check if Lambda function exists
        Write-Host "  Checking if Lambda function exists..." -ForegroundColor Yellow
        $functionExists = $false
        
        if (-not $DryRun) {
            $checkFunction = aws lambda get-function --function-name $functionName --region $Region 2>&1
            if ($LASTEXITCODE -eq 0) {
                $functionExists = $true
                Write-Host "  Success: Function exists will update" -ForegroundColor Green
            } else {
                Write-Host "  Warning: Function does not exist will create" -ForegroundColor Yellow
            }
        }
        
        # Deploy to AWS
        if ($functionExists) {
            Write-Host "  Updating Lambda function code..." -ForegroundColor Yellow
            if (-not $DryRun) {
                aws lambda update-function-code --function-name $functionName --zip-file fileb://$zipFile --region $Region --output json | Out-Null
                
                if ($LASTEXITCODE -ne 0) {
                    Write-Host "  Error: Failed to update function" -ForegroundColor Red
                    Pop-Location
                    $failCount++
                    continue
                }
            }
            Write-Host "  Success: Function updated successfully" -ForegroundColor Green
        } else {
            Write-Host "  Warning: Function does not exist. Please create it first using Terraform or CDK" -ForegroundColor Yellow
            Write-Host "    or create manually in AWS Console" -ForegroundColor Yellow
        }
        
        # Cleanup
        if (Test-Path $zipFile) {
            Remove-Item $zipFile -Force
        }
        
        $successCount++
        
    } catch {
        Write-Host "  Error: $_" -ForegroundColor Red
        $failCount++
    } finally {
        Pop-Location
    }
    
    Write-Host ""
}

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deployment Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total functions: $($lambdaFunctions.Count)" -ForegroundColor White
Write-Host "Successful: $successCount" -ForegroundColor Green
if ($failCount -gt 0) {
    Write-Host "Failed: $failCount" -ForegroundColor Red
} else {
    Write-Host "Failed: $failCount" -ForegroundColor Green
}
Write-Host ""

if ($DryRun) {
    Write-Host "This was a DRY RUN. No actual deployment occurred." -ForegroundColor Yellow
    Write-Host "Run without -DryRun flag to deploy for real." -ForegroundColor Yellow
} else {
    if ($failCount -eq 0) {
        Write-Host "Success: All Lambda functions deployed successfully!" -ForegroundColor Green
    } else {
        Write-Host "Warning: Some deployments failed. Check errors above." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Add Bedrock IAM permissions to Lambda execution role" -ForegroundColor White
Write-Host "2. Set environment variables (GEMINI_API_KEY, etc.)" -ForegroundColor White
Write-Host "3. Test Lambda functions" -ForegroundColor White
Write-Host "4. Monitor CloudWatch logs" -ForegroundColor White
Write-Host ""
Write-Host "For detailed instructions, see: AWS_BEDROCK_INTEGRATION_STATUS.md" -ForegroundColor Yellow
Write-Host ""
