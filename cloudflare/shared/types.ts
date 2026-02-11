/**
 * Shared TypeScript types for CxO Council
 */

export interface Config {
  executive_model: string
  ceo_model: string
  operational_context: string
  custom_role_instructions: {
    CTO: string
    CPO: string
    COO: string
    CISO: string
    CEO: string
  }
}

export interface ReviewRequest {
  document: string
  config: Config
  webhook_url?: string
}

export interface ReviewResult {
  stage1: StageResponse[]
  stage2: StageResponse[]
  stage3: StageResponse[]
  synthesis: string
}

export interface StageResponse {
  role: string
  response: string
}

export interface JobStatus {
  id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  created_at: string
  started_at?: string
  completed_at?: string
  failed_at?: string
  error?: string
  webhook_url?: string
  progress?: {
    stage: string
    step: string
  }
}

export interface QueueMessage {
  jobId: string
  documentKey: string
  configKey: string
  webhookUrl?: string
}

export const ROLES = ['CPO', 'CTO', 'COO', 'CISO'] as const
export type Role = typeof ROLES[number]
