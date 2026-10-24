"use client";

import { useEffect, useRef } from "react";

/* One tooltip for the whole page. Anything with data-tip="…" (and an
   optional data-tip-title) shows a short explanation on hover or keyboard
   focus, placed beside it so it never hides under a scrolling menu. */
export default function Tooltips() {
  const tip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = tip.current;
    if (!el) return;
    let current: HTMLElement | null = null;
    let timer = 0;
    const hide = () => {
      window.clearTimeout(timer);
      current = null;
      el.classList.remove("on");
    };
    const show = (target: HTMLElement) => {
      const text = target.dataset.tip;
      if (!text) return;
      current = target;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (current !== target) return;
        el.replaceChildren();
        if (target.dataset.tipTitle) {
          const b = document.createElement("b");
          b.textContent = target.dataset.tipTitle;
          el.append(b);
        }
        el.append(document.createTextNode(text));
        const r = target.getBoundingClientRect();
        const side = target.dataset.tipSide === "right" || (target.closest(".rail") && !target.closest(".mobile-nav"));
        el.style.left = "0px";
        el.style.top = "0px";
        el.classList.add("on");
        const w = el.offsetWidth, h = el.offsetHeight;
        let x = side ? r.right + 10 : r.left + r.width / 2 - w / 2;
        let y = side ? r.top + r.height / 2 - h / 2 : r.top - h - 8;
        if (!side && y < 8) y = r.bottom + 8;
        x = Math.max(8, Math.min(x, window.innerWidth - w - 8));
        y = Math.max(8, Math.min(y, window.innerHeight - h - 8));
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
      }, 350);
    };
    const over = (e: Event) => {
      const t = (e.target as HTMLElement | null)?.closest?.("[data-tip]") as HTMLElement | null;
      if (t && t !== current) show(t);
      else if (!t && current) hide();
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && hide();
    document.addEventListener("mouseover", over);
    document.addEventListener("focusin", over);
    document.addEventListener("focusout", hide);
    document.addEventListener("scroll", hide, true);
    document.addEventListener("keydown", key);
    document.addEventListener("click", hide);
    return () => {
      document.removeEventListener("mouseover", over);
      document.removeEventListener("focusin", over);
      document.removeEventListener("focusout", hide);
      document.removeEventListener("scroll", hide, true);
      document.removeEventListener("keydown", key);
      document.removeEventListener("click", hide);
    };
  }, []);
  return <div ref={tip} className="nm-tip" role="tooltip" aria-hidden="true" />;
}
