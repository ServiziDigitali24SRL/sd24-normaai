// Agent Orchestrator — minimal wrapper around our agents.
// Fase 1: pure linear pipeline (Routing stub → Norm Retriever → LLM →
// Citation Validator → Response Composer). The other 3 stubs (Vigenza,
// Document, Jurisprudence) emit started/done events so the sidebar shows
// the full picture; they don't touch the result.
//
// Fase 2: replace this file with NeMo Agent Toolkit driver. Keep the same
// public surface so route.ts doesn't need to change.

import { normRetrieverAgent } from "./agents/norm-retriever";
import { citationValidatorAgent } from "./agents/citation-validator";
import { responseComposerAgent } from "./agents/response-composer";
import {
  routingAgentStub,
  vigenzaVerifierStub,
  documentAnalyzerStub,
  jurisprudenceStub,
  leadQualityStub,
} from "./agents/stubs";
import type { AgentContext, CitationRef } from "./agents/types";
import type { SofiaChannel } from "@/app/api/chat/system-prompts";

export interface OrchestratorInput {
  conversationId: string;
  userQuery: string;
  channel: SofiaChannel;
  callLLM: (systemPrompt: string, ragContext: string | null, query: string) => Promise<string>;
  emit: AgentContext["emit"];
}

export interface OrchestratorOutput {
  finalMarkdown: string;
  citations: CitationRef[];
  invalidCitations: number;
  highRisk: boolean;
  ragContext: string | null;
}

export async function runPipeline(input: OrchestratorInput): Promise<OrchestratorOutput> {
  const ctx: AgentContext = {
    conversationId: input.conversationId,
    userQuery: input.userQuery,
    emit: input.emit,
  };

  // 1. Routing (stub) — declares the plan
  await routingAgentStub.run({}, ctx);

  // 2. Norm Retriever (real)
  const retrieved = await normRetrieverAgent.run(
    { query: input.userQuery, topK: 6 },
    ctx,
  );
  const ragContext = retrieved.ok && retrieved.data ? retrieved.data.ragContext : null;
  const chunks = retrieved.ok && retrieved.data ? retrieved.data.chunks : [];

  // 3. Vigenza Verifier (stub) — runs in parallel-ish
  await vigenzaVerifierStub.run({}, ctx);

  // 4. Document Analyzer (stub) — only runs if attachment present (skipped here)
  await documentAnalyzerStub.run({}, ctx);

  // 5. Jurisprudence (stub) — only if query mentions sentenze (skipped here)
  await jurisprudenceStub.run({}, ctx);

  // 6. LLM call (delegated to caller — has access to streaming infra)
  // System prompt + RAG context built by the caller.
  const llmRaw = await input.callLLM(
    /* systemPrompt */ "",   // caller injects it
    ragContext,
    input.userQuery,
  );

  // 7. Citation Validator (real)
  const validated = await citationValidatorAgent.run(
    { citations: chunks, rawText: llmRaw },
    ctx,
  );
  const finalCitations = validated.ok && validated.data ? validated.data.validated : chunks;
  const invalidCount = validated.ok && validated.data ? validated.data.invalidCount : 0;

  // 8. Response Composer (real)
  const composed = await responseComposerAgent.run(
    { rawText: llmRaw, citations: finalCitations, invalidCount, channel: input.channel },
    ctx,
  );

  // 9. Lead Quality (stub) — runs after to score the conversation
  await leadQualityStub.run({}, ctx);

  return {
    finalMarkdown: composed.ok && composed.data ? composed.data.finalMarkdown : llmRaw,
    citations: finalCitations,
    invalidCitations: invalidCount,
    highRisk: composed.ok && composed.data ? composed.data.highRisk : false,
    ragContext,
  };
}
