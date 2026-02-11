# CxO Council - Cloudflare Workers Deployment

Complete TypeScript implementation of CxO Council for Cloudflare Workers with Queues.

## Architecture

```
User Request
     │
     ├─> POST /api/review          (Ingress Worker)
     │   └─> Returns job_id immediately
     │
     ├─> Cloudflare Queue
     │   └─> Consumer Worker processes review (9-13 LLM API calls)
     │       └─> Stores result in R2
     │
     └─> GET /api/status/:job_id   (Check progress)
         GET /api/result/:job_id   (Get completed synthesis)
```

## Features

- ✅ **Async Processing**: No execution time limits via Cloudflare Queues
- ✅ **Global Edge**: Deployed to Cloudflare's global network
- ✅ **Scalable**: Automatically handles concurrent reviews
- ✅ **Persistent Storage**: R2 for documents/results, KV for job status
- ✅ **Progress Tracking**: Real-time progress updates during review
- ✅ **Webhook Support**: Optional webhook on completion
- ✅ **Full TypeScript**: Type-safe implementation

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Cloudflare account (free tier works, paid plan required for Queues)
- OpenRouter API key

### One-Command Deploy

```bash
./deploy.sh
```

This script will:
1. Install Wrangler CLI
2. Create Queues, R2 bucket, and KV namespace
3. Set API key secrets
4. Deploy both workers

### Manual Deployment

If you prefer step-by-step:

```bash
# 1. Install Wrangler
npm install -g wrangler

# 2. Login
wrangler login

# 3. Create resources
wrangler queues create cxo-review-queue
wrangler queues create cxo-review-dlq
wrangler r2 bucket create cxo-council-storage
wrangler kv:namespace create JOBS

# 4. Update wrangler.toml files with KV namespace ID
# (Copy the ID from step 3 output)

# 5. Set secrets
wrangler secret put OPENROUTER_API_KEY --name cxo-council-ingress
wrangler secret put OPENROUTER_API_KEY --name cxo-council-consumer

# 6. Deploy ingress worker
cd workers/ingress
npm install
wrangler deploy

# 7. Deploy consumer worker
cd ../consumer
npm install
wrangler deploy
```

## Project Structure

```
cloudflare/
├── shared/                  # Shared TypeScript code
│   ├── types.ts            # Type definitions
│   ├── council.ts          # Core council logic
│   ├── llm-client.ts       # LLM API client
│   └── prompts.ts          # Prompt templates
├── workers/
│   ├── ingress/            # HTTP API worker
│   │   ├── src/index.ts
│   │   ├── wrangler.toml
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── consumer/           # Queue consumer worker
│       ├── src/index.ts
│       ├── wrangler.toml
│       ├── package.json
│       └── tsconfig.json
├── deploy.sh               # Deployment script
├── README.md               # This file
└── examples/               # Usage examples
```

## API Reference

### POST /api/review

Start a new review.

**Request:**
```json
{
  "document": "# My Plan\n\n...",
  "config": {
    "executive_model": "openrouter:deepseek/deepseek-v3.2",
    "ceo_model": "openrouter:anthropic/claude-sonnet-4-5",
    "operational_context": "Your project context...",
    "custom_role_instructions": {
      "CTO": "...",
      "CPO": "...",
      "COO": "...",
      "CISO": "...",
      "CEO": "..."
    }
  },
  "webhook_url": "https://your-app.com/webhook" // optional
}
```

**Response (202 Accepted):**
```json
{
  "job_id": "uuid-here",
  "status": "queued",
  "created_at": "2025-01-15T10:30:00Z",
  "status_url": "/api/status/uuid-here",
  "result_url": "/api/result/uuid-here"
}
```

### GET /api/status/:jobId

Check review status.

**Response:**
```json
{
  "id": "uuid-here",
  "status": "processing",
  "created_at": "2025-01-15T10:30:00Z",
  "started_at": "2025-01-15T10:30:05Z",
  "progress": {
    "stage": "stage2",
    "step": "Querying CTO"
  }
}
```

Status values: `queued`, `processing`, `completed`, `failed`

### GET /api/result/:jobId

Get completed result.

**Response:**
```json
{
  "job_id": "uuid-here",
  "status": "completed",
  "completed_at": "2025-01-15T10:32:00Z",
  "result": {
    "stage1": [...],
    "stage2": [...],
    "stage3": [...],
    "synthesis": "## Executive Decision: GO\n\n..."
  }
}
```

### GET /api/result/:jobId/synthesis

Get just the synthesis text (as markdown).

**Response:**
```markdown
## Executive Decision: GO

...
```

### DELETE /api/job/:jobId

Delete a job and all its data.

## Usage Examples

### cURL

```bash
# Start a review
curl -X POST https://your-worker.workers.dev/api/review \
  -H "Content-Type: application/json" \
  -d @request.json

# Check status
curl https://your-worker.workers.dev/api/status/JOB_ID

# Get result
curl https://your-worker.workers.dev/api/result/JOB_ID

# Get just synthesis
curl https://your-worker.workers.dev/api/result/JOB_ID/synthesis
```

### JavaScript/TypeScript

```typescript
// Submit review
const response = await fetch('https://your-worker.workers.dev/api/review', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    document: '# My Plan\n\n...',
    config: { /* ... */ }
  })
})

const { job_id } = await response.json()

// Poll for completion
const pollStatus = async (jobId: string) => {
  const response = await fetch(`https://your-worker.workers.dev/api/status/${jobId}`)
  const status = await response.json()

  if (status.status === 'completed') {
    const result = await fetch(`https://your-worker.workers.dev/api/result/${jobId}`)
    return await result.json()
  } else if (status.status === 'failed') {
    throw new Error(status.error)
  } else {
    // Still processing, wait and retry
    await new Promise(resolve => setTimeout(resolve, 5000))
    return pollStatus(jobId)
  }
}

const result = await pollStatus(job_id)
console.log(result.result.synthesis)
```

### Python

```python
import requests
import time

# Submit review
response = requests.post(
    'https://your-worker.workers.dev/api/review',
    json={
        'document': '# My Plan\n\n...',
        'config': { ... }
    }
)

job_id = response.json()['job_id']

# Poll for completion
while True:
    status = requests.get(
        f'https://your-worker.workers.dev/api/status/{job_id}'
    ).json()

    if status['status'] == 'completed':
        result = requests.get(
            f'https://your-worker.workers.dev/api/result/{job_id}'
        ).json()
        print(result['result']['synthesis'])
        break
    elif status['status'] == 'failed':
        raise Exception(status['error'])
    else:
        print(f"Status: {status['progress']}")
        time.sleep(5)
```

## Configuration

### Custom Domain

Edit `workers/ingress/wrangler.toml`:

```toml
[env.production]
routes = [
  { pattern = "council.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

Then deploy:
```bash
wrangler deploy --env production
```

### Environment Variables

Set via Wrangler secrets:

```bash
# Required: OpenRouter API key
wrangler secret put OPENROUTER_API_KEY --name cxo-council-ingress
wrangler secret put OPENROUTER_API_KEY --name cxo-council-consumer

# Optional: Anthropic API key (if using anthropic: models)
wrangler secret put ANTHROPIC_API_KEY --name cxo-council-consumer
```

## Development

### Local Development

```bash
# Terminal 1: Run ingress worker
cd workers/ingress
npm install
wrangler dev

# Terminal 2: Run consumer worker (requires paid plan for local queue testing)
cd workers/consumer
npm install
wrangler dev
```

### Testing

```bash
# Test health endpoint
curl http://localhost:8787/health

# Submit test review
curl -X POST http://localhost:8787/api/review \
  -H "Content-Type: application/json" \
  -d @../../examples/test-request.json
```

### Logs

```bash
# Tail ingress logs
wrangler tail --name cxo-council-ingress

# Tail consumer logs
wrangler tail --name cxo-council-consumer
```

## Cost Estimation

### Cloudflare

- **Workers Paid Plan**: $5/month (required for Queues)
- **Queue Operations**: Included
- **R2 Storage**: $0.015/GB/month (first 10GB free)
- **KV Reads**: $0.50/million (first 100k/day free)

**Typical monthly cost**: ~$5-10 for moderate usage

### LLM APIs

Per review (with DeepSeek): $0.01 - $0.15
Per review (with Claude Sonnet): $0.20 - $3.00

See full cost breakdown in [../docs/CLOUDFLARE_DEPLOYMENT.md](../docs/CLOUDFLARE_DEPLOYMENT.md)

## Monitoring

### Check Queue Status

```bash
wrangler queues list
```

### View Dead Letter Queue

```bash
# If jobs are failing and going to DLQ
wrangler queues consumer --queue cxo-review-dlq
```

### Analytics

View in Cloudflare Dashboard:
- Workers Analytics: Request volume, errors
- R2 Analytics: Storage usage
- Queue Analytics: Processing rate, failures

## Troubleshooting

### Job Stuck in "queued"

- Check consumer worker is deployed: `wrangler deployments list --name cxo-council-consumer`
- Check consumer logs: `wrangler tail --name cxo-council-consumer`
- Verify queue binding in `wrangler.toml`

### "Result not found" Error

- Job may have failed, check `/api/status/:jobId`
- Check consumer logs for errors
- Verify R2 bucket exists and is accessible

### LLM API Errors

- Verify API key is set: `wrangler secret list --name cxo-council-consumer`
- Check API key is valid on OpenRouter/Anthropic
- Review consumer logs for specific error messages

## Next Steps

- **Custom Domain**: Configure in `wrangler.toml`
- **Client SDK**: See `examples/client-sdk.ts`
- **Web UI**: Build a frontend with real-time progress
- **Authentication**: Add API key validation in ingress worker
- **Rate Limiting**: Use Cloudflare Rate Limiting

## See Also

- [Full Documentation](../docs/CLOUDFLARE_DEPLOYMENT.md)
- [API Reference](../docs/API_REFERENCE.md)
- [Main README](../README.md)
