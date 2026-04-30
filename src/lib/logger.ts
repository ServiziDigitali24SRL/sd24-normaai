type LogLevel = "info" | "warn" | "error" | "debug";

export function log(level: LogLevel, event: string, data?: Record<string, unknown>) {
  const entry = { level, event, ...data, ts: new Date().toISOString() };
  if (level === "error") console.error(JSON.stringify(entry));
  else if (level === "warn") console.warn(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}
