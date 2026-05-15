#!/bin/bash

# Anthar-Jala Watch - AWS Infrastructure Deployment Script
# This script deploys the complete backend infrastructure

set -e

echo "🚀 Starting Anthar-Jala Watch Backend Deployment"
echo "================================================"

# Configuration
PROJECT_NAME="anthar-jala-watch"
ENVIRONMENT=${1:-prod}
AWS_REGION=${2:-us-east-1}

echo "Project: $PROJECT_NAME"
echo "Environment: $ENVIRONMENT"
echo "Region: $AWS_REGION"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install AWS CLI."
    exit 1
fi

if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform not found. Please install Terraform."
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js."
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Deploy infrastructure with Terraform
echo "🏗️  Deploying infrastructure with Terraform..."
cd terraform

terraform init
terraform plan -var="environment=$ENVIRONMENT" -var="aws_region=$AWS_REGION"

read -p "Do you want to apply these changes? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    terraform apply -var="environment=$ENVIRONMENT" -var="aws_region=$AWS_REGION" -auto-approve
else
    echo "❌ Deployment cancelled"
    exit 1
fi

# Get outputs
BOREWELL_LOGS_TABLE=$(terraform output -raw dynamodb_tables | jq -r '.borewell_logs')
KINESIS_STREAM=$(terraform output -raw kinesis_stream)
SNS_TOPIC=$(terraform output -raw sns_topic)
LAMBDA_ROLE_ARN=$(terraform output -raw lambda_role_arn)

echo "✅ Infrastructure deployed successfully"
echo ""

# Deploy Lambda functions
echo "🔧 Deploying Lambda functions..."
cd ../lambda

# Deploy each Lambda function
FUNCTIONS=("data-ingest" "heatmap-query" "user-history" "alert-detector" "stream-processor" "notification-sender")

for func in "${FUNCTIONS[@]}"; do
    echo "Deploying $func..."
    cd $func
    
    # Install dependencies
    npm install --production
    
    # Create deployment package
    zip -r function.zip . -x "*.git*" "node_modules/.cache/*"
    
    # Deploy function
    aws lambda create-function \
        --function-name "$PROJECT_NAME-$func-$ENVIRONMENT" \
        --runtime nodejs18.x \
        --role "$LAMBDA_ROLE_ARN" \
        --handler index.handler \
        --zip-file fileb://function.zip \
        --timeout 30 \
        --memory-size 512 \
        --environment Variables="{
            BOREWELL_LOGS_TABLE=$BOREWELL_LOGS_TABLE,
            KINESIS_STREAM_NAME=$KINESIS_STREAM,
            ALERT_TOPIC_ARN=$SNS_TOPIC
        }" \
        --region $AWS_REGION || \
    aws lambda update-function-code \
        --function-name "$PROJECT_NAME-$func-$ENVIRONMENT" \
        --zip-file fileb://function.zip \
        --region $AWS_REGION
    
    # Clean up
    rm function.zip
    cd ..
done

echo "✅ Lambda functions deployed successfully"
echo ""

# Set up API Gateway (simplified)
echo "🌐 Setting up API Gateway..."

# Create API Gateway (basic setup)
API_ID=$(aws apigateway create-rest-api \
    --name "$PROJECT_NAME-api-$ENVIRONMENT" \
    --description "Anthar-Jala Watch API" \
    --region $AWS_REGION \
    --query 'id' --output text)

echo "API Gateway created: $API_ID"

# Set up CloudWatch Events for alert detector
echo "⏰ Setting up scheduled alerts..."

aws events put-rule \
    --name "$PROJECT_NAME-alert-detector-$ENVIRONMENT" \
    --schedule-expression "rate(1 hour)" \
    --region $AWS_REGION

aws events put-targets \
    --rule "$PROJECT_NAME-alert-detector-$ENVIRONMENT" \
    --targets "Id"="1","Arn"="arn:aws:lambda:$AWS_REGION:$(aws sts get-caller-identity --query Account --output text):function:$PROJECT_NAME-alert-detector-$ENVIRONMENT" \
    --region $AWS_REGION

echo "✅ Scheduled alerts configured"
echo ""

echo "🎉 Deployment Complete!"
echo "======================"
echo ""
echo "📊 Deployment Summary:"
echo "- Infrastructure: ✅ Deployed"
echo "- Lambda Functions: ✅ Deployed (6)"
echo "- API Gateway: ✅ Created"
echo "- Scheduled Jobs: ✅ Configured"
echo ""
echo "🔗 Resources:"
echo "- API Gateway ID: $API_ID"
echo "- DynamoDB Table: $BOREWELL_LOGS_TABLE"
echo "- Kinesis Stream: $KINESIS_STREAM"
echo ""
echo "📝 Next Steps:"
echo "1. Configure API Gateway endpoints"
echo "2. Set up custom domain (optional)"
echo "3. Configure monitoring alerts"
echo "4. Run integration tests"
echo ""
echo "🚀 Your backend is ready!"