export function CTA() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <h2
        className="text-[clamp(2rem,5.5vw,3.75rem)] leading-[1.1] tracking-[-0.01em]"
        style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
      >
        Vuoi vedere come finisce?
      </h2>

      <p className="mt-8 max-w-2xl text-[18px] leading-relaxed text-[#756C5E]">
        Ti scrivo solo quando NormaAI raggiunge{' '}
        <em className="italic text-[#13110F]">una milestone reale.</em> Niente
        newsletter periodica, niente spam, niente cross-selling.
      </p>

      <form
        action="/api/newsletter"
        method="POST"
        className="mt-10 flex flex-col gap-3 sm:flex-row"
        aria-label="Iscrizione al diario di costruzione"
      >
        <label className="sr-only" htmlFor="cta-email">
          Email
        </label>
        <input
          id="cta-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="tua@email.it"
          className="flex-1 rounded border border-[#D8CFBC] bg-[#FBF8F1] px-4 py-3 text-[16px] text-[#13110F] placeholder:text-[#9A8E83] focus-visible:border-[oklch(0.42_0.20_35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[oklch(0.42_0.20_35)]"
          style={{ fontFamily: 'var(--font-inter-tight)' }}
        />
        <button
          type="submit"
          className="rounded bg-[oklch(0.42_0.20_35)] px-6 py-3 text-[14px] uppercase tracking-[0.18em] text-[#FBF8F1] transition hover:bg-[oklch(0.42_0.20_35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[oklch(0.42_0.20_35)]"
          style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
        >
          iscrivimi →
        </button>
      </form>

      <p className="mt-3 text-[12px] text-[#9A8E83]">
        Email mai cedute. Disiscrizione con un click. Frequenza: meno di una al mese.
      </p>

      <hr className="my-12 border-t border-[#D8CFBC]" aria-hidden="true" />

      <p className="text-[12px] uppercase tracking-[0.18em] text-[#756C5E]" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
        oppure
      </p>

      <ul className="mt-4 space-y-3 text-[15px]">
        <li>
          <a
            href="/manifesto"
            className="text-[#13110F] underline-offset-4 hover:underline"
          >
            <span aria-hidden="true" className="text-[oklch(0.42_0.20_35)]">→</span> il manifesto del progetto
          </a>
        </li>
        <li>
          <a
            href="https://github.com/ServiziDigitali24SRL/sd24-normaai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#13110F] underline-offset-4 hover:underline"
          >
            <span aria-hidden="true" className="text-[oklch(0.42_0.20_35)]">→</span> il repository su GitHub
          </a>
        </li>
        <li>
          <a
            href="https://x.com/francescotudini"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#13110F] underline-offset-4 hover:underline"
          >
            <span aria-hidden="true" className="text-[oklch(0.42_0.20_35)]">→</span> seguire Francesco su X
          </a>
        </li>
      </ul>
    </section>
  );
}
