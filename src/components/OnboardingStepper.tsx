"use client";

interface Props {
  current: number;
  total: number;
}

export default function OnboardingStepper({ current, total }: Props) {
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        justifyContent: "center",
        margin: "16px 0 32px",
      }}
      aria-label={`Step ${current + 1} di ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          style={{
            width: i === current ? 28 : 18,
            height: 3,
            borderRadius: 2,
            background: i <= current ? "var(--vermiglio, #C93924)" : "var(--paper-line, #E8E0D2)",
            transition: "all 0.25s ease",
          }}
        />
      ))}
    </div>
  );
}
