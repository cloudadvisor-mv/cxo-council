"""Simple LLM client - uses OpenRouter for all models."""

import os
import httpx


class LLMClient:
    """Minimal LLM client using OpenRouter for CxO Council."""

    def __init__(self):
        self.openrouter_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("COUNCIL_OPENROUTER_API_KEY")

        if not self.openrouter_key:
            raise ValueError("OPENROUTER_API_KEY or COUNCIL_OPENROUTER_API_KEY required")

    def query(self, prompt: str, model: str, temperature: float = 0.7) -> str:
        """Send a query via OpenRouter and get a response."""
        try:
            # Strip openrouter: prefix if present
            model_id = model.replace("openrouter:", "")

            # If it's an anthropic: prefix, convert to OpenRouter format
            if model_id.startswith("anthropic:"):
                model_id = model_id.replace("anthropic:", "anthropic/")

            headers = {
                "Authorization": f"Bearer {self.openrouter_key}",
                "Content-Type": "application/json",
            }

            data = {
                "model": model_id,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": temperature,
            }

            with httpx.Client(timeout=120.0) as client:
                response = client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=data
                )
                response.raise_for_status()
                result = response.json()
                return result["choices"][0]["message"]["content"]
        except Exception as e:
            return f"ERROR: {str(e)}"
