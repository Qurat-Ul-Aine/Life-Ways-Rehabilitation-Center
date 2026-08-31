/** Shared print/PDF export styling — therapy, patient, and staff reports. */

export const REPORT_EXPORT_STYLES = `
  body { font-family: ui-sans-serif, system-ui, sans-serif; padding: 32px; color: #0f172a; }
  h1 { margin: 0 0 4px; color: #0f766e; font-size: 24px; }
  h2 { margin-top: 24px; border-bottom: 2px solid #0f766e; padding-bottom: 4px; color: #1e3a5f; font-size: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
  td, th { padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left; vertical-align: top; }
  th { background: #f0fdfa; color: #0f766e; font-weight: 600; }
  p.empty { color: #64748b; font-size: 13px; margin-top: 8px; }
  ul { margin: 8px 0 0; padding-left: 20px; font-size: 13px; }
  li { margin-bottom: 4px; }
  .meta { color: #475569; margin-bottom: 0; font-size: 13px; }
  .summary { display: flex; gap: 12px; flex-wrap: wrap; margin: 16px 0; }
  .summary span { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 6px; padding: 8px 14px; font-size: 13px; color: #0f172a; }
  .header-bar { border-left: 4px solid #0f766e; padding-left: 12px; margin-bottom: 8px; }
  @media print { body { padding: 16px; } }
`;

export function escapeHtml(value: unknown): string {
  const s = value === undefined || value === null ? "" : String(value);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function tableRows(rows: string[][]): string {
  return rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("");
}

export function reportHeader(title: string, meta: string): string {
  return `<div class="header-bar">
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">${meta}</div>
  </div>`;
}

export function summaryBadges(items: Array<{ label: string; value: string }>): string {
  if (items.length === 0) return "";
  return `<div class="summary">${items
    .map((item) => `<span><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.value)}</span>`)
    .join("")}</div>`;
}

export function emptyBlock(message: string): string {
  return `<p class="empty">${escapeHtml(message)}</p>`;
}

export function openPrintReport(title: string, bodyHtml: string): void {
  const win = window.open("", "_blank", "width=900,height=1100");
  if (!win) return;

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
  <title>${escapeHtml(title)}</title>
  <style>${REPORT_EXPORT_STYLES}</style>
  </head><body>${bodyHtml}
  <script>window.onload = () => setTimeout(() => window.print(), 250);</script>
  </body></html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}
