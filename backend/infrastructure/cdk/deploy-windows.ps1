# ========================================
# Anthar-Jala Watch - AWS CDK Deployment (Windows)
# ========================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Anthar-Jala Watch - AWS CDK Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ========================================
# Step 1: Prerequisites Check
# ========================================

Write-Host "[1/6] Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check AWS CLI
try {
    $awsVersion = aws --version
    Write-Host "✓ AWS CLI installed: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ AWS CLI not found. Please install from https://aws.amazon.com/cli/" -ForegroundColor Red
    exit 1
}

# Check AWS credentials
try {
    $awsIdentity = aws sts get-caller-identity 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ AWS credentials configured" -ForegroundColor Green
    } else {
        Write-Host "✗ AWS credentials not configured. Run: aws configure" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ AWS credentials not configured. Run: aws configure" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ========================================
# Step 2: Environment Variables
# ========================================

Write-Host "[2/6] Setting environment variables..." -ForegroundColor Yellow

# Check for .env file
if (Test-Path "../../.env") {
    Write-Host "✓ Loading environment from ../../.env" -ForegroundColor Green
    Get-Content "../../.env" | ForEach-Object {
        if ($_ -match "^([^=]+)=(.*)$") {
            $name = $matches[1]
            $value = $matches[2]
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
} else {
    Write-Host "⚠ No .env file found. Using default values." -ForegroundColor Yellow
    Write-Host "  Create backend/.env with:" -ForegroundColor Yellow
    Write-Host "    GEMINI_API_KEY=your_gemini_api_key" -ForegroundColor Yellow
    Write-Host "    JWT_SECRET=your_jwt_secret" -ForegroundColor Yellow
}

# Set default region if not set
if (-not $env:AWS_REGION) {
    $env:AWS_REGION = "ap-south-1"
    Write-Host "✓ Using default region: ap-south-1" -ForegroundColor Green
}

Write-Host ""

# ========================================
# Step 3: Install Dependencies
# ========================================

Write-Host "[3/6] Installing CDK dependencies..." -ForegroundColor Yellow

if (-not (Test-Path "node_modules")) {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✓ Dependencies already installed" -ForegroundColor Green
}

Write-Host ""

# ========================================
# Step 4: Bootstrap CDK (if needed)
# ========================================

Write-Host "[4/6] Checking CDK bootstrap..." -ForegroundColor Yellow

$bootstrapCheck = aws cloudformation describe-stacks --stack-name CDKToolkit 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ CDK not bootstrapped. Bootstrapping now..." -ForegroundColor Yellow
    npx cdk bootstrap
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ CDK bootstrap failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ CDK bootstrapped successfully" -ForegroundColor Green
} else {
    Write-Host "✓ CDK already bootstrapped" -ForegroundColor Green
}

Write-Host ""

# ========================================
# Step 5: Synthesize CloudFormation
# ========================================

Write-Host "[5/6] Synthesizing CloudFormation template..." -ForegroundColor Yellow

npx cdk synth
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ CDK synthesis failed" -ForegroundColor Red
    exit 1
}

Write-Host "✓ CloudFormation template synthesized" -ForegroundColor Green
Write-Host ""

# ========================================
# Step 6: Deploy Stack
# ========================================

Write-Host "[6/6] Deploying to AWS..." -ForegroundColor Yellow
Write-Host ""
Write-Host "This will create the following resources:" -ForegroundColor Cyan
Write-Host "  • 4 DynamoDB Tables" -ForegroundColor White
Write-Host "  • 7 Lambda Functions" -ForegroundColor White
Write-Host "  • 1 API Gateway REST API" -ForegroundColor White
Write-Host "  • 1 Kinesis Data Stream" -ForegroundColor White
Write-Host "  • 1 SNS Topic for alerts" -ForegroundColor White
Write-Host ""

$confirmation = Read-Host "Do you want to proceed? [yes/no]"
if ($confirmation -ne "yes") {
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Deploying stack... this may take 5-10 minutes" -ForegroundColor Yellow

npx cdk deploy --all --require-approval never
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "✗ Deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✓ DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# ========================================
# Get Outputs
# ========================================

Write-Host "Fetching stack outputs..." -ForegroundColor Yellow
$outputs = aws cloudformation describe-stacks --stack-name AntharJalaWatchStack --query "Stacks[0].Outputs" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "API Endpoint and Resources:" -ForegroundColor Cyan
    Write-Host $outputs
    Write-Host ""
    Write-Host "Save the API endpoint URL and update your Android app configuration." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Copy the API endpoint URL from above" -ForegroundColor White
Write-Host "2. Update NetworkModule.kt with your API endpoint" -ForegroundColor White
Write-Host "3. Replace BASE_URL with your API endpoint" -ForegroundColor White
Write-Host "4. Build and test your Android app" -ForegroundColor White
Write-Host ""
Write-Host "To destroy the stack later, run: npx cdk destroy --all" -ForegroundColor Yellow
Write-Host ""
