// Stub agents — surfaced in the AgentSidebar so the user (and prospective
// white-label clients) see the full pipeline. Each emits started/done with
// a fast no-op so the UI shows them as part of the live demo.
//
// These will be implemented in Fase 2:
//   - routing            → NeMo Agent Toolkit graph
//   - vigenza-verifier   → Normattiva live + corpus_chunks.status
//   - document-analyzer  → NIM nv-yolox + DePlot + PaddleOCR
//   - jurisprudence      → corpus filtered to vertical=cassazione
//   - lead-quality       → score query + match lawyers

import type { Agent, AgentContext, AgentResult } from "./types";
import type { AgentName } from "@/config/agents";

function makeStub(name: AgentName, doneOutput: string): Agent<unknown, { stub: true }> {
  return {
    name,
    async run(_input, ctx: AgentContext): Promise<AgentResult<{ stub: true }>> {
      const t0 = Date.now();
      ctx.emit({ agent: name, state: "started" });
      // Simulate work for visual feedback (small delay so the UI pulse is visible)
      await new Promise(r => setTimeout(r, 120));
      ctx.emit({
        agent: name,
        state: "done",
        durationMs: Date.now() - t0,
        output: doneOutput,
      });
      return { ok: true, data: { stub: true } };
    },
  };
}

export const routingAgentStub          = makeStub("routing",           "pipeline: retrieve → validate → compose");
export const vigenzaVerifierStub       = makeStub("vigenza-verifier",  "verifica vigenza disponibile in fase 2");
export const documentAnalyzerStub      = makeStub("document-analyzer", "estrazione documenti disponibile in fase 2");
export const jurisprudenceStub         = makeStub("jurisprudence",     "ricerca sentenze disponibile in fase 2");
export const leadQualityStub           = makeStub("lead-quality",      "scoring lead disponibile in fase 2");
