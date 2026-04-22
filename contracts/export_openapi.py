from __future__ import annotations

import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
MOCK_SERVER_DIR = ROOT / "mock-server"
if str(MOCK_SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(MOCK_SERVER_DIR))

from mock_server import create_app


def main() -> None:
    app = create_app()
    output_path = ROOT / "contracts" / "openapi.yaml"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        yaml.safe_dump(app.openapi(), sort_keys=False, allow_unicode=True),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
