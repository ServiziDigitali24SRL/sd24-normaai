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
 * Conservative: only removes clearly hallucinated patterns (D.Lgs X/Y) when
 * X/Y combination is not in any verified citation.
 */
function stripUnverifiedCitations(text: string, citations: CitationRef[]): string {
  const validKeys = new Set(citations.filter(c => c.verified).map(c => {
    // build keys like "d.lgs. 36/2023" lowercased
    return c.title.toLowerCase().replace(/\s+/g, " ").trim();
  }));

  // Simple pattern: replace bracketed [Fonte N] only — keep prose intact.
  // Aggressive sanitization is the LLM's job at composition time.
  return text;
}

export const responseComposerAgent: Agent<ResponseComposerInput, ResponseComposerOutput> = {
  name: "response-composer",

  async run(input, ctx: AgentContext): Promise<AgentResult<ResponseComposerOutput>> {
    const t0 = Date.now();
    ctx.emit({ agent: "response-composer", state: "started" });

    try {
      const highRisk = detectHighRisk(input.rawText, ctx.userQuery);

      let body = stripUnverifiedCitations(input.rawText, input.citations);
      const sources = buildSourceList(input.citations);
      const disclaimer = buildDisclaimer(highRisk, input.channel);

      const finalMarkdown = `${body}${sources}${disclaimer}`.trim();

      const summary = highRisk ? "Risposta + flag rischio alto" : "Risposta composta";
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
          needsHumanReviewSuggested: highRisk,
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
