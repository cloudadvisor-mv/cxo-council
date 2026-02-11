/**
 * CxO Council Client SDK
 * TypeScript client for interacting with the Cloudflare Workers API
 */

import type { Config, ReviewResult, JobStatus } from '../shared/types'

export interface ReviewRequestOptions {
  document: string
  config: Config
  webhookUrl?: string
}

export interface ReviewResponse {
  job_id: string
  status: string
  created_at: string
  status_url: string
  result_url: string
}

export class CxOCouncilClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    // Remove trailing slash
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  /**
   * Submit a document for review
   */
  async submitReview(options: ReviewRequestOptions): Promise<ReviewResponse> {
    const response = await fetch(`${this.baseUrl}/api/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document: options.document,
        config: options.config,
        webhook_url: options.webhookUrl
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to submit review: ${error.error || response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Check the status of a review
   */
  async getStatus(jobId: string): Promise<JobStatus> {
    const response = await fetch(`${this.baseUrl}/api/status/${jobId}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to get status: ${error.error || response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Get the result of a completed review
   */
  async getResult(jobId: string): Promise<ReviewResult> {
    const response = await fetch(`${this.baseUrl}/api/result/${jobId}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to get result: ${error.error || response.statusText}`)
    }

    const data = await response.json()
    return data.result
  }

  /**
   * Get just the synthesis text
   */
  async getSynthesis(jobId: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/result/${jobId}/synthesis`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to get synthesis: ${error.error || response.statusText}`)
    }

    return await response.text()
  }

  /**
   * Delete a job and its data
   */
  async deleteJob(jobId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/job/${jobId}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to delete job: ${error.error || response.statusText}`)
    }
  }

  /**
   * Submit a review and wait for completion (polls status)
   */
  async submitAndWait(
    options: ReviewRequestOptions,
    pollInterval: number = 5000,
    onProgress?: (status: JobStatus) => void
  ): Promise<ReviewResult> {
    const { job_id } = await this.submitReview(options)

    while (true) {
      const status = await this.getStatus(job_id)

      if (onProgress) {
        onProgress(status)
      }

      if (status.status === 'completed') {
        return await this.getResult(job_id)
      } else if (status.status === 'failed') {
        throw new Error(`Review failed: ${status.error || 'Unknown error'}`)
      }

      // Still processing, wait and retry
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }
  }
}

// Example usage
export async function example() {
  const client = new CxOCouncilClient('https://your-worker.workers.dev')

  // Option 1: Submit and poll manually
  const response = await client.submitReview({
    document: '# My Plan\n\n...',
    config: {
      executive_model: 'openrouter:deepseek/deepseek-v3.2',
      ceo_model: 'openrouter:anthropic/claude-sonnet-4-5',
      operational_context: '...',
      custom_role_instructions: {
        CTO: '...',
        CPO: '...',
        COO: '...',
        CISO: '...',
        CEO: '...'
      }
    }
  })

  console.log(`Job submitted: ${response.job_id}`)

  // Check status
  let status = await client.getStatus(response.job_id)
  while (status.status !== 'completed' && status.status !== 'failed') {
    console.log(`Status: ${status.status}`, status.progress)
    await new Promise(resolve => setTimeout(resolve, 5000))
    status = await client.getStatus(response.job_id)
  }

  if (status.status === 'completed') {
    const result = await client.getResult(response.job_id)
    console.log('Synthesis:', result.synthesis)
  }

  // Option 2: Submit and wait (automatic polling)
  const result = await client.submitAndWait(
    {
      document: '# My Plan\n\n...',
      config: { /* ... */ }
    },
    5000, // Poll every 5 seconds
    (status) => {
      console.log(`Progress: ${status.status}`, status.progress)
    }
  )

  console.log('Synthesis:', result.synthesis)
}
