/**
 * CxO Review prompts - 4-stage executive deliberation
 * Ported from Python implementation
 */

import { StageResponse, Role } from './types'

// Stage 1: Executive Domain Reviews
export const STAGE1_PROMPT = `{role_instructions}

{operational_context}

---

You are reviewing the following plan or specification:

{document_content}

---

Provide your {role} perspective on this plan. Focus on your domain expertise.

Structure your review:
1. **Domain Assessment**: Key observations from your perspective
2. **Strengths**: What's working well
3. **Concerns**: Issues or risks in your domain
4. **Questions**: What you need clarified (if any)
5. **Recommendations**: Specific suggestions

Be direct and actionable. Flag critical issues clearly.`

// Stage 2: Questions & Conflicts
export const STAGE2_PROMPT = `{role_instructions}

{operational_context}

You've seen initial reviews from the executive team:

{stage1_text}

---

Now identify cross-domain tensions and ask clarifying questions.

Your task:
1. Identify where your domain concerns may conflict with others
2. Note areas of implicit disagreement
3. Ask 1-3 specific questions to OTHER executives

Format your questions as:
"Question to [ROLE]: [Your question]"

Example:
"Question to CTO: How does the proposed architecture handle the compliance requirements I flagged?"

Be specific. Good questions surface hidden tensions.`

// Stage 3: Responses to Questions
export const STAGE3_PROMPT = `{role_instructions}

{operational_context}

Previous discussion:

{stage1_text}

---

Questions directed to you:

{directed_questions}

---

Respond to questions directed to your role. Be specific and actionable.

If a question reveals a genuine tension, acknowledge it rather than dismissing it.
If you need to defer to another executive, say so explicitly.`

// Stage 4: CEO Synthesis
export const STAGE4_PROMPT = `You are the CEO synthesizing the executive team's deliberation.

{operational_context}

---

Original Plan:
{document_content}

---

Executive Reviews (Stage 1):
{stage1_text}

---

Cross-Domain Questions (Stage 2):
{stage2_text}

---

Responses (Stage 3):
{stage3_text}

---

Synthesize into an executive decision. Use this structure:

## Executive Decision
[Clear go/no-go/conditional-go with rationale]

## Key Consensus Points
[Where the team agreed]

## Unresolved Tensions
[Tradeoffs that remain - don't force false consensus]

## Action Items
[Concrete next steps with ownership]
- [ ] [Action] — Owner: [Role]

## Phase Gate Criteria
[What must be true before proceeding to next phase?]

## What Remains Unknown
[Honest acknowledgment of uncertainties]

Be decisive while honoring the complexity surfaced by your team.`

/**
 * Format Stage 1 CxO responses
 */
export function formatStage1Responses(responses: StageResponse[]): string {
  const parts = responses.map(resp => {
    const role = resp.role || 'Executive'
    const content = resp.response || ''
    return `### ${role}\n${content}\n`
  })
  return parts.join('\n---\n')
}

/**
 * Format Stage 2 questions/conflicts
 */
export function formatStage2Responses(responses: StageResponse[]): string {
  const parts = responses.map(resp => {
    const role = resp.role || 'Executive'
    const content = resp.response || ''
    return `### ${role}\n${content}\n`
  })
  return parts.join('\n')
}

/**
 * Extract questions directed to a specific role
 */
export function extractDirectedQuestions(
  stage2Responses: StageResponse[],
  targetRole: string
): string {
  const questions: string[] = []
  const targetPatterns = [
    `Question to ${targetRole}:`,
    `Question for ${targetRole}:`,
    `To ${targetRole}:`,
    `@${targetRole}:`,
  ]

  for (const resp of stage2Responses) {
    const content = resp.response || ''
    const lines = content.split('\n')

    for (const line of lines) {
      const lineUpper = line.toUpperCase()
      for (const pattern of targetPatterns) {
        if (lineUpper.includes(pattern.toUpperCase())) {
          // Extract the question
          const idx = lineUpper.indexOf(pattern.toUpperCase())
          const question = line.substring(idx)
          questions.push(`From ${resp.role || 'Unknown'}: ${question}`)
          break
        }
      }
    }
  }

  if (questions.length === 0) {
    return 'No questions directed to your role.'
  }

  return questions.join('\n\n')
}

/**
 * Determine which executives have questions directed to them
 */
export function getExecutivesWithQuestions(
  stage2Responses: StageResponse[]
): Set<Role> {
  const rolesWithQuestions = new Set<Role>()
  const allRoles: Role[] = ['CPO', 'CTO', 'COO', 'CISO']

  for (const resp of stage2Responses) {
    const content = (resp.response || '').toUpperCase()
    for (const role of allRoles) {
      const patterns = [
        `QUESTION TO ${role}`,
        `QUESTION FOR ${role}`,
        `TO ${role}:`,
        `@${role}`,
      ]
      if (patterns.some(p => content.includes(p))) {
        rolesWithQuestions.add(role)
      }
    }
  }

  return rolesWithQuestions
}
