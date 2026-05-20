/**
 * Handoff design system — Icon SVG component (SER-209).
 * Ported 1:1 from norma-ai-test-template/project/components/Chrome.jsx.
 * All paths use currentColor stroke; size prop drives both width and height.
 */

import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "chat" | "archive" | "pdf" | "clock" | "users" | "plug" | "pen"
  | "star" | "building" | "scale" | "wallet" | "check" | "plus"
  | "search" | "send" | "paperclip" | "arrow" | "arrowDown" | "arrowUp"
  | "download" | "settings" | "book" | "alert" | "mail" | "drive"
  | "cloud" | "folder" | "bolt" | "lock" | "shield" | "euro"
  | "briefcase" | "graph" | "flame" | "grad" | "close" | "filter"
  | "pin" | "org" | "doc" | "spark";

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
}

const PATHS: Record<IconName, ReactNode> = {
  chat: <path d="M4 6h16v10H8l-4 4V6z" />,
  archive: (
    <>
      <rect x="3" y="5" width="18" height="4" />
      <path d="M5 9v10h14V9" />
      <path d="M10 13h4" />
    </>
  ),
  pdf: (
    <>
      <path d="M14 3H6v18h12V7l-4-4z" />
      <path d="M14 3v4h4" />
      <path d="M9 13h2v4H9zM13 13h2v2h-2zM17 13h-2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2" />
      <path d="M21 19c0-2.2-1.8-4-4-4" />
    </>
  ),
  plug: <path d="M9 2v6M15 2v6M8 8h8v4a4 4 0 0 1-4 4 4 4 0 0 1-4-4V8zM12 16v6" />,
  pen: (
    <>
      <path d="M4 20h4L20 8l-4-4L4 16v4z" />
      <path d="M14 6l4 4" />
    </>
  ),
  star: <path d="M12 3l2.5 6 6.5.5-5 4.5 1.5 6.5L12 17l-5.5 3.5L8 14l-5-4.5 6.5-.5z" />,
  building: (
    <>
      <rect x="4" y="3" width="16" height="18" />
      <path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2" />
    </>
  ),
  scale: (
    <path d="M12 3v18M5 21h14M7 7h10M6 7l-3 8a4 4 0 0 0 8 0l-3-8M18 7l-3 8a4 4 0 0 0 8 0l-3-8" />
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M3 10h18M17 15h1" />
    </>
  ),
  check: <path d="M4 12l5 5L20 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.5-4.5" />
    </>
  ),
  send: <path d="M3 12l18-8-8 18-2-8-8-2z" />,
  paperclip: (
    <path d="M21 11l-9 9a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8" />
  ),
  arrow: <path d="M5 12h14M13 5l7 7-7 7" />,
  arrowDown: <path d="M12 5v14M5 13l7 7 7-7" />,
  arrowUp: <path d="M12 19V5M5 11l7-7 7 7" />,
  download: <path d="M12 3v14M5 12l7 7 7-7M4 21h16" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
  book: (
    <>
      <path d="M4 4h7a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H4z" />
      <path d="M20 4h-7a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h8z" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3l10 18H2z" />
      <path d="M12 10v5M12 18v.5" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  drive: (
    <>
      <path d="M8 3h8l6 10-4 7H6L2 13z" />
      <path d="M8 3L2 13M16 3l6 10M6 20l4-7M14 13h8M10 13L6 20" />
    </>
  ),
  cloud: <path d="M7 18a5 5 0 1 1 .3-10A6 6 0 0 1 19 10a4 4 0 0 1-1 8H7z" />,
  folder: <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" />,
  bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="1" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  shield: <path d="M12 3l8 3v6c0 5-4 9-8 10-4-1-8-5-8-10V6l8-3z" />,
  euro: <path d="M18 5a7 7 0 1 0 0 14M3 9h12M3 14h12" />,
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="1" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" />
    </>
  ),
  graph: <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />,
  flame: <path d="M12 22a7 7 0 0 1-7-7c0-4 4-6 4-10 2 2 3 3 4 6 1-3 4-3 5-1 1 1.5 1 3 1 5a7 7 0 0 1-7 7z" />,
  grad: (
    <>
      <path d="M12 3L2 8l10 5 10-5-10-5z" />
      <path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  filter: <path d="M3 5h18l-7 9v5l-4 2v-7z" />,
  pin: <path d="M12 2l3 7h6l-5 4 2 7-6-4-6 4 2-7-5-4h6z" />,
  org: (
    <>
      <rect x="9" y="3" width="6" height="4" />
      <rect x="3" y="17" width="6" height="4" />
      <rect x="15" y="17" width="6" height="4" />
      <path d="M12 7v4M6 17v-2h12v2" />
    </>
  ),
  doc: (
    <>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M15 3v4h4M9 12h6M9 16h6M9 8h2" />
    </>
  ),
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />,
};

export function Icon({ name, size = 16, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
