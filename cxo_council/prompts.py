"""CxO Review prompts - 4-stage executive deliberation."""

# Stage 1: Executive Domain Reviews
STAGE1_PROMPT = """{role_instructions}

{operational_context}

---

You are reviewing the following plan or specification:

{document_content}

---

Provide your {role} perspective on this plan. Focus on your domain expertise.

Structure your review:
1. **Domain Assessment**: Key observations from your perspective
2. **Strengths**: What's working well
3. **Concerns**: Issues or risks in your domain
4. **Questions**: What you need clarified (if any)
5. **Recommendations**: Specific suggestions

Be direct and actionable. Flag critical issues clearly."""

# Stage 2: Questions & Conflicts
STAGE2_PROMPT = """{role_instructions}

{operational_context}

You've seen initial reviews from the executive team:

{stage1_text}

---

Now identify cross-domain tensions and ask clarifying questions.

Your task:
1. Identify where your domain concerns may conflict with others
2. Note areas of implicit disagreement
3. Ask 1-3 specific questions to OTHER executives

Format your questions as:
"Question to [ROLE]: [Your question]"

Example:
"Question to CTO: How does the proposed architecture handle the compliance requirements I flagged?"

Be specific. Good questions surface hidden tensions."""

# Stage 3: Responses to Questions
STAGE3_PROMPT = """{role_instructions}

{operational_context}

Previous discussion:

{stage1_text}

---

Questions directed to you:

{directed_questions}

---

Respond to questions directed to your role. Be specific and actionable.

If a question reveals a genuine tension, acknowledge it rather than dismissing it.
If you need to defer to another executive, say so explicitly."""

# Stage 4: CEO Synthesis
STAGE4_PROMPT = """You are the CEO synthesizing the executive team's deliberation.

{operational_context}

---

Original Plan:
{document_content}

---

Executive Reviews (Stage 1):
{stage1_text}

---

Cross-Domain Questions (Stage 2):
{stage2_text}

---

Responses (Stage 3):
{stage3_text}

---

Synthesize into an executive decision. Use this structure:

## Executive Decision
[Clear go/no-go/conditional-go with rationale]

## Key Consensus Points
[Where the team agreed]

## Unresolved Tensions
[Tradeoffs that remain - don't force false consensus]

## Action Items
[Concrete next steps with ownership]
- [ ] [Action] — Owner: [Role]

## Phase Gate Criteria
[What must be true before proceeding to next phase?]

## What Remains Unknown
[Honest acknowledgment of uncertainties]

Be decisive while honoring the complexity surfaced by your team."""


def format_stage1_responses(responses: list[dict]) -> str:
    """Format Stage 1 CxO responses."""
    parts = []
    for resp in responses:
        role = resp.get("role", "Executive")
        content = resp.get("response", "")
        parts.append(f"### {role}\n{content}\n")
    return "\n---\n".join(parts)


def format_stage2_responses(responses: list[dict]) -> str:
    """Format Stage 2 questions/conflicts."""
    parts = []
    for resp in responses:
        role = resp.get("role", "Executive")
        content = resp.get("response", "")
        parts.append(f"### {role}\n{content}\n")
    return "\n".join(parts)


def extract_directed_questions(stage2_responses: list[dict], target_role: str) -> str:
    """Extract questions directed to a specific role."""
    questions = []
    target_patterns = [
        f"Question to {target_role}:",
        f"Question for {target_role}:",
        f"To {target_role}:",
        f"@{target_role}:",
    ]

    for resp in stage2_responses:
        content = resp.get("response", "")
        lines = content.split("\n")

        for line in lines:
            line_upper = line.upper()
            for pattern in target_patterns:
                if pattern.upper() in line_upper:
                    # Extract the question
                    idx = line_upper.find(pattern.upper())
                    question = line[idx:]
                    questions.append(f"From {resp.get('role', 'Unknown')}: {question}")
                    break

    if not questions:
        return "No questions directed to your role."

    return "\n\n".join(questions)


def get_executives_with_questions(stage2_responses: list[dict]) -> set[str]:
    """Determine which executives have questions directed to them."""
    roles_with_questions = set()
    all_roles = ["CPO", "CTO", "COO", "CISO"]

    for resp in stage2_responses:
        content = resp.get("response", "").upper()
        for role in all_roles:
            patterns = [
                f"QUESTION TO {role}",
                f"QUESTION FOR {role}",
                f"TO {role}:",
                f"@{role}",
            ]
            if any(p in content for p in patterns):
                roles_with_questions.add(role)

    return roles_with_questions
