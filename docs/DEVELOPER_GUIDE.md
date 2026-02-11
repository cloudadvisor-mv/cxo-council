# Developer Guide

Guide for contributing to and extending CxO Council.

## Development Setup

### Prerequisites

- Python 3.10 or higher
- Git
- Text editor or IDE
- OpenRouter API key (for testing)

### Clone and Install

```bash
# Clone repository
git clone https://github.com/yourusername/cxo-council.git
cd cxo-council

# Install in editable mode
pip install -e .

# Verify installation
cxo --help
```

### Development Dependencies

Currently minimal - only `httpx` is required. For development, you may want:

```bash
# Optional: Testing tools
pip install pytest pytest-cov

# Optional: Code quality
pip install black flake8 mypy

# Optional: Documentation
pip install mkdocs mkdocs-material
```

### Environment Setup

Create a `.env` file (git-ignored):

```bash
# .env
OPENROUTER_API_KEY=your-key-here
```

Load it in your shell:

```bash
# Linux/macOS
export $(cat .env | xargs)

# Or use direnv
echo "dotenv" > .envrc
direnv allow
```

## Project Structure

```
cxo-council/
├── cxo_council/              # Main package
│   ├── __init__.py           # Package initialization
│   ├── cli.py                # CLI entry point
│   ├── council.py            # Core orchestration
│   ├── llm_client.py         # LLM API client
│   └── prompts.py            # Prompt templates
├── examples/                 # Example configs and documents
│   ├── example-config.jsonc
│   └── example-plan.md
├── docs/                     # Documentation
│   ├── GETTING_STARTED.md
│   ├── ARCHITECTURE.md
│   ├── CONFIGURATION.md
│   ├── API_REFERENCE.md
│   ├── DEVELOPER_GUIDE.md
│   └── TROUBLESHOOTING.md
├── tests/                    # Tests (to be created)
├── pyproject.toml            # Package metadata
├── README.md                 # User-facing docs
├── LICENSE                   # MIT license
└── .gitignore                # Git ignore rules
```

## Code Style

### Python Style

Follow PEP 8 with these conventions:

- **Line length**: 88 characters (Black default)
- **Imports**: Standard library, third-party, local (separated by blank lines)
- **Docstrings**: Use for all public functions and classes
- **Type hints**: Use where helpful, especially function signatures

### Example:

```python
"""Module docstring."""

import sys
from pathlib import Path

import httpx

from .prompts import STAGE1_PROMPT


def review_document(document_path: str) -> dict[str, Any]:
    """Run a document through 4-stage review.

    Args:
        document_path: Path to markdown document

    Returns:
        Dictionary with stage results and synthesis
    """
    # Implementation
    pass
```

### Formatting

Use Black for formatting:

```bash
# Format all files
black cxo_council/

# Check without modifying
black --check cxo_council/
```

### Linting

Use flake8 for linting:

```bash
# Run linter
flake8 cxo_council/

# With config
flake8 --max-line-length=88 --extend-ignore=E203 cxo_council/
```

### Type Checking

Use mypy for type checking:

```bash
# Run type checker
mypy cxo_council/
```

## Testing

### Test Structure

```
tests/
├── __init__.py
├── test_cli.py
├── test_council.py
├── test_llm_client.py
└── test_prompts.py
```

### Writing Tests

Use pytest:

```python
# tests/test_prompts.py
import pytest
from cxo_council.prompts import format_stage1_responses


def test_format_stage1_responses():
    results = [
        {"role": "CPO", "response": "Product review"},
        {"role": "CTO", "response": "Tech review"}
    ]

    formatted = format_stage1_responses(results)

    assert "## CPO Review" in formatted
    assert "Product review" in formatted
    assert "## CTO Review" in formatted
    assert "Tech review" in formatted


def test_format_stage1_responses_empty():
    formatted = format_stage1_responses([])
    assert formatted == ""
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=cxo_council

# Run specific test file
pytest tests/test_prompts.py

# Run specific test
pytest tests/test_prompts.py::test_format_stage1_responses
```

### Mocking LLM Calls

For tests that would call LLM APIs:

```python
# tests/test_council.py
from unittest.mock import patch, MagicMock


def test_review_document():
    with patch('cxo_council.council.LLMClient') as mock_llm_class:
        # Setup mock
        mock_llm = MagicMock()
        mock_llm.query.return_value = "Mocked response"
        mock_llm_class.return_value = mock_llm

        # Test
        council = CouncilV1(config_path="test-config.jsonc")
        result = council.review_document("test-doc.md")

        # Assertions
        assert "synthesis" in result
        assert mock_llm.query.call_count > 0
```

## Adding Features

### Adding a New Executive Role

1. **Update `council.py`**:

```python
class CouncilV1:
    ROLES = ["CPO", "CTO", "COO", "CISO", "CFO"]  # Add CFO
```

2. **Update config template**:

```jsonc
"custom_role_instructions": {
    "CFO": "You are the Chief Financial Officer...",
    // ...
}
```

3. **Update documentation**:
   - Update [CONFIGURATION.md](./CONFIGURATION.md)
   - Add CFO role description
   - Update example configs

### Adding a New Stage

1. **Add prompt template in `prompts.py`**:

```python
STAGE5_PROMPT = """
You are {role}.

Stage 5: Final validation.

Previous stages:
{stage1_text}
{stage2_text}
{stage3_text}
{stage4_text}

Provide final validation:
"""
```

2. **Update `council.py`**:

```python
def review_document(self, document_path: str) -> dict[str, Any]:
    # ... existing stages ...

    # Stage 5: Validation
    print(f"\n{'─'*80}")
    print("STAGE 5: Final Validation")
    print(f"{'─'*80}\n")

    stage5_results = []
    for role in self.ROLES:
        prompt = STAGE5_PROMPT.replace("{role}", role)
        # ... replace other placeholders ...
        response = self.llm.query(prompt, model=self.executive_model)
        stage5_results.append({"role": role, "response": response})

    return {
        "stage1": stage1_results,
        "stage2": stage2_results,
        "stage3": stage3_results,
        "stage4": synthesis,
        "stage5": stage5_results  # Add to return
    }
```

### Adding a New Model Provider

1. **Update `llm_client.py`**:

```python
def query(self, prompt: str, model: str, temperature: float = 0.7) -> str:
    if model.startswith("openrouter:"):
        # ... existing OpenRouter code ...
    elif model.startswith("anthropic:"):
        # ... existing Anthropic code ...
    elif model.startswith("cohere:"):
        # New provider
        return self._query_cohere(prompt, model, temperature)
    else:
        raise ValueError(f"Unknown model provider: {model}")


def _query_cohere(self, prompt: str, model: str, temperature: float) -> str:
    """Query Cohere API."""
    import os
    api_key = os.environ["COHERE_API_KEY"]
    model_name = model.replace("cohere:", "")

    # Implement Cohere API call
    # ...
```

2. **Update documentation**:
   - Add to [CONFIGURATION.md](./CONFIGURATION.md)
   - Document required environment variable
   - Add example usage

### Adding CLI Options

1. **Update `cli.py`**:

```python
def main():
    parser = argparse.ArgumentParser(...)
    parser.add_argument("document", help="...")
    parser.add_argument("-c", "--config", help="...")

    # New option
    parser.add_argument(
        "-o", "--output",
        help="Output file path (default: <document>-synthesis.md)",
        default=None
    )

    args = parser.parse_args()

    # Use args.output
    output_path = args.output or (Path(args.document).stem + "-synthesis.md")
```

2. **Update help text**:
   - Update README.md
   - Update [GETTING_STARTED.md](./GETTING_STARTED.md)

## Contributing Guidelines

### Workflow

1. **Fork and clone**:

```bash
git clone https://github.com/yourusername/cxo-council.git
cd cxo-council
```

2. **Create a branch**:

```bash
git checkout -b feature/your-feature-name
```

3. **Make changes**:
   - Write code
   - Add tests
   - Update documentation

4. **Test**:

```bash
# Format code
black cxo_council/

# Run tests
pytest

# Check types
mypy cxo_council/
```

5. **Commit**:

```bash
git add .
git commit -m "Add feature: description"
```

6. **Push and create PR**:

```bash
git push origin feature/your-feature-name
```

### Commit Messages

Follow conventional commits:

```
feat: Add support for Cohere models
fix: Handle empty Stage 3 results correctly
docs: Update configuration guide with examples
refactor: Extract prompt formatting to separate module
test: Add tests for directed question extraction
```

### Pull Request Template

```markdown
## Description
Brief description of the change.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Testing
- [ ] Added tests
- [ ] All tests pass
- [ ] Manual testing completed

## Documentation
- [ ] Updated relevant docs
- [ ] Added examples if needed

## Checklist
- [ ] Code follows project style
- [ ] Self-reviewed the code
- [ ] Commented complex logic
- [ ] No breaking changes (or clearly documented)
```

## Design Principles

### 1. Minimal

- Avoid adding dependencies unless absolutely necessary
- Keep the codebase small and focused
- Prefer simple solutions over complex ones

**Bad:**
```python
# Don't add a full ORM for simple file operations
from sqlalchemy import create_engine, Table, MetaData
# ...
```

**Good:**
```python
# Use standard library
import json
with open("config.json") as f:
    config = json.load(f)
```

### 2. Stateless

- Each review is independent
- No session management or state persistence
- Config is loaded fresh each time

**Bad:**
```python
class CouncilV1:
    _cache = {}  # Global state - avoid

    def review_document(self, path):
        if path in self._cache:
            return self._cache[path]
```

**Good:**
```python
class CouncilV1:
    def review_document(self, path):
        # Fresh review each time
        with open(path) as f:
            content = f.read()
        # Process independently
```

### 3. Domain-Blind

- Don't hardcode domain-specific logic
- Keep the tool configurable for any use case
- Project specifics belong in config, not code

**Bad:**
```python
# Don't hardcode domain assumptions
if "authentication" in document:
    extra_security_review = True
```

**Good:**
```python
# Let config drive behavior
security_focus = self.config.get("security_focus", [])
```

### 4. Honest

- Surface tensions, don't hide them
- Make tradeoffs explicit
- Don't force consensus where it doesn't exist

**Bad:**
```python
# Don't merge conflicting perspectives
if cto_says_no and cpo_says_yes:
    decision = "MAYBE"  # Unclear
```

**Good:**
```python
# Surface the tension
synthesis = f"""
The CTO raises concerns about {cto_concern}.
The CPO prioritizes {cpo_priority}.
This is a real tension that requires a decision.
"""
```

## Debugging

### Enable Debug Output

Add debug logging:

```python
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# In your code
logger.debug(f"Querying {role} with model {model}")
logger.debug(f"Prompt length: {len(prompt)}")
```

### Test Individual Components

```python
# Test LLM client directly
from cxo_council.llm_client import LLMClient

llm = LLMClient()
response = llm.query("Test prompt", "openrouter:deepseek/deepseek-v3.2")
print(response)

# Test config loading
from cxo_council.council import CouncilV1

council = CouncilV1(config_path="test-config.jsonc")
print(council.config)
print(council.operational_context)
```

### Inspect API Calls

Use `httpx` debugging:

```python
import httpx
import logging

# Enable httpx logging
logging.basicConfig(level=logging.DEBUG)
logging.getLogger("httpx").setLevel(logging.DEBUG)

# Your code will now log all HTTP requests/responses
```

## Release Process

### Version Bumping

1. **Update version in `pyproject.toml`**:

```toml
[project]
name = "cxo-council"
version = "0.2.0"  # Increment
```

2. **Update CHANGELOG.md**:

```markdown
## [0.2.0] - 2025-01-15

### Added
- Support for Cohere models
- New CLI option for custom output path

### Fixed
- Empty Stage 3 handling
```

3. **Tag release**:

```bash
git tag -a v0.2.0 -m "Release v0.2.0"
git push origin v0.2.0
```

### Publishing to PyPI

```bash
# Build distribution
python -m build

# Upload to PyPI
python -m twine upload dist/*

# Or test PyPI first
python -m twine upload --repository testpypi dist/*
```

## Common Tasks

### Running from Source

```bash
# Instead of installed `cxo` command
python -m cxo_council.cli document.md
```

### Testing with Different Models

```bash
# Test with cheap model
EXECUTIVE_MODEL="openrouter:deepseek/deepseek-v3.2" cxo doc.md

# Test with expensive model
EXECUTIVE_MODEL="anthropic:claude-opus-4-6-20250929" cxo doc.md
```

### Generating Documentation

```bash
# If using mkdocs
mkdocs serve  # Preview at http://localhost:8000
mkdocs build  # Generate static site
```

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/yourusername/cxo-council/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/cxo-council/discussions)
- **Documentation**: [docs/](./README.md)

## See Also

- [Architecture Overview](./ARCHITECTURE.md) - System design
- [API Reference](./API_REFERENCE.md) - Code documentation
- [Configuration Guide](./CONFIGURATION.md) - Config details
