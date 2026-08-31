/** Download a blob response from an intern report export. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function reportFilename(type: string, format: string, internId?: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  const suffix = internId ? `-${internId.slice(0, 8)}` : "";
  const ext = format === "csv" || format === "excel" ? "csv" : format === "pdf" ? "pdf" : "json";
  return `${type}${suffix}-${stamp}.${ext}`;
}
