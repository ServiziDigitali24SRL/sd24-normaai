"use client";

/**
 * Mobile inputs — iOS-style.
 * - MobileInput:   text input grande, label flottante stile iOS
 * - MobileCodeInput: 6 caselle OTP grandi (numeric)
 * - MobileSelect:  select stilizzata
 * - MobilePill:    button pillola multi-select
 */

import { useRef, useState, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { MOBILE_COLORS, MOBILE_FONT, MOBILE_RADIUS } from "./theme";

interface MobileInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  hint?: string;
  errorText?: string;
}

export function MobileInput({ label, hint, errorText, style, ...rest }: MobileInputProps) {
  const [focused, setFocused] = useState(false);
  const borderColor = errorText
    ? MOBILE_COLORS.danger
    : focused
    ? MOBILE_COLORS.blue
    : MOBILE_COLORS.line;

  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
      {label && (
        <span
          style={{
            fontSize: MOBILE_FONT.small,
            fontWeight: 500,
            color: MOBILE_COLORS.textMuted,
            paddingLeft: 4,
          }}
        >
          {label}
        </span>
      )}
      <input
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        style={{
          width: "100%",
          height: 52,
          padding: "0 16px",
          borderRadius: MOBILE_RADIUS.md,
          border: `1.5px solid ${borderColor}`,
          background: MOBILE_COLORS.surface,
          fontFamily: MOBILE_FONT.family,
          fontSize: MOBILE_FONT.bodyLg,
          color: MOBILE_COLORS.text,
          outline: "none",
          transition: "border-color 120ms ease",
          WebkitAppearance: "none",
          ...style,
        }}
        {...rest}
      />
      {(hint || errorText) && (
        <span
          style={{
            fontSize: MOBILE_FONT.caption,
            color: errorText ? MOBILE_COLORS.danger : MOBILE_COLORS.textSoft,
            paddingLeft: 4,
          }}
        >
          {errorText || hint}
        </span>
      )}
    </label>
  );
}

interface MobileCodeInputProps {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  autoFocus?: boolean;
}

export function MobileCodeInput({ length = 6, value, onChange, onComplete, autoFocus }: MobileCodeInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (i: number, e: ChangeEvent<HTMLInputElement>) => {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    const arr = (value + "").padEnd(length, " ").slice(0, length).split("");
    arr[i] = digit || " ";
    const next = arr.join("").replace(/ +$/, "");
    onChange(next);
    if (digit && i < length - 1) refs.current[i + 1]?.focus();
    if (next.trim().length === length) onComplete?.(next);
  };

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      const arr = (value + "").padEnd(length, " ").split("");
      if (!arr[i] || arr[i] === " ") {
        if (i > 0) refs.current[i - 1]?.focus();
      }
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (pasted.length === length) {
      e.preventDefault();
      onChange(pasted);
      onComplete?.(pasted);
      refs.current[length - 1]?.focus();
    }
  };

  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      {Array.from({ length }).map((_, i) => {
        const d = value[i] ?? "";
        return (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKey(i, e)}
            onPaste={handlePaste}
            autoFocus={autoFocus && i === 0}
            style={{
              width: 48,
              height: 60,
              textAlign: "center",
              fontSize: MOBILE_FONT.title2,
              fontWeight: 600,
              fontFamily: MOBILE_FONT.family,
              borderRadius: MOBILE_RADIUS.md,
              border: `1.5px solid ${d ? MOBILE_COLORS.blue : MOBILE_COLORS.line}`,
              background: MOBILE_COLORS.surface,
              color: MOBILE_COLORS.text,
              outline: "none",
              transition: "border-color 120ms ease, background 120ms ease",
              WebkitAppearance: "none",
            }}
          />
        );
      })}
    </div>
  );
}

interface MobileSelectProps {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}

export function MobileSelect({ label, value, onChange, options, hint }: MobileSelectProps) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
      {label && (
        <span style={{ fontSize: MOBILE_FONT.small, fontWeight: 500, color: MOBILE_COLORS.textMuted, paddingLeft: 4 }}>
          {label}
        </span>
      )}
      <div style={{ position: "relative" }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            height: 52,
            padding: "0 40px 0 16px",
            borderRadius: MOBILE_RADIUS.md,
            border: `1.5px solid ${MOBILE_COLORS.line}`,
            background: MOBILE_COLORS.surface,
            fontFamily: MOBILE_FONT.family,
            fontSize: MOBILE_FONT.bodyLg,
            color: MOBILE_COLORS.text,
            outline: "none",
            WebkitAppearance: "none",
            appearance: "none",
            cursor: "pointer",
          }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden
          style={{
            position: "absolute",
            right: 16,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            color: MOBILE_COLORS.textMuted,
            fontSize: 12,
          }}
        >
          ▼
        </span>
      </div>
      {hint && (
        <span style={{ fontSize: MOBILE_FONT.caption, color: MOBILE_COLORS.textSoft, paddingLeft: 4 }}>{hint}</span>
      )}
    </label>
  );
}

interface MobilePillProps {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}

export function MobilePill({ active, onClick, children }: MobilePillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "10px 16px",
        borderRadius: MOBILE_RADIUS.pill,
        border: active ? `1.5px solid ${MOBILE_COLORS.blue}` : `1px solid ${MOBILE_COLORS.line}`,
        background: active ? MOBILE_COLORS.blueLight : MOBILE_COLORS.surface,
        color: active ? MOBILE_COLORS.blue : MOBILE_COLORS.text,
        fontFamily: MOBILE_FONT.family,
        fontSize: MOBILE_FONT.small,
        fontWeight: active ? 600 : 500,
        cursor: "pointer",
        transition: "all 120ms ease",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {children}
    </button>
  );
}
