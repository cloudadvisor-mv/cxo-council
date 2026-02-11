# Troubleshooting Guide

Common issues and solutions for CxO Council.

## Installation Issues

### Python Not Found

**Symptom:**
```
'python' is not recognized as an internal or external command
```

**Solutions:**

1. **Verify Python installation:**
   ```bash
   # Try alternative commands
   python3 --version
   py --version
   ```

2. **Install Python:**
   - Download from [python.org](https://www.python.org/downloads/)
   - During installation, check "Add Python to PATH"

3. **Add Python to PATH manually** (Windows):
   - Search for "Environment Variables"
   - Edit PATH
   - Add: `C:\Users\YourName\AppData\Local\Programs\Python\Python311`
   - Add: `C:\Users\YourName\AppData\Local\Programs\Python\Python311\Scripts`

4. **Verify PATH:**
   ```bash
   # Windows (Command Prompt)
   echo %PATH%

   # Linux/macOS
   echo $PATH
   ```

### `cxo` Command Not Found

**Symptom:**
```
'cxo' is not recognized as an internal or external command
```

**Solutions:**

1. **Verify installation:**
   ```bash
   pip show cxo-council
   ```

2. **Reinstall:**
   ```bash
   pip uninstall cxo-council
   pip install -e .
   ```

3. **Use alternative invocation:**
   ```bash
   python -m cxo_council.cli document.md
   ```

4. **Check Scripts directory in PATH** (Windows):
   - Scripts directory: `C:\Users\YourName\AppData\Local\Programs\Python\Python311\Scripts`
   - Should be in PATH

5. **Check bin directory** (Linux/macOS):
   ```bash
   which cxo
   ls ~/.local/bin/cxo  # User install
   ls /usr/local/bin/cxo  # System install
   ```

### Permission Denied

**Symptom:**
```
PermissionError: [Errno 13] Permission denied: '...'
```

**Solutions:**

1. **Use user install:**
   ```bash
   pip install --user -e .
   ```

2. **Use virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/macOS
   venv\Scripts\activate  # Windows
   pip install -e .
   ```

3. **Don't use `sudo`** (unless you know what you're doing):
   ```bash
   # Bad (modifies system Python)
   sudo pip install -e .

   # Good (user or venv install)
   pip install --user -e .
   ```

## Configuration Issues

### Config File Not Found

**Symptom:**
```
FileNotFoundError: No council config found. Create council-config.jsonc or specify with --config
```

**Solutions:**

1. **Create config in current directory:**
   ```bash
   cp examples/example-config.jsonc council-config.jsonc
   nano council-config.jsonc  # Edit as needed
   ```

2. **Use explicit path:**
   ```bash
   cxo document.md --config /path/to/config.jsonc
   ```

3. **Check current directory:**
   ```bash
   ls -la | grep config
   pwd  # Verify you're in the right directory
   ```

4. **Verify config search paths:**
   - `./council-config.jsonc` (current directory)
   - `./cxo-council-config.jsonc` (current directory)
   - `../council-config.jsonc` (parent directory)

### JSON Parse Error

**Symptom:**
```
json.JSONDecodeError: Expecting ',' delimiter: line 5 column 3 (char 123)
```

**Solutions:**

1. **Remove block comments:**
   ```jsonc
   // Good (line comments work)
   "model": "openrouter:deepseek/deepseek-v3.2"

   /* Bad (block comments don't work)
   "model": "openrouter:deepseek/deepseek-v3.2"
   */
   ```

2. **Remove trailing commas:**
   ```json
   // Bad
   {
     "model": "...",
     "context": "...",  // <-- trailing comma
   }

   // Good
   {
     "model": "...",
     "context": "..."
   }
   ```

3. **Validate JSON:**
   - Use [jsonlint.com](https://jsonlint.com/)
   - Or use `jq`:
     ```bash
     # Remove comments first
     grep -v '^\s*//' council-config.jsonc | jq .
     ```

4. **Check quotes:**
   ```json
   // Bad (single quotes)
   { 'model': 'openrouter:...' }

   // Good (double quotes)
   { "model": "openrouter:..." }
   ```

### Missing Config Fields

**Symptom:**
- Empty prompts
- Incorrect behavior
- Key errors

**Solutions:**

1. **Verify required fields exist:**
   ```jsonc
   {
     "executive_model": "...",      // Required
     "ceo_model": "...",             // Required
     "operational_context": "...",   // Required
     "custom_role_instructions": {   // Required
       "CTO": "...",                 // Required
       "CPO": "...",                 // Required
       "COO": "...",                 // Required
       "CISO": "...",                // Required
       "CEO": "..."                  // Required
     }
   }
   ```

2. **Use example config as template:**
   ```bash
   cp examples/example-config.jsonc council-config.jsonc
   ```

## API Issues

### API Key Not Found

**Symptom:**
```
KeyError: 'OPENROUTER_API_KEY'
```

**Solutions:**

1. **Set environment variable:**
   ```bash
   # Linux/macOS
   export OPENROUTER_API_KEY="sk-or-v1-..."

   # Windows (Command Prompt)
   set OPENROUTER_API_KEY=sk-or-v1-...

   # Windows (PowerShell)
   $env:OPENROUTER_API_KEY="sk-or-v1-..."
   ```

2. **Verify it's set:**
   ```bash
   # Linux/macOS
   echo $OPENROUTER_API_KEY

   # Windows (Command Prompt)
   echo %OPENROUTER_API_KEY%

   # Windows (PowerShell)
   echo $env:OPENROUTER_API_KEY
   ```

3. **Make it permanent:**

   **Linux/macOS:**
   ```bash
   # Add to ~/.bashrc or ~/.zshrc
   echo 'export OPENROUTER_API_KEY="sk-or-v1-..."' >> ~/.bashrc
   source ~/.bashrc
   ```

   **Windows:**
   - Search for "Environment Variables"
   - Click "New" under User variables
   - Name: `OPENROUTER_API_KEY`
   - Value: `sk-or-v1-...`

### Invalid API Key

**Symptom:**
```
httpx.HTTPStatusError: 401 Unauthorized
```

**Solutions:**

1. **Verify key is correct:**
   - Check for typos
   - Ensure no extra spaces
   - Copy directly from provider dashboard

2. **Test key manually:**
   ```bash
   curl -H "Authorization: Bearer $OPENROUTER_API_KEY" \
     https://openrouter.ai/api/v1/models
   ```

3. **Regenerate key:**
   - Go to [OpenRouter dashboard](https://openrouter.ai/keys)
   - Create new API key
   - Update environment variable

### Model Not Found

**Symptom:**
```
httpx.HTTPStatusError: 404 Not Found
Model 'provider/model-name' not found
```

**Solutions:**

1. **Check model name:**
   - Verify model exists: [OpenRouter Models](https://openrouter.ai/models)
   - Check spelling and format

2. **Use correct format:**
   ```jsonc
   // Correct
   "executive_model": "openrouter:deepseek/deepseek-v3.2"

   // Wrong (missing prefix)
   "executive_model": "deepseek/deepseek-v3.2"

   // Wrong (wrong prefix)
   "executive_model": "anthropic:deepseek/deepseek-v3.2"
   ```

3. **Try alternative model:**
   ```jsonc
   // If specific version not found, try latest
   "executive_model": "openrouter:deepseek/deepseek-chat"
   ```

### Rate Limit Exceeded

**Symptom:**
```
httpx.HTTPStatusError: 429 Too Many Requests
```

**Solutions:**

1. **Wait and retry:**
   - Most rate limits are temporary (1 minute)
   - Wait and run again

2. **Check rate limits:**
   - OpenRouter: Check your plan limits
   - Some free tier models have strict limits

3. **Use different model:**
   - Switch to a model with higher rate limits
   - Or use a paid tier

### Network/Connection Errors

**Symptom:**
```
httpx.ConnectError: Connection refused
httpx.TimeoutException: Timed out
```

**Solutions:**

1. **Check internet connection:**
   ```bash
   ping openrouter.ai
   curl https://openrouter.ai
   ```

2. **Check firewall/proxy:**
   - Ensure HTTPS traffic is allowed
   - Configure proxy if needed:
     ```bash
     export HTTPS_PROXY="http://proxy.example.com:8080"
     ```

3. **Retry:**
   - Temporary network issues often resolve themselves

## Runtime Issues

### Document Not Found

**Symptom:**
```
Error: File not found: document.md
```

**Solutions:**

1. **Verify file exists:**
   ```bash
   ls -la document.md
   ```

2. **Use correct path:**
   ```bash
   # Absolute path
   cxo /full/path/to/document.md

   # Relative path
   cxo ./subdirectory/document.md
   ```

3. **Check current directory:**
   ```bash
   pwd
   ls
   ```

### Unicode/Encoding Errors

**Symptom:**
```
UnicodeDecodeError: 'charmap' codec can't decode byte...
```

**Solutions:**

1. **Save file as UTF-8:**
   - In your editor, set encoding to UTF-8
   - Resave the file

2. **Check file encoding:**
   ```bash
   file -i document.md
   ```

3. **Convert encoding:**
   ```bash
   # Linux/macOS
   iconv -f ISO-8859-1 -t UTF-8 document.md > document-utf8.md
   ```

### Memory Errors

**Symptom:**
```
MemoryError
```

**Solutions:**

1. **Reduce document size:**
   - Split large documents into smaller parts
   - Remove unnecessary content

2. **Close other applications:**
   - Free up RAM

3. **Increase available memory:**
   - If using Docker or VM, increase allocation

### Slow Performance

**Symptom:**
- Review takes a very long time (>5 minutes)

**Causes & Solutions:**

1. **Large document:**
   - Break into smaller documents
   - Each stage processes the full document

2. **Slow model:**
   - Some models are slower than others
   - Try faster models (DeepSeek is generally fast)

3. **Network latency:**
   - API calls are sequential
   - Total time = sum of all API call times
   - Consider async implementation (future enhancement)

4. **Model queue:**
   - Some models have queuing during high demand
   - Try different model or time of day

## Output Issues

### Empty or Incomplete Synthesis

**Symptom:**
- Synthesis file is empty or truncated
- Missing sections

**Solutions:**

1. **Check for errors during execution:**
   - Look for error messages in terminal output
   - Check if all stages completed

2. **Verify model responses:**
   - Some models may return empty responses
   - Try different model

3. **Check API limits:**
   - Some models have max token limits
   - Document + context may exceed limit

### Synthesis File Permission Error

**Symptom:**
```
PermissionError: [Errno 13] Permission denied: 'document-synthesis.md'
```

**Solutions:**

1. **File is open:**
   - Close the file in other applications
   - Retry

2. **Write permissions:**
   - Ensure you have write permissions in directory
   ```bash
   ls -la  # Check permissions
   chmod +w .  # Add write permission
   ```

3. **Use different output location:**
   ```bash
   cxo document.md
   # Then manually copy output file to desired location
   ```

## Quality Issues

### Poor Quality Reviews

**Symptom:**
- Reviews are generic or unhelpful
- Missing domain expertise
- Executives don't follow instructions

**Solutions:**

1. **Improve role instructions:**
   - Be more specific in `custom_role_instructions`
   - Add examples of good reviews
   - Specify what NOT to do

2. **Improve operational context:**
   - Add more project-specific constraints
   - Define success criteria
   - State priorities explicitly

3. **Use better models:**
   - Cheaper models may produce generic responses
   - Try Claude Sonnet or Opus for higher quality

4. **Refine document:**
   - Add more context to your document
   - Be specific about requirements
   - Include open questions

### Executives Going Off-Topic

**Symptom:**
- CTO talking about product
- CPO talking about operations
- Blurred domain boundaries

**Solutions:**

1. **Strengthen role boundaries:**
   ```jsonc
   "CTO": "You are the CTO. Your domain is ONLY: architecture, ...

   What you do NOT own:
   - Product decisions (that's CPO)
   - Operations (that's COO)
   - Security (that's CISO)

   If you find yourself discussing these topics, STOP."
   ```

2. **Add operational context constraints:**
   ```jsonc
   "operational_context": "When you review:
   - Stay in your domain. If you cross into another CxO's area, stop.
   - ..."
   ```

3. **Use better models:**
   - Better instruction-following
   - Stronger domain adherence

### No Questions in Stage 2

**Symptom:**
- Stage 2 produces no questions
- Stage 3 is skipped
- Synthesis lacks depth

**Solutions:**

1. **Encourage critical thinking in prompts:**
   - Add to role instructions: "You MUST identify at least one tension or question"
   - Encourage disagreement

2. **Improve document:**
   - Add controversial elements
   - Include tradeoffs
   - Mention constraints

3. **Review Stage 1 quality:**
   - If Stage 1 reviews are generic, Stage 2 won't have substance
   - Improve role instructions first

## Advanced Issues

### Custom Provider Not Working

**Symptom:**
- Using custom LLM provider
- Getting connection errors

**Solutions:**

1. **Extend `llm_client.py`:**
   - Add support for your provider
   - Follow existing patterns (OpenRouter, Anthropic, OpenAI)

2. **Check provider documentation:**
   - Verify API endpoint
   - Verify request format
   - Verify authentication method

3. **Test API directly:**
   ```bash
   curl -X POST https://your-provider.com/api/chat \
     -H "Authorization: Bearer $YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model": "...", "messages": [...]}'
   ```

### Concurrent Execution Issues

**Symptom:**
- Want to speed up execution with parallel API calls

**Note:**
- Current implementation is sequential
- Parallel execution requires code changes

**Solutions:**

1. **Use async/await** (requires modification):
   ```python
   import asyncio

   async def review_stage1_async(self, ...):
       tasks = [
           self.llm.query_async(prompt1, model),
           self.llm.query_async(prompt2, model),
           # ...
       ]
       results = await asyncio.gather(*tasks)
       return results
   ```

2. **Contribute enhancement:**
   - See [Developer Guide](./DEVELOPER_GUIDE.md)
   - Submit PR with async support

## Getting Help

If you're still stuck:

1. **Check documentation:**
   - [Getting Started](./GETTING_STARTED.md)
   - [Configuration Guide](./CONFIGURATION.md)
   - [API Reference](./API_REFERENCE.md)

2. **Search existing issues:**
   - [GitHub Issues](https://github.com/yourusername/cxo-council/issues)

3. **Create new issue:**
   - Provide error messages
   - Include config (remove API keys!)
   - Describe what you've tried

4. **Ask in discussions:**
   - [GitHub Discussions](https://github.com/yourusername/cxo-council/discussions)

## See Also

- [Getting Started](./GETTING_STARTED.md) - Installation guide
- [Configuration](./CONFIGURATION.md) - Config options
- [Developer Guide](./DEVELOPER_GUIDE.md) - Contributing
