#!/usr/bin/env python3
"""
Compile embed/embed.src.js → embed/embed.js.

Default (production / customer iframe): strips all /* @if CITATION_DEBUG */ blocks.
Local instrumentation: python3 scripts/build_embed.py --citation-debug

Edit embed.src.js, then run this script before commit/deploy.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "embed" / "embed.src.js"
OUT = ROOT / "embed" / "embed.js"

IF_OPEN = "/* @if CITATION_DEBUG */"
IF_CLOSE = "/* @endif */"


def compile_embed(source: str, citation_debug: bool) -> str:
    if citation_debug:
        compiled = source.replace(IF_OPEN, "").replace(IF_CLOSE, "")
    else:
        out: list[str] = []
        i = 0
        while i < len(source):
            start = source.find(IF_OPEN, i)
            if start == -1:
                out.append(source[i:])
                break
            out.append(source[i:start])
            end = source.find(IF_CLOSE, start + len(IF_OPEN))
            if end == -1:
                print("error: unclosed CITATION_DEBUG block in embed.src.js", file=sys.stderr)
                sys.exit(1)
            i = end + len(IF_CLOSE)
        compiled = "".join(out)

    # Source-only banner at top of embed.src.js — omit from shipped embed.js
    compiled = re.sub(r"^/\*\*[\s\S]*?\*/\s*", "", compiled, count=1)
    compiled = re.sub(r"\n[ \t]*\n[ \t]*\n+", "\n\n", compiled)
    return compiled


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--citation-debug",
        action="store_true",
        help="Include citation debug ingest (local Cursor sessions only)",
    )
    args = parser.parse_args()

    if not SRC.is_file():
        print(f"error: missing {SRC}", file=sys.stderr)
        sys.exit(1)

    source = SRC.read_text(encoding="utf-8")
    compiled = compile_embed(source, args.citation_debug)
    OUT.write_text(compiled, encoding="utf-8")
    mode = "citation-debug" if args.citation_debug else "production"
    print(f"Wrote {OUT.relative_to(ROOT)} ({mode}, {len(compiled)} bytes)")


if __name__ == "__main__":
    main()
