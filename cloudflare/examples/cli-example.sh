#!/bin/bash
# Example CLI usage of CxO Council API

# Set your API endpoint
API_URL="https://your-worker.workers.dev"

# Submit a review
echo "Submitting review..."
RESPONSE=$(curl -s -X POST "$API_URL/api/review" \
  -H "Content-Type: application/json" \
  -d @test-request.json)

echo "$RESPONSE"

# Extract job ID
JOB_ID=$(echo "$RESPONSE" | jq -r '.job_id')

if [ -z "$JOB_ID" ] || [ "$JOB_ID" == "null" ]; then
  echo "Failed to submit review"
  exit 1
fi

echo ""
echo "Job ID: $JOB_ID"
echo "Waiting for completion..."

# Poll for completion
while true; do
  STATUS=$(curl -s "$API_URL/api/status/$JOB_ID")
  STATUS_TEXT=$(echo "$STATUS" | jq -r '.status')
  PROGRESS=$(echo "$STATUS" | jq -r '.progress // empty')

  if [ "$PROGRESS" != "" ]; then
    echo "Status: $STATUS_TEXT - $PROGRESS"
  else
    echo "Status: $STATUS_TEXT"
  fi

  if [ "$STATUS_TEXT" == "completed" ]; then
    echo ""
    echo "Review completed!"
    break
  elif [ "$STATUS_TEXT" == "failed" ]; then
    echo ""
    echo "Review failed!"
    ERROR=$(echo "$STATUS" | jq -r '.error')
    echo "Error: $ERROR"
    exit 1
  fi

  sleep 5
done

# Get result
echo ""
echo "Fetching result..."
curl -s "$API_URL/api/result/$JOB_ID" | jq '.'

# Get just the synthesis
echo ""
echo "========================================="
echo "SYNTHESIS"
echo "========================================="
curl -s "$API_URL/api/result/$JOB_ID/synthesis"
echo ""
