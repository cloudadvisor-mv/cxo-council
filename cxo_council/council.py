"""Minimal 4-stage CxO Council for governed decision-making."""

import json
import sys
import asyncio
from pathlib import Path
from typing import Any

# Fix Windows console encoding
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

from .llm_client import LLMClient
from .prompts import (
    STAGE1_PROMPT,
    STAGE2_PROMPT,
    STAGE3_PROMPT,
    STAGE4_PROMPT,
    format_stage1_responses,
    format_stage2_responses,
    extract_directed_questions,
    get_executives_with_questions,
)


class CouncilV1:
    """Minimal CxO Council - 4-stage deliberation."""

    # Default CxO roles
    ROLES = ["CPO", "CTO", "COO", "CISO"]

    def __init__(self, config_path: str | None = None):
        """Initialize council with config."""
        self.llm = LLMClient()
        self.config = self._load_config(config_path)
        self.operational_context = self.config.get("operational_context", "")
        self.role_instructions = self.config.get("custom_role_instructions", {})

        # Model configuration - defaults to DeepSeek for executives, Sonnet for CEO
        self.executive_model = self.config.get("executive_model", "openrouter:deepseek/deepseek-v3.2")
        self.ceo_model = self.config.get("ceo_model", "anthropic:claude-sonnet-4-5-20250929")

    def _load_config(self, config_path: str | None) -> dict:
        """Load council config file."""
        if config_path is None:
            # Try to find config in current directory or parent
            candidates = [
                Path.cwd() / "council-config.jsonc",
                Path.cwd() / "cxo-council-config.jsonc",
                Path(__file__).parent.parent / "council-config.jsonc",
            ]
            for candidate in candidates:
                if candidate.exists():
                    config_path = candidate
                    break
            else:
                raise FileNotFoundError(
                    "No council config found. Create council-config.jsonc or specify with --config"
                )

        config_path = Path(config_path)
        with open(config_path, "r") as f:
            # Strip comments for JSONC support (simple approach)
            content = f.read()
            lines = []
            for line in content.split("\n"):
                stripped = line.strip()
                if not stripped.startswith("//"):
                    lines.append(line)
            clean_json = "\n".join(lines)
            return json.loads(clean_json)

    def review_document(self, document_path: str) -> dict[str, Any]:
        """Run a document through 4-stage CxO review."""
        # Read document
        with open(document_path, "r") as f:
            document_content = f.read()

        print(f"\n{'='*80}")
        print(f"CxO COUNCIL - Executive Review")
        print(f"{'='*80}\n")
        print(f"Document: {document_path}")
        print(f"Executive Model: {self.executive_model}")
        print(f"CEO Model: {self.ceo_model}\n")

        # Stage 1: Executive Domain Reviews
        print(f"\n{'─'*80}")
        print("STAGE 1: Executive Domain Reviews")
        print(f"{'─'*80}\n")

        stage1_results = []
        for role in self.ROLES:
            print(f"Querying {role}...", end=" ", flush=True)

            prompt = STAGE1_PROMPT
            prompt = prompt.replace("{role_instructions}", self.role_instructions.get(role, ""))
            prompt = prompt.replace("{operational_context}", self.operational_context)
            prompt = prompt.replace("{document_content}", document_content)
            prompt = prompt.replace("{role}", role)

            response = self.llm.query(prompt, model=self.executive_model, temperature=0.7)
            stage1_results.append({"role": role, "response": response})
            print("✓")

        stage1_text = format_stage1_responses(stage1_results)

        # Stage 2: Questions & Conflicts
        print(f"\n{'─'*80}")
        print("STAGE 2: Cross-Domain Questions")
        print(f"{'─'*80}\n")

        stage2_results = []
        for role in self.ROLES:
            print(f"Querying {role}...", end=" ", flush=True)

            prompt = STAGE2_PROMPT
            prompt = prompt.replace("{role_instructions}", self.role_instructions.get(role, ""))
            prompt = prompt.replace("{operational_context}", self.operational_context)
            prompt = prompt.replace("{stage1_text}", stage1_text)

            response = self.llm.query(prompt, model=self.executive_model, temperature=0.6)
            stage2_results.append({"role": role, "response": response})
            print("✓")

        stage2_text = format_stage2_responses(stage2_results)

        # Stage 3: Responses to Questions
        print(f"\n{'─'*80}")
        print("STAGE 3: Responses to Questions")
        print(f"{'─'*80}\n")

        roles_with_questions = get_executives_with_questions(stage2_results)
        stage3_results = []

        if roles_with_questions:
            for role in self.ROLES:
                if role not in roles_with_questions:
                    continue

                print(f"Querying {role}...", end=" ", flush=True)

                directed_questions = extract_directed_questions(stage2_results, role)

                prompt = STAGE3_PROMPT
                prompt = prompt.replace("{role_instructions}", self.role_instructions.get(role, ""))
                prompt = prompt.replace("{operational_context}", self.operational_context)
                prompt = prompt.replace("{stage1_text}", stage1_text)
                prompt = prompt.replace("{directed_questions}", directed_questions)

                response = self.llm.query(prompt, model=self.executive_model, temperature=0.7)
                stage3_results.append({"role": role, "response": response})
                print("✓")
        else:
            print("No questions directed to specific roles. Skipping Stage 3.")

        stage3_text = format_stage2_responses(stage3_results) if stage3_results else "No responses required."

        # Stage 4: CEO Synthesis
        print(f"\n{'─'*80}")
        print("STAGE 4: CEO Synthesis")
        print(f"{'─'*80}\n")

        print("Querying CEO...", end=" ", flush=True)

        prompt = STAGE4_PROMPT
        prompt = prompt.replace("{operational_context}", self.operational_context)
        prompt = prompt.replace("{document_content}", document_content)
        prompt = prompt.replace("{stage1_text}", stage1_text)
        prompt = prompt.replace("{stage2_text}", stage2_text)
        prompt = prompt.replace("{stage3_text}", stage3_text)

        synthesis = self.llm.query(prompt, model=self.ceo_model, temperature=0.7)
        print("✓")

        print(f"\n{'='*80}")
        print("SYNTHESIS")
        print(f"{'='*80}\n")
        print(synthesis)

        return {
            "stage1": stage1_results,
            "stage2": stage2_results,
            "stage3": stage3_results,
            "synthesis": synthesis,
        }
