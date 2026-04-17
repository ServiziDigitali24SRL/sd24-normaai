# /public — asset statici

**B-19 fix (pre-lancio):** creare questi file PRIMA del go-live. Placeholder qui sotto, ma i file reali devono essere uploadati dal team prima del deploy finale.

## File richiesti

| File | Size | Uso |
|------|------|-----|
| `og-image.png` | 1200×630 | OpenGraph / Twitter Card (referenziato in `src/app/layout.tsx`) |
| `favicon.ico` | 32×32 (multi-res) | Browser tab icon |
| `apple-touch-icon.png` | 180×180 | iOS home screen |
| `logo.png` | 512×512+ | JSON-LD `logo` in schema.org (`src/app/guide/[slug]/page.tsx`) |

## Come generare rapidamente

1. **og-image.png** — usa https://og-image.vercel.app o https://ogimage.gallery. Template: logo NormaAI + tagline "Il Copilota Legale Italiano con AI".
2. **favicon.ico** — https://favicon.io/favicon-generator/ (testo "NA" su sfondo blu #1e40af).
3. **apple-touch-icon.png** — stesso logo quadrato 180×180, sfondo opaco.
4. **logo.png** — logo vettoriale NormaAI in PNG trasparente 512×512.

## Verificare post-deploy

```bash
curl -I https://normaai.it/og-image.png      # 200 OK
curl -I https://normaai.it/favicon.ico       # 200 OK
curl -I https://normaai.it/apple-touch-icon.png
curl -I https://normaai.it/logo.png
```

Se 404 → OG preview LinkedIn/WhatsApp/X rotta, no favicon in tab, JSON-LD invalido.
