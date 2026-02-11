# CxO Council Documentation

Complete documentation for the CxO Council executive deliberation tool.

## Quick Links

### For Users

- **[Getting Started](./GETTING_STARTED.md)** - Installation, setup, and first review
- **[Configuration Guide](./CONFIGURATION.md)** - Detailed configuration options
- **[Troubleshooting](./TROUBLESHOOTING.md)** - Common issues and solutions

### For Developers

- **[Architecture Overview](./ARCHITECTURE.md)** - System design and components
- **[API Reference](./API_REFERENCE.md)** - Module, class, and function documentation
- **[Developer Guide](./DEVELOPER_GUIDE.md)** - Contributing and extending

## What is CxO Council?

CxO Council is a minimal command-line tool that runs documents (plans, specs, proposals) through a multi-perspective executive review process using Large Language Models.

### 4-Stage Deliberation Process

1. **Stage 1: Independent Reviews** - CPO, CTO, COO, CISO each review from their domain
2. **Stage 2: Cross-Domain Questions** - Executives identify tensions and ask clarifying questions
3. **Stage 3: Question Responses** - Targeted responses to directed questions
4. **Stage 4: CEO Synthesis** - Final decision with consensus, tensions, and action items

### Key Features

- **Minimal**: 7 files, one dependency, no database
- **Stateless**: Each review is independent
- **Domain-blind**: Configure for any project via config
- **Command-line first**: Scriptable and composable
- **Honest**: Surfaces tensions rather than forcing false consensus

## Documentation Structure

```
docs/
├── README.md              # This file - documentation index
├── GETTING_STARTED.md     # Installation and quick start
├── CONFIGURATION.md       # Config file options and examples
├── ARCHITECTURE.md        # System design and data flow
├── API_REFERENCE.md       # Code documentation
├── DEVELOPER_GUIDE.md     # Contributing and extending
└── TROUBLESHOOTING.md     # Common issues and solutions
```

## Getting Started in 5 Minutes

### 1. Install

```bash
# Clone repository
git clone https://github.com/yourusername/cxo-council.git
cd cxo-council

# Install
pip install -e .
```

### 2. Configure

```bash
# Copy example config
cp examples/example-config.jsonc council-config.jsonc

# Set API key
export OPENROUTER_API_KEY="sk-or-v1-..."

# Edit config (optional)
nano council-config.jsonc
```

### 3. Review

```bash
# Create or use existing document
cxo your-plan.md

# Output saved to: your-plan-synthesis.md
```

That's it! See [Getting Started](./GETTING_STARTED.md) for details.

## Common Tasks

### Configure for Your Project

```bash
# Edit operational context and role instructions
nano council-config.jsonc
```

See [Configuration Guide](./CONFIGURATION.md) for all options.

### Review Different Documents

```bash
cxo feature-proposal.md
cxo architecture-design.md
cxo product-spec.md
```

### Use Custom Config

```bash
cxo document.md --config /path/to/custom-config.jsonc
```

### Choose Different Models

Edit `council-config.jsonc`:

```jsonc
{
  "executive_model": "openrouter:deepseek/deepseek-v3.2",  // Cost-efficient
  "ceo_model": "anthropic:claude-sonnet-4-5-20250929"      // High quality
}
```

See [Configuration Guide](./CONFIGURATION.md#model-configuration) for model options.

## Key Concepts

### Executive Roles

- **CPO (Chief Product Officer)**: User experience, API ergonomics, mental models
- **CTO (Chief Technology Officer)**: Architecture, system design, technical risk
- **COO (Chief Operations Officer)**: Build feasibility, operations, timeline
- **CISO (Chief Information Security Officer)**: Security, compliance, audit trails
- **CEO**: Synthesis across all domains, final decision-making

See [Configuration Guide](./CONFIGURATION.md#custom-role-instructions) for role details.

### Operational Context

Project-specific context injected into all prompts. Defines:
- What your project is (and isn't)
- Key constraints (team size, budget, timeline)
- Priorities and tradeoffs
- Success criteria

See [Configuration Guide](./CONFIGURATION.md#operational-context) for examples.

### Model Selection

- **OpenRouter** (recommended): Single API for multiple providers
- **Anthropic Direct**: Latest Claude models
- **OpenAI Direct**: GPT-4 and other OpenAI models

See [Configuration Guide](./CONFIGURATION.md#model-provider-details) for setup.

### Output Format

CEO synthesis includes:
- **Executive Decision**: GO / CONDITIONAL GO / REWORK / REJECT
- **Key Consensus Points**: Where executives agreed
- **Unresolved Tensions**: Honest tradeoffs that remain
- **Action Items**: With CxO ownership
- **Phase Gate Criteria**: Measurable checkpoints
- **What Remains Unknown**: Acknowledged uncertainties

See [Architecture Overview](./ARCHITECTURE.md#stage-4-ceo-synthesis) for details.

## Documentation by Use Case

### "I want to use CxO Council"

1. Start: [Getting Started](./GETTING_STARTED.md)
2. Configure: [Configuration Guide](./CONFIGURATION.md)
3. Stuck? [Troubleshooting](./TROUBLESHOOTING.md)

### "I want to understand how it works"

1. Overview: [Architecture Overview](./ARCHITECTURE.md)
2. Details: [API Reference](./API_REFERENCE.md)
3. Design: [Developer Guide](./DEVELOPER_GUIDE.md#design-principles)

### "I want to contribute or extend it"

1. Setup: [Developer Guide](./DEVELOPER_GUIDE.md#development-setup)
2. Architecture: [Architecture Overview](./ARCHITECTURE.md)
3. API: [API Reference](./API_REFERENCE.md)
4. Guidelines: [Developer Guide](./DEVELOPER_GUIDE.md#contributing-guidelines)

### "I'm having problems"

1. Check: [Troubleshooting](./TROUBLESHOOTING.md)
2. Search: [GitHub Issues](https://github.com/yourusername/cxo-council/issues)
3. Ask: [GitHub Discussions](https://github.com/yourusername/cxo-council/discussions)

## Examples

### Example Configurations

See [Configuration Guide](./CONFIGURATION.md#example-configurations):
- Solo founder / startup
- Enterprise / governed environment
- Open source project

### Example Documents

See [examples/](../examples/):
- `example-plan.md` - Feature proposal template
- `example-config.jsonc` - Comprehensive config template

### Example Output

```markdown
# Council Synthesis - Feature Proposal

## Executive Decision: CONDITIONAL GO

### Key Consensus Points
- All executives agree the feature addresses a real user need
- Technical architecture is sound and maintainable
- Security posture is acceptable for v1

### Unresolved Tensions
**CTO vs COO on timeline:**
- CTO: Wants 4 weeks for proper architecture
- COO: Needs delivery in 2 weeks for customer commitment
- Recommendation: 3-week timeline with clearly defined scope cuts

**CISO vs CPO on data collection:**
- CISO: Minimize data collection for compliance
- CPO: More data enables better UX
- Recommendation: Start minimal, expand with explicit consent

### Action Items
1. **CTO**: Finalize API schema by EOW (Phase Gate 1)
2. **COO**: Create deployment runbook (Phase Gate 2)
3. **CISO**: Complete security review of data flows (Phase Gate 1)
4. **CPO**: User testing plan for MVP (Phase Gate 2)

### Phase Gates
**Gate 1 (Week 1)**: Schema finalized, security reviewed
**Gate 2 (Week 2)**: MVP deployed to staging, user testing started
**Gate 3 (Week 3)**: Production deployment decision

### What Remains Unknown
- Actual user adoption rate (need real data)
- Performance at scale (need load testing)
- Integration complexity with legacy system (discovery work needed)
```

## FAQs

### How much does it cost?

- **Tool**: Free and open source (MIT license)
- **API costs**: Depends on model choice
  - DeepSeek: ~$0.14 per 1M input tokens (very cheap)
  - Claude Sonnet: ~$3 per 1M input tokens
  - Typical review: 4-12 API calls, $0.01 - $0.50 per review with DeepSeek

### Can I use it offline?

- No, requires API access to LLM providers
- Could be modified to use local models (Ollama, LM Studio, etc.)

### Can I add custom roles?

- Yes! Edit `CouncilV1.ROLES` in `council.py`
- Add role instructions in config
- See [Developer Guide](./DEVELOPER_GUIDE.md#adding-a-new-executive-role)

### Can I skip stages?

- Currently no, but code is minimal and easy to modify
- See [Developer Guide](./DEVELOPER_GUIDE.md) for customization

### How long does a review take?

- Depends on document size and model speed
- Typical: 1-3 minutes for 1-2 page document with DeepSeek
- Longer for complex documents or slower models

### Is my data sent to third parties?

- Yes, documents are sent to LLM API providers (OpenRouter, Anthropic, etc.)
- Providers' privacy policies apply
- For sensitive data, consider:
  - Self-hosted models
  - Redacting sensitive information
  - Using privacy-focused providers

### Can I use my own models?

- Yes, extend `llm_client.py` to support your provider
- See [Developer Guide](./DEVELOPER_GUIDE.md#adding-a-new-model-provider)
- Could integrate with Ollama, LM Studio, or custom endpoints

## Version Information

- **Current Version**: 0.1.0
- **Python Required**: 3.10+
- **Dependencies**: httpx>=0.27.0

## License

MIT License - see [LICENSE](../LICENSE)

## Contributing

We welcome contributions! See [Developer Guide](./DEVELOPER_GUIDE.md) for:
- Development setup
- Code style guidelines
- Testing approach
- PR process

## Support

- **Documentation**: You're reading it!
- **Issues**: [GitHub Issues](https://github.com/yourusername/cxo-council/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/cxo-council/discussions)
- **Examples**: [examples/](../examples/)

## Changelog

See the main [README.md](../README.md) for version history and updates.

---

**Start here**: [Getting Started Guide](./GETTING_STARTED.md)

**Questions?** Check [Troubleshooting](./TROUBLESHOOTING.md) or [create an issue](https://github.com/yourusername/cxo-council/issues)
