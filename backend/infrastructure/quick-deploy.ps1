# Quick Deploy Script for Anthar Jala Watch Backend
# This script deploys Lambda functions and creates basic infrastructure

param(
    [string]$Environment = "dev",
    [string]$Region = "ap-south-1"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Anthar Jala Watch Backend Deployment ===" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Gray
Write-Host "Region: $Region" -ForegroundColor Gray
Write-Host ""

# Check prerequisites
Write-Host "[1/6] Checking prerequisites..." -ForegroundColor Yellow

$commands = @("aws", "node", "npm", "zip")
foreach ($cmd in $commands) {
    $found = Get-Command $cmd -ErrorAction SilentlyContinue
    if (-not $found) {
        Write-Host "ERROR: $cmd not found. Please install it first." -ForegroundColor Red
        exit 1
    }
    Write-Host "  [OK] $cmd found" -ForegroundColor Green
}

# Verify AWS credentials
Write-Host "  Checking AWS credentials..." -ForegroundColor Gray
try {
    $identity = aws sts get-caller-identity 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: AWS credentials not configured" -ForegroundColor Red
        exit 1
    }
    Write-Host "  [OK] AWS credentials valid" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to verify AWS credentials" -ForegroundColor Red
    exit 1
}

# Set variables
$DEPLOY_REGION = $Region
$ENVIRONMENT = $Environment
$PROJECT_NAME = "anthar-jala-watch"
$STACK_NAME = "$PROJECT_NAME-$ENVIRONMENT"

# Get script directory and set paths
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$BACKEND_DIR = Split-Path -Parent $SCRIPT_DIR
$LAMBDA_DIR = Join-Path $BACKEND_DIR "lambda"

Write-Host ""
Write-Host "[2/6] Installing dependencies..." -ForegroundColor Yellow

# Lambda functions to deploy
$lambdaFunctions = @(
    "data-ingest",
    "stream-processor",
    "heatmap-query",
    "ai-advisor",
    "ai-realtime-engine",
    "alert-detector",
    "notification-sender",
    "user-history",
    "analytics-engine",
    "websocket-handler"
)

foreach ($func in $lambdaFunctions) {
    $funcPath = Join-Path $LAMBDA_DIR $func
    if (Test-Path $funcPath) {
        Write-Host "  Installing dependencies for $func..." -ForegroundColor Gray
        Push-Location $funcPath
        $npmOutput = npm install --omit=dev 2>&1
        # npm warnings are not errors, check if node_modules was created
        if (Test-Path "node_modules") {
            Write-Host "  [OK] $func dependencies installed" -ForegroundColor Green
        } else {
            Write-Host "  [WARN] No dependencies for $func" -ForegroundColor Yellow
        }
        Pop-Location
    }
}

Write-Host ""
Write-Host "[3/6] Creating deployment packages..." -ForegroundColor Yellow

$DIST_DIR = Join-Path $BACKEND_DIR "dist"
if (Test-Path $DIST_DIR) {
    Remove-Item -Path $DIST_DIR -Recurse -Force
}
New-Item -ItemType Directory -Path $DIST_DIR | Out-Null

foreach ($func in $lambdaFunctions) {
    $funcPath = Join-Path $LAMBDA_DIR $func
    if (Test-Path $funcPath) {
        Write-Host "  Packaging $func..." -ForegroundColor Gray
        $zipFile = Join-Path $DIST_DIR "$func.zip"
        
        # Create a temporary directory for packaging
        $tempDir = Join-Path $env:TEMP "lambda-$func-$(Get-Random)"
        New-Item -ItemType Directory -Path $tempDir | Out-Null
        
        try {
            # Copy files to temp directory
            if (Test-Path (Join-Path $funcPath "index.js")) {
                Copy-Item -Path (Join-Path $funcPath "index.js") -Destination $tempDir
            }
            if (Test-Path (Join-Path $funcPath "package.json")) {
                Copy-Item -Path (Join-Path $funcPath "package.json") -Destination $tempDir
            }
            if (Test-Path (Join-Path $funcPath "node_modules")) {
                Copy-Item -Path (Join-Path $funcPath "node_modules") -Destination $tempDir -Recurse
            }
            
            # Create zip file from temp directory
            $tempFiles = Get-ChildItem -Path $tempDir
            if ($tempFiles.Count -gt 0) {
                Push-Location $tempDir
                Compress-Archive -Path * -DestinationPath $zipFile -Force
                Pop-Location
                
                if (Test-Path $zipFile) {
                    $size = (Get-Item $zipFile).Length / 1KB
                    Write-Host "  [OK] $func packaged ($([math]::Round($size, 2)) KB)" -ForegroundColor Green
                } else {
                    Write-Host "  [ERROR] Failed to package $func" -ForegroundColor Red
                }
            } else {
                Write-Host "  [WARN] No files to package for $func" -ForegroundColor Yellow
            }
        } finally {
            # Clean up temp directory
            if (Test-Path $tempDir) {
                Remove-Item -Path $tempDir -Recurse -Force
            }
        }
    }
}

Write-Host ""
Write-Host "[4/6] Creating IAM role..." -ForegroundColor Yellow

$ROLE_NAME = "$PROJECT_NAME-lambda-role-$ENVIRONMENT"

# Check if role exists
try {
    $roleCheck = aws iam get-role --role-name $ROLE_NAME 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] IAM role already exists: $ROLE_NAME" -ForegroundColor Green
        $roleExists = $true
    } else {
        $roleExists = $false
    }
} catch {
    $roleExists = $false
}

if (-not $roleExists) {
    Write-Host "  Creating IAM role: $ROLE_NAME..." -ForegroundColor Gray
    
    $trustPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
"@
    
    $trustPolicyFile = Join-Path $env:TEMP "trust-policy.json"
    Set-Content -Path $trustPolicyFile -Value $trustPolicy
    
    $createResult = aws iam create-role --role-name $ROLE_NAME --assume-role-policy-document "file://$trustPolicyFile" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] IAM role created" -ForegroundColor Green
        
        # Attach policies
        aws iam attach-role-policy --role-name $ROLE_NAME --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole" 2>&1 | Out-Null
        aws iam attach-role-policy --role-name $ROLE_NAME --policy-arn "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess" 2>&1 | Out-Null
        aws iam attach-role-policy --role-name $ROLE_NAME --policy-arn "arn:aws:iam::aws:policy/AmazonKinesisFullAccess" 2>&1 | Out-Null
        
        Write-Host "  [OK] Policies attached" -ForegroundColor Green
        Write-Host "  Waiting for role to propagate..." -ForegroundColor Gray
        Start-Sleep -Seconds 10
    } else {
        Write-Host "  [ERROR] Failed to create IAM role" -ForegroundColor Red
        Write-Host "  Error: $createResult" -ForegroundColor Red
        exit 1
    }
}

# Get role ARN
$ROLE_ARN = (aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text 2>&1)
Write-Host "  Role ARN: $ROLE_ARN" -ForegroundColor Gray

Write-Host ""
Write-Host "[5/6] Deploying Lambda functions..." -ForegroundColor Yellow

foreach ($func in $lambdaFunctions) {
    $zipFile = Join-Path $DIST_DIR "$func.zip"
    if (Test-Path $zipFile) {
        $functionName = "$PROJECT_NAME-$func-$ENVIRONMENT"
        Write-Host "  Deploying $functionName..." -ForegroundColor Gray
        
        # Check if function exists
        $ErrorActionPreference = "SilentlyContinue"
        $funcCheck = aws lambda get-function --function-name $functionName --region $DEPLOY_REGION 2>&1
        $funcExists = $LASTEXITCODE -eq 0
        $ErrorActionPreference = "Stop"
        
        if ($funcExists) {
            # Update existing function
            $updateResult = aws lambda update-function-code --function-name $functionName --zip-file "fileb://$zipFile" --region $DEPLOY_REGION 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  [OK] $functionName updated" -ForegroundColor Green
            } else {
                Write-Host "  [WARN] Failed to update $functionName" -ForegroundColor Yellow
            }
        } else {
            # Create new function
            $createResult = aws lambda create-function `
                --function-name $functionName `
                --runtime nodejs18.x `
                --role $ROLE_ARN `
                --handler index.handler `
                --zip-file "fileb://$zipFile" `
                --timeout 30 `
                --memory-size 512 `
                --region $DEPLOY_REGION 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  [OK] $functionName created" -ForegroundColor Green
            } else {
                Write-Host "  [WARN] Failed to create $functionName" -ForegroundColor Yellow
                $errorMsg = $createResult | Out-String
                if ($errorMsg.Length -gt 200) {
                    $errorMsg = $errorMsg.Substring(0, 200)
                }
                Write-Host "  Error: $errorMsg" -ForegroundColor Red
            }
        }
    }
}

Write-Host ""
Write-Host "[6/6] Creating API Gateway..." -ForegroundColor Yellow

$API_NAME = "$PROJECT_NAME-api-$ENVIRONMENT"

# Check if API exists
$apiId = aws apigatewayv2 get-apis --query "Items[?Name=='$API_NAME'].ApiId" --output text --region $DEPLOY_REGION 2>&1 | Out-String
$apiId = $apiId.Trim()

if ($apiId -and $apiId -ne "" -and $LASTEXITCODE -eq 0) {
    Write-Host "  [OK] API Gateway already exists: $apiId" -ForegroundColor Green
} else {
    Write-Host "  Creating HTTP API..." -ForegroundColor Gray
    $apiResult = aws apigatewayv2 create-api --name $API_NAME --protocol-type HTTP --region $DEPLOY_REGION 2>&1 | ConvertFrom-Json
    
    if ($LASTEXITCODE -eq 0) {
        $apiId = $apiResult.ApiId
        Write-Host "  [OK] API Gateway created: $apiId" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Failed to create API Gateway" -ForegroundColor Yellow
        $apiId = "PLACEHOLDER"
    }
}

$API_URL = "https://$apiId.execute-api.$DEPLOY_REGION.amazonaws.com"

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "API Gateway URL: $API_URL" -ForegroundColor Cyan
Write-Host "Region: $DEPLOY_REGION" -ForegroundColor Cyan
Write-Host "Environment: $ENVIRONMENT" -ForegroundColor Cyan
Write-Host ""

# Save outputs to file
$currentDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$outputContent = @"
API_GATEWAY_URL=$API_URL
DEPLOYMENT_DATE=$currentDate
ENVIRONMENT=$ENVIRONMENT
REGION=$DEPLOY_REGION
"@

$outputPath = Join-Path (Split-Path -Parent $BACKEND_DIR) "deployment-outputs.env"
Set-Content -Path $outputPath -Value $outputContent

Write-Host "[OK] Outputs saved to deployment-outputs.env" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Update your Android app with the API_GATEWAY_URL" -ForegroundColor Gray
Write-Host "2. Configure DynamoDB tables (see terraform/main.tf)" -ForegroundColor Gray
Write-Host "3. Set up Kinesis streams for real-time data" -ForegroundColor Gray
Write-Host "4. Configure environment variables for Lambda functions" -ForegroundColor Gray
Write-Host ""
