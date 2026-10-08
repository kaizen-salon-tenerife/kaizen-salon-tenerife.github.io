import { spawn } from "node:child_process";
import { readFile, mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const task = process.argv[2];
const allowed = ["dev", "start", "build", "lint", "validate:artifact"];
if (!allowed.includes(task)) throw new Error("Unknown project task");

async function run(command, args) {
  await new Promise((done, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env: process.env });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? done() : reject(new Error(`Command failed (${code})`)));
  });
}

async function validate() {
  JSON.parse(await readFile("dist/.openai/hosting.json", "utf8"));
  const worker = await import(pathToFileURL(resolve("dist/server/index.js")).href);
  if (typeof worker.default?.fetch !== "function") throw new Error("Missing ESM Worker default.fetch");
  console.log("Validated production ESM Worker and hosting manifest.");
}

if (process.platform !== "win32") {
  const scripts = { build: "build-verified.sh", lint: "sites-env.sh", "validate:artifact": "validate-artifact.sh" };
  if (scripts[task]) {
    await run("bash", [`scripts/${scripts[task]}`, ...(task === "lint" ? ["--", "eslint", ".", "--ignore-pattern", "dist", "--ignore-pattern", ".next"] : [])]);
    process.exit(0);
  }
}

process.env.WRANGLER_WRITE_LOGS = "false";
process.env.WRANGLER_LOG_PATH = resolve(".wrangler/logs");
process.env.MINIFLARE_REGISTRY_PATH = resolve(".wrangler/registry");
await mkdir(".wrangler/logs", { recursive: true });
if (task === "start" && process.platform === "win32") await run(process.execPath, ["scripts/preview-server.mjs", ...process.argv.slice(3)]);
else if (task === "validate:artifact") await validate();
else {
  const pkg = task === "lint" ? "eslint" : "vinext";
  const config = JSON.parse(await readFile(`node_modules/${pkg}/package.json`, "utf8"));
  const bin = typeof config.bin === "string" ? config.bin : config.bin[pkg];
  await run(process.execPath, [`node_modules/${pkg}/${bin}`, ...(task === "lint" ? [".", "--ignore-pattern", "dist", "--ignore-pattern", ".next"] : [task, ...process.argv.slice(3)])]);
  if (task === "build") await validate();
}
