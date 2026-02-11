# API Reference

Complete reference for all modules, classes, and functions in CxO Council.

## Module: `cxo_council.cli`

Command-line interface for CxO Council.

### Functions

#### `main()`

Entry point for the `cxo` command.

**Description:**
- Parses command-line arguments
- Loads and validates the document
- Instantiates CouncilV1
- Runs the review
- Saves synthesis output

**Arguments:** None (uses `sys.argv`)

**Returns:** None

**Exit Codes:**
- `0`: Success
- `1`: Error (file not found, config error, or review failure)

**Example:**
```python
if __name__ == "__main__":
    main()
```

**CLI Usage:**
```bash
cxo document.md
cxo document.md --config custom-config.jsonc
cxo document.md -c custom-config.jsonc
```

---

## Module: `cxo_council.council`

Core orchestration for 4-stage deliberation.

### Class: `CouncilV1`

Main orchestrator for the CxO Council review process.

#### Class Attributes

##### `ROLES`

List of executive roles used in the council.

**Type:** `list[str]`

**Value:** `["CPO", "CTO", "COO", "CISO"]`

**Usage:**
```python
for role in CouncilV1.ROLES:
    print(role)  # CPO, CTO, COO, CISO
```

#### Instance Methods

##### `__init__(config_path: str | None = None)`

Initialize council with configuration.

**Parameters:**
- `config_path` (str | None): Path to council config JSONC file. If None, searches default locations.

**Raises:**
- `FileNotFoundError`: If config file not found
- `json.JSONDecodeError`: If config file is invalid JSON

**Attributes Set:**
- `self.llm`: LLMClient instance
- `self.config`: Loaded configuration dictionary
- `self.operational_context`: Project context string
- `self.role_instructions`: Dict of role -> instructions
- `self.executive_model`: Model string for executives
- `self.ceo_model`: Model string for CEO

**Example:**
```python
# Auto-detect config
council = CouncilV1()

# Explicit config path
council = CouncilV1(config_path="my-config.jsonc")
```

##### `_load_config(config_path: str | None) -> dict`

Load and parse JSONC configuration file.

**Parameters:**
- `config_path` (str | None): Path to config file or None for auto-detection

**Returns:**
- `dict`: Parsed configuration

**Raises:**
- `FileNotFoundError`: If no config found
- `json.JSONDecodeError`: If JSON is invalid

**Search Order (if `config_path` is None):**
1. `./council-config.jsonc`
2. `./cxo-council-config.jsonc`
3. `../council-config.jsonc`

**Comment Handling:**
- Strips lines starting with `//` (after whitespace removal)
- Does NOT support block comments (`/* */`)

**Example:**
```python
config = council._load_config("my-config.jsonc")
print(config["executive_model"])
```

##### `review_document(document_path: str) -> dict[str, Any]`

Run a document through 4-stage CxO review.

**Parameters:**
- `document_path` (str): Path to markdown document to review

**Returns:**
- `dict` with keys:
  - `"stage1"`: List of Stage 1 review dicts
  - `"stage2"`: List of Stage 2 question dicts
  - `"stage3"`: List of Stage 3 response dicts
  - `"synthesis"`: String of CEO synthesis

**Stage Result Format:**
```python
{
    "role": "CTO",
    "response": "Review text from LLM..."
}
```

**Return Example:**
```python
{
    "stage1": [
        {"role": "CPO", "response": "..."},
        {"role": "CTO", "response": "..."},
        {"role": "COO", "response": "..."},
        {"role": "CISO", "response": "..."}
    ],
    "stage2": [...],
    "stage3": [...],
    "synthesis": "## Executive Decision: GO\n\n..."
}
```

**Side Effects:**
- Prints progress to stdout
- Makes multiple LLM API calls (12-16 calls total)

**Example:**
```python
council = CouncilV1()
result = council.review_document("feature-plan.md")
print(result["synthesis"])
```

---

## Module: `cxo_council.llm_client`

HTTP client for LLM API interactions.

### Class: `LLMClient`

Client for interfacing with multiple LLM providers.

#### Instance Methods

##### `__init__()`

Initialize LLM client.

**Example:**
```python
llm = LLMClient()
```

##### `query(prompt: str, model: str, temperature: float = 0.7) -> str`

Send a prompt to an LLM and get response.

**Parameters:**
- `prompt` (str): The prompt text to send
- `model` (str): Model identifier in format `provider:model-name`
- `temperature` (float): Sampling temperature (0.0 - 1.0), default 0.7

**Returns:**
- `str`: The LLM's response text

**Raises:**
- `httpx.HTTPError`: If API request fails
- `KeyError`: If required environment variable not set
- `ValueError`: If response format is unexpected

**Model Format:**
- OpenRouter: `"openrouter:provider/model"`
- Anthropic: `"anthropic:model-name"`
- OpenAI: `"openai:model-name"`

**Environment Variables Required:**
- OpenRouter: `OPENROUTER_API_KEY`
- Anthropic: `ANTHROPIC_API_KEY`
- OpenAI: `OPENAI_API_KEY`

**Example:**
```python
llm = LLMClient()
response = llm.query(
    prompt="Explain quantum computing",
    model="openrouter:deepseek/deepseek-v3.2",
    temperature=0.5
)
print(response)
```

**Provider Detection:**
The client detects the provider from the model prefix:
```python
"openrouter:..." -> OpenRouter API
"anthropic:..."  -> Anthropic API
"openai:..."     -> OpenAI API
```

---

## Module: `cxo_council.prompts`

Prompt templates and formatting utilities.

### Constants

#### `STAGE1_PROMPT`

Template for Stage 1 independent domain reviews.

**Type:** `str`

**Placeholders:**
- `{role}`: Executive role (CPO, CTO, COO, CISO)
- `{role_instructions}`: Custom role instructions from config
- `{operational_context}`: Project context from config
- `{document_content}`: The document being reviewed

**Usage:**
```python
prompt = STAGE1_PROMPT.replace("{role}", "CTO")
prompt = prompt.replace("{role_instructions}", custom_instructions)
# ... replace other placeholders
```

#### `STAGE2_PROMPT`

Template for Stage 2 cross-domain questions.

**Type:** `str`

**Placeholders:**
- `{role_instructions}`: Custom role instructions
- `{operational_context}`: Project context
- `{stage1_text}`: Formatted Stage 1 responses

**Directed Question Format:**
Executives should format directed questions as:
```
@CTO: Your question here...
@CPO: Another question...
```

#### `STAGE3_PROMPT`

Template for Stage 3 question responses.

**Type:** `str`

**Placeholders:**
- `{role_instructions}`: Custom role instructions
- `{operational_context}`: Project context
- `{stage1_text}`: Original Stage 1 context
- `{directed_questions}`: Questions directed to this role

#### `STAGE4_PROMPT`

Template for Stage 4 CEO synthesis.

**Type:** `str`

**Placeholders:**
- `{operational_context}`: Project context
- `{document_content}`: Original document
- `{stage1_text}`: Stage 1 reviews
- `{stage2_text}`: Stage 2 questions
- `{stage3_text}`: Stage 3 responses

**Expected Output Format:**
- Executive Decision: GO / CONDITIONAL GO / REWORK / REJECT
- Key Consensus Points
- Unresolved Tensions
- Action Items (with CxO ownership)
- Phase Gate Criteria
- What Remains Unknown

### Functions

#### `format_stage1_responses(results: list[dict]) -> str`

Format Stage 1 review results into a single text block.

**Parameters:**
- `results` (list[dict]): List of review dictionaries with `"role"` and `"response"` keys

**Returns:**
- `str`: Formatted text with all reviews

**Format:**
```
## CPO Review
[CPO response text]

## CTO Review
[CTO response text]

...
```

**Example:**
```python
stage1_results = [
    {"role": "CPO", "response": "Product perspective..."},
    {"role": "CTO", "response": "Technical perspective..."}
]
formatted = format_stage1_responses(stage1_results)
print(formatted)
```

#### `format_stage2_responses(results: list[dict]) -> str`

Format Stage 2 question results into a single text block.

**Parameters:**
- `results` (list[dict]): List of question dictionaries with `"role"` and `"response"` keys

**Returns:**
- `str`: Formatted text with all questions

**Format:**
```
## Questions from CPO
[CPO questions]

## Questions from CTO
[CTO questions]

...
```

**Example:**
```python
stage2_results = [
    {"role": "CPO", "response": "@CTO: How will this scale?"},
    {"role": "CTO", "response": "@CPO: What's the user flow?"}
]
formatted = format_stage2_responses(stage2_results)
```

#### `extract_directed_questions(results: list[dict], target_role: str) -> str`

Extract questions directed to a specific role from Stage 2 results.

**Parameters:**
- `results` (list[dict]): Stage 2 results
- `target_role` (str): Role to extract questions for (e.g., "CTO")

**Returns:**
- `str`: Questions directed to this role, formatted with attribution

**Question Format Detection:**
Looks for patterns like:
- `@CTO: question text`
- `@cto: question text`
- (case-insensitive)

**Example:**
```python
stage2_results = [
    {"role": "CPO", "response": "@CTO: How will this scale?\n@CISO: Is this secure?"},
    {"role": "COO", "response": "@CTO: Can we build this in 2 weeks?"}
]

cto_questions = extract_directed_questions(stage2_results, "CTO")
# Returns:
# "From CPO: How will this scale?
#  From COO: Can we build this in 2 weeks?"
```

#### `get_executives_with_questions(results: list[dict]) -> set[str]`

Identify which executives have directed questions to answer.

**Parameters:**
- `results` (list[dict]): Stage 2 results

**Returns:**
- `set[str]`: Set of roles that have questions directed to them

**Example:**
```python
stage2_results = [
    {"role": "CPO", "response": "@CTO: Question 1\n@CISO: Question 2"},
    {"role": "COO", "response": "No questions, just thoughts."}
]

roles = get_executives_with_questions(stage2_results)
# Returns: {"CTO", "CISO"}

# Use to determine who needs to respond in Stage 3
if "CTO" in roles:
    # Query CTO for responses
    pass
```

---

## Data Structures

### Config Dictionary Structure

```python
{
    "executive_model": str,              # e.g., "openrouter:deepseek/deepseek-v3.2"
    "ceo_model": str,                    # e.g., "anthropic:claude-sonnet-4-5-20250929"
    "operational_context": str,          # Project-specific context
    "custom_role_instructions": {
        "CTO": str,                      # CTO role instructions
        "CPO": str,                      # CPO role instructions
        "COO": str,                      # COO role instructions
        "CISO": str,                     # CISO role instructions
        "CEO": str                       # CEO synthesis instructions
    }
}
```

### Review Result Structure

```python
{
    "role": str,                         # Executive role (CPO, CTO, COO, CISO)
    "response": str                      # LLM response text
}
```

### Complete Review Output

```python
{
    "stage1": [                          # List of Stage 1 reviews
        {"role": "CPO", "response": str},
        {"role": "CTO", "response": str},
        {"role": "COO", "response": str},
        {"role": "CISO", "response": str}
    ],
    "stage2": [                          # List of Stage 2 questions
        {"role": "CPO", "response": str},
        {"role": "CTO", "response": str},
        {"role": "COO", "response": str},
        {"role": "CISO", "response": str}
    ],
    "stage3": [                          # List of Stage 3 responses (0-4 items)
        {"role": "CTO", "response": str},
        # Only includes roles with directed questions
    ],
    "synthesis": str                     # CEO synthesis text
}
```

---

## Usage Examples

### Basic Review

```python
from cxo_council.council import CouncilV1

# Initialize with auto-detected config
council = CouncilV1()

# Run review
result = council.review_document("my-plan.md")

# Access results
print(result["synthesis"])
print(f"Reviewed by {len(result['stage1'])} executives")
```

### Custom Config Path

```python
from cxo_council.council import CouncilV1

council = CouncilV1(config_path="/custom/path/config.jsonc")
result = council.review_document("document.md")
```

### Direct LLM Query

```python
from cxo_council.llm_client import LLMClient

llm = LLMClient()
response = llm.query(
    prompt="What is the capital of France?",
    model="openrouter:deepseek/deepseek-v3.2",
    temperature=0.3
)
print(response)
```

### Extract Specific Questions

```python
from cxo_council.council import CouncilV1
from cxo_council.prompts import extract_directed_questions

council = CouncilV1()
result = council.review_document("plan.md")

# Get questions directed to CTO
cto_questions = extract_directed_questions(result["stage2"], "CTO")
print(f"Questions for CTO:\n{cto_questions}")
```

### Check for Questions

```python
from cxo_council.prompts import get_executives_with_questions

stage2_results = [...]
roles_to_query = get_executives_with_questions(stage2_results)

if roles_to_query:
    print(f"Need responses from: {', '.join(roles_to_query)}")
else:
    print("No directed questions - skipping Stage 3")
```

---

## Error Handling

### Common Exceptions

#### `FileNotFoundError`

Raised when:
- Config file not found (and no default found)
- Document file not found

```python
try:
    council = CouncilV1(config_path="missing.jsonc")
except FileNotFoundError as e:
    print(f"Config not found: {e}")
```

#### `json.JSONDecodeError`

Raised when:
- Config file has invalid JSON syntax
- Comment stripping doesn't fix the issue

```python
try:
    council = CouncilV1(config_path="broken.jsonc")
except json.JSONDecodeError as e:
    print(f"Invalid JSON in config: {e}")
```

#### `httpx.HTTPError`

Raised when:
- API request fails (network, auth, rate limit)
- Model name is invalid
- API key is missing or invalid

```python
from httpx import HTTPError

try:
    llm = LLMClient()
    response = llm.query("Test", "openrouter:invalid/model")
except HTTPError as e:
    print(f"API error: {e}")
```

#### `KeyError`

Raised when:
- Environment variable not set (e.g., `OPENROUTER_API_KEY`)

```python
try:
    llm = LLMClient()
    response = llm.query("Test", "openrouter:deepseek/deepseek-v3.2")
except KeyError as e:
    print(f"Missing environment variable: {e}")
```

---

## See Also

- [Configuration Guide](./CONFIGURATION.md) - Detailed config options
- [Architecture Overview](./ARCHITECTURE.md) - System design
- [Developer Guide](./DEVELOPER_GUIDE.md) - Contributing guidelines
