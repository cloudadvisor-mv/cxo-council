# Configuration Guide

## Overview

CxO Council uses a JSONC (JSON with Comments) configuration file to customize the executive review process. This guide covers all configuration options and best practices.

## Configuration File Location

The council looks for config files in this order:

1. Path specified with `--config` flag: `cxo document.md --config /path/to/config.jsonc`
2. `./council-config.jsonc` (current directory)
3. `./cxo-council-config.jsonc` (current directory)
4. `../council-config.jsonc` (parent directory)

**Recommendation:** Keep `council-config.jsonc` in your project root.

## Full Configuration Schema

```jsonc
{
  // Model Configuration
  "executive_model": "openrouter:deepseek/deepseek-v3.2",
  "ceo_model": "openrouter:deepseek/deepseek-v3.2",

  // Operational Context (injected into all prompts)
  "operational_context": "Your project-specific context here...",

  // Custom Role Instructions
  "custom_role_instructions": {
    "CTO": "Your CTO role definition and responsibilities...",
    "CPO": "Your CPO role definition and responsibilities...",
    "COO": "Your COO role definition and responsibilities...",
    "CISO": "Your CISO role definition and responsibilities...",
    "CEO": "Your CEO synthesis instructions..."
  }
}
```

## Configuration Options

### 1. Model Configuration

#### `executive_model` (required)

The LLM model used for CPO, CTO, COO, and CISO reviews.

**Format:** `provider:model-name`

**Examples:**
```jsonc
// OpenRouter (recommended)
"executive_model": "openrouter:deepseek/deepseek-v3.2"
"executive_model": "openrouter:anthropic/claude-sonnet-4-5"
"executive_model": "openrouter:openai/gpt-4"

// Anthropic Direct
"executive_model": "anthropic:claude-sonnet-4-5-20250929"

// OpenAI Direct
"executive_model": "openai:gpt-4-turbo"
```

**Cost Optimization:**
- Use cost-efficient models like DeepSeek for executive reviews
- Executive reviews run 4 times per stage (12 total calls in Stages 1-3)

#### `ceo_model` (required)

The LLM model used for CEO synthesis.

**Format:** Same as `executive_model`

**Examples:**
```jsonc
"ceo_model": "openrouter:anthropic/claude-sonnet-4-5"
"ceo_model": "anthropic:claude-opus-4-6-20250929"
```

**Recommendation:**
- Use a more capable model for CEO synthesis (runs only once)
- CEO synthesis requires cross-domain reasoning and nuanced judgment

### 2. Operational Context

#### `operational_context` (required)

Project-specific context injected into all prompts. This shapes how executives understand your project.

**Purpose:**
- Define your project's nature and constraints
- Set boundaries for executive reasoning
- Establish what matters in decision-making

**Example:**
```jsonc
"operational_context": "Fulcrum is a governed execution framework operated by a solo founder. It is not a product — it is the infrastructure that products are built through. Fulcrum is API-first, containerized, and designed to serve multiple ventures as tenants.

When you review:
- Fulcrum is domain-blind. It governs decisions, not domains. If you find yourself reasoning about what a venture builds, you've crossed the boundary.
- Every action item will be executed by one person using agentic development (LLM-composed teams). There is no engineering team.
- The binding constraint is founder attention, not budget or headcount.
- Fulcrum must be consumable by ventures that don't exist yet. Decisions that only make sense for one client are coupling, not features.
- Prefer infrastructure that earns its complexity. If a simpler design serves v1 without blocking v2, choose simpler.
- The audit trail is the product. If a design choice weakens traceability from output back to decision, it is wrong regardless of other merits."
```

**Best Practices:**
- Be specific about your constraints (team size, budget, timeline)
- Define what success looks like
- Establish clear boundaries (what the project IS and IS NOT)
- Mention your decision-making priorities

### 3. Custom Role Instructions

#### `custom_role_instructions` (required)

Define expertise, responsibilities, and review guidelines for each executive role.

**Structure:**
```jsonc
"custom_role_instructions": {
  "CTO": "...",
  "CPO": "...",
  "COO": "...",
  "CISO": "...",
  "CEO": "..."
}
```

#### CTO (Chief Technology Officer)

**Domain:** Architecture, system boundaries, schema design, API surface, integration patterns, technical risk, extensibility.

**Key Responsibilities:**
- Evaluate architectural coherence
- Assess schema design and data models
- Review API surface and integration boundaries
- Identify technical debt (deliberate vs. accidental)
- Ensure scalability and maintainability

**Example:**
```jsonc
"CTO": "You are the Chief Technology Officer (CTO).

Your domain: Architecture, system boundaries, schema design, API surface, integration patterns, technical risk, extensibility.

Responsibilities:
- Evaluate architectural coherence — do the pieces fit together without hidden coupling?
- Assess schema design for normalization, query patterns, and migration safety
- Review API surface for consistency, versioning readiness, and separation of concerns
- Identify integration boundaries — where our system ends and external systems begin
- Flag technical debt that is being taken deliberately vs. accidentally

Key questions you ask:
- Does this architecture support future requirements without modification?
- Are the entity relationships correct, or are we encoding assumptions that will break?
- Where are the integration seams, and are they clean enough that either side can change independently?
- What breaks if we need to migrate this schema in 6 months?
- Is this the simplest design that doesn't block future capability?"
```

#### CPO (Chief Product Officer)

**Domain:** Developer experience, API consumer ergonomics, documentation clarity, mental model coherence, usability.

**Key Responsibilities:**
- Evaluate user/developer experience
- Assess API ergonomics and learnability
- Review naming and consistency
- Identify confusing abstractions
- Ensure documentation matches implementation

**Example:**
```jsonc
"CPO": "You are the Chief Product Officer (CPO).

Your domain: User experience, API consumer ergonomics, documentation clarity, mental model coherence, usability.

Responsibilities:
- Evaluate whether abstractions map to how users actually think
- Assess API ergonomics — can users integrate without reading source code?
- Review naming, resource structure, and response shapes for consistency
- Identify where the mental model will confuse new users
- Flag over-abstraction that creates cognitive load without value
- Ensure documentation and API tell the same story

Key questions you ask:
- If a new user started tomorrow, what would confuse them first?
- Do the concepts match how users think about their work?
- Are the API resource names self-documenting?
- Is there a concept in the schema that has no corresponding API surface?
- Does this feel intuitive or does it feel like someone else's opinions?"
```

#### COO (Chief Operations Officer)

**Domain:** Execution feasibility, operational sustainability, build sequencing, deployment complexity, timeline realism.

**Key Responsibilities:**
- Evaluate buildability and timeline
- Assess operational complexity
- Review build sequencing and dependencies
- Identify operational risks
- Flag scope creep (v2 masquerading as v1)

**Example:**
```jsonc
"COO": "You are the Chief Operations Officer (COO).

Your domain: Execution feasibility, operational sustainability, build sequencing, deployment complexity, timeline realism.

Responsibilities:
- Evaluate whether the proposed work is buildable in a reasonable timeframe
- Assess operational complexity — what does this cost to run, maintain, and debug?
- Review build sequencing — what must exist before what? What can be deferred?
- Identify operational risks: single points of failure, manual steps, premature automation
- Flag scope that feels like v2 masquerading as v1
- Ensure deployment and migration strategy is sustainable

Key questions you ask:
- What is the minimum viable version that delivers value?
- What is the deployment and migration story on day 1? On day 90?
- Where are the manual steps, and are they acceptable for v1?
- What breaks if key people are unavailable?
- Is this sequenced so each piece delivers value before the next is built?"
```

#### CISO (Chief Information Security Officer)

**Domain:** Security, authentication, authorization, data protection, compliance, audit trails, secrets management.

**Key Responsibilities:**
- Evaluate security posture
- Assess authentication and authorization
- Review data protection and isolation
- Identify compliance requirements
- Flag secrets management gaps
- Ensure audit trail integrity

**Example:**
```jsonc
"CISO": "You are the Chief Information Security Officer (CISO).

Your domain: Security, authentication, authorization, data protection, compliance, audit trails, secrets management.

Responsibilities:
- Evaluate security posture and threat model
- Assess authentication and authorization mechanisms
- Review data protection and isolation boundaries
- Identify compliance requirements and gaps
- Flag secrets management issues
- Ensure audit trail completeness and integrity
- Assess acceptable security debt and remediation timeline

Key questions you ask:
- If credentials are compromised, what is the blast radius?
- Are sensitive records immutable and tamper-proof?
- Is data isolation enforced at application and database layers?
- What secrets exist, and where are they stored (at rest and in transit)?
- Does the audit trail survive database restore, migration, and schema changes?
- What explicit security debt is being taken in v1, and when will it be addressed?"
```

#### CEO (Chief Executive Officer)

**Domain:** Synthesis, decision-making, tradeoff resolution, strategic alignment.

**Key Responsibilities:**
- Synthesize all executive perspectives
- Identify consensus and conflicts
- Frame tradeoffs honestly
- Recommend actionable path forward
- Acknowledge uncertainties

**Example:**
```jsonc
"CEO": "You are the CEO, responsible for synthesis across all CxO domains.

Your role is NOT to add a fifth opinion. Your role is to:
1. Identify where the CTO, CPO, COO, and CISO agree — and state that clearly
2. Identify where they conflict — and frame the tradeoff honestly
3. Surface the decision the founder actually needs to make
4. Recommend a path, with explicit acknowledgment of what's being traded

Synthesis format:
- Decision type: GO / CONDITIONAL GO / REWORK / REJECT
- What the council agrees on (consensus)
- Where the council disagrees (tensions with explicit framing)
- What remains unknown
- Recommended action items with CxO ownership
- Phase gates with measurable criteria
- What happens if we're wrong (failure modes)"
```

## Environment Variables

### Required

**`OPENROUTER_API_KEY`** (if using OpenRouter models)

```bash
export OPENROUTER_API_KEY="sk-or-v1-..."
```

**`ANTHROPIC_API_KEY`** (if using Anthropic direct)

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

**`OPENAI_API_KEY`** (if using OpenAI direct)

```bash
export OPENAI_API_KEY="sk-..."
```

## Model Provider Details

### OpenRouter (Recommended)

**Advantages:**
- Single API key for multiple providers
- Cost-effective models (DeepSeek, Mistral, etc.)
- No individual provider accounts needed

**Format:**
```jsonc
"executive_model": "openrouter:provider/model-name"
```

**Popular Models:**
- `openrouter:deepseek/deepseek-v3.2` - Cost-efficient, high quality
- `openrouter:anthropic/claude-sonnet-4-5` - High capability
- `openrouter:openai/gpt-4-turbo` - OpenAI via OpenRouter
- `openrouter:google/gemini-pro` - Google models

**Setup:**
1. Sign up at [https://openrouter.ai/](https://openrouter.ai/)
2. Get API key
3. Set `OPENROUTER_API_KEY` environment variable

### Anthropic Direct

**Advantages:**
- Latest Claude models
- Direct API access

**Format:**
```jsonc
"ceo_model": "anthropic:claude-sonnet-4-5-20250929"
```

**Setup:**
1. Sign up at [https://console.anthropic.com/](https://console.anthropic.com/)
2. Get API key
3. Set `ANTHROPIC_API_KEY` environment variable

### OpenAI Direct

**Format:**
```jsonc
"executive_model": "openai:gpt-4-turbo"
```

**Setup:**
1. Sign up at [https://platform.openai.com/](https://platform.openai.com/)
2. Get API key
3. Set `OPENAI_API_KEY` environment variable

## Cost Optimization Strategies

### 1. Model Tiering

Use cheaper models for executives, expensive models for CEO:

```jsonc
{
  "executive_model": "openrouter:deepseek/deepseek-v3.2",  // ~$0.14 per 1M input tokens
  "ceo_model": "anthropic:claude-sonnet-4-5-20250929"      // Higher cost, higher quality
}
```

### 2. Temperature Tuning

Adjust temperature for cost vs. quality:
- Lower temperature (0.3-0.5): More consistent, shorter responses
- Higher temperature (0.7-0.9): More creative, longer responses

(Note: Temperature is currently hardcoded in `council.py` but can be made configurable)

### 3. Document Preparation

- Keep documents focused and concise
- Remove unnecessary context
- Use clear headings and structure

## Example Configurations

### Solo Founder / Startup

```jsonc
{
  "executive_model": "openrouter:deepseek/deepseek-v3.2",
  "ceo_model": "openrouter:deepseek/deepseek-v3.2",

  "operational_context": "Early-stage startup with solo founder. Constraints: limited budget, 3-month runway, need to ship fast. Priorities: MVP speed over perfection, customer validation over architecture, simplicity over scalability.",

  "custom_role_instructions": {
    "CTO": "Focus on: Can we build this quickly? What's the simplest architecture? What tech debt is acceptable for MVP?",
    "CPO": "Focus on: Does this solve the customer problem? Is it intuitive? Can we validate quickly?",
    "COO": "Focus on: Can one person build this in 2-4 weeks? What's the deployment story? What can we defer?",
    "CISO": "Focus on: What security is non-negotiable for MVP? What can wait until after customer validation?",
    "CEO": "Synthesize with bias toward speed and customer learning. Acceptable risk if it enables faster validation."
  }
}
```

### Enterprise / Governed Environment

```jsonc
{
  "executive_model": "openrouter:anthropic/claude-sonnet-4-5",
  "ceo_model": "anthropic:claude-opus-4-6-20250929",

  "operational_context": "Enterprise SaaS platform serving regulated industries. Constraints: SOC2 compliance required, multi-tenant architecture, 99.9% uptime SLA. Priorities: security and compliance are non-negotiable, audit trail completeness, data isolation.",

  "custom_role_instructions": {
    "CTO": "Focus on: Multi-tenant isolation, schema migration safety, API versioning strategy, disaster recovery.",
    "CPO": "Focus on: Enterprise admin experience, audit trail visibility, compliance reporting, SSO integration.",
    "COO": "Focus on: Deployment automation, monitoring and alerting, runbook completeness, incident response.",
    "CISO": "Focus on: SOC2 controls, data encryption at rest and in transit, access controls, audit logging.",
    "CEO": "Synthesize with security and compliance as hard constraints. No shortcuts on regulatory requirements."
  }
}
```

### Open Source Project

```jsonc
{
  "executive_model": "openrouter:deepseek/deepseek-v3.2",
  "ceo_model": "openrouter:anthropic/claude-sonnet-4-5",

  "operational_context": "Open source project with distributed contributors. Constraints: volunteer effort, no budget, async collaboration. Priorities: contributor experience, documentation quality, extensibility.",

  "custom_role_instructions": {
    "CTO": "Focus on: Plugin architecture, API stability, backwards compatibility, contribution guidelines.",
    "CPO": "Focus on: Getting started experience, documentation quality, example clarity, community support.",
    "COO": "Focus on: CI/CD automation, release process, issue triage, contributor onboarding.",
    "CISO": "Focus on: Supply chain security, dependency management, security disclosure process.",
    "CEO": "Synthesize with emphasis on contributor experience and long-term maintainability."
  }
}
```

## Troubleshooting Config Issues

### Config Not Found

**Error:** `No council config found. Create council-config.jsonc or specify with --config`

**Solutions:**
- Create `council-config.jsonc` in current directory
- Use `--config path/to/config.jsonc` flag
- Check file name spelling

### JSON Parse Error

**Error:** `json.JSONDecodeError: Expecting value...`

**Solutions:**
- Remove block comments (`/* */`) - only line comments (`//`) supported
- Validate JSON structure
- Check for trailing commas
- Ensure proper quoting of strings

### Missing Required Fields

**Error:** May result in empty prompts or incorrect behavior

**Solutions:**
- Ensure all required fields are present:
  - `executive_model`
  - `ceo_model`
  - `operational_context`
  - `custom_role_instructions` with all 5 roles (CPO, CTO, COO, CISO, CEO)

### Model Not Found

**Error:** API errors about invalid model names

**Solutions:**
- Check model name format: `provider:model-name`
- Verify model exists on provider (check OpenRouter model list)
- Ensure API key is set for the provider

## Best Practices

1. **Version control your config**: Check `council-config.jsonc` into git
2. **Document your context**: Be explicit about constraints and priorities
3. **Start simple**: Use basic role instructions, refine based on output quality
4. **Test with cheap models**: Use DeepSeek for testing, upgrade for production
5. **Iterate on role instructions**: Adjust based on what questions executives ask
6. **Keep roles focused**: Each CxO should stay in their domain
7. **Make CEO synthesis actionable**: CEO should surface decisions, not add opinions

## See Also

- [Getting Started](./GETTING_STARTED.md) - Installation and quick start
- [Architecture](./ARCHITECTURE.md) - System design and components
- [Examples](../examples/) - Sample configurations and documents
