renderBootstrapStatus("JavaScript gestartet", "App-Module werden geladen.");

void import("./styles/index.css").catch((error) => {
  console.error("BlobFin styles failed to load.", error);
});

void import("./app/bootstrap")
  .then(({ bootstrapApp }) => bootstrapApp("#app"))
  .catch((error) => {
    const root = document.querySelector<HTMLDivElement>("#app");
    console.error("BlobFin bootstrap failed.", error);
    if (!root) return;
    root.innerHTML = `
      <main style="min-height:100vh;padding:32px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f7f4ed;color:#172033">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;color:#56616f">BlobFin konnte nicht gestartet werden</p>
        <h1 style="margin:0 0 12px;font-size:28px;line-height:1.15">Bootstrap-Fehler</h1>
        <pre style="max-width:960px;white-space:pre-wrap;border:1px solid #d8d2c4;background:#fffaf0;padding:16px;border-radius:8px;color:#7c2d12">${escapeHtml(
          error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ""}` : String(error)
        )}</pre>
      </main>
    `;
  });

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderBootstrapStatus(title: string, detail: string): void {
  const root = document.querySelector<HTMLDivElement>("#app");
  if (!root) return;
  root.innerHTML = `
    <main style="min-height:100vh;padding:32px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f7f4ed;color:#172033">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;color:#56616f">BlobFin</p>
      <h1 style="margin:0 0 12px;font-size:28px;line-height:1.15">${escapeHtml(title)}</h1>
      <p style="margin:0;max-width:640px;color:#56616f">${escapeHtml(detail)}</p>
    </main>
  `;
}
