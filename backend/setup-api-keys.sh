#!/bin/bash

# ========================================
# API Keys Setup Script
# ========================================

echo "========================================="
echo "Anthar-Jala Watch - API Keys Setup"
echo "========================================="
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    touch .env
    echo "Created .env file"
fi

echo "This script will help you configure all required API keys."
echo ""

# Function to add or update environment variable
add_env_var() {
    local key=$1
    local value=$2
    
    if grep -q "^${key}=" .env; then
        # Update existing
        sed -i "s|^${key}=.*|${key}=${value}|" .env
    else
        # Add new
        echo "${key}=${value}" >> .env
    fi
}

# ========================================
# Essential APIs (Required)
# ========================================

echo "========================================="
echo "ESSENTIAL APIs (Required for core features)"
echo "========================================="
echo ""

# Gemini API
echo "1. Google Gemini API Key"
echo "   Get it from: https://makersuite.google.com/app/apikey"
echo "   Cost: FREE"
read -p "   Enter GEMINI_API_KEY (or press Enter to skip): " GEMINI_KEY
if [ ! -z "$GEMINI_KEY" ]; then
    add_env_var "GEMINI_API_KEY" "$GEMINI_KEY"
    echo "   ✓ Gemini API key saved"
else
    echo "   ⚠ Skipped - AI features will not work"
fi
echo ""

# Google Maps API
echo "2. Google Maps API Key (for Android app)"
echo "   Get it from: https://console.cloud.google.com/google/maps-apis"
echo "   Cost: $200 free credit/month"
read -p "   Enter GOOGLE_MAPS_API_KEY (or press Enter to skip): " MAPS_KEY
if [ ! -z "$MAPS_KEY" ]; then
    add_env_var "GOOGLE_MAPS_API_KEY" "$MAPS_KEY"
    echo "   ✓ Google Maps API key saved"
else
    echo "   ⚠ Skipped - Map features will show placeholder"
fi
echo ""

# Firebase
echo "3. Firebase Configuration (for push notifications)"
echo "   Get it from: https://console.firebase.google.com/"
echo "   Go to Project Settings → Service Accounts → Generate New Private Key"
echo "   Cost: FREE"
read -p "   Enter FIREBASE_PROJECT_ID (or press Enter to skip): " FIREBASE_PROJECT
if [ ! -z "$FIREBASE_PROJECT" ]; then
    add_env_var "FIREBASE_PROJECT_ID" "$FIREBASE_PROJECT"
    
    read -p "   Enter FIREBASE_CLIENT_EMAIL: " FIREBASE_EMAIL
    add_env_var "FIREBASE_CLIENT_EMAIL" "$FIREBASE_EMAIL"
    
    echo "   Enter FIREBASE_PRIVATE_KEY (paste the entire key including -----BEGIN/END-----):"
    read -r FIREBASE_KEY
    add_env_var "FIREBASE_PRIVATE_KEY" "$FIREBASE_KEY"
    
    echo "   ✓ Firebase configuration saved"
else
    echo "   ⚠ Skipped - Push notifications will not work"
fi
echo ""

# ========================================
# Enhanced AI APIs (Optional but Recommended)
# ========================================

echo "========================================="
echo "ENHANCED AI APIs (Optional - for better AI)"
echo "========================================="
echo ""

# Claude API
echo "4. Anthropic Claude API Key"
echo "   Get it from: https://console.anthropic.com/"
echo "   Cost: $5 free credit, then $3-$15 per million tokens"
read -p "   Enter ANTHROPIC_API_KEY (or press Enter to skip): " CLAUDE_KEY
if [ ! -z "$CLAUDE_KEY" ]; then
    add_env_var "ANTHROPIC_API_KEY" "$CLAUDE_KEY"
    echo "   ✓ Claude API key saved"
else
    echo "   ⚠ Skipped - Will use only Gemini for AI"
fi
echo ""

# OpenAI API
echo "5. OpenAI API Key (GPT-4)"
echo "   Get it from: https://platform.openai.com/api-keys"
echo "   Cost: $5-$30 per million tokens"
read -p "   Enter OPENAI_API_KEY (or press Enter to skip): " OPENAI_KEY
if [ ! -z "$OPENAI_KEY" ]; then
    add_env_var "OPENAI_API_KEY" "$OPENAI_KEY"
    echo "   ✓ OpenAI API key saved"
else
    echo "   ⚠ Skipped - Will use only Gemini for AI"
fi
echo ""

# OpenWeatherMap API
echo "6. OpenWeatherMap API Key (for rainfall forecasts)"
echo "   Get it from: https://openweathermap.org/api"
echo "   Cost: FREE tier (1000 calls/day), Paid: $40/month"
read -p "   Enter OPENWEATHER_API_KEY (or press Enter to skip): " WEATHER_KEY
if [ ! -z "$WEATHER_KEY" ]; then
    add_env_var "OPENWEATHER_API_KEY" "$WEATHER_KEY"
    echo "   ✓ OpenWeatherMap API key saved"
else
    echo "   ⚠ Skipped - Will use only historical weather data"
fi
echo ""

# ========================================
# Advanced APIs (Optional)
# ========================================

echo "========================================="
echo "ADVANCED APIs (Optional - for advanced features)"
echo "========================================="
echo ""

# NASA Earthdata
echo "7. NASA Earthdata Token (for soil moisture data)"
echo "   Get it from: https://urs.earthdata.nasa.gov/"
echo "   Cost: FREE"
read -p "   Enter NASA_EARTHDATA_TOKEN (or press Enter to skip): " NASA_TOKEN
if [ ! -z "$NASA_TOKEN" ]; then
    add_env_var "NASA_EARTHDATA_TOKEN" "$NASA_TOKEN"
    echo "   ✓ NASA Earthdata token saved"
else
    echo "   ⚠ Skipped - Soil moisture data will be estimated"
fi
echo ""

# SageMaker Endpoint
echo "8. AWS SageMaker Endpoint (for ML predictions)"
echo "   Deploy ML model first, then enter endpoint name"
echo "   Cost: ~$0.10/hour for inference"
read -p "   Enter SAGEMAKER_ENDPOINT (or press Enter to skip): " SAGEMAKER_EP
if [ ! -z "$SAGEMAKER_EP" ]; then
    add_env_var "SAGEMAKER_ENDPOINT" "$SAGEMAKER_EP"
    echo "   ✓ SageMaker endpoint saved"
else
    echo "   ⚠ Skipped - Will use AI models for predictions"
fi
echo ""

# ========================================
# Summary
# ========================================

echo "========================================="
echo "SETUP COMPLETE!"
echo "========================================="
echo ""
echo "Configuration saved to: .env"
echo ""
echo "Configured APIs:"
grep -v "^#" .env | grep "=" | cut -d'=' -f1 | while read key; do
    echo "  ✓ $key"
done
echo ""

# Count configured vs total
TOTAL_APIS=8
CONFIGURED=$(grep -v "^#" .env | grep -c "=")
echo "Progress: $CONFIGURED/$TOTAL_APIS APIs configured"
echo ""

# Next steps
echo "========================================="
echo "NEXT STEPS:"
echo "========================================="
echo ""
echo "1. Review the .env file:"
echo "   cat .env"
echo ""
echo "2. Deploy to AWS Lambda:"
echo "   cd infrastructure/cdk"
echo "   npm install"
echo "   cdk deploy"
echo ""
echo "3. Update Android app with Google Maps API key:"
echo "   Edit: app/src/main/AndroidManifest.xml"
echo "   Add: <meta-data android:name=\"com.google.android.geo.API_KEY\" android:value=\"YOUR_KEY\"/>"
echo ""
echo "4. Test the APIs:"
echo "   ./test-apis.sh"
echo ""

# Create test script
cat > test-apis.sh << 'EOF'
#!/bin/bash

echo "Testing API Keys..."
echo ""

# Test Gemini
if [ ! -z "$GEMINI_API_KEY" ]; then
    echo "Testing Gemini API..."
    curl -s "https://generativelanguage.googleapis.com/v1/models?key=$GEMINI_API_KEY" > /dev/null
    if [ $? -eq 0 ]; then
        echo "  ✓ Gemini API: Working"
    else
        echo "  ✗ Gemini API: Failed"
    fi
fi

# Test OpenWeatherMap
if [ ! -z "$OPENWEATHER_API_KEY" ]; then
    echo "Testing OpenWeatherMap API..."
    curl -s "https://api.openweathermap.org/data/2.5/weather?q=Bangalore&appid=$OPENWEATHER_API_KEY" > /dev/null
    if [ $? -eq 0 ]; then
        echo "  ✓ OpenWeatherMap API: Working"
    else
        echo "  ✗ OpenWeatherMap API: Failed"
    fi
fi

echo ""
echo "Test complete!"
EOF

chmod +x test-apis.sh

echo "API test script created: test-apis.sh"
echo ""
