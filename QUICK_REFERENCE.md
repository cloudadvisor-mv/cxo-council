# CxO Council Quick Reference

Fast reference for common commands and patterns.

## Installation

```bash
pip install -e .
```

## Basic Usage

```bash
# Review a document
cxo document.md

# Use custom config
cxo document.md --config my-config.jsonc

# Alternative invocation
python -m cxo_council.cli document.md
```

## Setup

```bash
# Set API key (required)
export OPENROUTER_API_KEY="sk-or-v1-..."

# Create config
cp examples/example-config.jsonc council-config.jsonc

# Edit config
nano council-config.jsonc
```

## Config File Structure

```jsonc
{
  "executive_model": "openrouter:provider/model",
  "ceo_model": "openrouter:provider/model",
  "operational_context": "Your project context...",
  "custom_role_instructions": {
    "CTO": "...",
    "CPO": "...",
    "COO": "...",
    "CISO": "...",
    "CEO": "..."
  }
}
```

## Popular Models

### Cost-Efficient
```jsonc
"executive_model": "openrouter:deepseek/deepseek-v3.2"
```

### High Quality
```jsonc
"ceo_model": "anthropic:claude-sonnet-4-5-20250929"
"ceo_model": "openrouter:anthropic/claude-sonnet-4-5"
```

### OpenAI
```jsonc
"executive_model": "openrouter:openai/gpt-4-turbo"
```

## Environment Variables

```bash
# OpenRouter (recommended)
export OPENROUTER_API_KEY="sk-or-v1-..."

# Anthropic Direct
export ANTHROPIC_API_KEY="sk-ant-..."

# OpenAI Direct
export OPENAI_API_KEY="sk-..."
```

## Output

Reviews are saved to `<document-name>-synthesis.md`

Contains:
- Executive Decision (GO / CONDITIONAL GO / REWORK / REJECT)
- Key Consensus Points
- Unresolved Tensions
- Action Items
- Phase Gates
- Unknowns

## Executive Roles

| Role | Domain |
|------|--------|
| **CPO** | Product, UX, API ergonomics, mental models |
| **CTO** | Architecture, system design, technical risk |
| **COO** | Execution, operations, build feasibility |
| **CISO** | Security, compliance, audit trails |
| **CEO** | Synthesis, decision-making, tradeoffs |

## The 4 Stages

1. **Stage 1**: Independent domain reviews (4 parallel calls)
2. **Stage 2**: Cross-domain questions (4 parallel calls)
3. **Stage 3**: Question responses (0-4 calls, as needed)
4. **Stage 4**: CEO synthesis (1 call)

Total: 9-13 LLM API calls per review

## Troubleshooting

### Command not found
```bash
# Use alternative
python -m cxo_council.cli document.md

# Or reinstall
pip install -e .
```

### Config not found
```bash
# Check location
ls council-config.jsonc

# Use explicit path
cxo doc.md --config /path/to/config.jsonc
```

### API key error
```bash
# Verify it's set
echo $OPENROUTER_API_KEY

# Set it
export OPENROUTER_API_KEY="sk-or-v1-..."
```

### JSON parse error
- Remove block comments (`/* */`)
- Remove trailing commas
- Use double quotes, not single quotes
- Validate at [jsonlint.com](https://jsonlint.com/)

## File Locations

| File | Location |
|------|----------|
| Config | `./council-config.jsonc` |
| Document | Any `.md` file |
| Output | `<document>-synthesis.md` |
| Examples | `./examples/` |
| Docs | `./docs/` |

## Development

```bash
# Run from source
python -m cxo_council.cli document.md

# Format code
black cxo_council/

# Run tests (if available)
pytest

# Type check
mypy cxo_council/
```

## Links

- **[Full Documentation](./docs/README.md)**
- **[Getting Started](./docs/GETTING_STARTED.md)**
- **[Configuration](./docs/CONFIGURATION.md)**
- **[Troubleshooting](./docs/TROUBLESHOOTING.md)**
- **[API Reference](./docs/API_REFERENCE.md)**

## Cost Examples (Approximate)

Using DeepSeek (~$0.14 per 1M input tokens):
- Short plan (500 words): ~$0.01
- Medium plan (2000 words): ~$0.05
- Long plan (5000 words): ~$0.15

Using Claude Sonnet (~$3 per 1M input tokens):
- Short plan (500 words): ~$0.20
- Medium plan (2000 words): ~$1.00
- Long plan (5000 words): ~$3.00

## Tips

1. **Start with DeepSeek** for testing and iteration
2. **Use Claude Sonnet/Opus for CEO** for best synthesis quality
3. **Keep documents focused** (1-3 pages ideal)
4. **Be specific in operational context** - better context = better reviews
5. **Iterate on role instructions** based on review quality
6. **Version control your config** with your project

## Example Workflow

```bash
# 1. One-time setup
pip install -e .
cp examples/example-config.jsonc council-config.jsonc
export OPENROUTER_API_KEY="sk-or-v1-..."

# 2. Customize config
nano council-config.jsonc  # Edit operational context and roles

# 3. Write plan
nano feature-proposal.md

# 4. Run review
cxo feature-proposal.md

# 5. Read output
cat feature-proposal-synthesis.md

# 6. Iterate
nano feature-proposal.md  # Refine based on feedback
cxo feature-proposal.md   # Re-review
```

## Support

- **Docs**: [./docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/cxo-council/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/cxo-council/discussions)
