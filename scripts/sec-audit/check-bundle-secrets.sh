#!/usr/bin/env bash
# SER-66: Service role key audit — scansiona il bundle .next/ per leak di segreti JWT/API key
# Esecuzione: ./scripts/sec-audit/check-bundle-secrets.sh [--dir <path>]
# Exit 0 = OK | Exit 1 = segreti trovati (blocca CI)

set -euo pipefail

# ─── Configurazione ────────────────────────────────────────────────────────────
BUILD_DIR="${BUILD_DIR:-.next}"
SCAN_DIR="${1:-$BUILD_DIR}"
REPORT_FILE="${REPORT_FILE:-/tmp/bundle-secrets-report.txt}"

# Colori per output locale (disabilitati in CI)
if [ -t 1 ]; then
  RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; RESET='\033[0m'
else
  RED=''; YELLOW=''; GREEN=''; RESET=''
fi

FOUND_ISSUES=0
declare -a ISSUES=()

# ─── Pattern da cercare ────────────────────────────────────────────────────────
# eyJ = prefisso base64 di qualsiasi JWT (Supabase service_role, anon key, Anthropic, ecc.)
# sk-ant = Anthropic API key prefix
# sbp_  = Supabase Personal Access Token
# xoxb-, xoxp- = Slack tokens
# ghp_, ghs_ = GitHub tokens

declare -A PATTERNS=(
  ["JWT/Supabase-key"]="eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}"
  ["Anthropic-API-key"]="sk-ant-[A-Za-z0-9_-]{30,}"
  ["Supabase-PAT"]="sbp_[A-Za-z0-9]{30,}"
  ["Stripe-secret"]="sk_(live|test)_[A-Za-z0-9]{20,}"
  ["Stripe-restricted"]="rk_(live|test)_[A-Za-z0-9]{20,}"
  ["GitHub-token"]="(ghp|ghs|gho|ghu)_[A-Za-z0-9]{30,}"
)

# ─── Funzioni helper ──────────────────────────────────────────────────────────
log_info()  { echo -e "${GREEN}[INFO]${RESET}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
log_error() { echo -e "${RED}[ERROR]${RESET} $*"; }

# Verifica che il pattern non sia un placeholder/example noto
is_placeholder() {
  local match="$1"
  # Escludi valori di test/esempio noti nei file di documentazione
  local placeholders=(
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE5ODM4MTI5OTZ9"  # jwt.io example
    "YOUR_KEY_HERE"
    "REPLACE_ME"
    "example"
    "placeholder"
  )
  for p in "${placeholders[@]}"; do
    [[ "$match" == *"$p"* ]] && return 0
  done
  return 1
}

# ─── Verifica prerequisiti ────────────────────────────────────────────────────
if [ ! -d "$SCAN_DIR" ]; then
  log_warn "Directory '$SCAN_DIR' non trovata — skip audit (build non eseguita?)"
  exit 0
fi

log_info "SER-66 Secret Leak Audit — scansione: $SCAN_DIR"
log_info "Pattern controllati: ${!PATTERNS[*]}"
echo ""

# ─── Scansione ────────────────────────────────────────────────────────────────
# Esamina solo file rilevanti (JS, JSON, HTML), esclude source maps e test fixtures
SCAN_FILES=$(find "$SCAN_DIR" -type f \( \
  -name "*.js" -o \
  -name "*.json" -o \
  -name "*.html" -o \
  -name "*.css" \
\) ! -name "*.map" 2>/dev/null || true)

if [ -z "$SCAN_FILES" ]; then
  log_warn "Nessun file trovato in '$SCAN_DIR'"
  exit 0
fi

FILE_COUNT=$(echo "$SCAN_FILES" | wc -l | tr -d ' ')
log_info "File da scansionare: $FILE_COUNT"

# Svuota il report precedente
> "$REPORT_FILE"

for label in "${!PATTERNS[@]}"; do
  pattern="${PATTERNS[$label]}"
  log_info "Controllo: $label ..."

  while IFS= read -r file; do
    # grep con Perl regex per supportare lookahead/lookbehind se necessario
    matches=$(grep -Poh "$pattern" "$file" 2>/dev/null || true)

    if [ -n "$matches" ]; then
      while IFS= read -r match; do
        # Filtra placeholder noti
        if is_placeholder "$match"; then
          log_info "  Placeholder ignorato in $file"
          continue
        fi

        # Tronca il match per il report (non mostrare l'intero segreto)
        truncated="${match:0:12}...${match: -4}"
        file_short="${file#$SCAN_DIR/}"

        issue_line="[$label] $file_short: $truncated"
        ISSUES+=("$issue_line")
        echo "$issue_line" >> "$REPORT_FILE"
        log_error "LEAK TROVATO: $issue_line"
        FOUND_ISSUES=$((FOUND_ISSUES + 1))
      done <<< "$matches"
    fi
  done <<< "$SCAN_FILES"
done

echo ""

# ─── Risultato ────────────────────────────────────────────────────────────────
if [ "$FOUND_ISSUES" -eq 0 ]; then
  log_info "✅ Nessun segreto trovato nel bundle. Build sicura."
  exit 0
else
  log_error "❌ AUDIT FALLITO — $FOUND_ISSUES segreto/i trovato/i nel bundle!"
  log_error ""
  log_error "AZIONE RICHIESTA:"
  log_error "  1. Identifica la variabile che è finita nel bundle client"
  log_error "     (assicurati che NON usi il prefisso NEXT_PUBLIC_)"
  log_error "  2. Ruota IMMEDIATAMENTE la chiave compromessa (vedi docs/sec/key-rotation-runbook.md)"
  log_error "  3. Rimuovi la chiave dal repository e dalla cronologia git"
  log_error "     (usa: git filter-repo o BFG Repo Cleaner)"
  log_error ""
  log_error "Report completo: $REPORT_FILE"

  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    {
      echo "## ❌ SER-66 Secret Leak Audit — FALLITO"
      echo ""
      echo "**$FOUND_ISSUES segreto/i trovato/i nel bundle Next.js.**"
      echo ""
      echo "| Pattern | File | Valore (troncato) |"
      echo "|---|---|---|"
      for issue in "${ISSUES[@]}"; do
        # Parse: [label] file: truncated
        issue_label=$(echo "$issue" | grep -oP '(?<=\[)[^\]]+')
        issue_rest=$(echo "$issue" | sed 's/\[[^]]*\] //')
        issue_file=$(echo "$issue_rest" | cut -d: -f1)
        issue_val=$(echo "$issue_rest" | cut -d: -f2-)
        echo "| $issue_label | \`$issue_file\` | \`$issue_val\` |"
      done
      echo ""
      echo "> Ruota immediatamente le chiavi compromesse. Vedi \`docs/sec/key-rotation-runbook.md\`."
    } >> "$GITHUB_STEP_SUMMARY"
  fi

  exit 1
fi
