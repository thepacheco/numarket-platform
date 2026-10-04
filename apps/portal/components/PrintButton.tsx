"use client";

import Icon from "./Icon";

export default function PrintButton() {
  return (
    <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
      <Icon name="download" /> Save as PDF
    </button>
  );
}
