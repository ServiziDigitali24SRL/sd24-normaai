// /api/onboarding/lookup/cap?cap=00187 — restituisce {citta, comune, provincia, regione}
// per il CAP fornito. Pubblico (necessario in fase onboarding pre-auth).
//
// Strategia di lookup:
//   1. cerca match esatto nelle entry "singles" (medium cities ~80 capoluoghi)
//   2. se non trovato, cerca nei "ranges" (Roma 00118-00199, Milano 20121-20162, ecc.)
//   3. se ancora non trovato → 404 con suggerimento di inserimento manuale
//
// Il dataset corrente copre i capoluoghi + range metro maggiori (Roma, Milano,
// Torino, Genova, Venezia, Trieste, Bologna, Firenze, Bari, Napoli, Palermo,
// Catania, Cagliari). Per la copertura completa (~7950 comuni) basta
// rigenerare src/data/cap-dataset.json da ISTAT/Poste — il lookup non cambia.

import { NextRequest, NextResponse } from "next/server";
import cap_data from "@/data/cap-dataset.json";

export const dynamic = "force-dynamic";

type RangeRow = [string, string, string, string, string]; // [cap_start, cap_end, citta, prov, regione]
type SingleRow = [string, string, string, string];        // [cap, citta, prov, regione]

interface CapDataset {
  ranges: RangeRow[];
  singles: SingleRow[];
}

const data = cap_data as CapDataset;

// Pre-index singles for O(1) lookup
const singleIndex = new Map<string, SingleRow>();
for (const row of data.singles) singleIndex.set(row[0], row);

function lookup(cap: string): { citta: string; comune: string; provincia: string; regione: string } | null {
  // Normalize: keep only digits, pad to 5
  const clean = cap.replace(/\D/g, "").padStart(5, "0").slice(0, 5);
  if (clean.length !== 5) return null;

  // Try exact single
  const single = singleIndex.get(clean);
  if (single) {
    return {
      citta: single[1],
      comune: single[1],          // for major capoluoghi citta === comune
      provincia: single[2],
      regione: single[3],
    };
  }

  // Try ranges (metro areas)
  for (const [start, end, citta, prov, regione] of data.ranges) {
    if (clean >= start && clean <= end) {
      return { citta, comune: citta, provincia: prov, regione };
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  const cap = req.nextUrl.searchParams.get("cap");
  if (!cap) {
    return NextResponse.json({ error: "missing_cap" }, { status: 400 });
  }

  const result = lookup(cap);
  if (!result) {
    return NextResponse.json(
      {
        error: "not_found",
        message: "CAP non trovato nel dataset embedded. Inserisci manualmente città/comune/regione.",
        cap_requested: cap,
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    cap,
    ...result,
  });
}
