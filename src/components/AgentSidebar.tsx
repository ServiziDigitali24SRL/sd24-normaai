"use client";

import { motion, AnimatePresence } from "framer-motion";
import * as Icons from "lucide-react";
import { AGENT_DEFINITIONS, type AgentDefinition } from "@/config/agents";
import type { AgentRow } from "@/hooks/useAgentStream";

interface Props {
  rows: Record<string, AgentRow>;
}

const stateColor: Record<string, string> = {
  idle:     "var(--ink-5)",
  started:  "var(--vermiglio)",
  progress: "var(--vermiglio)",
  done:     "var(--green-success, #2E7D5B)",
  error:    "var(--red-error, #B43B25)",
};

function fmtDuration(ms?: number): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function AgentRowView({ def, row }: { def: AgentDefinition; row: AgentRow }) {
  const Icon = (Icons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string }>>)[def.icon] || Icons.Circle;
  const color = stateColor[row.state] ?? stateColor.idle;
  const isPulsing = row.state === "started" || row.state === "progress";

  return (
    <div
      style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--paper-line)",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <motion.div
        animate={isPulsing ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={isPulsing ? { duration: 1.2, repeat: Infinity } : { duration: 0.2 }}
        style={{ flexShrink: 0, marginTop: 2 }}
      >
        <Icon size={16} color={color} />
      </motion.div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--sans)",
            fontSize: 13,
            fontWeight: row.state === "started" ? 600 : 500,
            color: "var(--ink-1)",
            lineHeight: 1.3,
          }}
        >
          {def.displayName}
          {!def.implemented && (
            <span
              style={{
                marginLeft: 6,
                fontSize: 9,
                fontFamily: "var(--mono)",
                color: "var(--ink-4)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              soon
            </span>
          )}
        </div>

        <AnimatePresence>
          {row.state === "done" && row.output && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                fontFamily: "var(--serif)",
                fontStyle: "italic",
                fontSize: 11,
                color: "var(--ink-3)",
                marginTop: 3,
                lineHeight: 1.4,
              }}
            >
              {row.output}
            </motion.div>
          )}
          {row.state === "error" && row.error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                fontSize: 11,
                color: "var(--red-error, #B43B25)",
                marginTop: 3,
              }}
            >
              {row.error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          color: "var(--ink-3)",
          flexShrink: 0,
          marginTop: 4,
        }}
      >
        {fmtDuration(row.durationMs)}
      </div>
    </div>
  );
}

export default function AgentSidebar({ rows }: Props) {
  return (
    <aside
      style={{
        width: 280,
        flexShrink: 0,
        background: "var(--paper-tint, #F8F4ED)",
        borderLeft: "1px solid var(--paper-line, #E8E0D2)",
        height: "100%",
        overflowY: "auto",
        position: "sticky",
        top: 0,
      }}
      aria-label="Agent attivi"
    >
      <div
        style={{
          padding: "16px 16px 10px",
          borderBottom: "1px solid var(--paper-line)",
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.13em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
        }}
      >
        Agent attivi
      </div>

      {AGENT_DEFINITIONS.map(def => (
        <AgentRowView
          key={def.name}
          def={def}
          row={rows[def.name] ?? { name: def.name, state: "idle" }}
        />
      ))}

      <div
        style={{
          padding: "12px 16px",
          fontSize: 10,
          fontFamily: "var(--mono)",
          color: "var(--ink-4)",
          textAlign: "center",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Powered by NeMo Agent Toolkit
      </div>
    </aside>
  );
}
