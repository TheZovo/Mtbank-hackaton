from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from app import create_app
from core.config import Settings


def main() -> None:
    app = create_app(
        Settings(
            auto_create_schema=False,
            seed_defaults=False,
        )
    )
    output_path = ROOT / "openapi.json"
    output_path.write_text(json.dumps(app.openapi(), ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
