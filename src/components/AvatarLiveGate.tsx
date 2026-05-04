"use client";

// AvatarLiveGate — wraps AvatarLive (WebRTC streaming avatar) behind auth.
// Logged-in users see the live videocall; anonymous visitors see a CTA
// that triggers the parent's signup/login modal.
//
// Drop-in for the desktop landing/dashboard. Mobile should NOT use this
// (WebRTC unreliable on 4G; mobile uses voice agent instead).
//
// Usage:
//   <AvatarLiveGate
//     avatar="sofia"
//     onRequireAuth={() => openSignupModal()}
//   />

import { useEffect, useState, useRef, forwardRef } from "react";
import { createClient } from "@/lib/supabase-browser";
import { AvatarLive, type AvatarLiveHandle, type AvatarKey } from "./AvatarLive";

export const AvatarLiveGate = forwardRef<
  AvatarLiveHandle,
  {
    avatar?: AvatarKey;
    onAvatarChange?: (a: AvatarKey) => void;
    showSelector?: boolean;
    /** Called when an anonymous user clicks "Inizia videochiamata". */
    onRequireAuth?: () => void;
    /** Custom CTA label for anon users. Default: "Inizia videochiamata live" */
    ctaLabel?: string;
  }
>(function AvatarLiveGate(
  { avatar = "sofia", onAvatarChange, showSelector = true, onRequireAuth, ctaLabel },
  ref,
) {
  const [authState, setAuthState] = useState<"loading" | "anon" | "authed">("loading");
  const [activated, setActivated] = useState(false); // user clicked Start
  const localRef = useRef<AvatarLiveHandle>(null);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setAuthState(data.user ? "authed" : "anon");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      if (!mounted) return;
      setAuthState(sess?.user ? "authed" : "anon");
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // expose ref to parent (forward to inner AvatarLive)
  useEffect(() => {
    if (!ref) return;
    if (typeof ref === "function") ref(localRef.current);
    else (ref as React.MutableRefObject<AvatarLiveHandle | null>).current = localRef.current;
  }, [ref, activated]);

  if (authState === "loading") {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          aspectRatio: "9 / 16",
          borderRadius: 12,
          background: "var(--paper-tint, #FBF8F1)",
        }}
      />
    );
  }

  if (authState === "anon" || !activated) {
    const handleClick = () => {
      if (authState === "authed") setActivated(true);
      else onRequireAuth?.();
    };
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          alignItems: "center",
          width: "100%",
          maxWidth: 360,
        }}
      >
        <div
          style={{
            width: "100%",
            aspectRatio: "9 / 16",
            borderRadius: 12,
            background: "var(--paper-tint, #FBF8F1)",
            border: "1px dashed var(--paper-line, #E8E0D2)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.13em",
              textTransform: "uppercase",
              color: "var(--ink-3, #4A433A)",
            }}
          >
            Videochiamata live
          </div>
          <div style={{ fontSize: 14, color: "var(--ink-2, #2A2621)", lineHeight: 1.5 }}>
            {authState === "authed"
              ? "Sofia è pronta. Avvia la videochiamata per parlare in tempo reale."
              : "Solo per utenti registrati. Accedi per parlare con Sofia in videochiamata."}
          </div>
          <button
            type="button"
            onClick={handleClick}
            style={{
              padding: "10px 20px",
              borderRadius: 999,
              border: "none",
              background: "var(--vermiglio, #C93924)",
              color: "white",
              fontFamily: "var(--mono)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.13em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            {ctaLabel ?? (authState === "authed" ? "Avvia videochiamata" : "Accedi per la live")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <AvatarLive
      ref={localRef}
      avatar={avatar}
      onAvatarChange={onAvatarChange}
      showSelector={showSelector}
      autoStart={true}
    />
  );
});
