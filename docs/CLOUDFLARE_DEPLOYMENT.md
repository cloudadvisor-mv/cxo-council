# Deploying CxO Council to Cloudflare Workers

Guide for deploying CxO Council as a serverless API on Cloudflare Workers.

## Architecture Overview

CxO Council's 4-stage review process makes 9-13 sequential LLM API calls, taking 20-130 seconds total. This exceeds Cloudflare Workers' execution limits, so we need an **async architecture**.

## The Challenge

| Metric | Requirement | Workers Free | Workers Paid |
|--------|-------------|--------------|--------------|
| CPU Time | 20-130s | 10ms | 30s |
| Wall Time | 20-130s | 50ms | 30s |
| **Status** | ❌ Too long | ❌ Too long | ❌ Too long |

**Solution**: Use async processing with Cloudflare Queues or Durable Objects.

## Recommended Architecture: Cloudflare Queues

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Request                            │
│  POST /api/review { document, config }                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Ingress Worker (HTTP)                        │
│  - Validate request                                             │
│  - Store document in R2/KV                                      │
│  - Enqueue job to Queue                                         │
│  - Return job_id                                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Cloudflare Queue                            │
│  Job: { job_id, document_id, config }                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Consumer Worker (Queue)                       │
│  - Fetch document from R2/KV                                    │
│  - Run 4-stage deliberation (9-13 LLM calls)                    │
│  - Store result in R2/KV                                        │
│  - Update status to "completed"                                 │
│  - Optionally: Call webhook URL                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Status/Result Endpoints                      │
│  GET /api/status/:job_id  -> { status, progress }              │
│  GET /api/result/:job_id  -> { synthesis, stages }             │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Options

### Option 1: Full Async with Queues (Production-Ready)

**Pros:**
- No execution time limits on Queue consumers
- Scalable and resilient
- Best for production use

**Cons:**
- Requires Cloudflare Workers Paid plan (~$5/month)
- More complex implementation

**Use when:**
- Building a public API
- Need reliability at scale
- Multiple concurrent reviews

### Option 2: Durable Objects + WebSockets (Real-time)

**Pros:**
- Real-time streaming of results
- Interactive experience
- Can show progress as stages complete

**Cons:**
- More complex client-side
- Requires Durable Objects (paid)
- WebSocket connection management

**Use when:**
- Building a web UI
- Want real-time progress updates
- Interactive applications

### Option 3: Simple Webhook (Minimal)

**Pros:**
- Simplest implementation
- Works with free tier (for small jobs)
- Easy to understand

**Cons:**
- Requires webhook endpoint
- May hit time limits on complex reviews
- Less reliable

**Use when:**
- Testing/prototyping
- Small documents only
- You control both ends (API + webhook receiver)

## Detailed Implementation: Option 1 (Queues)

### Project Structure

```
cxo-council-cf/
├── workers/
│   ├── ingress/              # HTTP API endpoints
│   │   ├── src/
│   │   │   └── index.ts     # Main worker
│   │   ├── wrangler.toml    # Config
│   │   └── package.json
│   └── consumer/             # Queue consumer
│       ├── src/
│       │   └── index.ts     # Queue handler
│       ├── wrangler.toml
│       └── package.json
├── shared/
│   ├── council.ts            # Core council logic (ported from Python)
│   ├── llm-client.ts         # LLM API client
│   └── prompts.ts            # Prompt templates
└── docs/
    └── API.md                # API documentation
```

### Step-by-Step Setup

#### 1. Install Wrangler

```bash
npm install -g wrangler

# Login
wrangler login
```

#### 2. Create Ingress Worker

```bash
mkdir -p cxo-council-cf/workers/ingress
cd cxo-council-cf/workers/ingress
npm init -y
npm install --save-dev wrangler
npm install hono zod
```

**`wrangler.toml`:**
```toml
name = "cxo-council-ingress"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[env.production]
workers_dev = false
routes = [
  { pattern = "council.yourdomain.com/*", zone_name = "yourdomain.com" }
]

# Bindings
[[queues.producers]]
binding = "REVIEW_QUEUE"
queue = "cxo-review-queue"

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "cxo-council-storage"

[[kv_namespaces]]
binding = "JOBS"
id = "your-kv-namespace-id"

[vars]
OPENROUTER_API_KEY = ""  # Set via secrets
```

**`src/index.ts`:**
```typescript
import { Hono } from 'hono'
import { z } from 'zod'

type Env = {
  REVIEW_QUEUE: Queue
  STORAGE: R2Bucket
  JOBS: KVNamespace
  OPENROUTER_API_KEY: string
}

const app = new Hono<{ Bindings: Env }>()

// Request schema
const reviewRequestSchema = z.object({
  document: z.string().min(1).max(50000),
  config: z.object({
    executive_model: z.string(),
    ceo_model: z.string(),
    operational_context: z.string(),
    custom_role_instructions: z.record(z.string())
  }),
  webhook_url: z.string().url().optional()
})

// POST /api/review - Start a review
app.post('/api/review', async (c) => {
  try {
    const body = await c.req.json()
    const validated = reviewRequestSchema.parse(body)

    // Generate job ID
    const jobId = crypto.randomUUID()

    // Store document in R2
    await c.env.STORAGE.put(
      `documents/${jobId}.md`,
      validated.document
    )

    // Store config in R2
    await c.env.STORAGE.put(
      `configs/${jobId}.json`,
      JSON.stringify(validated.config)
    )

    // Initialize job status in KV
    await c.env.JOBS.put(
      `job:${jobId}`,
      JSON.stringify({
        id: jobId,
        status: 'queued',
        created_at: new Date().toISOString(),
        webhook_url: validated.webhook_url
      })
    )

    // Enqueue job
    await c.env.REVIEW_QUEUE.send({
      jobId,
      documentKey: `documents/${jobId}.md`,
      configKey: `configs/${jobId}.json`,
      webhookUrl: validated.webhook_url
    })

    return c.json({
      job_id: jobId,
      status: 'queued',
      status_url: `/api/status/${jobId}`,
      result_url: `/api/result/${jobId}`
    }, 202)

  } catch (error) {
    return c.json({ error: 'Invalid request', details: error.message }, 400)
  }
})

// GET /api/status/:jobId - Check job status
app.get('/api/status/:jobId', async (c) => {
  const jobId = c.req.param('jobId')
  const job = await c.env.JOBS.get(`job:${jobId}`, 'json')

  if (!job) {
    return c.json({ error: 'Job not found' }, 404)
  }

  return c.json(job)
})

// GET /api/result/:jobId - Get completed result
app.get('/api/result/:jobId', async (c) => {
  const jobId = c.req.param('jobId')
  const job = await c.env.JOBS.get(`job:${jobId}`, 'json')

  if (!job) {
    return c.json({ error: 'Job not found' }, 404)
  }

  if (job.status !== 'completed') {
    return c.json({
      error: 'Job not completed',
      status: job.status
    }, 400)
  }

  // Fetch result from R2
  const result = await c.env.STORAGE.get(`results/${jobId}.json`)
  if (!result) {
    return c.json({ error: 'Result not found' }, 404)
  }

  return c.json(await result.json())
})

export default app
```

#### 3. Create Queue Consumer Worker

```bash
mkdir -p cxo-council-cf/workers/consumer
cd cxo-council-cf/workers/consumer
npm init -y
npm install --save-dev wrangler
```

**`wrangler.toml`:**
```toml
name = "cxo-council-consumer"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[queues.consumers]]
queue = "cxo-review-queue"
max_batch_size = 1
max_retries = 3
dead_letter_queue = "cxo-review-dlq"

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "cxo-council-storage"

[[kv_namespaces]]
binding = "JOBS"
id = "your-kv-namespace-id"

[vars]
OPENROUTER_API_KEY = ""  # Set via secrets
```

**`src/index.ts`:**
```typescript
import { CouncilV1 } from '../../shared/council'

type Env = {
  STORAGE: R2Bucket
  JOBS: KVNamespace
  OPENROUTER_API_KEY: string
}

export default {
  async queue(batch: MessageBatch, env: Env): Promise<void> {
    for (const message of batch.messages) {
      const { jobId, documentKey, configKey, webhookUrl } = message.body

      try {
        // Update status to processing
        await updateJobStatus(env.JOBS, jobId, 'processing')

        // Fetch document and config from R2
        const document = await env.STORAGE.get(documentKey)
        const config = await env.STORAGE.get(configKey)

        if (!document || !config) {
          throw new Error('Document or config not found')
        }

        const documentText = await document.text()
        const configJson = await config.json()

        // Run council review
        const council = new CouncilV1(configJson, env.OPENROUTER_API_KEY)
        const result = await council.reviewDocument(documentText)

        // Store result in R2
        await env.STORAGE.put(
          `results/${jobId}.json`,
          JSON.stringify(result)
        )

        // Update status to completed
        await updateJobStatus(env.JOBS, jobId, 'completed', {
          completed_at: new Date().toISOString()
        })

        // Call webhook if provided
        if (webhookUrl) {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              job_id: jobId,
              status: 'completed',
              result_url: `/api/result/${jobId}`
            })
          })
        }

        message.ack()
      } catch (error) {
        // Update status to failed
        await updateJobStatus(env.JOBS, jobId, 'failed', {
          error: error.message,
          failed_at: new Date().toISOString()
        })

        message.retry()
      }
    }
  }
}

async function updateJobStatus(
  kv: KVNamespace,
  jobId: string,
  status: string,
  extra: Record<string, any> = {}
) {
  const existing = await kv.get(`job:${jobId}`, 'json') || {}
  await kv.put(
    `job:${jobId}`,
    JSON.stringify({
      ...existing,
      status,
      ...extra
    })
  )
}
```

#### 4. Port Council Logic to TypeScript

**`shared/council.ts`:**
```typescript
import { LLMClient } from './llm-client'
import {
  STAGE1_PROMPT,
  STAGE2_PROMPT,
  STAGE3_PROMPT,
  STAGE4_PROMPT,
  formatStage1Responses,
  formatStage2Responses,
  extractDirectedQuestions,
  getExecutivesWithQuestions
} from './prompts'

export interface Config {
  executive_model: string
  ceo_model: string
  operational_context: string
  custom_role_instructions: Record<string, string>
}

export interface ReviewResult {
  stage1: Array<{ role: string; response: string }>
  stage2: Array<{ role: string; response: string }>
  stage3: Array<{ role: string; response: string }>
  synthesis: string
}

export class CouncilV1 {
  private llm: LLMClient
  private config: Config
  private roles = ['CPO', 'CTO', 'COO', 'CISO']

  constructor(config: Config, apiKey: string) {
    this.config = config
    this.llm = new LLMClient(apiKey)
  }

  async reviewDocument(documentContent: string): Promise<ReviewResult> {
    // Stage 1: Independent Reviews
    const stage1Results = await Promise.all(
      this.roles.map(async (role) => {
        const prompt = STAGE1_PROMPT
          .replace('{role}', role)
          .replace('{role_instructions}', this.config.custom_role_instructions[role])
          .replace('{operational_context}', this.config.operational_context)
          .replace('{document_content}', documentContent)

        const response = await this.llm.query(
          prompt,
          this.config.executive_model,
          0.7
        )

        return { role, response }
      })
    )

    const stage1Text = formatStage1Responses(stage1Results)

    // Stage 2: Questions
    const stage2Results = await Promise.all(
      this.roles.map(async (role) => {
        const prompt = STAGE2_PROMPT
          .replace('{role_instructions}', this.config.custom_role_instructions[role])
          .replace('{operational_context}', this.config.operational_context)
          .replace('{stage1_text}', stage1Text)

        const response = await this.llm.query(
          prompt,
          this.config.executive_model,
          0.6
        )

        return { role, response }
      })
    )

    const stage2Text = formatStage2Responses(stage2Results)

    // Stage 3: Responses
    const rolesWithQuestions = getExecutivesWithQuestions(stage2Results)
    const stage3Results = await Promise.all(
      Array.from(rolesWithQuestions).map(async (role) => {
        const questions = extractDirectedQuestions(stage2Results, role)
        const prompt = STAGE3_PROMPT
          .replace('{role_instructions}', this.config.custom_role_instructions[role])
          .replace('{operational_context}', this.config.operational_context)
          .replace('{stage1_text}', stage1Text)
          .replace('{directed_questions}', questions)

        const response = await this.llm.query(
          prompt,
          this.config.executive_model,
          0.7
        )

        return { role, response }
      })
    )

    const stage3Text = stage3Results.length > 0
      ? formatStage2Responses(stage3Results)
      : 'No responses required.'

    // Stage 4: CEO Synthesis
    const synthesisPrompt = STAGE4_PROMPT
      .replace('{operational_context}', this.config.operational_context)
      .replace('{document_content}', documentContent)
      .replace('{stage1_text}', stage1Text)
      .replace('{stage2_text}', stage2Text)
      .replace('{stage3_text}', stage3Text)

    const synthesis = await this.llm.query(
      synthesisPrompt,
      this.config.ceo_model,
      0.7
    )

    return {
      stage1: stage1Results,
      stage2: stage2Results,
      stage3: stage3Results,
      synthesis
    }
  }
}
```

**`shared/llm-client.ts`:**
```typescript
export class LLMClient {
  constructor(private apiKey: string) {}

  async query(
    prompt: string,
    model: string,
    temperature: number = 0.7
  ): Promise<string> {
    if (model.startsWith('openrouter:')) {
      return this.queryOpenRouter(prompt, model, temperature)
    } else if (model.startsWith('anthropic:')) {
      return this.queryAnthropic(prompt, model, temperature)
    } else {
      throw new Error(`Unknown model provider: ${model}`)
    }
  }

  private async queryOpenRouter(
    prompt: string,
    model: string,
    temperature: number
  ): Promise<string> {
    const modelName = model.replace('openrouter:', '')

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/yourusername/cxo-council',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature
      })
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  }

  private async queryAnthropic(
    prompt: string,
    model: string,
    temperature: number
  ): Promise<string> {
    const modelName = model.replace('anthropic:', '')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
        temperature
      })
    })

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.content[0].text
  }
}
```

#### 5. Deploy

```bash
# Create Queue
wrangler queues create cxo-review-queue
wrangler queues create cxo-review-dlq

# Create R2 Bucket
wrangler r2 bucket create cxo-council-storage

# Create KV Namespace
wrangler kv:namespace create JOBS

# Set secrets
wrangler secret put OPENROUTER_API_KEY  # Paste your key

# Deploy ingress worker
cd workers/ingress
wrangler deploy

# Deploy consumer worker
cd ../consumer
wrangler deploy
```

### Usage

```bash
# Start a review
curl -X POST https://council.yourdomain.com/api/review \
  -H "Content-Type: application/json" \
  -d '{
    "document": "# My Plan\n\n...",
    "config": {
      "executive_model": "openrouter:deepseek/deepseek-v3.2",
      "ceo_model": "openrouter:anthropic/claude-sonnet-4-5",
      "operational_context": "...",
      "custom_role_instructions": {...}
    },
    "webhook_url": "https://your-app.com/webhook"
  }'

# Response:
{
  "job_id": "uuid-here",
  "status": "queued",
  "status_url": "/api/status/uuid-here",
  "result_url": "/api/result/uuid-here"
}

# Check status
curl https://council.yourdomain.com/api/status/uuid-here

# Get result (when completed)
curl https://council.yourdomain.com/api/result/uuid-here
```

## Cost Estimation

### Cloudflare Costs

| Service | Free Tier | Paid Tier | Notes |
|---------|-----------|-----------|-------|
| Workers | 100k req/day | $5/month + usage | Need paid for Queues |
| Queues | Not available | Included in paid | Required for this architecture |
| R2 | 10 GB storage | $0.015/GB/month | Document/result storage |
| KV | 100k reads/day | $0.50/million reads | Job status tracking |

**Minimum**: ~$5/month for Workers Paid plan

### LLM API Costs (per review)

See [QUICK_REFERENCE.md](../QUICK_REFERENCE.md#cost-examples-approximate)

## Next Steps

1. Choose your deployment approach (Queues, Durable Objects, or Webhook)
2. Port Python code to TypeScript
3. Set up Cloudflare account and services
4. Deploy and test
5. Build client integration (CLI, web UI, or SDK)

## See Also

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare Queues Docs](https://developers.cloudflare.com/queues/)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [API Reference](./API_REFERENCE.md) - Python implementation reference
