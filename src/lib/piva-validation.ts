// /lib/piva-validation.ts
// Validazione P.IVA italiana via checksum + VIES (best-effort)

export interface PIVAValidationResult {
  valid: boolean;
  country: string;
  pivaNumber: string;
  companyName?: string;
  companyAddress?: string;
  error?: string;
}

function validateItalianPIVAChecksum(vat: string): boolean {
  if (!/^\d{11}$/.test(vat)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const digit = parseInt(vat[i], 10);
    if (i % 2 === 0) {
      sum += digit;
    } else {
      const doubled = digit * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    }
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(vat[10], 10);
}

async function checkVIESDatabase(country: string, vatNumber: string): Promise<{ valid: boolean; name?: string; address?: string; error?: string }> {
  try {
    const res = await fetch(
      `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${country}/vat/${vatNumber}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return { valid: true }; // VIES down → accetta comunque
    const data = await res.json();
    return {
      valid: data.isValid ?? true,
      name: data.name,
      address: data.address,
    };
  } catch {
    return { valid: true }; // fallback: accetta se VIES non risponde
  }
}

export async function validatePIVA(piva: string): Promise<PIVAValidationResult> {
  const clean = piva.replace(/\s+/g, '').toUpperCase();

  // formato: 11 cifre o IT + 11 cifre
  if (!/^(IT)?\d{11}$/.test(clean)) {
    return { valid: false, country: 'IT', pivaNumber: piva, error: 'Formato P.IVA non valido (11 cifre)' };
  }

  const vatNumber = clean.startsWith('IT') ? clean.slice(2) : clean;

  if (!validateItalianPIVAChecksum(vatNumber)) {
    return { valid: false, country: 'IT', pivaNumber: piva, error: 'Codice di controllo P.IVA non valido' };
  }

  const vies = await checkVIESDatabase('IT', vatNumber);
  return {
    valid: vies.valid,
    country: 'IT',
    pivaNumber: piva,
    companyName: vies.name,
    companyAddress: vies.address,
    error: vies.error,
  };
}
