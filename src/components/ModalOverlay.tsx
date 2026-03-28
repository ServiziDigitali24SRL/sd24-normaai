"use client";

interface ModalOverlayProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}

export default function ModalOverlay({
  open,
  onClose,
  children,
  wide,
}: ModalOverlayProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/[0.82] z-[200] flex items-center justify-center p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-[#131313] border border-[#252525] rounded-[18px] w-full relative max-h-[92vh] overflow-y-auto ${
          wide ? "max-w-[560px]" : "max-w-[440px]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="absolute top-[14px] right-[16px] bg-transparent border-none text-[#555] text-[20px] leading-none z-10 hover:text-[#999]"
    >
      &times;
    </button>
  );
}

export function ModalTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-serif text-[24px] mb-[3px]">{children}</div>
  );
}

export function ModalSub({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12.5px] text-[#555] mb-5">{children}</div>
  );
}

export function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] text-[#555] mb-[5px] mt-[14px] uppercase tracking-[0.5px]">
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
      className="w-full py-[9px] px-[13px] bg-[#1c1c1c] border border-[#252525] rounded-[9px] text-cream text-[13.5px] outline-none transition-colors duration-150 focus:border-[#3a3a3a] placeholder:text-[#3a3a3a]"
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
      onClick={onClick}
      className={`w-full py-[11px] rounded-[9px] text-[13.5px] font-medium mt-4 border-none cursor-pointer transition-all duration-150 bg-accent text-white hover:bg-accent-hover ${className}`}
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
      onClick={onClick}
      className={`w-full py-[11px] rounded-[9px] text-[13.5px] font-medium mt-[7px] border border-[#252525] bg-transparent text-cream cursor-pointer transition-all duration-150 hover:border-[#3a3a3a] hover:bg-white/[0.02] ${className}`}
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
    <div className="flex gap-[3px] bg-card rounded-[9px] p-[3px] mb-4">
      {tabs.map((t, i) => (
        <button
          key={i}
          onClick={() => onSwitch(i)}
          className={`flex-1 py-[7px] text-center rounded-[6px] text-[12.5px] border-none cursor-pointer transition-all duration-150 ${
            active === i
              ? "bg-[#222] text-cream"
              : "bg-transparent text-[#666]"
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
