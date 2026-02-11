# Getting Started with CxO Council

## What is CxO Council?

CxO Council is a minimal command-line tool that runs your plans, specifications, and proposals through a multi-perspective executive review process using Large Language Models (LLMs). It simulates a 4-stage executive deliberation process with CPO, CTO, COO, CISO roles and CEO synthesis.

## Prerequisites

- **Python 3.10 or higher** - [Download Python](https://www.python.org/downloads/)
- **OpenRouter API key** - [Get your API key](https://openrouter.ai/)

## Installation

### 1. Install Python

Make sure Python 3.10+ is installed:

```bash
python --version
```

If not installed, download from [python.org](https://www.python.org/downloads/) and ensure "Add Python to PATH" is checked during installation.

### 2. Clone or Download the Repository

```bash
git clone https://github.com/yourusername/cxo-council.git
cd cxo-council
```

### 3. Install the Package

Install in development mode (editable):

```bash
pip install -e .
```

This installs the `cxo` command globally.

### 4. Set Your OpenRouter API Key

**Linux/macOS:**
```bash
export OPENROUTER_API_KEY="your-key-here"
```

**Windows (Command Prompt):**
```cmd
set OPENROUTER_API_KEY=your-key-here
```

**Windows (PowerShell):**
```powershell
$env:OPENROUTER_API_KEY="your-key-here"
```

For permanent setup, add to your shell profile (`~/.bashrc`, `~/.zshrc`) or Windows Environment Variables.

## Quick Start

### 1. Create a Configuration File

Copy the example config:

```bash
cp examples/example-config.jsonc council-config.jsonc
```

Edit `council-config.jsonc` to customize:
- Model selection (executive and CEO models)
- Operational context for your project
- Custom role instructions for each CxO

### 2. Prepare a Document for Review

Create a markdown file with your plan, spec, or proposal:

```markdown
# My Feature Proposal

## Overview
Brief description of what you want to build...

## Requirements
- Requirement 1
- Requirement 2

## Technical Approach
How you plan to implement it...

## Open Questions
- Question 1
- Question 2
```

### 3. Run the Council Review

```bash
cxo your-document.md
```

The council will:
1. Run Stage 1: Each executive reviews from their domain
2. Run Stage 2: Executives ask cross-domain questions
3. Run Stage 3: Targeted responses to questions
4. Run Stage 4: CEO synthesis with decision

### 4. Review the Output

The synthesis is saved to `<document-name>-synthesis.md` with:
- Executive decision (GO / CONDITIONAL GO / REWORK / REJECT)
- Key consensus points
- Unresolved tensions
- Action items with CxO ownership
- Phase gate criteria
- Acknowledged uncertainties

## Example Workflow

```bash
# 1. Create your config (one time)
cp examples/example-config.jsonc council-config.jsonc
nano council-config.jsonc  # Edit with your context

# 2. Set API key (per session)
export OPENROUTER_API_KEY="sk-or-v1-..."

# 3. Write your plan
nano feature-proposal.md

# 4. Run the review
cxo feature-proposal.md

# 5. Read the synthesis
cat feature-proposal-synthesis.md
```

## Next Steps

- **[Configuration Guide](./CONFIGURATION.md)** - Detailed config options
- **[Architecture Overview](./ARCHITECTURE.md)** - How the system works
- **[Developer Guide](./DEVELOPER_GUIDE.md)** - Contributing and extending
- **[Examples](../examples/)** - Sample documents and configs

## Troubleshooting

**Command `cxo` not found:**
- Ensure `pip install -e .` completed successfully
- Try `python -m cxo_council.cli` instead
- Check that Python's scripts directory is in PATH

**API Key errors:**
- Verify your OpenRouter API key is set: `echo $OPENROUTER_API_KEY`
- Check for typos or extra spaces
- Ensure the key is active on OpenRouter

**Config not found:**
- The tool looks for `council-config.jsonc` in current directory
- Use `--config path/to/config.jsonc` to specify a different location

**JSON parsing errors:**
- Remove all comments from JSONC file (lines starting with `//`)
- Validate JSON structure with a linter
- Check for trailing commas

See [Troubleshooting Guide](./TROUBLESHOOTING.md) for more help.
