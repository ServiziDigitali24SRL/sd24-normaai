"use client";

import { SofiaAvatar } from "@/components/SofiaAvatar";

export default function TestSofiaPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f0f1a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ color: "#e2e8f0", fontSize: 22, fontWeight: 700, margin: 0 }}>
        Sofia — NormaAI
      </h1>
      <SofiaAvatar />
    </main>
  );
}
