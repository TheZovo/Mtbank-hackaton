const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const node = process.execPath;
const openapiTypescriptCli = path.join(root, "node_modules", "openapi-typescript", "bin", "cli.js");
const openapiPath = path.join(root, "contracts", "openapi.yaml");
const generatedPath = path.join(root, "contracts", "generated", "api.ts");
const venvPythonWindows = path.join(root, ".venv", "Scripts", "python.exe");
const venvPythonUnix = path.join(root, ".venv", "bin", "python");
const python =
  process.env.PYTHON ||
  (fs.existsSync(venvPythonWindows) ? venvPythonWindows : fs.existsSync(venvPythonUnix) ? venvPythonUnix : "python");

fs.mkdirSync(path.dirname(generatedPath), { recursive: true });

execFileSync(python, [path.join(root, "contracts", "export_openapi.py")], {
  cwd: root,
  stdio: "inherit",
});

execFileSync(node, [openapiTypescriptCli, openapiPath, "-o", generatedPath], {
  cwd: root,
  stdio: "inherit",
});
