import { fmt as fmtBase, fmtChange as fmtChangeBase } from "@numarket/blocks";

/* The PDFs use the built-in Helvetica, which only has the Windows-1252
   characters. Swap the few symbols the web formats use for ones it has. */
export const pdfText = (s: string) => s.replace(/−/g, "-").replace(/▲\s?/g, "+").replace(/▼\s?/g, "-").replace(/[  ]/g, " ");

export const fmt = (...a: Parameters<typeof fmtBase>) => pdfText(fmtBase(...a));
export const fmtChange = (...a: Parameters<typeof fmtChangeBase>) => {
  const v = fmtChangeBase(...a);
  return v === null ? null : pdfText(v);
};
