// SER-70: Zod schemas centralizzati per validazione API routes
import { z } from "zod";

// ── Chat ─────────────────────────────────────────────────────────────────────

export const ChatRequestSchema = z.object({
  question: z.string().min(1, "question è obbligatorio").max(10000, "Messaggio troppo lungo (max 10.000 caratteri)"),
  vertical: z.string().max(100).nullable().optional(),
  userId: z.string().uuid("userId non valido").nullable().optional(),
  turnNumber: z.number().int().min(0).max(1000).optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(5000),
  })).max(20).optional(),
  attachment: z.object({
    type: z.enum(["document", "image"]),
    mediaType: z.string().max(100),
    name: z.string().max(255),
    data: z.string(), // base64
    textContent: z.string().max(100000).optional(),
  }).optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// ── Leads ────────────────────────────────────────────────────────────────────

export const LeadsQuerySchema = z.object({
  tab: z.enum(["new", "history"]).optional().default("new"),
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  verticale: z.string().max(100).optional(),
  citta: z.string().max(100).optional(),
  prezzo_max: z.coerce.number().min(0).max(100000).optional(),
});

// ── Bug Report ───────────────────────────────────────────────────────────────

export const BugReportSchema = z.object({
  message: z.string().min(1).max(5000),
  url: z.string().url().optional(),
  userAgent: z.string().max(500).optional(),
  userId: z.string().uuid().nullable().optional(),
});

// ── Invest Lead ───────────────────────────────────────────────────────────────

export const InvestLeadSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email("Email non valida"),
  amount: z.number().int().min(500).max(100000).optional(),
  notes: z.string().max(2000).optional(),
});

// ── Env vars al boot (SER-70) ─────────────────────────────────────────────────

export function validateEnvVars() {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ANTHROPIC_API_KEY",
  ] as const;

  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    const msg = `[NormaAI] Env vars mancanti: ${missing.join(", ")}`;
    console.error(msg);
    // In production throw hard; in dev warn only
    if (process.env.NODE_ENV === "production") throw new Error(msg);
  }
}
