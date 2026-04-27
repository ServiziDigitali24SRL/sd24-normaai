#!/usr/bin/env python3
"""
NormaAI — Threat Model STRIDE formale
Generato con pytm 1.3.x
Architettura: Next.js/Vercel + Supabase + VPS Hetzner (fastembed) + OpenRouter + Stripe + OAuth

Flussi critici modellati:
  1. Chat anonima freemium  — User → /api/chat → VPS embed → Supabase RAG → OpenRouter → SSE
  2. Marketplace lead       — User paga 9€ → lead creato → professionista compra lead via OTP
  3. OAuth connettori       — User autorizza Gmail/Drive → callback → token AES-GCM in Supabase
"""

import sys
import os
import subprocess

from pytm import (
    TM, Actor, Server, Process, Datastore, ExternalEntity,
    Boundary, Dataflow, Data, Classification
)


# ---------------------------------------------------------------------------
# 1. THREAT MODEL SETUP
# ---------------------------------------------------------------------------

import os as _os
_THREATS_FILE = _os.path.join(
    _os.path.dirname(__import__("pytm").__file__),
    "threatlib", "threats.json"
)

tm = TM("NormaAI Threat Model")
tm.description = (
    "Modello STRIDE per NormaAI SaaS normativo. "
    "Analizza i 3 flussi critici: chat freemium anonima, marketplace lead e connettori OAuth. "
    "Stack: Next.js 16/Vercel, Supabase Postgres+pgvector, VPS Hetzner fastembed, "
    "OpenRouter LLM, Stripe, Brevo, Twilio, Vapi."
)
if _os.path.exists(_THREATS_FILE):
    tm.threatsFile = _THREATS_FILE
tm.assumptions = [
    "TLS 1.2+ su tutti i dataflow pubblici",
    "Supabase Auth gestisce sessioni utente via cookie SSR httpOnly",
    "Token OAuth cifrati AES-GCM prima della persistenza",
    "Rate limiting via Upstash Redis su /api/chat (100 req/min anonimo, 500 autenticato)",
    "VPS Hetzner non è esposto pubblicamente salvo porta 8765 (fastembed)",
    "Chiavi API (OpenRouter, Stripe, Brevo, Twilio) in variabili d'ambiente Vercel",
]


# ---------------------------------------------------------------------------
# 2. TRUST BOUNDARIES
# ---------------------------------------------------------------------------

internet_boundary = Boundary("Internet")
vercel_boundary   = Boundary("Vercel Edge / Serverless")
supabase_boundary = Boundary("Supabase Cloud (eu-central-1)")
hetzner_boundary  = Boundary("VPS Hetzner (89.167.123.25)")
third_party_boundary = Boundary("Third-Party Services")


# ---------------------------------------------------------------------------
# 3. ATTORI ESTERNI
# ---------------------------------------------------------------------------

anon_user = Actor("Anonymous User")
anon_user.description = "Utente non autenticato che accede al chatbot freemium"
anon_user.inBoundary = internet_boundary

reg_user = Actor("Registered User")
reg_user.description = "Cittadino o impresa con account NormaAI (freemium/paid)"
reg_user.inBoundary = internet_boundary

professional = Actor("Professional User")
professional.description = "Avvocato, commercialista, tecnico — acquista lead dal marketplace"
professional.inBoundary = internet_boundary

oauth_provider = ExternalEntity("OAuth Provider")
oauth_provider.description = "Google OAuth2 (Gmail/Drive)"
oauth_provider.inBoundary = third_party_boundary

stripe_ext = ExternalEntity("Stripe")
stripe_ext.description = "Gateway pagamenti — account acct_1TDwVdFwYIps2Iy9"
stripe_ext.inBoundary = third_party_boundary

openrouter = ExternalEntity("OpenRouter LLM")
openrouter.description = "Proxy multi-LLM (primario) → Claude/GPT-4o/Gemini"
openrouter.inBoundary = third_party_boundary

brevo = ExternalEntity("Brevo Email")
brevo.description = "SMTP transazionale per OTP lead, notifiche, conferme"
brevo.inBoundary = third_party_boundary

twilio = ExternalEntity("Twilio SMS/WhatsApp")
twilio.description = "SMS OTP per conferma acquisto lead"
twilio.inBoundary = third_party_boundary

vapi = ExternalEntity("Vapi Voice AI")
vapi.description = "Integrazione voice AI per flussi telefonici"
vapi.inBoundary = third_party_boundary


# ---------------------------------------------------------------------------
# 4. COMPONENTI VERCEL (Next.js serverless)
# ---------------------------------------------------------------------------

browser = Process("Browser")
browser.description = "Client Next.js SSR/CSR nel browser dell'utente"
browser.inBoundary = internet_boundary
browser.allowsClientSideScripting = True

vercel_api = Process("Vercel API Routes")
vercel_api.description = (
    "Next.js API routes: /api/chat (SSE), /api/leads, /api/oauth/callback, "
    "/api/stripe/webhook, /api/marketplace"
)
vercel_api.inBoundary = vercel_boundary
vercel_api.implementsAPI = True
vercel_api.usesEnvironmentVariables = True
vercel_api.tracksExecutionFlow = True

vercel_middleware = Process("Vercel Edge Middleware")
vercel_middleware.description = "Auth check, rate limit Upstash Redis, geo-routing"
vercel_middleware.inBoundary = vercel_boundary
vercel_middleware.implementsAPI = True

upstash_redis = Datastore("Upstash Redis")
upstash_redis.description = "Rate limiting + session cache. Key: ip:endpoint → count/TTL"
upstash_redis.inBoundary = vercel_boundary
upstash_redis.isSQL = False
upstash_redis.storesSensitiveData = False
upstash_redis.hasWriteAccess = True


# ---------------------------------------------------------------------------
# 5. SUPABASE CLOUD
# ---------------------------------------------------------------------------

supabase_auth = Process("Supabase Auth")
supabase_auth.description = "Auth SSR: JWT in cookie httpOnly. Provider: email/password + Google OAuth"
supabase_auth.inBoundary = supabase_boundary
supabase_auth.usesSessionTokens = True
supabase_auth.implementsAPI = True

supabase_db = Datastore("Supabase Postgres + pgvector")
supabase_db.description = (
    "DB principale NormaAI (project: rjwaegzdfsdlnbijkark). "
    "Tabelle: users, leads, documents, embeddings, oauth_tokens (AES-GCM), chat_logs"
)
supabase_db.inBoundary = supabase_boundary
supabase_db.isSQL = True
supabase_db.storesPII = True
supabase_db.storesSensitiveData = True
supabase_db.hasWriteAccess = True

supabase_storage = Datastore("Supabase Storage")
supabase_storage.description = "Bucket S3-compatibile: documenti normativi, PDF allegati lead"
supabase_storage.inBoundary = supabase_boundary
supabase_storage.isSQL = False
supabase_storage.storesSensitiveData = True
supabase_storage.hasWriteAccess = True


# ---------------------------------------------------------------------------
# 6. VPS HETZNER — fastembed
# ---------------------------------------------------------------------------

vps_embedder = Server("VPS Hetzner fastembed")
vps_embedder.description = (
    "Servizio embedding HTTP :8765 (fastembed). "
    "Riceve testo, restituisce vettori float32. Non autenticato internamente."
)
vps_embedder.inBoundary = hetzner_boundary
vps_embedder.port = 8765
vps_embedder.protocol = "HTTP"
vps_embedder.OS = "Linux"
vps_embedder.usesEnvironmentVariables = True


# ---------------------------------------------------------------------------
# 7. DATA DEFINITIONS
# ---------------------------------------------------------------------------

chat_message_data = Data(
    "Chat Message",
    classification=Classification.PUBLIC,
    isPII=False,
    isCredentials=False,
    isStored=True,
    description="Domanda utente + contesto normativo"
)

user_pii_data = Data(
    "User PII",
    classification=Classification.SENSITIVE,
    isPII=True,
    isCredentials=False,
    isStored=True,
    description="Nome, email, CF, P.IVA utente registrato"
)

lead_data = Data(
    "Lead Data",
    classification=Classification.SENSITIVE,
    isPII=True,
    isCredentials=False,
    isStored=True,
    description="Contatti utente + quesito normativo venduto al professionista"
)

oauth_token_data = Data(
    "OAuth Token (AES-GCM)",
    classification=Classification.TOP_SECRET,
    isPII=False,
    isCredentials=True,
    isStored=True,
    description="access_token + refresh_token Google cifrati AES-GCM in Supabase"
)

payment_data = Data(
    "Payment Intent",
    classification=Classification.SENSITIVE,
    isPII=False,
    isCredentials=False,
    isStored=False,
    description="Stripe PaymentIntent ID, amount, currency — NON PAN, solo intent"
)

otp_data = Data(
    "OTP Lead",
    classification=Classification.SENSITIVE,
    isPII=False,
    isCredentials=True,
    isStored=False,
    description="OTP 6 cifre via SMS/email per sbloccare acquisto lead"
)

embedding_data = Data(
    "Text Embedding Vector",
    classification=Classification.RESTRICTED,
    isPII=False,
    isCredentials=False,
    isStored=True,
    description="Vettore float32 dim=768 da fastembed — può codificare contenuto normativo"
)

llm_prompt_data = Data(
    "LLM Prompt + Context",
    classification=Classification.RESTRICTED,
    isPII=False,
    isCredentials=False,
    isStored=False,
    description="Prompt utente + chunk RAG inviato a OpenRouter"
)

sse_response_data = Data(
    "SSE Stream Response",
    classification=Classification.PUBLIC,
    isPII=False,
    isCredentials=False,
    isStored=False,
    description="Risposta LLM streamed via Server-Sent Events"
)


# ---------------------------------------------------------------------------
# 8. DATAFLOW — FLUSSO 1: Chat Anonima Freemium
#    User → Browser → Vercel Middleware → /api/chat → VPS embed →
#    Supabase RAG → OpenRouter → risposta SSE
# ---------------------------------------------------------------------------

df1 = Dataflow(anon_user, browser, "User types question")
df1.description = "Input testuale dell'utente nel chatbot freemium"
df1.data = chat_message_data
df1.protocol = "HTTPS"

df2 = Dataflow(browser, vercel_middleware, "HTTPS POST /api/chat")
df2.description = "Request al chatbot con user message. Cookie sessione assente (anonimo)"
df2.data = chat_message_data
df2.protocol = "HTTPS"
df2.usesSessionTokens = False

df3 = Dataflow(vercel_middleware, upstash_redis, "Rate limit check (ip:chat)")
df3.description = "Controlla contatore rate limit per IP su Redis. Max 100/min anonimo."
df3.data = chat_message_data
df3.protocol = "HTTPS"

df4 = Dataflow(vercel_middleware, vercel_api, "Forward to /api/chat handler")
df4.description = "Middleware passa request verificata all'API route"
df4.data = chat_message_data

df5 = Dataflow(vercel_api, vps_embedder, "POST /embed — text to vector")
df5.description = "Testo query inviato al VPS fastembed su HTTP :8765"
df5.data = llm_prompt_data
df5.protocol = "HTTP"
df5.dstPort = 8765

df6 = Dataflow(vps_embedder, vercel_api, "Embedding vector response")
df6.description = "Vettore float32 restituito per similarity search RAG"
df6.data = embedding_data
df6.isResponse = True
df6.protocol = "HTTP"

df7 = Dataflow(vercel_api, supabase_db, "pgvector similarity search")
df7.description = "SELECT top-K chunk RAG da embeddings table. RLS policy: public read"
df7.data = embedding_data
df7.protocol = "HTTPS"

df8 = Dataflow(supabase_db, vercel_api, "RAG chunks retrieved")
df8.description = "Chunk di testo normativo più rilevanti"
df8.data = llm_prompt_data
df8.isResponse = True

df9 = Dataflow(vercel_api, openrouter, "LLM request con RAG context")
df9.description = "Prompt augmented + chunk RAG. API key in header Authorization"
df9.data = llm_prompt_data
df9.protocol = "HTTPS"

df10 = Dataflow(openrouter, vercel_api, "LLM streamed response")
df10.description = "Risposta normativa streamed chunks"
df10.data = sse_response_data
df10.isResponse = True
df10.protocol = "HTTPS"

df11 = Dataflow(vercel_api, browser, "SSE stream response")
df11.description = "Risposta LLM streamata via Server-Sent Events al browser"
df11.data = sse_response_data
df11.protocol = "HTTPS"


# ---------------------------------------------------------------------------
# 9. DATAFLOW — FLUSSO 2: Marketplace Lead
#    User paga 9€ → lead creato → professionista OTP → acquisto 75-150€
# ---------------------------------------------------------------------------

df12 = Dataflow(reg_user, browser, "Submit quesito normativo (9€)")
df12.description = "Utente compila form quesito e paga 9€"
df12.data = lead_data

df13 = Dataflow(browser, vercel_api, "POST /api/leads/create + Stripe intent")
df13.description = "Crea lead + PaymentIntent Stripe. Richiede autenticazione Supabase"
df13.data = payment_data
df13.protocol = "HTTPS"
df13.usesSessionTokens = True

df14 = Dataflow(vercel_api, stripe_ext, "Create PaymentIntent 9€")
df14.description = "Stripe API call con secret key. Amount in centesimi."
df14.data = payment_data
df14.protocol = "HTTPS"

df15 = Dataflow(stripe_ext, vercel_api, "Stripe webhook payment_intent.succeeded")
df15.description = "Webhook firmato con Stripe-Signature header (HMAC-SHA256)"
df15.data = payment_data
df15.isResponse = True
df15.protocol = "HTTPS"

df16 = Dataflow(vercel_api, supabase_db, "INSERT lead record")
df16.description = "Lead creato post-conferma pagamento Stripe"
df16.data = lead_data
df16.protocol = "HTTPS"

df17 = Dataflow(professional, browser, "Browse marketplace leads")
df17.description = "Professionista vede lead anonimizzati nel marketplace"
df17.data = lead_data

df18 = Dataflow(browser, vercel_api, "POST /api/leads/purchase — richiesta OTP")
df18.description = "Professionista seleziona lead e richiede OTP per sblocco"
df18.data = otp_data
df18.protocol = "HTTPS"
df18.usesSessionTokens = True

df19 = Dataflow(vercel_api, brevo, "Invio OTP via email")
df19.description = "OTP 6 cifre TTL 5 min via Brevo SMTP"
df19.data = otp_data
df19.protocol = "HTTPS"

df20 = Dataflow(vercel_api, twilio, "Invio OTP via SMS")
df20.description = "OTP duplicato via SMS Twilio come fallback"
df20.data = otp_data
df20.protocol = "HTTPS"

df21 = Dataflow(professional, browser, "Submit OTP + conferma acquisto 75-150€")
df21.description = "Professionista inserisce OTP e procede al pagamento"
df21.data = otp_data

df22 = Dataflow(browser, vercel_api, "POST /api/leads/unlock con OTP + PaymentIntent")
df22.description = "Verifica OTP + Stripe intent acquisto professionista"
df22.data = lead_data
df22.protocol = "HTTPS"
df22.usesSessionTokens = True

df23 = Dataflow(vercel_api, supabase_db, "UPDATE lead — assign to professional")
df23.description = "Lead sbloccato, dati contatto visibili al professionista"
df23.data = lead_data
df23.protocol = "HTTPS"


# ---------------------------------------------------------------------------
# 10. DATAFLOW — FLUSSO 3: OAuth Connettori
#     User → OAuth Provider → callback → token AES-GCM → Supabase
# ---------------------------------------------------------------------------

df24 = Dataflow(reg_user, browser, "Click 'Connetti Gmail/Drive'")
df24.description = "Utente avvia flusso OAuth per connettere account Google"
df24.data = user_pii_data

df25 = Dataflow(browser, vercel_api, "GET /api/oauth/authorize?provider=google")
df25.description = "API genera state CSRF + code_verifier PKCE, redirige a Google"
df25.data = oauth_token_data
df25.protocol = "HTTPS"
df25.usesSessionTokens = True

df26 = Dataflow(vercel_api, oauth_provider, "OAuth2 Authorization Request (PKCE)")
df26.description = "redirect_uri, scope, state, code_challenge inviati a Google"
df26.data = oauth_token_data
df26.protocol = "HTTPS"

df27 = Dataflow(oauth_provider, reg_user, "Google consent screen")
df27.description = "Google mostra permessi richiesti all'utente"
df27.data = user_pii_data

df28 = Dataflow(oauth_provider, vercel_api, "OAuth callback con code + state")
df28.description = "Google redirige a /api/oauth/callback con authorization code"
df28.data = oauth_token_data
df28.protocol = "HTTPS"

df29 = Dataflow(vercel_api, oauth_provider, "Token exchange (code → access+refresh)")
df29.description = "POST /token con code_verifier PKCE. Riceve access_token + refresh_token"
df29.data = oauth_token_data
df29.protocol = "HTTPS"

df30 = Dataflow(oauth_provider, vercel_api, "Token response")
df30.description = "access_token (1h) + refresh_token (long-lived) ricevuti"
df30.data = oauth_token_data
df30.isResponse = True
df30.protocol = "HTTPS"

df31 = Dataflow(vercel_api, supabase_db, "INSERT oauth_tokens (AES-GCM encrypted)")
df31.description = "Token cifrati con AES-GCM (key in env Vercel) prima della persistenza"
df31.data = oauth_token_data
df31.protocol = "HTTPS"


# ---------------------------------------------------------------------------
# 11. GENERA THREATS E OUTPUT
# ---------------------------------------------------------------------------

def print_separator(char="-", width=80):
    print(char * width)


def run_threat_model():
    """Esegue tm.process() e raccoglie le minacce trovate."""
    print_separator("=")
    print("  NormaAI — STRIDE Threat Model Report")
    print("  pytm v1.3.x | Generato automaticamente")
    print_separator("=")
    print()

    import io
    from contextlib import redirect_stdout

    # Genera DFD come PNG
    png_path = "/tmp/normaai-threat-model.png"
    print(f"[*] Generazione DFD PNG → {png_path}")
    png_generated = False
    try:
        # tm.dfd() restituisce la stringa DOT (non la stampa su stdout)
        dot_content = tm.dfd()

        if dot_content:
            dot_path = "/tmp/normaai-threat-model.dot"
            with open(dot_path, "w") as f:
                f.write(dot_content)
            print(f"[OK] File DOT salvato: {dot_path}")

            # Prova graphviz CLI in vari path
            dot_bins = [
                "dot",
                "/usr/local/bin/dot",
                "/opt/homebrew/bin/dot",
                "/usr/bin/dot",
            ]
            for dot_bin in dot_bins:
                try:
                    result = subprocess.run(
                        [dot_bin, "-Tpng", dot_path, "-o", png_path],
                        capture_output=True, text=True, timeout=15
                    )
                    if result.returncode == 0:
                        print(f"[OK] DFD PNG salvato: {png_path}")
                        png_generated = True
                        break
                except (FileNotFoundError, subprocess.TimeoutExpired):
                    continue

            if not png_generated:
                # Fallback: usa graphviz Python package (solo rendering)
                try:
                    import graphviz as gv
                    src = gv.Source(dot_content)
                    out = src.render(
                        filename="/tmp/normaai-threat-model",
                        format="png",
                        cleanup=True
                    )
                    if os.path.exists(out):
                        os.rename(out, png_path)
                        print(f"[OK] DFD PNG salvato (via graphviz py): {png_path}")
                        png_generated = True
                    elif os.path.exists(png_path):
                        print(f"[OK] DFD PNG salvato (via graphviz py): {png_path}")
                        png_generated = True
                except Exception as gv_err:
                    print(f"[!] graphviz Python package: {gv_err}")
                    print(f"    File .dot disponibile: {dot_path}")
        else:
            print("[!] DFD output vuoto")
    except Exception as e:
        print(f"[!] Errore generazione DFD: {e}")

    print()

    # Usa tm.resolve() per popolare i findings (metodo diretto, non process())
    print("[*] Esecuzione tm.resolve() — analisi STRIDE automatica...")
    print_separator()

    try:
        tm.resolve()
        print(f"[OK] resolve() completato. Findings nel TM: {len(tm.findings)}")
    except Exception as e:
        print(f"[!] Errore durante resolve(): {e}")

    # Raccoglie findings da tm.findings (globale) + per-component
    all_findings = []
    seen_ids = set()

    # Prima raccogli dal TM globale (più completo)
    try:
        for finding in tm.findings:
            fid = id(finding)
            if fid not in seen_ids:
                seen_ids.add(fid)
                elem = getattr(finding, 'element', None)
                comp_name = elem.name if elem and hasattr(elem, 'name') else 'Unknown'
                all_findings.append({
                    'component': comp_name,
                    'finding': finding,
                    'severity': getattr(finding, 'severity', 'Unknown'),
                    'description': getattr(finding, 'description', ''),
                    'threat_id': getattr(finding, 'threat_id', ''),
                    'cvss': getattr(finding, 'cvss', 0.0),
                })
    except Exception as e:
        print(f"[!] Errore raccolta findings globali: {e}")

    # Fallback: per-component scan
    if not all_findings:
        components = [
            anon_user, reg_user, professional, oauth_provider, stripe_ext,
            openrouter, brevo, twilio, vapi, browser, vercel_api,
            vercel_middleware, upstash_redis, supabase_auth, supabase_db,
            supabase_storage, vps_embedder,
            df1, df2, df3, df4, df5, df6, df7, df8, df9, df10, df11,
            df12, df13, df14, df15, df16, df17, df18, df19, df20, df21,
            df22, df23, df24, df25, df26, df27, df28, df29, df30, df31,
        ]
        for component in components:
            try:
                if hasattr(component, 'findings') and component.findings:
                    for finding in component.findings:
                        fid = id(finding)
                        if fid not in seen_ids:
                            seen_ids.add(fid)
                            all_findings.append({
                                'component': component.name,
                                'finding': finding,
                                'severity': getattr(finding, 'severity', 'Unknown'),
                                'description': getattr(finding, 'description', ''),
                                'threat_id': getattr(finding, 'threat_id', ''),
                                'cvss': getattr(finding, 'cvss', 0.0),
                            })
            except Exception:
                pass

    print()
    print_separator("=")
    print(f"  RISULTATI: {len(all_findings)} minacce STRIDE trovate")
    print_separator("=")

    if all_findings:
        # Ordina per severità CVSS (desc) poi per severity string
        severity_order = {
            'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3, 'INFO': 4, 'Unknown': 5
        }

        def sort_key(f):
            sev_str = str(f['severity']).upper() if f['severity'] else 'Unknown'
            cvss_val = float(f['cvss']) if f['cvss'] else 0.0
            return (severity_order.get(sev_str, 5), -cvss_val)

        sorted_findings = sorted(all_findings, key=sort_key)

        print()
        print("  TOP 5 MINACCE PIU SEVERE:")
        print_separator()

        for i, item in enumerate(sorted_findings[:5], 1):
            f = item['finding']
            sev = str(item['severity']).upper() if item['severity'] else 'N/A'
            cvss = item['cvss'] or 'N/A'
            tid = item['threat_id'] or 'N/A'
            desc = item['description'] or getattr(f, 'details', '') or 'N/A'
            print(f"\n  [{i}] Componente: {item['component']}")
            print(f"      Threat ID  : {tid}")
            print(f"      Severita   : {sev}  |  CVSS: {cvss}")
            print(f"      Descrizione: {str(desc)[:200]}")
            mitigations = getattr(f, 'mitigations', None)
            if mitigations:
                print(f"      Mitigazioni: {str(mitigations)[:200]}")

        print()
        print_separator()
        print(f"\n  TUTTE LE MINACCE ({len(all_findings)} totali):\n")
        for item in sorted_findings:
            f = item['finding']
            sev = str(item['severity']).upper() if item['severity'] else 'N/A'
            tid = item['threat_id'] or 'N/A'
            desc = item['description'] or ''
            print(f"  • [{sev:8}] {item['component'][:40]:<40} | {tid:<15} | {str(desc)[:80]}")

    else:
        print()
        print("  [!] Nessun finding automatico da tm.process().")
        print("      Questo può accadere se pytm non trova il file threats.json")
        print("      o se tutti i controlli sono soddisfatti.")
        print()
        print("  Eseguendo analisi STRIDE manuale basata sull'architettura...")
        _manual_stride_analysis()

    print()
    print_separator("=")
    print(f"  DFD PNG generato: {'SI → ' + png_path if png_generated else 'NO (graphviz mancante)'}")
    print(f"  Minacce trovate : {len(all_findings)}")
    print_separator("=")

    return len(all_findings), sorted_findings[:5] if all_findings else [], png_generated


def _manual_stride_analysis():
    """
    Analisi STRIDE manuale come fallback se pytm non genera findings automatici.
    Copre i 3 flussi critici con le minacce più rilevanti per NormaAI.
    """
    manual_threats = [
        # ---- FLUSSO 1: Chat anonima ----
        {
            "stride": "S - Spoofing",
            "componente": "VPS Hetzner fastembed (:8765)",
            "severita": "HIGH",
            "descrizione": (
                "Il servizio fastembed HTTP su :8765 non implementa autenticazione. "
                "Un attaccante sulla stessa rete o con accesso al VPS può inviare "
                "richieste arbitrarie all'endpoint embedding, avvelenando i vettori RAG."
            ),
            "mitigazione": (
                "Aggiungere API key header (X-Embed-Token) o mTLS tra Vercel e VPS. "
                "Bind su 127.0.0.1 e usare SSH tunnel o WireGuard."
            ),
        },
        {
            "stride": "T - Tampering",
            "componente": "Supabase pgvector (embeddings table)",
            "severita": "HIGH",
            "descrizione": (
                "Se la RLS policy su embeddings consente INSERT pubblico, "
                "un attaccante può iniettare chunk normativi falsi nel corpus RAG, "
                "causando risposte errate (RAG poisoning / data poisoning)."
            ),
            "mitigazione": (
                "RLS: solo service_role può scrivere in embeddings. "
                "Validare hash SHA-256 dei chunk prima dell'upsert. "
                "Audit log su INSERT in embeddings."
            ),
        },
        {
            "stride": "I - Information Disclosure",
            "componente": "OpenRouter LLM (prompt leakage)",
            "severita": "HIGH",
            "descrizione": (
                "I chunk RAG inviati a OpenRouter possono contenere dati normativi "
                "sensibili o PII dell'utente se il retrieval non è filtrato per tenant. "
                "OpenRouter (proxy terzo) ha visibilità sul prompt completo."
            ),
            "mitigazione": (
                "Filtrare PII dai chunk prima dell'invio LLM. "
                "Valutare Anthropic SDK diretto (fallback attivo) per dati sensibili. "
                "DPA con OpenRouter. Prompt sanitization middleware."
            ),
        },
        {
            "stride": "D - Denial of Service",
            "componente": "Vercel /api/chat (rate limit bypass)",
            "severita": "MEDIUM",
            "descrizione": (
                "Rate limit su IP (Upstash Redis) è bypassabile con IP rotation "
                "(proxy, Tor, IPv6 rotation). Un attaccante può esaurire la quota "
                "OpenRouter ($/token) o sovraccaricare fastembed sul VPS."
            ),
            "mitigazione": (
                "Aggiungere CAPTCHA dopo N richieste anonime. "
                "Rate limit anche su fingerprint browser (device-based). "
                "Budget cap OpenRouter per ora/giorno. "
                "Upstash sliding window più aggressiva per anonimo."
            ),
        },
        # ---- FLUSSO 2: Marketplace lead ----
        {
            "stride": "E - Elevation of Privilege",
            "componente": "Vercel /api/leads/unlock (OTP bypass)",
            "severita": "CRITICAL",
            "descrizione": (
                "L'OTP per sblocco lead (6 cifre, 1 milione combinazioni) "
                "può essere bruteforzato se non c'è limite tentativi. "
                "Un professionista malevolo può sbloccare lead pagando 0€ "
                "esaurendo l'OTP prima della scadenza (5 min)."
            ),
            "mitigazione": (
                "Max 3 tentativi OTP poi blocco 15 min (Upstash counter). "
                "OTP 8 cifre + entropy aggiuntiva. "
                "Legare OTP a (professional_id + lead_id + timestamp) non solo al valore. "
                "Stripe payment prima dell'OTP (non dopo)."
            ),
        },
        {
            "stride": "T - Tampering",
            "componente": "Stripe webhook /api/stripe/webhook",
            "severita": "HIGH",
            "descrizione": (
                "Se la verifica Stripe-Signature (HMAC-SHA256) non è implementata "
                "o usa il webhook secret sbagliato, un attaccante può forgiare "
                "payment_intent.succeeded e ottenere lead senza pagare."
            ),
            "mitigazione": (
                "stripe.webhooks.constructEvent() con STRIPE_WEBHOOK_SECRET env var. "
                "Reject payload senza header Stripe-Signature. "
                "Idempotency key su payment_intent_id per evitare replay. "
                "Test con Stripe CLI: stripe listen --forward-to."
            ),
        },
        {
            "stride": "I - Information Disclosure",
            "componente": "Marketplace lead (pre-acquisto)",
            "severita": "MEDIUM",
            "descrizione": (
                "I lead mostrati nel marketplace potrebbero contenere abbastanza "
                "contesto (settore, città, tipo quesito) per identificare l'utente "
                "senza acquistare formalmente, violando GDPR Art. 5(1)(c)."
            ),
            "mitigazione": (
                "Anonimizzare preview lead: solo categoria normativa + provincia (no comune). "
                "Nessun dettaglio identificativo nel titolo/snippet. "
                "Privacy by design review trimestrale."
            ),
        },
        # ---- FLUSSO 3: OAuth connettori ----
        {
            "stride": "S - Spoofing",
            "componente": "OAuth callback /api/oauth/callback (CSRF)",
            "severita": "HIGH",
            "descrizione": (
                "Senza validazione CSRF state parameter, un attaccante può "
                "forzare l'utente ad associare il proprio account Google "
                "all'account vittima (OAuth CSRF / account hijacking)."
            ),
            "mitigazione": (
                "Validare state parameter crittograficamente legato alla sessione utente. "
                "Usare PKCE (code_verifier/code_challenge). "
                "State = HMAC(session_id + timestamp) con TTL 5 min. "
                "Reject callback senza state corrispondente."
            ),
        },
        {
            "stride": "I - Information Disclosure",
            "componente": "Supabase oauth_tokens (AES-GCM key management)",
            "severita": "CRITICAL",
            "descrizione": (
                "I refresh_token Google cifrati con AES-GCM in Supabase sono sicuri "
                "solo quanto la chiave AES (in env Vercel). Se OAUTH_ENCRYPTION_KEY "
                "è esposta (leak .env, Vercel breach, log error) tutti i token "
                "sono decifrabili — accesso permanente a Gmail/Drive di tutti gli utenti."
            ),
            "mitigazione": (
                "Usare Supabase Vault (pgsodium) invece di AES custom in applicazione. "
                "Key rotation semestrale con re-encrypt asincrono. "
                "Audit log su ogni decrypt operation. "
                "Considera HashiCorp Vault o AWS KMS per key management enterprise."
            ),
        },
        {
            "stride": "R - Repudiation",
            "componente": "Supabase Auth + chat_logs",
            "severita": "LOW",
            "descrizione": (
                "Le chat_logs degli utenti anonimi non sono tracciate con identità verificata. "
                "In caso di uso illecito (richiesta dati per evasione, frode) "
                "è impossibile attribuire la sessione a un individuo specifico "
                "(solo IP, bypassabile con VPN)."
            ),
            "mitigazione": (
                "Per utenti anonimi: fingerprint browser + IP + timestamp. "
                "Retention policy: 90 giorni, poi anonimizzazione. "
                "GDPR Art. 17: procedura cancellazione dati su richiesta. "
                "Per query sensibili: richiedere registrazione prima della risposta."
            ),
        },
    ]

    severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    manual_threats.sort(key=lambda x: severity_order.get(x["severita"], 4))

    print(f"  {len(manual_threats)} minacce STRIDE identificate manualmente:\n")
    print_separator()

    print("\n  TOP 5 MINACCE PIU SEVERE:")
    print_separator("-", 80)
    for i, t in enumerate(manual_threats[:5], 1):
        print(f"\n  [{i}] [{t['severita']:8}] {t['stride']}")
        print(f"       Componente : {t['componente']}")
        print(f"       Descrizione: {t['descrizione'][:250]}")
        print(f"       Mitigazione: {t['mitigazione'][:250]}")

    print()
    print_separator()
    print(f"\n  RIEPILOGO COMPLETO ({len(manual_threats)} minacce):\n")
    for t in manual_threats:
        print(f"  • [{t['severita']:8}] {t['stride']:<30} | {t['componente'][:50]}")

    return manual_threats


if __name__ == "__main__":
    try:
        count, top5, png_ok = run_threat_model()
        sys.exit(0)
    except SystemExit as e:
        if e.code not in (0, None):
            # pytm a volte chiama sys.exit(0) dopo process()
            sys.exit(0)
    except Exception as e:
        print(f"\n[ERRORE FATALE] {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
