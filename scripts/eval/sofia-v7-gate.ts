#!/usr/bin/env tsx
/**
 * Sofia v7 promotion gate — call gemini-2.5-flash via OpenRouter with the v7
 * system prompt + each test query, score channel-format compliance.
 *
 * NOTE: this bypasses the ElevenLabs ConvAI runtime so does NOT exercise the
 * actual tool routing (`query_normaai_corpus` / `web_search_recent`). Tool
 * routing must be tested manually via the ElevenLabs dashboard "Test agent"
 * panel against agent_9001kr6zks5nfdza9fj1prkyk74r. This gate covers prompt
 * format compliance: tone (Lei), channel length caps, disclaimer presence,
 * structural rules.
 *
 * Run:
 *   OPENROUTER_API_KEY=... tsx scripts/eval/sofia-v7-gate.ts
 */

import fs from "fs";

const OR_KEY = process.env.OPENROUTER_API_KEY ?? "";
const OR_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env.SOFIA_GATE_MODEL ?? "google/gemini-2.5-flash";
const V7_FILE = "/Users/user/dev/sd24-normaai-eval/src/lib/agents/sofia-system-v7.md";
const TESTS_FILE = "/Users/user/dev/sd24-normaai-eval/scripts/sofia-test-queries.json";

interface TestCase {
  id: string;
  channel: "voice/avatar" | "community" | "dm";
  user: string;
  context_hint?: string;
  expect: string[];
}

function extractV7Prompt(md: string): string {
  const lines = md.split("\n");
  let inSec = false, inFence = false;
  const buf: string[] = [];
  for (const l of lines) {
    if (!inSec) { if (l.startsWith("## SYSTEM PROMPT v7")) inSec = true; continue; }
    if (!inFence) { if (l.startsWith("```")) { inFence = true; continue; } }
    else { if (l.startsWith("```")) break; buf.push(l); }
  }
  return buf.join("\n").trim();
}

async function callLLM(system: string, user: string): Promise<{ text: string; latency_ms: number }> {
  const t0 = Date.now();
  const r = await fetch(OR_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OR_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.3,
      max_tokens: 600,
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`openrouter ${r.status} ${t.slice(0, 200)}`);
  }
  const j = await r.json() as { choices: { message: { content: string } }[] };
  return { text: j.choices[0].message.content, latency_ms: Date.now() - t0 };
}

interface ScoreReport {
  id: string;
  channel: string;
  user: string;
  response: string;
  latency_ms: number;
  checks: {
    formal_lei: { pass: boolean; note: string };
    length_within_cap: { pass: boolean; chars: number; cap: number };
    disclaimer_present: { pass: boolean; expected: string };
    no_emoji: { pass: boolean };
    no_markdown_lists: { pass: boolean };
  };
  overall_pass: boolean;
}

function score(tc: TestCase, response: string, latency_ms: number): ScoreReport {
  const text = response;
  const lower = text.toLowerCase();

  // Formal "Lei" — robust detection.
  // Strong positive markers (any one is enough):
  //   - clitic suffixes -La / -Le on a verb stem (aiutarLa, fornirLe, assegnarLa)
  //   - capitalized formal pronouns (Lei, La, Le) in non-article positions
  //   - Suo / Sua / Suoi / Sue (formal possessive)
  //   - "Mi dica", "Mi scusi", "potrebbe", "le aliquote", "le imposte"
  // Strong negative markers (any one fails):
  //   - bare informal 2nd-person pronouns "ti " "tu "
  //   - informal possessive "tuo " "tua " "tuoi " "tue "
  //   - informal verb forms in addressing context: "dimmi", "sai?"
  const cliticFormal = /[a-zà-ù]L[ae]\b/.test(text);                // aiutarLa, fornirLe
  const capFormal = /\b(Lei|La invito|La prego|Le ind|Le suggeris|Le serv|Le scus|Le aliquote|Le imposte|Le accord)\b/.test(text);
  const possFormal = /\b(Suo|Sua|Suoi|Sue)\b/.test(text);
  const formalImp = /\b(Mi dica|Mi scusi|potrebbe|gradirebbe|si rivolg|specifichi|abbia)\b/i.test(text);
  const formalMarkers = cliticFormal || capFormal || possFormal || formalImp;

  const informalMarkers = /\b(ti\s|tuo\s|tua\s|tuoi\s|tue\s|dimmi|sai\?)\b/i.test(text);
  // Pass if: no informal markers AND (formal markers found OR neutral/factual
  // answer with no direct addressing — both are compliant with the "Lei sempre"
  // spirit since they avoid the informal "tu").
  const formal = !informalMarkers;

  // Length cap per channel
  let cap = 9999;
  if (tc.channel === "community") cap = 200;
  else if (tc.channel === "dm") cap = 500;
  // voice/avatar: no hard char cap, but 3-7 sentences ~ 800 chars typical
  const within = text.length <= cap;

  // Disclaimer — Francesco directive: absent OK in test gate. We still record
  // whether expected disclaimer is present, but it does NOT block overall_pass.
  // Voice/avatar CTA short answers (per v7 spec) also legitimately omit it.
  let expectedDiscl = "";
  if (tc.channel === "voice/avatar") expectedDiscl = "Risposta generata da AI ai sensi Reg. UE 2024/1689";
  else expectedDiscl = "Risposta automatica · Sofia AI di NormaAI";
  const disclPresent = text.includes(expectedDiscl);

  // No emoji
  const hasEmoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text);

  // No markdown lists in voice/avatar (TTS); allowed in dm/community? Strict for voice
  const hasLists = tc.channel === "voice/avatar"
    ? /^[\s\-\*\d]+[\.\)]\s/m.test(text)
    : false;

  const checks = {
    formal_lei: { pass: formal, note: formal ? "ok" : `markers=${formalMarkers} informal=${informalMarkers}` },
    length_within_cap: { pass: within, chars: text.length, cap },
    disclaimer_present: { pass: disclPresent, expected: expectedDiscl },
    no_emoji: { pass: !hasEmoji },
    no_markdown_lists: { pass: !hasLists },
  };
  // Per Francesco: disclaimer absent OK in test gate. Pass = formal_lei + length +
  // no_emoji + no_markdown_lists. Disclaimer is reported but advisory.
  const overall = checks.formal_lei.pass &&
                  checks.length_within_cap.pass &&
                  checks.no_emoji.pass &&
                  checks.no_markdown_lists.pass;

  return {
    id: tc.id,
    channel: tc.channel,
    user: tc.user,
    response: text,
    latency_ms,
    checks,
    overall_pass: overall,
  };
}

async function main() {
  if (!OR_KEY) { console.error("OPENROUTER_API_KEY missing"); process.exit(1); }
  const v7 = extractV7Prompt(fs.readFileSync(V7_FILE, "utf-8"));
  if (v7.length < 1000) { console.error("v7 prompt extraction failed"); process.exit(1); }
  const cases = JSON.parse(fs.readFileSync(TESTS_FILE, "utf-8")).tests as TestCase[];

  console.log(`Sofia v7 GATE — ${cases.length} test cases via ${MODEL}`);
  console.log(`prompt len: ${v7.length} chars\n`);

  const reports: ScoreReport[] = [];
  for (const tc of cases) {
    process.stdout.write(`[${tc.id}] ${tc.channel.padEnd(13)} ${tc.user.slice(0, 50)}... `);
    try {
      // Build system: v7 prompt + a channel hint when test wants community/dm
      let sys = v7;
      if (tc.channel === "community") sys = `${v7}\n\n[CONTEXT] channel=community — applica REGOLE community sopra.`;
      else if (tc.channel === "dm") sys = `${v7}\n\n[CONTEXT] channel=dm — applica REGOLE dm sopra.`;

      const { text, latency_ms } = await callLLM(sys, tc.user);
      const rep = score(tc, text, latency_ms);
      reports.push(rep);
      const flags = [
        rep.checks.formal_lei.pass ? "L" : "·",
        rep.checks.length_within_cap.pass ? "N" : "·",
        rep.checks.disclaimer_present.pass ? "D" : "·",
        rep.checks.no_emoji.pass ? "E" : "·",
        rep.checks.no_markdown_lists.pass ? "M" : "·",
      ].join("");
      console.log(`${rep.overall_pass ? "OK" : "KO"} [${flags}] t=${latency_ms}ms chars=${text.length}`);
    } catch (err) {
      console.log(`ERR ${(err as Error).message}`);
      reports.push({
        id: tc.id, channel: tc.channel, user: tc.user, response: "",
        latency_ms: 0,
        checks: { formal_lei:{pass:false,note:"err"}, length_within_cap:{pass:false,chars:0,cap:0}, disclaimer_present:{pass:false,expected:""}, no_emoji:{pass:false}, no_markdown_lists:{pass:false} },
        overall_pass: false,
      });
    }
    await new Promise((r) => setTimeout(r, 800));
  }

  const passed = reports.filter((r) => r.overall_pass).length;
  console.log(`\n${"-".repeat(60)}`);
  console.log(`gate: ${passed}/${reports.length}`);
  console.log("legend: L=formal_lei N=length D=disclaimer E=no_emoji M=no_markdown_list\n");
  console.log("per-check breakdown:");
  const checkKeys = ["formal_lei", "length_within_cap", "disclaimer_present", "no_emoji", "no_markdown_lists"] as const;
  for (const k of checkKeys) {
    const ok = reports.filter((r) => (r.checks as any)[k].pass).length;
    console.log(`  ${k.padEnd(22)} ${ok}/${reports.length}`);
  }
  fs.writeFileSync("sofia-v7-gate-report.json", JSON.stringify({
    run_at: new Date().toISOString(),
    model: MODEL,
    n: reports.length,
    pass: passed,
    pass_rate: passed / reports.length,
    reports,
  }, null, 2));
  console.log(`\nsaved: sofia-v7-gate-report.json`);
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
