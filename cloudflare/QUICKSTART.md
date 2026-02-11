# CxO Council - Cloudflare Quickstart

Get your CxO Council API deployed to Cloudflare in 5 minutes.

## Prerequisites

- Cloudflare account ([sign up](https://dash.cloudflare.com/sign-up))
- Node.js 18+ installed
- OpenRouter API key ([get one](https://openrouter.ai/))

## 5-Minute Deploy

### Step 1: Install Wrangler

```bash
npm install -g wrangler
```

### Step 2: Login to Cloudflare

```bash
wrangler login
```

This opens your browser to authenticate.

### Step 3: Run Deploy Script

```bash
cd cloudflare
chmod +x deploy.sh
./deploy.sh
```

The script will:
- ✅ Create Queues
- ✅ Create R2 bucket
- ✅ Create KV namespace
- ✅ Set API key secrets (you'll be prompted)
- ✅ Deploy both workers

### Step 4: Test Your API

```bash
# Get your worker URL from the deploy output
# It will look like: https://cxo-council-ingress.YOUR_SUBDOMAIN.workers.dev

# Test health endpoint
curl https://cxo-council-ingress.YOUR_SUBDOMAIN.workers.dev/health

# Submit a test review
curl -X POST https://cxo-council-ingress.YOUR_SUBDOMAIN.workers.dev/api/review \
  -H "Content-Type: application/json" \
  -d @examples/test-request.json
```

## What You Just Deployed

```
┌─────────────────────────────────────┐
│  Your CxO Council API (Global CDN)  │
│  https://your-worker.workers.dev    │
└──────────────┬──────────────────────┘
               │
       ┌───────┴───────┐
       │               │
   ┌───▼──┐      ┌────▼────┐
   │Ingress│      │Consumer │
   │Worker │      │Worker   │
   └───┬───┘      └────┬────┘
       │               │
   ┌───▼───────────────▼───┐
   │ Cloudflare Queue      │
   │ R2 Storage            │
   │ KV Namespace          │
   └───────────────────────┘
```

## Next Steps

### Use the API

See full API documentation in [README.md](./README.md#api-reference)

**Quick example:**

```bash
# 1. Submit review
JOB=$(curl -s -X POST https://your-worker.workers.dev/api/review \
  -H "Content-Type: application/json" \
  -d @examples/test-request.json | jq -r '.job_id')

# 2. Check status
curl https://your-worker.workers.dev/api/status/$JOB

# 3. Get result (when completed)
curl https://your-worker.workers.dev/api/result/$JOB | jq '.result.synthesis'
```

### Build a Client

Use the TypeScript client SDK:

```typescript
import { CxOCouncilClient } from './examples/client-sdk'

const client = new CxOCouncilClient('https://your-worker.workers.dev')

const result = await client.submitAndWait({
  document: '# My Plan\n\n...',
  config: { /* ... */ }
}, 5000, (status) => {
  console.log('Progress:', status.progress)
})

console.log(result.synthesis)
```

### Add Custom Domain

1. Add your domain to Cloudflare
2. Edit `workers/ingress/wrangler.toml`:
   ```toml
   [env.production]
   routes = [
     { pattern = "council.yourdomain.com/*", zone_name = "yourdomain.com" }
   ]
   ```
3. Deploy: `wrangler deploy --env production`

### Monitor Your API

```bash
# View live logs
wrangler tail --name cxo-council-ingress

# Check queue status
wrangler queues list
```

## Costs

- **Cloudflare Workers**: $5/month (required for Queues)
- **LLM APIs**: ~$0.01-$0.15 per review with DeepSeek

Total: ~$5-10/month for moderate usage

## Troubleshooting

### "Queue not found"

Make sure you've run the deploy script which creates the queue.

### "KV namespace not found"

Update the namespace ID in `wrangler.toml` files:

```bash
# Get the ID
wrangler kv:namespace list

# Copy the ID to both wrangler.toml files
```

### Job stays "queued"

Check consumer worker logs:

```bash
wrangler tail --name cxo-council-consumer
```

### More Help

- [Full README](./README.md)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [GitHub Issues](https://github.com/yourusername/cxo-council/issues)

## What's Next?

You now have a production-ready CxO Council API! 🎉

Build something cool:
- Web UI for document reviews
- Slack bot integration
- CI/CD pipeline integration
- VS Code extension
- GitHub Action

Share what you build!
