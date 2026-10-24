import type { SVGProps } from "react";

const paths: Record<string, string> = {
  home: "M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  form: "M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7",
  report: "M5 3h14v18H5zM8 7h8M8 11h8M8 15h5",
  plug: "M9 3v5M15 3v5M6 8h12v4a6 6 0 01-12 0zM12 18v3",
  pulse: "M3 12h4l2-6 4 12 2-6h6",
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  book: "M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 21V5",
  users: "M9 11a4 4 0 100-8 4 4 0 000 8zM2 21v-1a6 6 0 0112 0v1M16 3.5a4 4 0 010 7.5M18 14a6 6 0 014 5.6V21",
  shield: "M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z",
  palette: "M12 3a9 9 0 100 18c1 0 1.5-.8 1.5-1.6 0-1.2-1-1.6-1-2.6 0-.9.7-1.4 1.6-1.4H17a4 4 0 004-4c0-4.6-4-8.4-9-8.4zM7.5 11h.01M10 7.5h.01M15 7.5h.01",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  gauge: "M4 17a8 8 0 1116 0M12 17l4-6",
  key: "M15 7a4 4 0 11-3.9 5H3v3h3v3h3v-3h2.1A4 4 0 0115 7z",
  menu: "M4 7h16M4 12h16M4 17h16",
  refresh: "M20 11a8 8 0 10-2.3 5.7M20 4v7h-7",
  check: "M5 12.5l4.5 4.5L19 7.5",
  lock: "M7 11V8a5 5 0 0110 0v3M5 11h14v10H5z",
  arrow: "M5 12h14M13 6l6 6-6 6",
  download: "M12 3v12M7 10l5 5 5-5M5 21h14",
  building: "M4 21V5l8-2v18M12 7l8 2v12M8 8h.01M8 12h.01M8 16h.01M16 12h.01M16 16h.01M2 21h20",
  clock: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2",
  chat: "M4 5h16v11H9l-5 4z",
  review: "M9 11l2 2 4-4M5 4h14v16H5zM8 17h8",
  gear: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  pdf: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h4",
  upload: "M12 16V4M7 9l5-5 5 5M5 20h14",
  database: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  collapse: "M4 4h16v16H4zM9 4v16M15 10l-2 2 2 2",
  expand: "M4 4h16v16H4zM9 4v16M13 10l2 2-2 2",
  search: "M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-5-5",
  table: "M4 5h16v14H4zM4 10h16M4 14h16M10 5v14",
  send: "M4 12l16-8-6 16-2-7z",
  plus: "M12 5v14M5 12h14",
  up: "M12 19V5M6 11l6-6 6 6",
  down: "M12 5v14M6 13l6 6 6-6",
  trash: "M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13",
  chevron: "M6 9l6 6 6-6",
  x: "M6 6l12 12M18 6L6 18",
  pin: "M12 17v5M9 3h6l-1 6 3 3H7l3-3-1-6z",
  drag: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
  spark: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6",
  scan: "M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M7 12h10",
  dollar: "M12 3v18M16.5 7.5c0-1.9-2-3-4.5-3s-4.5 1.2-4.5 3.2c0 4.6 9 2.6 9 7.1 0 2-2 3.2-4.5 3.2s-4.5-1.1-4.5-3",
};

export default function Icon({ name, ...rest }: { name: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <path d={paths[name] ?? paths.list} />
    </svg>
  );
}
