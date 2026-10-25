"use client";

import { useRef, useState, useTransition } from "react";
import Icon from "./Icon";
import type { ActionResult } from "./ActionForm";

/* Sending a chart to someone: who can receive it (already checked for what
   they may see), the view on screen, and whether the rows can go along. */
export type SendCfg = {
  slug: string;
  block: string;
  view: string;
  viewLabel: string;
  people: { id: string; label: string }[];
  rows: boolean;
  action: (p: ActionResult | null, f: FormData) => Promise<ActionResult>;
};

/* The page's own font, as CSS with the font files inlined, so a picture
   uses it too. Built once per page from the @font-face rules already loaded. */
let fontCSS: Promise<string> | null = null;
function pageFontCSS() {
  fontCSS ??= (async () => {
    const family = getComputedStyle(document.body).fontFamily.split(",")[0].replace(/["']/g, "").trim();
    const rules: CSSFontFaceRule[] = [];
    for (const sheet of [...document.styleSheets]) {
      try {
        for (const r of [...sheet.cssRules]) if (r instanceof CSSFontFaceRule && r.style.getPropertyValue("font-family").replace(/["']/g, "").trim() === family) rules.push(r);
      } catch {}
    }
    const out: string[] = [];
    for (const r of rules) {
      let css = r.cssText;
      for (const m of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
        const url = new URL(m[1], r.parentStyleSheet?.href ?? location.href);
        if (url.origin !== location.origin) continue;
        const blob = await (await fetch(url)).blob();
        const data = await new Promise<string>((ok) => {
          const fr = new FileReader();
          fr.onload = () => ok(String(fr.result));
          fr.readAsDataURL(blob);
        });
        css = css.replace(m[0], `url(${data})`);
      }
      out.push(css);
    }
    return out.join("\n");
  })().catch(() => "");
  return fontCSS;
}

/* Copy a chart (or key number) as a picture, to paste into an email, a deck,
   or a chat; or save it as a PNG. The picture is the card as it looks now,
   with its title, at twice screen resolution. */
export default function ChartTools({ title, send }: { title: string; send?: SendCfg }) {
  const ref = useRef<HTMLDivElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [res, setRes] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const card = () => ref.current?.closest(".pin-wrap")?.querySelector<HTMLElement>(".b-card") ?? null;

  const render = async (): Promise<Blob> => {
    const el = card();
    if (!el) throw new Error("no card");
    const { toBlob } = await import("html-to-image");
    el.classList.add("nm-capture");
    try {
      const blob = await toBlob(el, {
        pixelRatio: 2,
        backgroundColor: getComputedStyle(el).backgroundColor || "#ffffff",
        /* the definition pop-ups and these buttons stay out of the picture */
        filter: (n) => !(n instanceof HTMLElement && (n.classList.contains("def-pop") || n.classList.contains("def-btn"))),
        /* the page's own font is embedded, so the picture matches the screen */
        fontEmbedCSS: await pageFontCSS(),
      });
      if (!blob) throw new Error("empty");
      return blob;
    } finally {
      el.classList.remove("nm-capture");
    }
  };
  const flash = (m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg(null), 2200);
  };
  const download = async (blob?: Blob) => {
    const b = blob ?? (await render());
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "chart"}.png`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const copy = async () => {
    try {
      if (!("ClipboardItem" in window) || !navigator.clipboard?.write) throw new Error("no clipboard");
      /* Safari needs the promise handed over inside the click */
      await navigator.clipboard.write([new ClipboardItem({ "image/png": render() })]);
      flash("Copied. Paste it anywhere.");
    } catch {
      try {
        await download();
        flash("Saved as a picture instead.");
      } catch {
        flash("Couldn't make the picture.");
      }
    }
  };

  /* the picture travels as a data URL; the server checks it again */
  const submit = (f: FormData) =>
    start(async () => {
      if (!send) return;
      f.set("slug", send.slug);
      f.set("block", send.block);
      f.set("view", send.view);
      if (f.get("picture") === "1") {
        try {
          const blob = await render();
          const url = await new Promise<string>((ok) => {
            const r = new FileReader();
            r.onload = () => ok(String(r.result));
            r.readAsDataURL(blob);
          });
          if (url.length < 1_400_000) f.set("png", url);
        } catch {}
      }
      const r = await send.action(null, f);
      setRes(r);
      if (r.ok) window.setTimeout(() => setOpen(false), 2400);
    });

  return (
    <div ref={ref} className="chart-tools">
      {send && (
        <button type="button" className={`pin-btn ${open ? "on" : ""}`} onClick={() => (setOpen(!open), setRes(null))} aria-expanded={open} data-tip="Send this to someone on your team, with the picture and the rows">
          <Icon name="send" />
          <span className="sr-only">Send {title}</span>
        </button>
      )}
      {send && open && (
        <form action={submit} className="send-pop" aria-label={`Send ${title}`}>
          <b>Send “{title}”</b>
          <span className="small muted">{send.viewLabel || "The full view"}</span>
          {send.people.length ? (
            <>
              <label className="field">
                <span className="label">To</span>
                <select name="to" className="input" required defaultValue="">
                  <option value="" disabled>
                    Someone on your team
                  </option>
                  {send.people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="label">Note (optional)</span>
                <textarea name="note" className="input" rows={2} maxLength={500} placeholder="What should they look at?" />
              </label>
              <label className="check">
                <input type="checkbox" name="picture" value="1" defaultChecked /> A picture of the chart
              </label>
              {send.rows && (
                <label className="check">
                  <input type="checkbox" name="rows" value="1" defaultChecked /> The rows behind it (CSV)
                </label>
              )}
              <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
                {pending ? "Sending…" : "Send"}
              </button>
              {res && (
                <p className={`notice ${res.ok ? "good" : "risk"}`} role="status" style={{ margin: 0 }}>
                  {res.message}
                </p>
              )}
            </>
          ) : (
            <p className="small muted" style={{ margin: 0 }}>
              Nobody else in this workspace can see these numbers yet.
            </p>
          )}
        </form>
      )}
      <button type="button" className="pin-btn" onClick={copy} data-tip="Copy as a picture, to paste into an email or slides">
        <Icon name="copy" />
        <span className="sr-only">Copy {title} as a picture</span>
      </button>
      <button type="button" className="pin-btn" onClick={() => download().catch(() => flash("Couldn't make the picture."))} data-tip="Save as a PNG picture">
        <Icon name="image" />
        <span className="sr-only">Save {title} as a PNG</span>
      </button>
      {msg && (
        <span className="pin-msg" role="status">
          {msg}
        </span>
      )}
    </div>
  );
}
