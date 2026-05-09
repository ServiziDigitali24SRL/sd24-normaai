"use client";

// HeroAvatarVideo — pre-rendered Sofia greeting (~12s) with click-to-play.
// Drop-in component for the desktop hero section.
//
// Asset: /public/sofia-greeting.mp4 (static MP4 fallback, 9:16, voce italiana).
// Use case: zero-latency intro for anonymous visitors, before the chat / live avatar.
//
// Usage:
//   <HeroAvatarVideo />
//   <HeroAvatarVideo poster="/sofia-poster.jpg" maxWidth={420} />

import { useRef, useState } from "react";

interface HeroAvatarVideoProps {
  /** MP4 path. Default: /sofia-greeting.mp4 */
  src?: string;
  /** Optional poster image (frame still). */
  poster?: string;
  /** Max width in px. Default 360. */
  maxWidth?: number;
  /** Show controls bar after play. Default true. */
  controls?: boolean;
  /** Loop on end. Default false (one-shot greeting). */
  loop?: boolean;
}

export function HeroAvatarVideo({
  src = "/sofia-greeting.mp4",
  poster,
  maxWidth = 360,
  controls = true,
  loop = false,
}: HeroAvatarVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const handlePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth,
        aspectRatio: "9 / 16",
        borderRadius: 16,
        overflow: "hidden",
        background: "var(--paper-tint, #FBF8F1)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
        cursor: playing ? "default" : "pointer",
      }}
      onClick={playing ? undefined : handlePlay}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        preload="metadata"
        controls={playing && controls}
        loop={loop}
        onEnded={() => loop ? null : setPlaying(false)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />

      {!playing && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: poster ? "rgba(0,0,0,0.18)" : "transparent",
            transition: "background 0.2s",
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePlay();
            }}
            aria-label="Riproduci presentazione di Sofia"
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              border: "none",
              background: "var(--vermiglio, #C93924)",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
              transition: "transform 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
