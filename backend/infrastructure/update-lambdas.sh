#!/bin/bash

# Lambda Update Script for Anthar-Jala Watch Backend
# This script updates existing Lambda functions or creates them if they don't exist

set -e  # Exit on error

echo "🔄 Anthar-Jala Watch - Lambda Update Script"
echo "============================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="anthar-jala-watch"
ENVIRONMENT="prod"
AWS_REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo -e "${BLUE}📋 Configuration${NC}"
echo "  Project: $PROJECT_NAME"
echo "  Environment: $ENVIRONMENT"
echo "  Region: $AWS_REGION"
echo "  Account: $ACCOUNT_ID"
echo ""

# Get Lambda role ARN
LAMBDA_ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${PROJECT_NAME}-lambda-role-${ENVIRONMENT}"
echo -e "${BLUE}🔑 Lambda Role: $LAMBDA_ROLE_ARN${NC}"
echo ""

# Function to check if Lambda exists
function lambda_exists() {
    local function_name=$1
    aws lambda get-function --function-name "$function_name" &>/dev/null
    return $?
}

# Function to create or update Lambda
function deploy_lambda() {
    local function_name=$1
    local handler=$2
    local description=$3
    local timeout=${4:-30}
    local memory=${5:-256}
    
    echo -e "${YELLOW}📦 Processing: $function_name${NC}"
    
    # Package the function
    local lambda_dir="../lambda/${function_name#${PROJECT_NAME}-${ENVIRONMENT}-}"
    
    if [ ! -d "$lambda_dir" ]; then
        echo -e "${RED}  ❌ Directory not found: $lambda_dir${NC}"
        return 1
    fi
    
    cd "$lambda_dir"
    
    # Install dependencies
    echo "  → Installing dependencies..."
    npm install --production --silent
    
    # Create deployment package
    echo "  → Creating deployment package..."
    local zip_file="/tmp/${function_name}.zip"
    rm -f "$zip_file"
    zip -r "$zip_file" . -x "*.git*" "node_modules/.cache/*" "*.zip" &>/dev/null
    
    cd - > /dev/null
    
    # Check if function exists
    if lambda_exists "$function_name"; then
        echo -e "${BLUE}  ↻ Updating existing function...${NC}"
        
        # Update function code
        aws lambda update-function-code \
            --function-name "$function_name" \
            --zip-file "fileb://$zip_file" \
            --region "$AWS_REGION" \
            --output text &>/dev/null
        
        # Wait for update to complete
        echo "  → Waiting for update to complete..."
        aws lambda wait function-updated \
            --function-name "$function_name" \
            --region "$AWS_REGION"
        
        # Update function configuration
        aws lambda update-function-configuration \
            --function-name "$function_name" \
            --timeout "$timeout" \
            --memory-size "$memory" \
            --region "$AWS_REGION" \
            --output text &>/dev/null
        
        echo -e "${GREEN}  ✅ Updated successfully${NC}"
    else
        echo -e "${BLUE}  + Creating new function...${NC}"
        
        # Create new function
        aws lambda create-function \
            --function-name "$function_name" \
            --runtime nodejs18.x \
            --role "$LAMBDA_ROLE_ARN" \
            --handler "$handler" \
            --zip-file "fileb://$zip_file" \
            --timeout "$timeout" \
            --memory-size "$memory" \
            --description "$description" \
            --region "$AWS_REGION" \
            --output text &>/dev/null
        
        echo -e "${GREEN}  ✅ Created successfully${NC}"
    fi
    
    # Clean up
    rm -f "$zip_file"
    echo ""
}

# Deploy all Lambda functions
echo -e "${YELLOW}🚀 Deploying Lambda Functions${NC}"
echo ""

# 1. Data Ingest
deploy_lambda \
    "${PROJECT_NAME}-${ENVIRONMENT}-data-ingest" \
    "index.handler" \
    "Ingests borewell data and publishes to Kinesis" \
    30 \
    256

# 2. Heatmap Query
deploy_lambda \
    "${PROJECT_NAME}-${ENVIRONMENT}-heatmap-query" \
    "index.handler" \
    "Queries and generates heatmap data" \
    30 \
    512

# 3. User History
deploy_lambda \
    "${PROJECT_NAME}-${ENVIRONMENT}-user-history" \
    "index.handler" \
    "Retrieves user submission history" \
    30 \
    256

# 4. AI Advisor
deploy_lambda \
    "${PROJECT_NAME}-${ENVIRONMENT}-ai-advisor" \
    "index.handler" \
    "Provides AI-powered water management advice" \
    60 \
    512

# 5. Alert Detector
deploy_lambda \
    "${PROJECT_NAME}-${ENVIRONMENT}-alert-detector" \
    "index.handler" \
    "Detects water stress patterns and generates alerts" \
    60 \
    512

# 6. Stream Processor
deploy_lambda \
    "${PROJECT_NAME}-${ENVIRONMENT}-stream-processor" \
    "index.handler" \
    "Processes Kinesis stream events" \
    30 \
    256

# 7. Analytics Engine
deploy_lambda \
    "${PROJECT_NAME}-${ENVIRONMENT}-analytics-engine" \
    "index.handler" \
    "Generates analytics and insights" \
    60 \
    512

# 8. Notification Sender
deploy_lambda \
    "${PROJECT_NAME}-${ENVIRONMENT}-notification-sender" \
    "index.handler" \
    "Sends notifications via SNS" \
    30 \
    256

echo -e "${GREEN}✅ All Lambda functions deployed!${NC}"
echo ""

# Update environment variables
echo -e "${YELLOW}🔧 Updating environment variables...${NC}"
echo ""

# Get resource names from Terraform outputs
cd terraform
BOREWELL_TABLE=$(terraform output -raw dynamodb_tables | jq -r '.borewell_logs')
USER_PROFILES_TABLE=$(terraform output -raw dynamodb_tables | jq -r '.user_profiles')
ALERTS_TABLE=$(terraform output -raw dynamodb_tables | jq -r '.alerts')
HEATMAP_CACHE_TABLE=$(terraform output -raw dynamodb_tables | jq -r '.heatmap_cache')
KINESIS_STREAM=$(terraform output -raw kinesis_stream)
SNS_TOPIC=$(terraform output -raw sns_topic)
S3_BUCKET=$(terraform output -raw s3_bucket)
cd - > /dev/null

# Common environment variables
COMMON_ENV="{
    \"BOREWELL_LOGS_TABLE\":\"$BOREWELL_TABLE\",
    \"USER_PROFILES_TABLE\":\"$USER_PROFILES_TABLE\",
    \"ALERTS_TABLE\":\"$ALERTS_TABLE\",
    \"HEATMAP_CACHE_TABLE\":\"$HEATMAP_CACHE_TABLE\",
    \"KINESIS_STREAM_NAME\":\"$KINESIS_STREAM\",
    \"ALERT_TOPIC_ARN\":\"$SNS_TOPIC\",
    \"S3_BUCKET\":\"$S3_BUCKET\",
    \"AWS_REGION\":\"$AWS_REGION\",
    \"ENVIRONMENT\":\"$ENVIRONMENT\"
}"

# Update each function's environment variables
for func in data-ingest heatmap-query user-history ai-advisor alert-detector stream-processor analytics-engine notification-sender; do
    function_name="${PROJECT_NAME}-${ENVIRONMENT}-${func}"
    
    if lambda_exists "$function_name"; then
        echo "  → Updating $func environment..."
        aws lambda update-function-configuration \
            --function-name "$function_name" \
            --environment "Variables=$COMMON_ENV" \
            --region "$AWS_REGION" \
            --output text &>/dev/null
    fi
done

echo -e "${GREEN}✅ Environment variables updated${NC}"
echo ""

# Test functions
echo -e "${YELLOW}🧪 Testing Lambda functions...${NC}"
echo ""

# Test data-ingest
echo "  → Testing data-ingest..."
TEST_PAYLOAD='{"test": true, "depth": 45.5, "yield": 1200, "geohash": "tdr3u6"}'
aws lambda invoke \
    --function-name "${PROJECT_NAME}-${ENVIRONMENT}-data-ingest" \
    --payload "$TEST_PAYLOAD" \
    --region "$AWS_REGION" \
    /tmp/test-response.json &>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}    ✅ data-ingest working${NC}"
else
    echo -e "${RED}    ❌ data-ingest failed${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Lambda deployment complete!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📊 Deployment Summary${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Lambda Functions:"
echo "  • ${PROJECT_NAME}-${ENVIRONMENT}-data-ingest"
echo "  • ${PROJECT_NAME}-${ENVIRONMENT}-heatmap-query"
echo "  • ${PROJECT_NAME}-${ENVIRONMENT}-user-history"
echo "  • ${PROJECT_NAME}-${ENVIRONMENT}-ai-advisor"
echo "  • ${PROJECT_NAME}-${ENVIRONMENT}-alert-detector"
echo "  • ${PROJECT_NAME}-${ENVIRONMENT}-stream-processor"
echo "  • ${PROJECT_NAME}-${ENVIRONMENT}-analytics-engine"
echo "  • ${PROJECT_NAME}-${ENVIRONMENT}-notification-sender"
echo ""
echo "Next Steps:"
echo "1. Run Terraform to update API Gateway:"
echo "   cd terraform && terraform apply"
echo ""
echo "2. Test the API endpoints"
echo ""
echo "3. Monitor CloudWatch logs:"
echo "   aws logs tail /aws/lambda/${PROJECT_NAME}-${ENVIRONMENT}-data-ingest --follow"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
