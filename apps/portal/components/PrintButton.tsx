"use client";

import Icon from "./Icon";

/* Opens the browser's print dialog, where "Save as PDF" makes the file. The
   page's print styles drop the menus and keep the document. */
export default function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  return (
    <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()}>
      <Icon name="pdf" /> {label}
    </button>
  );
}
