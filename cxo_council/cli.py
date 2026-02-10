"""CLI for CxO Council."""

import sys
import argparse
from pathlib import Path

from .council import CouncilV1


def main():
    """Run council review from CLI."""
    parser = argparse.ArgumentParser(
        description="Run a document through 4-stage CxO executive review"
    )
    parser.add_argument("document", help="Path to document to review (markdown)")
    parser.add_argument(
        "-c", "--config",
        help="Path to council config file (default: ./council-config.jsonc)",
        default=None
    )

    args = parser.parse_args()

    if not Path(args.document).exists():
        print(f"Error: File not found: {args.document}")
        sys.exit(1)

    try:
        council = CouncilV1(config_path=args.config)
        result = council.review_document(args.document)

        # Save output
        output_path = Path(args.document).stem + "-synthesis.md"
        with open(output_path, "w") as f:
            f.write(f"# Council Synthesis - {Path(args.document).name}\n\n")
            f.write(result["synthesis"])

        print(f"\n\nSynthesis saved to: {output_path}")

    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
