// Response Composer Agent — runs LAST in the pipeline.
// Takes:
//   - the raw LLM response
//   - validated citations (from Citation Validator)
// Produces the user-facing markdown:
//   - strips/rewrites unverified citations
//   - appends the full source list
//   - adds dynamic disclaimer based on materia
//   - flags high-risk topics (penal, employment, eviction, separation)

import type { Agent, AgentContext, AgentResult, CitationRef } from "./types";

interface ResponseComposerInput {
  rawText: string;
  citations: CitationRef[];
  invalidCount: number;
  channel: "chat" | "voice" | "avatar" | "api";
}

interface ResponseComposerOutput {
  finalMarkdown: string;
  highRisk: boolean;
  needsHumanReviewSuggested: boolean;
}

const HIGH_RISK_KEYWORDS = [
  "penal",                 // penale
  "imputat",
  "indagat",
  "licenziament",
  "sfratt",
  "separazion",
  "divorzi",
  "custodia",
  "minore",
  "violenza",
  "stalking",
  "estorsion",
  "minacce",
  "querela",
];

function detectHighRisk(text: string, query?: string): boolean {
  const haystack = `${query ?? ""} ${text}`.toLowerCase();
  return HIGH_RISK_KEYWORDS.some(k => haystack.includes(k));
}

function buildSourceList(citations: CitationRef[]): string {
  if (citations.length === 0) return "";
  const verified = citations.filter(c => c.verified);
  if (verified.length === 0) return "";

  const lines = verified.map((c, i) =>
    `[Fonte ${i + 1}] ${c.title}${c.article ? `, ${c.article}` : ""}`
  );
  return `\n\n---\n\n**Fonti:**\n${lines.join("\n")}`;
}

function buildDisclaimer(highRisk: boolean, channel: string): string {
  if (channel === "voice") return "";   // never disclaimer in voice — it's read aloud
  if (highRisk) {
    return `\n\n*Materia ad alto rischio — la consulenza umana è raccomandata.*`;
  }
  return "";
}

/**
 * Strip inline citations whose URN doesn't appear in the validated list.
 * Conservative: only removes clearly hallucinated patterns when X/Y
 * combination is not in any verified citation.
 *
 * Returns { sanitized, removedCount }.
 */
const URN_INLINE_PATTERNS: RegExp[] = [
  /D\.?\s?Lgs\.?\s+n?\.?\s?(\d+)\/(\d{4})/gi,
  /D\.?\s?L\.?\s+n?\.?\s?(\d+)\/(\d{4})/gi,
  /D\.?P\.?R\.?\s+n?\.?\s?(\d+)\/(\d{4})/gi,
  /\bL\.?\s+n?\.?\s?(\d+)\/(\d{4})/gi,
  /Reg\.?\s+(?:UE|CE|CEE)\s+(\d{4})\/(\d+)/gi,
  /Cass\.?\s+(?:sez\.?\s*\w+\.?\s*)?(?:S\.?U\.?\s*)?n\.?\s*(\d+)\/(\d{4})/gi,
  /Corte\s+Cost\.?\s+(?:sent\.?\s+)?n\.?\s*(\d+)\/(\d{4})/gi,
];

function buildVerifiedSignatures(citations: CitationRef[]): Set<string> {
  // Each verified citation contributes one or more "signatures" we can match
  // against inline references. Signature format: "<num>/<year>" lowercased.
  const sigs = new Set<string>();
  for (const c of citations) {
    if (!c.verified) continue;
    const haystack = `${c.title} ${c.article ?? ""} ${c.urn ?? ""}`.toLowerCase();
    // Extract every "N/YYYY" pattern that appears anywhere in the citation
    const matches = haystack.matchAll(/(\d+)\/(\d{4})/g);
    for (const m of matches) {
      sigs.add(`${m[1]}/${m[2]}`);
    }
    // Also include URN as-is (if present) for direct comparison
    if (c.urn) sigs.add(c.urn.toLowerCase());
  }
  return sigs;
}

function stripUnverifiedCitations(
  text: string,
  citations: CitationRef[]
): { sanitized: string; removedCount: number } {
  const verifiedSigs = buildVerifiedSignatures(citations);
  let removedCount = 0;
  let sanitized = text;

  for (const pat of URN_INLINE_PATTERNS) {
    sanitized = sanitized.replace(pat, (match, num, year) => {
      const sig = `${String(num).toLowerCase()}/${String(year).toLowerCase()}`;
      if (verifiedSigs.has(sig)) return match;
      removedCount++;
      return "[riferimento non verificato]";
    });
  }

  return { sanitized, removedCount };
}

export const responseComposerAgent: Agent<ResponseComposerInput, ResponseComposerOutput> = {
  name: "response-composer",

  async run(input, ctx: AgentContext): Promise<AgentResult<ResponseComposerOutput>> {
    const t0 = Date.now();
    ctx.emit({ agent: "response-composer", state: "started" });

    try {
      const highRisk = detectHighRisk(input.rawText, ctx.userQuery);

      const { sanitized: body, removedCount } = stripUnverifiedCitations(
        input.rawText,
        input.citations
      );
      const sources = buildSourceList(input.citations);
      const disclaimer = buildDisclaimer(highRisk, input.channel);

      // If we stripped one or more inline references, surface a soft warning
      // (skip in voice channel — read-aloud disclaimers are noisy).
      const stripWarning =
        removedCount > 0 && input.channel !== "voice"
          ? `\n\n*Nota: ${removedCount} riferiment${removedCount === 1 ? "o" : "i"} non verificat${removedCount === 1 ? "o" : "i"} nel corpus ${removedCount === 1 ? "è stato rimosso" : "sono stati rimossi"} per garantire l'accuratezza.*`
          : "";

      const finalMarkdown = `${body}${sources}${stripWarning}${disclaimer}`.trim();

      const totalInvalid = (input.invalidCount ?? 0) + removedCount;
      const summary = highRisk
        ? `Risposta + flag rischio alto (${removedCount} citazioni rimosse)`
        : `Risposta composta (${removedCount} citazioni rimosse)`;
      ctx.emit({
        agent: "response-composer",
        state: "done",
        durationMs: Date.now() - t0,
        output: summary,
      });

      return {
        ok: true,
        data: {
          finalMarkdown,
          highRisk,
          needsHumanReviewSuggested: highRisk || totalInvalid > 0,
        },
      };
    } catch (err) {
      ctx.emit({
        agent: "response-composer",
        state: "error",
        durationMs: Date.now() - t0,
        error: err instanceof Error ? err.message : String(err),
      });
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
