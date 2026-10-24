"use client";

import { useEffect, useRef } from "react";

/* Big numbers count up into place the first time they appear. The server
   sends the final value (for screen readers, PDFs, and no-JS); a one-line
   script in the page head hides it until this takes over, so there's no flash
   of the final number before the count. */
export default function CountUp({ text }: { text: string }) {
  const el = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const m = text.match(/(\d[\d,]*\.?\d*)/);
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!m || reduce) {
      node.classList.add("on");
      return;
    }
    const raw = m[1];
    const target = Number(raw.replace(/,/g, ""));
    const decimals = raw.includes(".") ? raw.split(".")[1].length : 0;
    const comma = raw.includes(",");
    const pre = text.slice(0, m.index), post = text.slice((m.index ?? 0) + raw.length);
    const show = (v: number) => {
      const s = comma ? v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : v.toFixed(decimals);
      node.textContent = pre + s + post;
    };
    show(0);
    node.classList.add("on");
    const start = performance.now();
    const dur = 900;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      show(target * e);
      if (p < 1) raf = requestAnimationFrame(tick);
      else node.textContent = text;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text]);
  return (
    <span ref={el} className="nm-count" aria-label={text}>
      {text}
    </span>
  );
}
