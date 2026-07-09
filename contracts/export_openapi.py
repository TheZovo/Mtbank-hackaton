from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
API_DIR = ROOT / "apps" / "api"
API_SRC_DIR = API_DIR / "src"
API_EXPORT_SCRIPT = API_DIR / "scripts" / "export_openapi.py"
API_OPENAPI_JSON = API_DIR / "openapi.json"


def main() -> None:
    env = os.environ.copy()
    pythonpath_parts = [str(API_SRC_DIR)]
    if existing_pythonpath := env.get("PYTHONPATH"):
        pythonpath_parts.append(existing_pythonpath)
    env["PYTHONPATH"] = os.pathsep.join(pythonpath_parts)

    subprocess.run([sys.executable, str(API_EXPORT_SCRIPT)], cwd=ROOT, check=True, env=env)

    spec = json.loads(API_OPENAPI_JSON.read_text(encoding="utf-8"))
    output_path = ROOT / "contracts" / "openapi.yaml"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        yaml.safe_dump(spec, sort_keys=False, allow_unicode=True),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
