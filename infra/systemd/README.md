# NormaAI · systemd units (GEX44)

Two periodic watchers for the reel-launch pipeline. **Tab 7 commits these
files only — installation on GEX44 is owned by Tab 4.**

## Units

| Unit | Cadence | Script | Purpose |
|---|---|---|---|
| `normaai-photo-watcher.{service,timer}` | every 5 min | `scripts/check-francesco-photo.ts` | poll `s3://normaai-assets/francesco/incoming/` + Telegram channel for new Higgsfield photos |
| `normaai-batch-launch.{service,timer}` | every 2 min | `scripts/check-batch-launch.ts` | `git fetch` + diff `scripts/reel-batch-launch.json`, trigger `/api/reels/batch` if changed |

Both run as `Type=oneshot` driven by their `.timer` — no long-lived process,
no supervisord, no Docker daemon.

## Install on GEX44 (Tab 4 task)

```bash
# 1. checkout repo into /opt/sd24-normaai
sudo git clone https://github.com/ServiziDigitali24SRL/sd24-normaai.git /opt/sd24-normaai
sudo chown -R normaai:normaai /opt/sd24-normaai
cd /opt/sd24-normaai && sudo -u normaai npm ci

# 2. env files (NOT in repo — fetch secrets from _VAULT)
sudo install -d -m 750 -o root -g normaai /etc/sd24-normaai
sudo tee /etc/sd24-normaai/photo-watcher.env >/dev/null <<EOF
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=normaai-assets
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
EOF
sudo tee /etc/sd24-normaai/batch-launch.env >/dev/null <<EOF
NORMAAI_API_BASE=https://normaai.it
NORMAAI_INTERNAL_TOKEN=...
EOF
sudo chmod 640 /etc/sd24-normaai/*.env

# 3. install + enable
sudo cp infra/systemd/*.service infra/systemd/*.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now normaai-photo-watcher.timer
sudo systemctl enable --now normaai-batch-launch.timer

# 4. tail logs
journalctl -u normaai-photo-watcher.service -f
journalctl -u normaai-batch-launch.service -f
```

## Notes

- Scripts in `scripts/check-francesco-photo.ts` and `scripts/check-batch-launch.ts`
  are committed as stubs — Tab 4 owns the live S3/Telegram credentials and
  may extend them.
- The batch-launch watcher MUST NOT call the n8n webhook
  `https://n8n.normaai.it/webhook/reel-publish` while Tab 4's smoke test is
  running (rate-limit / dup risk). It only triggers `/api/reels/batch`.
