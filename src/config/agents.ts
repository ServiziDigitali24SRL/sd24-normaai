// Agent catalog — keep in sync with agent_definitions table seed
// in supabase/migrations/_pivot/001_marketplace_init.sql.

export type AgentName =
  | "routing"
  | "norm-retriever"
  | "vigenza-verifier"
  | "document-analyzer"
  | "jurisprudence"
  | "citation-validator"
  | "response-composer"
  | "lead-quality";

export interface AgentDefinition {
  name: AgentName;
  displayName: string;
  icon: string;          // lucide-react icon name
  description: string;
  enabled: boolean;
  orderIdx: number;
  implemented: boolean;  // false = stub for sidebar visibility only
}

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  { name: "routing",            displayName: "Routing Agent",      icon: "GitBranch",   description: "Decide quale agent chiamare e in che ordine.",                  enabled: true, orderIdx: 1, implemented: false },
  { name: "norm-retriever",     displayName: "Norm Retriever",     icon: "Search",      description: "Trova la norma esatta nel corpus con RAG hybrid dense+sparse.", enabled: true, orderIdx: 2, implemented: true  },
  { name: "vigenza-verifier",   displayName: "Vigenza Verifier",   icon: "Shield",      description: "Verifica se la norma è vigente, abrogata o modificata.",        enabled: true, orderIdx: 3, implemented: false },
  { name: "document-analyzer",  displayName: "Document Analyzer",  icon: "FileText",    description: "Estrae clausole, parti e date da un documento utente.",         enabled: true, orderIdx: 4, implemented: false },
  { name: "jurisprudence",      displayName: "Jurisprudence",      icon: "Scale",       description: "Trova sentenze Cassazione pertinenti e orientamenti.",          enabled: true, orderIdx: 5, implemented: false },
  { name: "citation-validator", displayName: "Citation Validator", icon: "CheckCircle", description: "Verifica che ogni citazione esista nel DB Normattiva.",         enabled: true, orderIdx: 6, implemented: true  },
  { name: "response-composer",  displayName: "Response Composer",  icon: "PenLine",     description: "Compone la risposta finale citata e formattata.",               enabled: true, orderIdx: 7, implemented: true  },
  { name: "lead-quality",       displayName: "Lead Quality",       icon: "TrendingUp",  description: "Valuta se la query è un lead da inviare al marketplace.",       enabled: true, orderIdx: 8, implemented: false },
];

export function getAgent(name: AgentName): AgentDefinition {
  const a = AGENT_DEFINITIONS.find(d => d.name === name);
  if (!a) throw new Error(`Unknown agent: ${name}`);
  return a;
}
