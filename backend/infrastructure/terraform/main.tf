# Terraform configuration for Anthar-Jala Watch AWS infrastructure
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
  region = var.aws_region
}

# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "anthar-jala-watch"
}

# DynamoDB Tables
resource "aws_dynamodb_table" "borewell_logs" {
  name           = "${var.project_name}-borewell-logs-${var.environment}"
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
    Name        = "${var.project_name}-borewell-logs"
    Environment = var.environment
  }
}

resource "aws_dynamodb_table" "user_profiles" {
  name         = "${var.project_name}-user-profiles-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  tags = {
    Name        = "${var.project_name}-user-profiles"
    Environment = var.environment
  }
}

resource "aws_dynamodb_table" "alerts" {
  name         = "${var.project_name}-alerts-${var.environment}"
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
    Name        = "${var.project_name}-alerts"
    Environment = var.environment
  }
}

resource "aws_dynamodb_table" "heatmap_cache" {
  name         = "${var.project_name}-heatmap-cache-${var.environment}"
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
    Name        = "${var.project_name}-heatmap-cache"
    Environment = var.environment
  }
}

# Kinesis Data Stream
resource "aws_kinesis_stream" "events" {
  name             = "${var.project_name}-events-${var.environment}"
  shard_count      = 1
  retention_period = 24

  shard_level_metrics = [
    "IncomingRecords",
    "OutgoingRecords",
  ]

  tags = {
    Name        = "${var.project_name}-events"
    Environment = var.environment
  }
}

# S3 Bucket for data archival
resource "aws_s3_bucket" "data_archive" {
  bucket = "${var.project_name}-data-archive-${var.environment}"

  tags = {
    Name        = "${var.project_name}-data-archive"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "data_archive_lifecycle" {
  bucket = aws_s3_bucket.data_archive.id

  rule {
    id     = "archive_old_data"
    status = "Enabled"

    filter {}

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }
  }
}

# SNS Topic for alerts
resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-alerts-${var.environment}"

  tags = {
    Name        = "${var.project_name}-alerts"
    Environment = var.environment
  }
}

# IAM Role for Lambda functions
resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-lambda-role-${var.environment}"

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
  name = "${var.project_name}-lambda-policy-${var.environment}"
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
          "${aws_dynamodb_table.borewell_logs.arn}/index/*",
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
        Resource = "${aws_s3_bucket.data_archive.arn}/*"
      }
    ]
  })
}

# Bedrock permissions for AI features
resource "aws_iam_role_policy" "lambda_bedrock" {
  name = "${var.project_name}-${var.environment}-lambda-bedrock-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
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

# Reference existing Lambda functions (deployed via CLI)
# Commented out until Lambda functions are deployed
# data "aws_lambda_function" "data_ingest" {
#   function_name = "${var.project_name}-${var.environment}-data-ingest"
#   depends_on    = [aws_iam_role.lambda_role]
# }

# data "aws_lambda_function" "heatmap_query" {
#   function_name = "${var.project_name}-${var.environment}-heatmap-query"
#   depends_on    = [aws_iam_role.lambda_role]
# }

# data "aws_lambda_function" "user_history" {
#   function_name = "${var.project_name}-${var.environment}-user-history"
#   depends_on    = [aws_iam_role.lambda_role]
# }

# data "aws_lambda_function" "ai_advisor" {
#   function_name = "${var.project_name}-${var.environment}-ai-advisor"
#   depends_on    = [aws_iam_role.lambda_role]
# }

# API Gateway HTTP API
resource "aws_apigatewayv2_api" "main" {
  name          = "${var.project_name}-${var.environment}-api"
  protocol_type = "HTTP"
  
  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["*"]
    max_age       = 300
  }

  tags = {
    Name        = "${var.project_name}-api"
    Environment = var.environment
  }
}

resource "aws_apigatewayv2_stage" "main" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  tags = {
    Name        = "${var.project_name}-api-stage"
    Environment = var.environment
  }
}

# Data Ingest Lambda Integration
resource "aws_apigatewayv2_integration" "data_ingest" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  
  integration_uri    = data.aws_lambda_function.data_ingest.invoke_arn
  integration_method = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "data_ingest" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /data"
  target    = "integrations/${aws_apigatewayv2_integration.data_ingest.id}"
}

resource "aws_lambda_permission" "data_ingest_api" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = data.aws_lambda_function.data_ingest.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# Heatmap Query Lambda Integration
resource "aws_apigatewayv2_integration" "heatmap_query" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  
  integration_uri    = data.aws_lambda_function.heatmap_query.invoke_arn
  integration_method = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "heatmap_query" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /heatmap"
  target    = "integrations/${aws_apigatewayv2_integration.heatmap_query.id}"
}

resource "aws_lambda_permission" "heatmap_query_api" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = data.aws_lambda_function.heatmap_query.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# User History Lambda Integration
resource "aws_apigatewayv2_integration" "user_history" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  
  integration_uri    = data.aws_lambda_function.user_history.invoke_arn
  integration_method = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "user_history" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /history/{userId}"
  target    = "integrations/${aws_apigatewayv2_integration.user_history.id}"
}

resource "aws_lambda_permission" "user_history_api" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = data.aws_lambda_function.user_history.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# AI Advisor Lambda Integration
resource "aws_apigatewayv2_integration" "ai_advisor" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  
  integration_uri    = data.aws_lambda_function.ai_advisor.invoke_arn
  integration_method = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "ai_advisor" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /ai/advice"
  target    = "integrations/${aws_apigatewayv2_integration.ai_advisor.id}"
}

resource "aws_lambda_permission" "ai_advisor_api" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = data.aws_lambda_function.ai_advisor.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# Outputs
output "api_endpoint" {
  value       = aws_apigatewayv2_api.main.api_endpoint
  description = "API Gateway endpoint URL"
}

output "dynamodb_tables" {
  value = {
    borewell_logs   = aws_dynamodb_table.borewell_logs.name
    user_profiles   = aws_dynamodb_table.user_profiles.name
    alerts          = aws_dynamodb_table.alerts.name
    heatmap_cache   = aws_dynamodb_table.heatmap_cache.name
  }
}

output "kinesis_stream" {
  value = aws_kinesis_stream.events.name
}

output "s3_bucket" {
  value = aws_s3_bucket.data_archive.bucket
}

output "sns_topic" {
  value = aws_sns_topic.alerts.arn
}

output "lambda_role_arn" {
  value = aws_iam_role.lambda_role.arn
}