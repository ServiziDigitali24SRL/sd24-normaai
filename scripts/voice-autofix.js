#!/usr/bin/env node
// Chiamato da .github/workflows/voice-monitor.yml
// Env richieste: ANTHROPIC_API_KEY, VAPI_STATUS, VAPI_BODY, GITHUB_TOKEN, GITHUB_REPOSITORY

const fs = require("fs");
const { execSync } = require("child_process");

const status = process.env.VAPI_STATUS;
const body = process.env.VAPI_BODY;
const [owner, repo] = (process.env.GITHUB_REPOSITORY || "").split("/");

async function ghPost(path, data) {
  const res = await fetch(`https://api.github.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function openIssue(title, body) {
  return ghPost(`/repos/${owner}/${repo}/issues`, {
    title,
    body,
    labels: ["bug", "voice-down"],
  });
}

async function main() {
  const hook = fs.readFileSync("src/hooks/useMobileVoice.ts", "utf8");
  const personalities = fs.readFileSync("src/lib/orb-personalities.ts", "utf8");

  const prompt = [
    "Sei un senior engineer di NormaAI. Il monitor automatico ha rilevato che la voce Vapi e DOWN.",
    "",
    `POST https://api.vapi.ai/call/web -> HTTP ${status}`,
    `Response body: ${body}`,
    "",
    "File useMobileVoice.ts:",
    "```typescript",
    hook.slice(0, 5000),
    "```",
    "",
    "File orb-personalities.ts:",
    "```typescript",
    personalities.slice(0, 2000),
    "```",
    "",
    "Analizza l'errore e proponi un fix. Rispondi SOLO con JSON valido:",
    '{"can_fix":true/false,"reason":"causa e fix in una riga","file":"path/del/file","original":"stringa esatta da sostituire","fixed":"stringa corretta"}',
    "Se non puoi fixare in sicurezza, can_fix: false.",
  ].join("\n");

  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const claudeData = await claudeRes.json();
  const text = claudeData?.content?.[0]?.text ?? "";

  let fix;
  try {
    fix = JSON.parse((text.match(/\{[\s\S]*\}/) || ["{}"])[0]);
  } catch {
    fix = { can_fix: false, reason: "Claude parse error: " + text.slice(0, 200) };
  }

  const issueBody = [
    `**Voice monitor: POST /call/web -> ${status}**`,
    "",
    "```json",
    body,
    "```",
    "",
    `**Claude:** ${fix.reason || "N/A"}`,
    "",
    "---",
    "Generato automaticamente da Voice Monitor",
  ].join("\n");

  if (!fix.can_fix || !fix.file || !fix.original) {
    await openIssue(`[Voice DOWN] Vapi ${status} — richiede analisi`, issueBody);
    console.log("Issue aperta, fix non automatico:", fix.reason);
    return;
  }

  if (!fs.existsSync(fix.file)) {
    await openIssue(`[Voice DOWN] Vapi ${status} — file non trovato`, issueBody);
    console.log("File non trovato:", fix.file);
    return;
  }

  const src = fs.readFileSync(fix.file, "utf8");
  if (!src.includes(fix.original)) {
    await openIssue(`[Voice DOWN] Vapi ${status} — snippet non trovato`, issueBody);
    console.log("Snippet non trovato in", fix.file);
    return;
  }

  fs.writeFileSync(fix.file, src.replace(fix.original, fix.fixed));

  execSync('git config user.email "autofix@normaai.it"');
  execSync('git config user.name "NormaAI Autofix"');
  execSync(`git add ${fix.file}`);
  execSync(`git commit -m "fix(voice): autofix — ${fix.reason.slice(0, 72)}"`);
  execSync("git push origin main");

  console.log("Fix applicato e pushato su main:", fix.reason);
}

main().catch((err) => {
  console.error("voice-autofix error:", err);
  process.exit(1);
});
