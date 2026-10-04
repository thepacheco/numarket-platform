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
};

export default function Icon({ name, ...rest }: { name: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <path d={paths[name] ?? paths.list} />
    </svg>
  );
}
