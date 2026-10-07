#!/bin/bash
# apply-cors.sh

echo "=================================================="
echo " Applying CORS Configuration to Firebase Storage "
echo "=================================================="

BUCKET_NAME="studio-5700093446-89b93.firebasestorage.app"
CORS_FILE="storage.cors.json"

# Check if the CORS file exists
if [ ! -f "$CORS_FILE" ]; then
  echo "Error: $CORS_FILE not found!"
  exit 1
fi

echo "Using CORS file: $CORS_FILE"
echo "Target Bucket: $BUCKET_NAME"
echo ""

# Method 1: Using gsutil (Recommended)
if command -v gsutil &> /dev/null; then
    echo "Attempting to apply using 'gsutil' (Recommended)..."
    gsutil cors set "$CORS_FILE" "gs://$BUCKET_NAME"

    if [ $? -eq 0 ]; then
        echo "✅ Success! CORS configuration updated via gsutil."
        exit 0
    else
        echo "⚠️  'gsutil' command failed. It might require authentication or proper permissions."
        echo "   Try running: gcloud auth login"
    fi
else
    echo "ℹ️  'gsutil' is not installed or not in PATH."
fi

echo ""

# Method 2: Using firebase CLI
if command -v firebase &> /dev/null; then
    echo "Attempting to apply using 'firebase deploy'..."
    echo "Note: 'firebase deploy' handles rules well, but 'gsutil' is more reliable for CORS."
    firebase deploy --only storage

    if [ $? -eq 0 ]; then
        echo "✅ Firebase deployment command finished."
        echo "   Please verify if images are loading. If not, you MUST use gsutil (see below)."
    else
        echo "❌ 'firebase' deployment failed."
    fi
else
    echo "ℹ️  'firebase' CLI is not installed or not in PATH."
fi

echo ""
echo "=================================================="
echo " IMPORTANT: If images still don't load "
echo "=================================================="
echo "The most reliable way to fix CORB errors is using 'gsutil' (part of Google Cloud SDK)."
echo "If the scripts above didn't work or you don't have the tools installed,"
echo "please install the Google Cloud SDK and run:"
echo ""
echo "   gcloud auth login"
echo "   gsutil cors set $CORS_FILE gs://$BUCKET_NAME"
echo ""
