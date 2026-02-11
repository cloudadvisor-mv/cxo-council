# Architecture Overview

## Design Philosophy

CxO Council follows these principles:

- **Minimal**: 7 files, one dependency (httpx), no database
- **Stateless**: Each review is independent, no session management
- **Domain-blind**: Configure for any project or venture via config
- **Command-line first**: Scriptable, composable, no GUI
- **Honest**: Surfaces tensions rather than forcing false consensus

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI (cli.py)                        │
│  - Parse arguments                                          │
│  - Load document                                            │
│  - Save synthesis output                                    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   CouncilV1 (council.py)                    │
│  - Load config                                              │
│  - Orchestrate 4-stage deliberation                         │
│  - Format and aggregate responses                           │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ├──────────────┬──────────────┐
                  ▼              ▼              ▼
         ┌────────────┐  ┌────────────┐  ┌────────────┐
         │  Prompts   │  │ LLM Client │  │   Config   │
         │(prompts.py)│  │(llm_client │  │  (JSONC)   │
         │            │  │    .py)    │  │            │
         └────────────┘  └────────────┘  └────────────┘
```

## Core Components

### 1. CLI Layer (`cli.py`)

**Responsibilities:**
- Parse command-line arguments (document path, config path)
- Validate input file exists
- Instantiate CouncilV1
- Save synthesis output
- Handle errors and exit codes

**Key Functions:**
- `main()`: Entry point for `cxo` command

### 2. Council Orchestrator (`council.py`)

**Responsibilities:**
- Load and parse JSONC configuration
- Orchestrate 4-stage deliberation process
- Format responses between stages
- Manage executive roles and model selection

**Key Class: `CouncilV1`**

Properties:
- `ROLES`: List of executive roles (CPO, CTO, COO, CISO)
- `config`: Loaded configuration dictionary
- `operational_context`: Project-specific context
- `role_instructions`: Custom instructions per CxO
- `executive_model`: Model for domain executives
- `ceo_model`: Model for CEO synthesis

Methods:
- `__init__(config_path)`: Initialize with config
- `_load_config(config_path)`: Load JSONC config with comment stripping
- `review_document(document_path)`: Run 4-stage review

### 3. LLM Client (`llm_client.py`)

**Responsibilities:**
- Interface with OpenRouter API
- Handle HTTP requests to LLM endpoints
- Support multiple model providers (OpenRouter, Anthropic, OpenAI)
- Error handling and retries

**Key Class: `LLMClient`**

Methods:
- `query(prompt, model, temperature)`: Send prompt to LLM and get response
- Provider detection based on model prefix (`openrouter:`, `anthropic:`, `openai:`)

### 4. Prompt Templates (`prompts.py`)

**Responsibilities:**
- Define prompt templates for each stage
- Format and aggregate multi-executive responses
- Extract directed questions from Stage 2
- Identify which executives have questions

**Key Constants:**
- `STAGE1_PROMPT`: Independent domain reviews
- `STAGE2_PROMPT`: Cross-domain questions
- `STAGE3_PROMPT`: Responses to directed questions
- `STAGE4_PROMPT`: CEO synthesis

**Key Functions:**
- `format_stage1_responses(results)`: Aggregate Stage 1 reviews
- `format_stage2_responses(results)`: Aggregate Stage 2 questions
- `extract_directed_questions(results, target_role)`: Extract questions for a specific role
- `get_executives_with_questions(results)`: Identify roles with directed questions

## The 4-Stage Deliberation Process

### Stage 1: Independent Domain Reviews

**For each executive (CPO, CTO, COO, CISO):**

1. Receive the document and operational context
2. Review from their domain expertise
3. Provide domain-specific analysis

**Input:**
- Document content
- Operational context
- Role-specific instructions

**Output:**
- Independent review from each CxO perspective

### Stage 2: Cross-Domain Questions

**For each executive:**

1. Review all Stage 1 responses
2. Identify tensions, conflicts, or gaps
3. Ask clarifying questions to other executives

**Input:**
- All Stage 1 reviews
- Operational context

**Output:**
- Questions and concerns from each CxO

**Format for directed questions:**
```
@CTO: Your question here...
@CPO: Another question...
```

### Stage 3: Question Responses

**For each executive with directed questions:**

1. Review questions directed to them
2. Provide targeted responses
3. Clarify domain-specific concerns

**Input:**
- Questions directed at this role (extracted from Stage 2)
- Original Stage 1 context

**Output:**
- Responses to directed questions

**Note:** If no directed questions exist, Stage 3 is skipped.

### Stage 4: CEO Synthesis

**CEO reviews all prior stages and produces:**

1. **Executive Decision**: GO / CONDITIONAL GO / REWORK / REJECT
2. **Key Consensus Points**: Where executives agreed
3. **Unresolved Tensions**: Honest tradeoffs that remain
4. **Action Items**: With CxO ownership
5. **Phase Gate Criteria**: Measurable checkpoints
6. **What Remains Unknown**: Acknowledged uncertainties

**Input:**
- Original document
- All Stage 1, 2, 3 outputs
- Operational context
- CEO role instructions

**Output:**
- Final synthesis document

## Configuration System

### Config File Format (JSONC)

Supports JavaScript-style comments:

```jsonc
{
  // Model configuration
  "executive_model": "openrouter:deepseek/deepseek-v3.2",
  "ceo_model": "openrouter:deepseek/deepseek-v3.2",

  // Project context
  "operational_context": "...",

  // Role customization
  "custom_role_instructions": {
    "CTO": "...",
    "CPO": "...",
    "COO": "...",
    "CISO": "...",
    "CEO": "..."
  }
}
```

### Config Loading Priority

1. Path specified via `--config` flag
2. `./council-config.jsonc` (current directory)
3. `./cxo-council-config.jsonc` (current directory)
4. `../council-config.jsonc` (parent directory)

### JSONC Comment Stripping

Simple line-based comment removal:
- Lines starting with `//` (after strip) are removed
- Block comments (`/* */`) are NOT supported

## Model Selection

### Supported Providers

- **OpenRouter** (recommended): `openrouter:provider/model-name`
  - Example: `openrouter:deepseek/deepseek-v3.2`
  - Supports many providers (DeepSeek, Anthropic, OpenAI, etc.)

- **Anthropic Direct**: `anthropic:model-name`
  - Example: `anthropic:claude-sonnet-4-5-20250929`
  - Requires `ANTHROPIC_API_KEY`

- **OpenAI Direct**: `openai:model-name`
  - Example: `openai:gpt-4`
  - Requires `OPENAI_API_KEY`

### Default Models

- **Executives**: `openrouter:deepseek/deepseek-v3.2` (cost-efficient)
- **CEO**: `anthropic:claude-sonnet-4-5-20250929` (higher capability)

## Data Flow

```
Document (Markdown)
    │
    ├──> Stage 1: 4 parallel LLM calls (CPO, CTO, COO, CISO)
    │         │
    │         └──> 4 domain reviews
    │
    ├──> Stage 2: 4 parallel LLM calls (with Stage 1 context)
    │         │
    │         └──> 4 sets of questions
    │
    ├──> Stage 3: N parallel LLM calls (only for roles with questions)
    │         │
    │         └──> N targeted responses
    │
    └──> Stage 4: 1 LLM call (CEO with all prior context)
              │
              └──> Final synthesis
                       │
                       └──> Output file: <document>-synthesis.md
```

## Error Handling

### CLI Level
- File not found: Exit with code 1, error message
- Exception during review: Print error, exit with code 1

### Council Level
- Config not found: Raise `FileNotFoundError`
- Invalid JSON: Raise `json.JSONDecodeError`

### LLM Client Level
- API errors: Propagate HTTP exceptions
- Network errors: Propagate connection exceptions

## Performance Considerations

### Latency
- **Stage 1**: 4 parallel calls (can use async in future)
- **Stage 2**: 4 parallel calls
- **Stage 3**: N parallel calls (where N ≤ 4)
- **Stage 4**: 1 serial call

Total time depends on:
- Model response time
- Network latency
- Document complexity

### Cost Optimization
- Use cheaper models for executives (e.g., DeepSeek)
- Reserve expensive models for CEO synthesis
- Adjust temperature for creativity vs. consistency

## Extension Points

### Adding New Roles
Modify `CouncilV1.ROLES` and add custom instructions in config.

### Custom Stages
Subclass `CouncilV1` and override `review_document()`.

### Different Output Formats
Modify CLI to support JSON, HTML, or other formats.

### Async Execution
Replace synchronous LLM calls with async/await for parallel execution.

## File Structure

```
cxo-council/
├── cxo_council/
│   ├── __init__.py          # Package initialization
│   ├── cli.py               # CLI entry point
│   ├── council.py           # Core orchestration
│   ├── llm_client.py        # LLM API interface
│   └── prompts.py           # Prompt templates
├── examples/
│   ├── example-config.jsonc # Sample configuration
│   └── example-plan.md      # Sample document
├── docs/                    # Documentation
├── pyproject.toml           # Package metadata
├── README.md                # User-facing overview
└── LICENSE                  # MIT license
```

## Dependencies

**Runtime:**
- `httpx>=0.27.0`: HTTP client for API calls

**Development:**
- Python 3.10+ standard library only

## Security Considerations

- API keys stored in environment variables
- No local data persistence
- All processing is ephemeral
- Review outputs may contain sensitive decision data (handle accordingly)
