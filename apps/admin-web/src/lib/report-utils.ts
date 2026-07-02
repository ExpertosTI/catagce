function escapeHtml(value: string) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeCsv(value: string | number) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const lines = [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))];
  const csv = `\uFEFF${lines.join('\r\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function printReportTable(opts: {
  title: string;
  companyName?: string;
  subtitle?: string;
  meta?: { label: string; value: string }[];
  columns: string[];
  rows: (string | number)[][];
  totalsRow?: (string | number)[];
}) {
  const safeTitle = escapeHtml(opts.title);
  const safeCompany = escapeHtml(opts.companyName ?? 'General Home');

  const thead = opts.columns.map((c, i) => `<th${i > 0 ? ' class="right"' : ''}>${escapeHtml(c)}</th>`).join('');
  const tbody = opts.rows.map((r) => `<tr>${r.map((cell, i) => `<td${i > 0 ? ' class="right"' : ''}>${escapeHtml(String(cell))}</td>`).join('')}</tr>`).join('');
  const tfoot = opts.totalsRow
    ? `<tfoot><tr>${opts.totalsRow.map((cell, i) => `<td${i > 0 ? ' class="right"' : ''}>${escapeHtml(String(cell))}</td>`).join('')}</tr></tfoot>`
    : '';
  const metaHtml = (opts.meta ?? []).map((m) => `<div class="meta-block"><p>${escapeHtml(m.label)}</p><p>${escapeHtml(m.value)}</p></div>`).join('');

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/><title>${safeTitle}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #0f172a; padding: 0; margin: 0; background: #f1f5f9; }
  .sheet { max-width: 920px; margin: 0 auto; background: #fff; }
  .header { background: linear-gradient(135deg, #1d4ed8, #1e3a8a); color: #fff; padding: 32px 40px; }
  .header h1 { margin: 0; font-size: 20px; font-weight: 800; }
  .header p { margin: 4px 0 0; font-size: 12px; opacity: 0.85; }
  .meta-bar { display: flex; flex-wrap: wrap; gap: 16px; padding: 18px 40px; border-bottom: 1px solid #e2e8f0; }
  .meta-block p:first-child { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px; }
  .meta-block p:last-child { font-size: 14px; font-weight: 700; margin: 0; color: #0f172a; }
  .body { padding: 24px 40px 40px; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  thead th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; padding: 0 8px 10px; border-bottom: 2px solid #e2e8f0; }
  th.right, td.right { text-align: right; }
  td { padding: 9px 8px; border-bottom: 1px solid #f1f5f9; }
  tfoot td { font-weight: 800; border-top: 2px solid #1e3a8a; padding-top: 12px; color: #1e3a8a; }
  .footer { margin-top: 32px; padding: 16px 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  @media print { body { background: #fff; } .sheet { max-width: 100%; } }
</style></head><body>
  <div class="sheet">
    <div class="header">
      <h1>${safeCompany}</h1>
      <p>${safeTitle}${opts.subtitle ? ` · ${escapeHtml(opts.subtitle)}` : ''}</p>
    </div>
    ${metaHtml ? `<div class="meta-bar">${metaHtml}</div>` : ''}
    <div class="body">
      <table>
        <thead><tr>${thead}</tr></thead>
        <tbody>${tbody}</tbody>
        ${tfoot}
      </table>
    </div>
    <div class="footer">Santo Domingo, RD · Documento generado por GHome · Desarrollado por renace.tech · ${new Date().toLocaleDateString('es-DO')}</div>
  </div>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    URL.revokeObjectURL(url);
    alert('Permita ventanas emergentes para imprimir o guardar como PDF.');
    return;
  }
  win.addEventListener('load', () => { win.focus(); win.print(); });
  setTimeout(() => {
    try { win.focus(); win.print(); } catch { /* noop */ }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }, 800);
}
