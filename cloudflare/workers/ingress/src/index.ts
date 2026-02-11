/**
 * CxO Council Ingress Worker
 * HTTP API for submitting reviews and checking status
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'
import type { Config, ReviewRequest, JobStatus, QueueMessage } from '../../../shared/types'

type Env = {
  REVIEW_QUEUE: Queue<QueueMessage>
  STORAGE: R2Bucket
  JOBS: KVNamespace
  OPENROUTER_API_KEY: string
}

const app = new Hono<{ Bindings: Env }>()

// Enable CORS
app.use('/*', cors())

// Request validation schema
const configSchema = z.object({
  executive_model: z.string(),
  ceo_model: z.string(),
  operational_context: z.string(),
  custom_role_instructions: z.object({
    CTO: z.string(),
    CPO: z.string(),
    COO: z.string(),
    CISO: z.string(),
    CEO: z.string()
  })
})

const reviewRequestSchema = z.object({
  document: z.string().min(1).max(100000),
  config: configSchema,
  webhook_url: z.string().url().optional()
})

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'cxo-council-ingress' })
})

// POST /api/review - Start a review
app.post('/api/review', async (c) => {
  try {
    const body = await c.req.json()
    const validated = reviewRequestSchema.parse(body)

    // Generate job ID
    const jobId = crypto.randomUUID()
    const timestamp = new Date().toISOString()

    // Store document in R2
    await c.env.STORAGE.put(
      `documents/${jobId}.md`,
      validated.document,
      {
        httpMetadata: {
          contentType: 'text/markdown'
        },
        customMetadata: {
          created_at: timestamp,
          job_id: jobId
        }
      }
    )

    // Store config in R2
    await c.env.STORAGE.put(
      `configs/${jobId}.json`,
      JSON.stringify(validated.config),
      {
        httpMetadata: {
          contentType: 'application/json'
        },
        customMetadata: {
          created_at: timestamp,
          job_id: jobId
        }
      }
    )

    // Initialize job status in KV
    const jobStatus: JobStatus = {
      id: jobId,
      status: 'queued',
      created_at: timestamp,
      webhook_url: validated.webhook_url
    }

    await c.env.JOBS.put(
      `job:${jobId}`,
      JSON.stringify(jobStatus),
      {
        expirationTtl: 86400 * 7 // 7 days
      }
    )

    // Enqueue job
    const message: QueueMessage = {
      jobId,
      documentKey: `documents/${jobId}.md`,
      configKey: `configs/${jobId}.json`,
      webhookUrl: validated.webhook_url
    }

    await c.env.REVIEW_QUEUE.send(message)

    // Return response
    return c.json({
      job_id: jobId,
      status: 'queued',
      created_at: timestamp,
      status_url: `/api/status/${jobId}`,
      result_url: `/api/result/${jobId}`
    }, 202)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({
        error: 'Invalid request',
        details: error.errors
      }, 400)
    }

    console.error('Error creating review:', error)
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// GET /api/status/:jobId - Check job status
app.get('/api/status/:jobId', async (c) => {
  const jobId = c.req.param('jobId')

  try {
    const jobData = await c.env.JOBS.get(`job:${jobId}`, 'json')

    if (!jobData) {
      return c.json({ error: 'Job not found' }, 404)
    }

    return c.json(jobData as JobStatus)
  } catch (error) {
    console.error('Error fetching job status:', error)
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// GET /api/result/:jobId - Get completed result
app.get('/api/result/:jobId', async (c) => {
  const jobId = c.req.param('jobId')

  try {
    const jobData = await c.env.JOBS.get(`job:${jobId}`, 'json') as JobStatus | null

    if (!jobData) {
      return c.json({ error: 'Job not found' }, 404)
    }

    if (jobData.status === 'failed') {
      return c.json({
        error: 'Job failed',
        message: jobData.error || 'Unknown error',
        job_status: jobData
      }, 500)
    }

    if (jobData.status !== 'completed') {
      return c.json({
        error: 'Job not completed',
        status: jobData.status,
        message: 'Result not available yet. Check /api/status/:jobId for current status.'
      }, 400)
    }

    // Fetch result from R2
    const result = await c.env.STORAGE.get(`results/${jobId}.json`)
    if (!result) {
      return c.json({
        error: 'Result not found',
        message: 'Job completed but result is missing. Please contact support.'
      }, 404)
    }

    const resultData = await result.json()
    return c.json({
      job_id: jobId,
      status: 'completed',
      completed_at: jobData.completed_at,
      result: resultData
    })
  } catch (error) {
    console.error('Error fetching result:', error)
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// GET /api/result/:jobId/synthesis - Get just the synthesis text
app.get('/api/result/:jobId/synthesis', async (c) => {
  const jobId = c.req.param('jobId')

  try {
    const jobData = await c.env.JOBS.get(`job:${jobId}`, 'json') as JobStatus | null

    if (!jobData) {
      return c.json({ error: 'Job not found' }, 404)
    }

    if (jobData.status !== 'completed') {
      return c.json({
        error: 'Job not completed',
        status: jobData.status
      }, 400)
    }

    const result = await c.env.STORAGE.get(`results/${jobId}.json`)
    if (!result) {
      return c.json({ error: 'Result not found' }, 404)
    }

    const resultData: any = await result.json()

    // Return as markdown
    return c.text(resultData.synthesis, 200, {
      'Content-Type': 'text/markdown'
    })
  } catch (error) {
    console.error('Error fetching synthesis:', error)
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// DELETE /api/job/:jobId - Delete a job and its data
app.delete('/api/job/:jobId', async (c) => {
  const jobId = c.req.param('jobId')

  try {
    // Delete from KV
    await c.env.JOBS.delete(`job:${jobId}`)

    // Delete from R2
    await Promise.all([
      c.env.STORAGE.delete(`documents/${jobId}.md`),
      c.env.STORAGE.delete(`configs/${jobId}.json`),
      c.env.STORAGE.delete(`results/${jobId}.json`)
    ])

    return c.json({ message: 'Job deleted successfully' })
  } catch (error) {
    console.error('Error deleting job:', error)
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not found',
    message: 'The requested endpoint does not exist',
    available_endpoints: [
      'GET /health',
      'POST /api/review',
      'GET /api/status/:jobId',
      'GET /api/result/:jobId',
      'GET /api/result/:jobId/synthesis',
      'DELETE /api/job/:jobId'
    ]
  }, 404)
})

export default app
