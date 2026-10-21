#!/usr/bin/env python3
"""
Compile embed/embed.src.js → embed/embed.js.

Edit embed.src.js, then run this script before commit/deploy.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "embed" / "embed.src.js"
OUT = ROOT / "embed" / "embed.js"


def compile_embed(source: str) -> str:
    # Source-only banner at top of embed.src.js — omit from shipped embed.js
    compiled = re.sub(r"^/\*\*[\s\S]*?\*/\s*", "", source, count=1)
    compiled = re.sub(r"\n[ \t]*\n[ \t]*\n+", "\n\n", compiled)
    return compiled


def main() -> None:
    if not SRC.is_file():
        print(f"error: missing {SRC}", file=sys.stderr)
        sys.exit(1)

    source = SRC.read_text(encoding="utf-8")
    compiled = compile_embed(source)
    OUT.write_text(compiled, encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)} ({len(compiled)} bytes)")


if __name__ == "__main__":
    main()
