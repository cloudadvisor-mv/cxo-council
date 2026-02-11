#!/bin/bash
# CxO Council Cloudflare Deployment Script

set -e

echo "========================================="
echo "CxO Council - Cloudflare Deployment"
echo "========================================="
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Login to Cloudflare
echo "📝 Logging in to Cloudflare..."
wrangler login

# Create queues
echo ""
echo "📦 Creating Cloudflare Queues..."
wrangler queues create cxo-review-queue || echo "Queue already exists"
wrangler queues create cxo-review-dlq || echo "DLQ already exists"

# Create R2 bucket
echo ""
echo "🪣 Creating R2 Bucket..."
wrangler r2 bucket create cxo-council-storage || echo "Bucket already exists"

# Create KV namespace
echo ""
echo "🗄️  Creating KV Namespace..."
KV_OUTPUT=$(wrangler kv:namespace create JOBS 2>&1)
echo "$KV_OUTPUT"

# Extract KV namespace ID
KV_ID=$(echo "$KV_OUTPUT" | grep -oP 'id = "\K[^"]+' || echo "")

if [ -n "$KV_ID" ]; then
    echo ""
    echo "✅ KV Namespace created with ID: $KV_ID"
    echo "Updating wrangler.toml files..."

    # Update ingress wrangler.toml
    sed -i "s/YOUR_KV_NAMESPACE_ID/$KV_ID/g" workers/ingress/wrangler.toml

    # Update consumer wrangler.toml
    sed -i "s/YOUR_KV_NAMESPACE_ID/$KV_ID/g" workers/consumer/wrangler.toml
else
    echo "⚠️  Could not extract KV namespace ID. Please update wrangler.toml files manually."
fi

# Set secrets
echo ""
echo "🔐 Setting API keys as secrets..."
echo "Please enter your OpenRouter API key:"
wrangler secret put OPENROUTER_API_KEY --name cxo-council-ingress
wrangler secret put OPENROUTER_API_KEY --name cxo-council-consumer

# Install dependencies and deploy ingress worker
echo ""
echo "📦 Installing dependencies for ingress worker..."
cd workers/ingress
npm install

echo ""
echo "🚀 Deploying ingress worker..."
wrangler deploy

# Install dependencies and deploy consumer worker
echo ""
echo "📦 Installing dependencies for consumer worker..."
cd ../consumer
npm install

echo ""
echo "🚀 Deploying consumer worker..."
wrangler deploy

cd ../..

echo ""
echo "========================================="
echo "✅ Deployment Complete!"
echo "========================================="
echo ""
echo "Your CxO Council API is now live!"
echo ""
echo "Next steps:"
echo "1. Test the API: curl https://cxo-council-ingress.YOUR_SUBDOMAIN.workers.dev/health"
echo "2. Submit a review: See examples in ./examples/"
echo "3. Configure custom domain (optional): Edit wrangler.toml"
echo ""
