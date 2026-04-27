"use client";

import { usePathname, useRouter } from "next/navigation";
import { Mic, MessageSquare, Archive, Briefcase } from "lucide-react";

interface Tab {
  path: string;
  label: string;
  icon: React.ReactNode;
  requiresAuth?: boolean;
}

const TABS: Tab[] = [
  { path: "/mobile", label: "Voce", icon: <Mic size={20} strokeWidth={1.8} /> },
  { path: "/mobile/chat", label: "Chat", icon: <MessageSquare size={20} strokeWidth={1.8} /> },
  { path: "/mobile/archivio", label: "Archivio", icon: <Archive size={20} strokeWidth={1.8} />, requiresAuth: true },
  { path: "/mobile/leads", label: "Lead", icon: <Briefcase size={20} strokeWidth={1.8} />, requiresAuth: true },
];

interface MobileTabBarProps {
  isAvvocato?: boolean;
}

export function MobileTabBar({ isAvvocato: _isAvvocato = false }: MobileTabBarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Always show all 4 tabs — the leads page handles role gating internally
  const visibleTabs = TABS;

  return (
    <nav style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      height: 72,
      background: "var(--paper)",
      borderTop: "1px solid var(--paper-line)",
      display: "flex",
      alignItems: "stretch",
      zIndex: 400,
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      {visibleTabs.map((tab) => {
        const isActive = pathname === tab.path || (tab.path !== "/mobile" && pathname.startsWith(tab.path));
        return (
          <button
            key={tab.path}
            onClick={() => router.push(tab.path)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: isActive ? "var(--vermiglio)" : "var(--ink-3)",
              transition: "color 0.15s ease",
              WebkitTapHighlightColor: "transparent",
              padding: "8px 4px",
            }}
          >
            <span style={{ transition: "transform 0.15s ease", transform: isActive ? "scale(1.08)" : "scale(1)" }}>
              {tab.icon}
            </span>
            <span style={{
              fontFamily: "var(--mono)",
              fontSize: 9,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: isActive ? 500 : 400,
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
