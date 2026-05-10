// scripts/check-francesco-photo.ts
//
// Run by `normaai-photo-watcher.service` every 5 minutes.
// Checks S3 (`s3://normaai-assets/francesco/incoming/`) for new Higgsfield-generated
// photos and polls the Telegram bot for upload events. Logs new arrivals so the
// downstream reel pipeline can pick them up.
//
// Stub commit (Tab 7) — Tab 4 will plug in live AWS + Telegram creds via
// /etc/sd24-normaai/photo-watcher.env. Keep this file dependency-free (no SDK
// install) until then; a single fetch() call is enough for the smoke run.

const S3_BUCKET = process.env.S3_BUCKET ?? "normaai-assets";
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const TG_CHAT = process.env.TELEGRAM_CHAT_ID ?? "";

async function pollTelegram(): Promise<number> {
  if (!TG_TOKEN) {
    console.log("[photo-watcher] telegram skipped (no TELEGRAM_BOT_TOKEN)");
    return 0;
  }
  const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/getUpdates?limit=20`);
  if (!r.ok) {
    console.error(`[photo-watcher] telegram_${r.status}`);
    return 0;
  }
  const j = await r.json() as { result?: Array<{ message?: { chat?: { id: number }; photo?: unknown[] } }> };
  const photos = (j.result ?? []).filter((u) =>
    u.message?.photo && (!TG_CHAT || String(u.message.chat?.id) === TG_CHAT),
  );
  return photos.length;
}

async function main() {
  console.log(`[photo-watcher] tick @ ${new Date().toISOString()} bucket=${S3_BUCKET}`);
  // S3 listing requires aws-sdk — Tab 4 will wire it in.
  // For now we only ping Telegram (stateless, no SDK).
  const tg = await pollTelegram().catch((e) => { console.error(e); return 0; });
  console.log(`[photo-watcher] telegram_photo_events=${tg}`);
}

main().catch((e) => {
  console.error("[photo-watcher] fatal", e);
  process.exit(1);
});
