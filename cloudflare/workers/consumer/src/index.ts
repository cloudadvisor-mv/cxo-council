/**
 * CxO Council Queue Consumer Worker
 * Processes review jobs from the queue
 */

import { CouncilV1 } from '../../../shared/council'
import type { Config, JobStatus, QueueMessage, ReviewResult } from '../../../shared/types'

type Env = {
  STORAGE: R2Bucket
  JOBS: KVNamespace
  OPENROUTER_API_KEY: string
}

export default {
  async queue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      const { jobId, documentKey, configKey, webhookUrl } = message.body

      console.log(`Processing job ${jobId}`)

      try {
        // Update status to processing
        await updateJobStatus(env.JOBS, jobId, 'processing', {
          started_at: new Date().toISOString()
        })

        // Fetch document and config from R2
        const [documentObj, configObj] = await Promise.all([
          env.STORAGE.get(documentKey),
          env.STORAGE.get(configKey)
        ])

        if (!documentObj || !configObj) {
          throw new Error(`Document or config not found for job ${jobId}`)
        }

        const documentText = await documentObj.text()
        const config = await configObj.json() as Config

        console.log(`Starting review for job ${jobId}`)

        // Run council review with progress tracking
        const council = new CouncilV1(config, env.OPENROUTER_API_KEY)

        const result = await council.reviewDocument(
          documentText,
          async (stage: string, step: string) => {
            // Update progress in KV
            await updateJobProgress(env.JOBS, jobId, stage, step)
            console.log(`Job ${jobId}: ${stage} - ${step}`)
          }
        )

        console.log(`Review completed for job ${jobId}`)

        // Store result in R2
        await env.STORAGE.put(
          `results/${jobId}.json`,
          JSON.stringify(result),
          {
            httpMetadata: {
              contentType: 'application/json'
            },
            customMetadata: {
              job_id: jobId,
              completed_at: new Date().toISOString()
            }
          }
        )

        // Update status to completed
        await updateJobStatus(env.JOBS, jobId, 'completed', {
          completed_at: new Date().toISOString()
        })

        console.log(`Job ${jobId} marked as completed`)

        // Call webhook if provided
        if (webhookUrl) {
          try {
            await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                job_id: jobId,
                status: 'completed',
                completed_at: new Date().toISOString(),
                result_url: `/api/result/${jobId}`
              })
            })
            console.log(`Webhook called for job ${jobId}`)
          } catch (webhookError) {
            console.error(`Webhook failed for job ${jobId}:`, webhookError)
            // Don't fail the job if webhook fails
          }
        }

        // Acknowledge message
        message.ack()

      } catch (error) {
        console.error(`Job ${jobId} failed:`, error)

        // Update status to failed
        await updateJobStatus(env.JOBS, jobId, 'failed', {
          failed_at: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        })

        // Call webhook with error if provided
        if (webhookUrl) {
          try {
            await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                job_id: jobId,
                status: 'failed',
                failed_at: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error'
              })
            })
          } catch (webhookError) {
            console.error(`Error webhook failed for job ${jobId}:`, webhookError)
          }
        }

        // Retry the message (up to max_retries in wrangler.toml)
        message.retry()
      }
    }
  }
}

/**
 * Update job status in KV
 */
async function updateJobStatus(
  kv: KVNamespace,
  jobId: string,
  status: JobStatus['status'],
  extra: Partial<JobStatus> = {}
): Promise<void> {
  const existing = await kv.get(`job:${jobId}`, 'json') as JobStatus | null
  const updated: JobStatus = {
    ...existing,
    id: jobId,
    status,
    created_at: existing?.created_at || new Date().toISOString(),
    ...extra
  } as JobStatus

  await kv.put(
    `job:${jobId}`,
    JSON.stringify(updated),
    {
      expirationTtl: 86400 * 7 // 7 days
    }
  )
}

/**
 * Update job progress in KV
 */
async function updateJobProgress(
  kv: KVNamespace,
  jobId: string,
  stage: string,
  step: string
): Promise<void> {
  const existing = await kv.get(`job:${jobId}`, 'json') as JobStatus | null
  if (existing) {
    const updated: JobStatus = {
      ...existing,
      progress: { stage, step }
    }
    await kv.put(
      `job:${jobId}`,
      JSON.stringify(updated),
      {
        expirationTtl: 86400 * 7 // 7 days
      }
    )
  }
}
