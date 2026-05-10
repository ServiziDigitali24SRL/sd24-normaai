// scripts/check-batch-launch.ts
//
// Run by `normaai-batch-launch.service` every 2 minutes on GEX44.
// Strategy:
//   1. git fetch origin main
//   2. diff scripts/reel-batch-launch.json between HEAD and origin/main
//   3. if changed → fast-forward + POST the new payload to /api/reels/batch
//
// IMPORTANT: never calls the n8n reel-publish webhook directly (Tab 4 owns
// publish smoke-tests and rate limits there).

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const REPO = process.env.REPO_PATH ?? "/opt/sd24-normaai";
const PAYLOAD = `${REPO}/scripts/reel-batch-launch.json`;
const API = process.env.NORMAAI_API_BASE ?? "https://normaai.it";
const TOKEN = process.env.NORMAAI_INTERNAL_TOKEN ?? "";

function sh(cmd: string): string {
  return execSync(cmd, { cwd: REPO, encoding: "utf8" }).trim();
}

async function main() {
  console.log(`[batch-launch] tick @ ${new Date().toISOString()}`);
  sh("git fetch origin main --quiet");
  const localSha = sh("git rev-parse HEAD");
  const remoteSha = sh("git rev-parse origin/main");
  if (localSha === remoteSha) {
    console.log("[batch-launch] up-to-date, no diff");
    return;
  }
  const changed = sh(`git diff --name-only ${localSha} ${remoteSha}`).split("\n");
  const triggered = changed.includes("scripts/reel-batch-launch.json");
  sh("git merge --ff-only origin/main");
  if (!triggered) {
    console.log("[batch-launch] fast-forwarded but reel-batch-launch.json unchanged");
    return;
  }
  if (!existsSync(PAYLOAD)) {
    console.log("[batch-launch] payload file missing after merge");
    return;
  }
  const body = readFileSync(PAYLOAD, "utf8");
  const r = await fetch(`${API}/api/reels/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(TOKEN ? { "Authorization": `Bearer ${TOKEN}` } : {}),
    },
    body,
  });
  console.log(`[batch-launch] POST /api/reels/batch → ${r.status}`);
  console.log(await r.text());
}

main().catch((e) => {
  console.error("[batch-launch] fatal", e);
  process.exit(1);
});
