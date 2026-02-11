# CxO Council

**Minimal 4-stage executive deliberation for governed decision-making.**

A lightweight tool that runs your plans, specifications, and proposals through a multi-perspective executive review process using LLMs.

## Deployment Options

### 🌐 Cloudflare Workers (Recommended)
Serverless API deployed globally on Cloudflare's edge network.

- ✅ No local installation required
- ✅ Async processing (no timeout limits)
- ✅ Global CDN with low latency
- ✅ Auto-scaling
- ✅ ~$5/month + LLM costs

**[→ Deploy to Cloudflare](./cloudflare/QUICKSTART.md)**

### 💻 Local CLI
Python command-line tool for local execution.

- ✅ Simple setup
- ✅ Full control
- ✅ Offline-capable (with local models)
- ✅ Free (except LLM costs)

**[→ Install Local CLI](./docs/GETTING_STARTED.md)**

---

## What It Does

Runs documents through 4 deliberation stages:

1. **Stage 1: Independent Reviews** - CPO, CTO, COO, CISO each review from their domain
2. **Stage 2: Cross-Domain Questions** - Executives identify tensions and ask clarifying questions
3. **Stage 3: Question Responses** - Targeted responses to directed questions
4. **Stage 4: CEO Synthesis** - Final decision with consensus, tensions, action items, and unknowns

## Installation

```bash
pip install -e .
```

Or install from git:
```bash
pip install git+https://github.com/yourusername/cxo-council.git
```

## Quick Start

1. **Set your OpenRouter API key:**
   ```bash
   export OPENROUTER_API_KEY="your-key-here"
   ```

2. **Create a config file** (see `examples/example-config.jsonc`):
   ```jsonc
   {
     "executive_model": "openrouter:deepseek/deepseek-v3.2",
     "ceo_model": "openrouter:deepseek/deepseek-v3.2",
     "operational_context": "Your project context here...",
     "custom_role_instructions": {
       "CTO": "Your CTO instructions...",
       "CPO": "Your CPO instructions...",
       "COO": "Your COO instructions...",
       "CISO": "Your CISO instructions...",
       "CEO": "Your CEO synthesis instructions..."
     }
   }
   ```

3. **Review a document:**
   ```bash
   cxo your-plan.md
   ```

## Usage

```bash
# Review a document with default config (./council-config.jsonc)
cxo document.md

# Use custom config file
cxo document.md --config path/to/config.jsonc

# Output saves to <document-name>-synthesis.md
```

## Configuration

The council requires a config file with:

- **executive_model**: Model for CPO, CTO, COO, CISO (e.g., `openrouter:deepseek/deepseek-v3.2`)
- **ceo_model**: Model for CEO synthesis (e.g., `openrouter:deepseek/deepseek-v3.2`)
- **operational_context**: Project-specific context injected into all prompts
- **custom_role_instructions**: Domain expertise and responsibilities for each CxO role

See `examples/example-config.jsonc` for a complete template.

## Output Format

The CEO synthesis includes:

- **Executive Decision**: GO / CONDITIONAL GO / REWORK / REJECT
- **Key Consensus Points**: Where executives agreed
- **Unresolved Tensions**: Honest tradeoffs that remain
- **Action Items**: With CxO ownership
- **Phase Gate Criteria**: Measurable checkpoints
- **What Remains Unknown**: Acknowledged uncertainties

## Design Philosophy

- **Minimal**: 7 files, one dependency, no database
- **Stateless**: Each review is independent
- **Domain-blind**: Configure for any project or venture
- **Command-line first**: Scriptable and composable
- **Honest**: Surfaces tensions rather than forcing false consensus

## Requirements

- Python 3.10+
- OpenRouter API key (supports multiple LLM providers)

## Examples

See `examples/` directory for:
- Example configuration
- Sample plan documents
- Output syntheses

## License

MIT

## Contributing

This is a minimal tool by design. Pull requests should preserve simplicity.
