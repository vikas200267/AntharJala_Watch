#!/bin/bash

# Quick Deployment Script for Anthar-Jala Watch Backend
# This script automates the complete AWS infrastructure deployment

set -e  # Exit on error

echo "🚀 Anthar-Jala Watch - Quick Deployment Script"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="anthar-jala-watch"
ENVIRONMENT="prod"
AWS_REGION="us-east-1"

echo -e "${YELLOW}📋 Pre-deployment Checklist${NC}"
echo "1. AWS CLI installed and configured"
echo "2. Terraform installed (>= 1.0)"
echo "3. Node.js installed (>= 18.x)"
echo "4. AWS credentials configured"
echo ""

read -p "Have you completed the checklist? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo -e "${RED}❌ Please complete the checklist first${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Starting deployment...${NC}"
echo ""

# Step 1: Package Lambda Functions
echo -e "${YELLOW}📦 Step 1/5: Packaging Lambda functions...${NC}"
cd ../lambda

# Data Ingest
echo "  → Packaging data-ingest..."
cd data-ingest
npm install --production
zip -r ../data-ingest.zip . -x "*.git*" "node_modules/.cache/*"
cd ..

# Heatmap Query
echo "  → Packaging heatmap-query..."
cd heatmap-query
npm install --production
zip -r ../heatmap-query.zip . -x "*.git*" "node_modules/.cache/*"
cd ..

# User History
echo "  → Packaging user-history..."
cd user-history
npm install --production
zip -r ../user-history.zip . -x "*.git*" "node_modules/.cache/*"
cd ..

# AI Advisor
echo "  → Packaging ai-advisor..."
cd ai-advisor
npm install --production
zip -r ../ai-advisor.zip . -x "*.git*" "node_modules/.cache/*"
cd ..

# Alert Detector
echo "  → Packaging alert-detector..."
cd alert-detector
npm install --production
zip -r ../alert-detector.zip . -x "*.git*" "node_modules/.cache/*"
cd ..

# Stream Processor
echo "  → Packaging stream-processor..."
cd stream-processor
npm install --production
zip -r ../stream-processor.zip . -x "*.git*" "node_modules/.cache/*"
cd ..

echo -e "${GREEN}✅ Lambda functions packaged${NC}"
echo ""

# Step 2: Initialize Terraform
echo -e "${YELLOW}🔧 Step 2/5: Initializing Terraform...${NC}"
cd ../infrastructure/terraform
terraform init

echo -e "${GREEN}✅ Terraform initialized${NC}"
echo ""

# Step 3: Validate Terraform Configuration
echo -e "${YELLOW}🔍 Step 3/5: Validating Terraform configuration...${NC}"
terraform validate

echo -e "${GREEN}✅ Configuration validated${NC}"
echo ""

# Step 4: Plan Deployment
echo -e "${YELLOW}📋 Step 4/5: Planning deployment...${NC}"
terraform plan -out=tfplan

echo -e "${GREEN}✅ Deployment plan created${NC}"
echo ""

# Step 5: Deploy Infrastructure
echo -e "${YELLOW}🚀 Step 5/5: Deploying infrastructure...${NC}"
echo ""
echo -e "${YELLOW}⚠️  This will create AWS resources and may incur costs${NC}"
read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo -e "${RED}❌ Deployment cancelled${NC}"
    exit 1
fi

terraform apply tfplan

echo ""
echo -e "${GREEN}✅ Infrastructure deployed successfully!${NC}"
echo ""

# Get outputs
echo -e "${YELLOW}📊 Deployment Outputs:${NC}"
API_URL=$(terraform output -raw api_gateway_url)
echo "  → API Gateway URL: $API_URL"
echo ""

# Save outputs to file
echo "API_GATEWAY_URL=$API_URL" > ../../deployment-outputs.env
echo "DEPLOYMENT_DATE=$(date)" >> ../../deployment-outputs.env
echo "ENVIRONMENT=$ENVIRONMENT" >> ../../deployment-outputs.env

echo -e "${GREEN}✅ Outputs saved to deployment-outputs.env${NC}"
echo ""

# Post-deployment verification
echo -e "${YELLOW}🧪 Running post-deployment tests...${NC}"
echo "  → Testing health endpoint..."

HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" ${API_URL}/health)

if [ "$HEALTH_RESPONSE" == "200" ]; then
    echo -e "${GREEN}  ✅ Health check passed${NC}"
else
    echo -e "${RED}  ❌ Health check failed (HTTP $HEALTH_RESPONSE)${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Next Steps:${NC}"
echo "1. Update Android app API URL:"
echo "   BASE_URL = \"$API_URL\""
echo ""
echo "2. Configure Gemini API key:"
echo "   aws lambda update-function-configuration \\"
echo "     --function-name $PROJECT_NAME-ai-advisor-$ENVIRONMENT \\"
echo "     --environment Variables={GEMINI_API_KEY=your_key}"
echo ""
echo "3. Test the API endpoints:"
echo "   curl $API_URL/health"
echo ""
echo "4. Monitor CloudWatch logs:"
echo "   aws logs tail /aws/lambda/$PROJECT_NAME-data-ingest-$ENVIRONMENT --follow"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}📄 Full documentation: ALL_3_STEPS_COMPLETE_GUIDE.md${NC}"
echo ""