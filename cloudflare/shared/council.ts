/**
 * CxO Council - 4-stage executive deliberation
 * TypeScript port of Python implementation
 */

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
import { Config, ReviewResult, StageResponse, ROLES, Role } from './types'

export class CouncilV1 {
  private llm: LLMClient
  private config: Config
  private roles: readonly Role[] = ROLES

  constructor(config: Config, apiKey: string) {
    this.config = config
    this.llm = new LLMClient(apiKey)
  }

  async reviewDocument(
    documentContent: string,
    progressCallback?: (stage: string, step: string) => Promise<void>
  ): Promise<ReviewResult> {
    // Stage 1: Independent Reviews
    if (progressCallback) {
      await progressCallback('stage1', 'Starting independent reviews')
    }

    const stage1Results = await Promise.all(
      this.roles.map(async (role) => {
        if (progressCallback) {
          await progressCallback('stage1', `Querying ${role}`)
        }

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
    if (progressCallback) {
      await progressCallback('stage2', 'Starting cross-domain questions')
    }

    const stage2Results = await Promise.all(
      this.roles.map(async (role) => {
        if (progressCallback) {
          await progressCallback('stage2', `Querying ${role}`)
        }

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
    let stage3Results: StageResponse[] = []

    if (rolesWithQuestions.size > 0) {
      if (progressCallback) {
        await progressCallback('stage3', 'Starting question responses')
      }

      stage3Results = await Promise.all(
        Array.from(rolesWithQuestions).map(async (role) => {
          if (progressCallback) {
            await progressCallback('stage3', `Querying ${role}`)
          }

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
    } else {
      if (progressCallback) {
        await progressCallback('stage3', 'No directed questions - skipping')
      }
    }

    const stage3Text = stage3Results.length > 0
      ? formatStage2Responses(stage3Results)
      : 'No responses required.'

    // Stage 4: CEO Synthesis
    if (progressCallback) {
      await progressCallback('stage4', 'Starting CEO synthesis')
    }

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

    if (progressCallback) {
      await progressCallback('stage4', 'Synthesis complete')
    }

    return {
      stage1: stage1Results,
      stage2: stage2Results,
      stage3: stage3Results,
      synthesis
    }
  }
}
