"use client";

import { motion, AnimatePresence } from "framer-motion";

interface ModalOverlayProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  maxWidth?: string;
}

export default function ModalOverlay({
  open,
  onClose,
  children,
  wide,
  maxWidth,
}: ModalOverlayProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 z-[200]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          {/* Mobile: bottom sheet | Desktop: centered modal */}
          <div className="fixed inset-0 z-[201] flex items-end sm:items-center sm:justify-center sm:p-5 pointer-events-none">
            <motion.div
              role="dialog"
              aria-modal="true"
              className={`bg-white border border-[#E5E1D8] w-full relative max-h-[92vh] overflow-y-auto shadow-[0_4px_32px_rgba(0,0,0,0.12)] pointer-events-auto rounded-t-[20px] sm:rounded-[18px] ${maxWidth ?? (wide ? "sm:max-w-[560px]" : "sm:max-w-[440px]")}`}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Drag handle — mobile only */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 bg-[#D5D0C8] rounded-full" />
              </div>
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export function ModalClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      aria-label="Chiudi"
      className="absolute top-2 right-2 w-[44px] h-[44px] flex items-center justify-center bg-transparent border-none text-[#9A9690] text-[20px] leading-none z-10 hover:text-[#1a1a1a] hover:bg-[#F0EDE8] rounded-lg transition-colors cursor-pointer"
    >
      &times;
    </button>
  );
}

export function ModalTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-serif text-[24px] mb-[3px] text-[#1a1a1a]">{children}</div>
  );
}

export function ModalSub({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12.5px] text-[#6B6763] mb-5">{children}</div>
  );
}

export function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] text-[#6B6763] mb-[5px] mt-[14px] uppercase tracking-[0.5px]">
      {children}
    </label>
  );
}

export function FormInput({
  type = "text",
  placeholder,
  value,
  onChange,
}: {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className="w-full py-[12px] px-[13px] bg-[#F0EDE8] border border-[#D5D0C8] rounded-[9px] text-[#1a1a1a] text-[16px] outline-none transition-colors duration-150 focus:border-[#B0A898] focus:bg-white placeholder:text-[#A09B93]"
    />
  );
}

export function BtnPrimary({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full py-[11px] rounded-[9px] text-[13.5px] font-medium mt-4 border-none cursor-pointer transition-all duration-150 bg-accent text-white hover:bg-accent-hover shadow-[0_2px_8px_rgba(232,52,10,0.20)] ${className}`}
    >
      {children}
    </button>
  );
}

export function BtnOutline({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full py-[11px] rounded-[9px] text-[13.5px] font-medium mt-[7px] border border-[#D5D0C8] bg-transparent text-[#1a1a1a] cursor-pointer transition-all duration-150 hover:border-[#B0A898] hover:bg-[#F7F5F2] ${className}`}
    >
      {children}
    </button>
  );
}

export function Tabs({
  tabs,
  active,
  onSwitch,
}: {
  tabs: string[];
  active: number;
  onSwitch: (i: number) => void;
}) {
  return (
    <div className="flex gap-[3px] bg-[#F0EDE8] rounded-[9px] p-[3px] mb-4">
      {tabs.map((t, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSwitch(i)}
          className={`flex-1 py-[7px] text-center rounded-[6px] text-[12.5px] border-none cursor-pointer transition-all duration-150 ${
            active === i
              ? "bg-white text-[#1a1a1a] shadow-sm"
              : "bg-transparent text-[#7A766F] hover:text-[#1a1a1a]"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

export function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[13px] h-[13px] stroke-accent fill-none stroke-[2.5] shrink-0"
    >
      <polyline points="20,6 9,17 4,12" />
    </svg>
  );
}
