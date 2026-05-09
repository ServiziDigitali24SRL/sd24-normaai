export function HeroBar() {
  return (
    <header
      role="banner"
      className="sticky top-0 z-50 border-b border-[#D8CFBC] bg-[#F6F2EA]/95 backdrop-blur"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex items-baseline gap-3">
          <span
            className="text-[22px] leading-none"
            style={{ fontFamily: 'var(--font-instrument-serif)' }}
          >
            <span className="text-[oklch(0.58_0.18_35)]">§ </span>
            <span className="italic">NormaAI</span>
          </span>
          <span className="hidden text-[13px] text-[#756C5E] sm:inline">
            · diario di costruzione
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="text-[10px] uppercase tracking-[0.2em] text-[oklch(0.58_0.18_35)]"
            style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
          >
            01 · in diretta
          </span>
          <span aria-hidden="true" className="relative inline-flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[oklch(0.58_0.18_35)] opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[oklch(0.58_0.18_35)]" />
          </span>
        </div>
      </div>
    </header>
  );
}
