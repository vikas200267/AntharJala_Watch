# Anthar-Jala Watch - Lambda Functions Deployment Script (Windows PowerShell)
# This script deploys all Lambda functions to AWS

param(
    [string]$Environment = "prod",
    [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"

Write-Host "Starting Lambda Functions Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ProjectName = "anthar-jala-watch"
Write-Host "Project: $ProjectName" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Green
Write-Host "Region: $Region" -ForegroundColor Green
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

if (!(Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: AWS CLI not found. Please install AWS CLI." -ForegroundColor Red
    exit 1
}

if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js not found. Please install Node.js." -ForegroundColor Red
    exit 1
}

Write-Host "Prerequisites check passed" -ForegroundColor Green
Write-Host ""

# Get Terraform outputs
Write-Host "Getting infrastructure details from Terraform..." -ForegroundColor Yellow
Push-Location terraform

try {
    $tfOutput = terraform output -json | ConvertFrom-Json
    $LambdaRoleArn = $tfOutput.lambda_role_arn.value
    $BorewellLogsTable = $tfOutput.dynamodb_tables.value.borewell_logs
    $UserProfilesTable = $tfOutput.dynamodb_tables.value.user_profiles
    $AlertsTable = $tfOutput.dynamodb_tables.value.alerts
    $HeatmapCacheTable = $tfOutput.dynamodb_tables.value.heatmap_cache
    $KinesisStream = $tfOutput.kinesis_stream.value
    $SnsTopicArn = $tfOutput.sns_topic.value
    
    Write-Host "Infrastructure details retrieved" -ForegroundColor Green
    Write-Host "   Lambda Role: $LambdaRoleArn" -ForegroundColor Gray
    Write-Host "   DynamoDB Tables: $BorewellLogsTable, $UserProfilesTable, $AlertsTable, $HeatmapCacheTable" -ForegroundColor Gray
    Write-Host "   Kinesis Stream: $KinesisStream" -ForegroundColor Gray
    Write-Host "   SNS Topic: $SnsTopicArn" -ForegroundColor Gray
} catch {
    Write-Host "ERROR: Failed to get Terraform outputs. Make sure Terraform is applied first." -ForegroundColor Red
    Pop-Location
    exit 1
}

Pop-Location
Write-Host ""

# Load environment variables from .env file
Write-Host "Loading API keys from .env file..." -ForegroundColor Yellow
$envFile = "..\..env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            # Remove quotes if present
            $value = $value -replace '^"(.*)"$', '$1'
            Set-Variable -Name "ENV_$key" -Value $value -Scope Script
        }
    }
    Write-Host "API keys loaded" -ForegroundColor Green
} else {
    Write-Host "WARNING: .env file not found. Using default configuration." -ForegroundColor Yellow
}
Write-Host ""

# Lambda functions to deploy
$functions = @(
    @{Name="data-ingest"; Timeout=30; Memory=256},
    @{Name="heatmap-query"; Timeout=30; Memory=512},
    @{Name="user-history"; Timeout=30; Memory=256},
    @{Name="ai-advisor"; Timeout=60; Memory=512},
    @{Name="alert-detector"; Timeout=30; Memory=256},
    @{Name="stream-processor"; Timeout=60; Memory=512}
)

Write-Host "Deploying Lambda functions..." -ForegroundColor Cyan
Write-Host ""

$deployedCount = 0

foreach ($func in $functions) {
    $funcName = $func.Name
    $fullFunctionName = "$ProjectName-$Environment-$funcName"
    
    Write-Host "Deploying $funcName..." -ForegroundColor Yellow
    
    $funcPath = "..\lambda\$funcName"
    
    if (!(Test-Path $funcPath)) {
        Write-Host "   WARNING: Directory not found: $funcPath, skipping..." -ForegroundColor Yellow
        continue
    }
    
    Push-Location $funcPath
    
    try {
        # Install dependencies
        Write-Host "   Installing dependencies..." -ForegroundColor Gray
        npm install --production --silent 2>&1 | Out-Null
        
        # Create deployment package
        Write-Host "   Creating deployment package..." -ForegroundColor Gray
        $zipFile = "function.zip"
        if (Test-Path $zipFile) {
            Remove-Item $zipFile -Force
        }
        
        # Use PowerShell Compress-Archive
        $filesToZip = Get-ChildItem -Path . -Exclude @("function.zip", ".git*", "node_modules\.cache")
        Compress-Archive -Path $filesToZip -DestinationPath $zipFile -Force
        
        # Prepare environment variables
        $envVars = @{
            BOREWELL_LOGS_TABLE = $BorewellLogsTable
            USER_PROFILES_TABLE = $UserProfilesTable
            ALERTS_TABLE = $AlertsTable
            HEATMAP_CACHE_TABLE = $HeatmapCacheTable
            KINESIS_STREAM_NAME = $KinesisStream
            ALERT_TOPIC_ARN = $SnsTopicArn
            AWS_REGION = $Region
        }
        
        # Add API keys if available
        if ($Script:ENV_GEMINI_API_KEY) { $envVars.GEMINI_API_KEY = $Script:ENV_GEMINI_API_KEY }
        if ($Script:ENV_OPENWEATHER_API_KEY) { $envVars.OPENWEATHER_API_KEY = $Script:ENV_OPENWEATHER_API_KEY }
        if ($Script:ENV_OPENAI_API_KEY) { $envVars.OPENAI_API_KEY = $Script:ENV_OPENAI_API_KEY }
        
        $envVarsJson = $envVars | ConvertTo-Json -Compress
        
        # Check if function exists
        $functionExists = $false
        try {
            aws lambda get-function --function-name $fullFunctionName --region $Region 2>&1 | Out-Null
            $functionExists = $true
        } catch {}
        
        if ($functionExists) {
            # Update existing function
            Write-Host "   Updating existing function..." -ForegroundColor Gray
            aws lambda update-function-code `
                --function-name $fullFunctionName `
                --zip-file "fileb://$zipFile" `
                --region $Region | Out-Null
            
            aws lambda update-function-configuration `
                --function-name $fullFunctionName `
                --timeout $($func.Timeout) `
                --memory-size $($func.Memory) `
                --environment "Variables=$envVarsJson" `
                --region $Region | Out-Null
        } else {
            # Create new function
            Write-Host "   Creating new function..." -ForegroundColor Gray
            aws lambda create-function `
                --function-name $fullFunctionName `
                --runtime nodejs18.x `
                --role $LambdaRoleArn `
                --handler index.handler `
                --zip-file "fileb://$zipFile" `
                --timeout $($func.Timeout) `
                --memory-size $($func.Memory) `
                --environment "Variables=$envVarsJson" `
                --region $Region | Out-Null
        }
        
        # Clean up
        Remove-Item $zipFile -Force
        
        Write-Host "   SUCCESS: $funcName deployed" -ForegroundColor Green
        $deployedCount++
        
    } catch {
        Write-Host "   ERROR: Failed to deploy $funcName : $_" -ForegroundColor Red
    } finally {
        Pop-Location
    }
    
    Write-Host ""
}

Write-Host ""
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green
Write-Host ""
Write-Host "Deployment Summary:" -ForegroundColor Cyan
Write-Host "- Lambda Functions Deployed: $deployedCount / $($functions.Count)" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Run terraform apply again to create API Gateway integrations" -ForegroundColor White
Write-Host "2. Test Lambda functions with sample events" -ForegroundColor White
Write-Host "3. Update Android app with API Gateway URL" -ForegroundColor White
Write-Host ""
Write-Host "Lambda functions are ready!" -ForegroundColor Green
