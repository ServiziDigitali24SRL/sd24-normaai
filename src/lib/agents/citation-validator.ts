// Citation Validator Agent — anti-hallucination guard.
// For every citation extracted from the LLM response, verify the URN exists
// in corpus_chunks. If not, mark `verified=false` and the Response Composer
// will either rewrite or strip the unverified citation.

import { createAdminClient } from "@/lib/supabase-admin";
import type { Agent, AgentContext, AgentResult, CitationRef } from "./types";

interface CitationValidatorInput {
  citations: CitationRef[];
  rawText: string;     // raw LLM output, in case we need to extract citations from it
}

interface CitationValidatorOutput {
  validated: CitationRef[];
  invalidCount: number;
}

// Pattern italian legal citations: art. X L./D.Lgs./Cod. Y/AAAA
const URN_PATTERNS = [
  /D\.?\s?Lgs\.?\s+(\d+)\/(\d{4})/gi,
  /D\.?\s?L\.?\s+(\d+)\/(\d{4})/gi,
  /L\.?\s+(\d+)\/(\d{4})/gi,
  /art\.?\s+(\d+)/gi,
];

function extractCitationsFromText(text: string): string[] {
  const found = new Set<string>();
  for (const pat of URN_PATTERNS) {
    const matches = text.matchAll(pat);
    for (const m of matches) found.add(m[0]);
  }
  return [...found];
}

export const citationValidatorAgent: Agent<CitationValidatorInput, CitationValidatorOutput> = {
  name: "citation-validator",

  async run(input, ctx: AgentContext): Promise<AgentResult<CitationValidatorOutput>> {
    const t0 = Date.now();
    ctx.emit({ agent: "citation-validator", state: "started" });

    try {
      const sb = createAdminClient();
      const validated: CitationRef[] = [];
      let invalidCount = 0;

      // Validate provided citations against corpus_chunks
      for (const c of input.citations) {
        const { data, error } = await sb
          .from("corpus_chunks")
          .select("id, status")
          .eq("urn", c.urn)
          .limit(1);

        if (error || !data || data.length === 0) {
          invalidCount++;
          validated.push({ ...c, verified: false });
        } else {
          validated.push({ ...c, verified: data[0].status === "vigente" });
        }
      }

      // Surface raw-text citations not in the structured list (LLM may have
      // hallucinated extra references inline)
      const inlineRefs = extractCitationsFromText(input.rawText);
      const knownLabels = new Set(input.citations.map(c => `${c.title} ${c.article ?? ""}`));
      let extraInvalid = 0;
      for (const ref of inlineRefs) {
        const matched = [...knownLabels].some(lbl => lbl.toLowerCase().includes(ref.toLowerCase()));
        if (!matched) extraInvalid++;
      }
      invalidCount += extraInvalid;

      const summary = invalidCount === 0
        ? `${validated.length}/${validated.length} citazioni valide`
        : `${invalidCount} citazioni non verificate`;

      ctx.emit({
        agent: "citation-validator",
        state: invalidCount > 0 ? "done" : "done",   // done either way; composer decides what to do
        durationMs: Date.now() - t0,
        output: summary,
      });

      return { ok: true, data: { validated, invalidCount } };
    } catch (err) {
      ctx.emit({
        agent: "citation-validator",
        state: "error",
        durationMs: Date.now() - t0,
        error: err instanceof Error ? err.message : String(err),
      });
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
