/**
 * Genera e scarica un CSV compatibile con Excel IT (BOM UTF-8, delimitatore ';').
 * Stesso pattern già usato in altre pagine dell'app (presenze, dashboard turni).
 */
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent =
    'data:text/csv;charset=utf-8,﻿' +
    [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
