# Complete AWS Deployment Script for Windows
# Deploys infrastructure and Lambda functions in the correct order

$ErrorActionPreference = "Stop"

Write-Host "🚀 Anthar-Jala Watch - Complete Deployment Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$PROJECT_NAME = "anthar-jala-watch"
$ENVIRONMENT = "prod"
$AWS_REGION = "us-east-1"

Write-Host "Project: $PROJECT_NAME" -ForegroundColor Yellow
Write-Host "Environment: $ENVIRONMENT" -ForegroundColor Yellow
Write-Host "Region: $AWS_REGION" -ForegroundColor Yellow
Write-Host ""

# Check prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

# Check AWS CLI
try {
    $awsVersion = aws --version 2>&1
    Write-Host "  ✅ AWS CLI: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ AWS CLI not found" -ForegroundColor Red
    exit 1
}

# Check AWS credentials
try {
    $identity = aws sts get-caller-identity 2>&1 | ConvertFrom-Json
    Write-Host "  ✅ AWS Account: $($identity.Account)" -ForegroundColor Green
    Write-Host "  ✅ AWS User: $($identity.Arn)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ AWS credentials not configured" -ForegroundColor Red
    exit 1
}

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "  ✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Node.js not found" -ForegroundColor Red
    exit 1
}

Write-Host ""

# PHASE 1: Deploy Core Infrastructure (without Lambda references)
Write-Host "🏗️  PHASE 1: Deploying Core Infrastructure..." -ForegroundColor Cyan
Write-Host "This will create DynamoDB tables, Kinesis stream, S3 bucket, SNS topic, and IAM roles" -ForegroundColor Gray
Write-Host ""

# Create simplified Terraform config without Lambda data sources
$simplifiedTerraform = @"
# Simplified Terraform for initial deployment
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "$AWS_REGION"
}

# DynamoDB Tables
resource "aws_dynamodb_table" "borewell_logs" {
  name           = "$PROJECT_NAME-borewell-logs-$ENVIRONMENT"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "geohash"
  range_key      = "timestamp"

  attribute {
    name = "geohash"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  global_secondary_index {
    name     = "UserIdIndex"
    hash_key = "userId"
    range_key = "timestamp"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Name        = "$PROJECT_NAME-borewell-logs"
    Environment = "$ENVIRONMENT"
  }
}

resource "aws_dynamodb_table" "user_profiles" {
  name         = "$PROJECT_NAME-user-profiles-$ENVIRONMENT"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  tags = {
    Name        = "$PROJECT_NAME-user-profiles"
    Environment = "$ENVIRONMENT"
  }
}

resource "aws_dynamodb_table" "alerts" {
  name         = "$PROJECT_NAME-alerts-$ENVIRONMENT"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "alertId"

  attribute {
    name = "alertId"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Name        = "$PROJECT_NAME-alerts"
    Environment = "$ENVIRONMENT"
  }
}

resource "aws_dynamodb_table" "heatmap_cache" {
  name         = "$PROJECT_NAME-heatmap-cache-$ENVIRONMENT"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "cacheKey"

  attribute {
    name = "cacheKey"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Name        = "$PROJECT_NAME-heatmap-cache"
    Environment = "$ENVIRONMENT"
  }
}

# Kinesis Data Stream
resource "aws_kinesis_stream" "events" {
  name             = "$PROJECT_NAME-events-$ENVIRONMENT"
  shard_count      = 1
  retention_period = 24

  shard_level_metrics = [
    "IncomingRecords",
    "OutgoingRecords",
  ]

  tags = {
    Name        = "$PROJECT_NAME-events"
    Environment = "$ENVIRONMENT"
  }
}

# S3 Bucket for data archival
resource "aws_s3_bucket" "data_archive" {
  bucket = "$PROJECT_NAME-data-archive-$ENVIRONMENT-$($identity.Account)"

  tags = {
    Name        = "$PROJECT_NAME-data-archive"
    Environment = "$ENVIRONMENT"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "data_archive_lifecycle" {
  bucket = aws_s3_bucket.data_archive.id

  rule {
    id     = "archive_old_data"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }
  }
}

# SNS Topic for alerts
resource "aws_sns_topic" "alerts" {
  name = "$PROJECT_NAME-alerts-$ENVIRONMENT"

  tags = {
    Name        = "$PROJECT_NAME-alerts"
    Environment = "$ENVIRONMENT"
  }
}

# IAM Role for Lambda functions
resource "aws_iam_role" "lambda_role" {
  name = "$PROJECT_NAME-lambda-role-$ENVIRONMENT"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_policy" {
  name = "$PROJECT_NAME-lambda-policy-$ENVIRONMENT"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ]
        Resource = [
          aws_dynamodb_table.borewell_logs.arn,
          "$${aws_dynamodb_table.borewell_logs.arn}/index/*",
          aws_dynamodb_table.user_profiles.arn,
          aws_dynamodb_table.alerts.arn,
          aws_dynamodb_table.heatmap_cache.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kinesis:PutRecord",
          "kinesis:PutRecords",
          "kinesis:GetRecords",
          "kinesis:GetShardIterator",
          "kinesis:DescribeStream",
          "kinesis:ListStreams"
        ]
        Resource = aws_kinesis_stream.events.arn
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.alerts.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = "$${aws_s3_bucket.data_archive.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = "*"
      }
    ]
  })
}

# Outputs
output "lambda_role_arn" {
  value = aws_iam_role.lambda_role.arn
}

output "borewell_logs_table" {
  value = aws_dynamodb_table.borewell_logs.name
}

output "kinesis_stream" {
  value = aws_kinesis_stream.events.name
}

output "sns_topic_arn" {
  value = aws_sns_topic.alerts.arn
}

output "s3_bucket" {
  value = aws_s3_bucket.data_archive.bucket
}
"@

# Save simplified Terraform config
$terraformDir = "terraform-deploy"
if (Test-Path $terraformDir) {
    Remove-Item $terraformDir -Recurse -Force
}
New-Item -ItemType Directory -Path $terraformDir | Out-Null
Set-Content -Path "$terraformDir\main.tf" -Value $simplifiedTerraform

# Initialize and apply Terraform
Push-Location $terraformDir

Write-Host "  Initializing Terraform..." -ForegroundColor Gray
terraform init | Out-Null

Write-Host "  Planning infrastructure..." -ForegroundColor Gray
terraform plan -out=tfplan

Write-Host ""
$response = Read-Host "  Apply infrastructure changes? (y/N)"
if ($response -ne "y" -and $response -ne "Y") {
    Write-Host "❌ Deployment cancelled" -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host "  Applying infrastructure..." -ForegroundColor Gray
terraform apply tfplan

# Get outputs
$LAMBDA_ROLE_ARN = terraform output -raw lambda_role_arn
$BOREWELL_LOGS_TABLE = terraform output -raw borewell_logs_table
$KINESIS_STREAM = terraform output -raw kinesis_stream
$SNS_TOPIC_ARN = terraform output -raw sns_topic_arn
$S3_BUCKET = terraform output -raw s3_bucket

Pop-Location

Write-Host "✅ Infrastructure deployed successfully" -ForegroundColor Green
Write-Host ""

# PHASE 2: Deploy Lambda Functions
Write-Host "🔧 PHASE 2: Deploying Lambda Functions..." -ForegroundColor Cyan
Write-Host ""

# Load environment variables
$envFile = "..\\.env"
$envVars = @{}

if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            $value = $value -replace '^"(.*)"$', '$1'
            $envVars[$key] = $value
        }
    }
}

# Lambda functions to deploy
$lambdaFunctions = @(
    @{Name="data-ingest"; Dir="data-ingest"},
    @{Name="heatmap-query"; Dir="heatmap-query"},
    @{Name="user-history"; Dir="user-history"},
    @{Name="ai-advisor"; Dir="ai-advisor"},
    @{Name="alert-detector"; Dir="alert-detector"},
    @{Name="stream-processor"; Dir="stream-processor"},
    @{Name="notification-sender"; Dir="notification-sender"},
    @{Name="websocket-handler"; Dir="websocket-handler"},
    @{Name="analytics-engine"; Dir="analytics-engine"},
    @{Name="ai-realtime-engine"; Dir="ai-realtime-engine"}
)

foreach ($func in $lambdaFunctions) {
    $functionName = "$PROJECT_NAME-$ENVIRONMENT-$($func.Name)"
    $lambdaDir = "..\\lambda\\$($func.Dir)"
    
    Write-Host "  📦 Deploying $functionName..." -ForegroundColor Yellow
    
    if (-not (Test-Path $lambdaDir)) {
        Write-Host "    ⚠️  Directory not found: $lambdaDir" -ForegroundColor Yellow
        continue
    }
    
    # Install dependencies
    Push-Location $lambdaDir
    
    if (Test-Path "package.json") {
        Write-Host "    Installing dependencies..." -ForegroundColor Gray
        npm install --omit=dev 2>&1 | Out-Null
    }
    
    # Create deployment package
    Write-Host "    Creating deployment package..." -ForegroundColor Gray
    $zipFile = "$functionName.zip"
    $zipPath = "..\\..\\infrastructure\\$zipFile"
    
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }
    
    Compress-Archive -Path * -DestinationPath $zipPath -Force
    
    Pop-Location
    
    # Create Lambda function
    Write-Host "    Creating Lambda function..." -ForegroundColor Gray
    
    $envJson = @{
        Variables = @{
            GEMINI_API_KEY = $envVars["GEMINI_API_KEY"]
            GOOGLE_MAPS_API_KEY = $envVars["GOOGLE_MAPS_API_KEY"]
            FIREBASE_PROJECT_ID = $envVars["FIREBASE_PROJECT_ID"]
            FIREBASE_CLIENT_EMAIL = $envVars["FIREBASE_CLIENT_EMAIL"]
            FIREBASE_PRIVATE_KEY = $envVars["FIREBASE_PRIVATE_KEY"]
            OPENWEATHER_API_KEY = $envVars["OPENWEATHER_API_KEY"]
            OPENAI_API_KEY = $envVars["OPENAI_API_KEY"]
            DYNAMODB_TABLE = $BOREWELL_LOGS_TABLE
            KINESIS_STREAM = $KINESIS_STREAM
            SNS_TOPIC_ARN = $SNS_TOPIC_ARN
        }
    } | ConvertTo-Json -Compress
    
    $envJsonFile = "env-$functionName.json"
    $envJson | Out-File -FilePath $envJsonFile -Encoding utf8 -NoNewline
    
    try {
        aws lambda create-function `
            --function-name $functionName `
            --runtime nodejs18.x `
            --role $LAMBDA_ROLE_ARN `
            --handler index.handler `
            --zip-file "fileb://$zipFile" `
            --timeout 30 `
            --memory-size 512 `
            --environment "file://$envJsonFile" `
            --region $AWS_REGION 2>&1 | Out-Null
        
        Write-Host "    ✅ Function created" -ForegroundColor Green
    } catch {
        Write-Host "    ⚠️  Function may already exist, updating code..." -ForegroundColor Yellow
        
        aws lambda update-function-code `
            --function-name $functionName `
            --zip-file "fileb://$zipFile" `
            --region $AWS_REGION 2>&1 | Out-Null
        
        Start-Sleep -Seconds 2
        
        aws lambda update-function-configuration `
            --function-name $functionName `
            --environment "file://$envJsonFile" `
            --region $AWS_REGION 2>&1 | Out-Null
        
        Write-Host "    ✅ Function updated" -ForegroundColor Green
    }
    
    # Clean up
    Remove-Item $zipFile -Force -ErrorAction SilentlyContinue
    Remove-Item $envJsonFile -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "✅ All Lambda functions deployed" -ForegroundColor Green
Write-Host ""

# PHASE 3: Create API Gateway
Write-Host "🌐 PHASE 3: Creating API Gateway..." -ForegroundColor Cyan
Write-Host ""

$apiResult = aws apigatewayv2 create-api `
    --name "$PROJECT_NAME-$ENVIRONMENT-api" `
    --protocol-type HTTP `
    --cors-configuration "AllowOrigins=*,AllowMethods=GET,POST,PUT,DELETE,OPTIONS,AllowHeaders=*" `
    --region $AWS_REGION | ConvertFrom-Json

$API_ID = $apiResult.ApiId
$API_ENDPOINT = $apiResult.ApiEndpoint

Write-Host "  ✅ API Gateway created: $API_ID" -ForegroundColor Green
Write-Host "  ✅ API Endpoint: $API_ENDPOINT" -ForegroundColor Green
Write-Host ""

# PHASE 4: Summary
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Deployed Resources:" -ForegroundColor Yellow
Write-Host "  • DynamoDB Tables: 4" -ForegroundColor Cyan
Write-Host "  • Kinesis Stream: 1" -ForegroundColor Cyan
Write-Host "  • S3 Bucket: 1" -ForegroundColor Cyan
Write-Host "  • SNS Topic: 1" -ForegroundColor Cyan
Write-Host "  • Lambda Functions: 10" -ForegroundColor Cyan
Write-Host "  • API Gateway: 1" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔗 Important URLs:" -ForegroundColor Yellow
Write-Host "  • API Endpoint: $API_ENDPOINT" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Configure API Gateway routes (manual step)" -ForegroundColor Gray
Write-Host "  2. Update Android app with API endpoint" -ForegroundColor Gray
Write-Host "  3. Test Lambda functions" -ForegroundColor Gray
Write-Host "  4. Set up CloudWatch monitoring" -ForegroundColor Gray
Write-Host ""
