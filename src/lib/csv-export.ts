/**
 * Convert columns and rows to CSV format.
 * Handles escaping of commas, quotes, and newlines.
 */
export function toCSV(columns: string[], rows: Record<string, any>[]): string {
  const escape = (val: any): string => {
    const str = val == null ? '' : String(val);
    // Escape quotes and wrap if contains comma, quote, or newline
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = columns.map(escape).join(',');
  const body = rows.map((row) =>
    columns.map((col) => escape(row[col])).join(',')
  ).join('\n');

  // Add BOM for Excel UTF-8 compatibility
  return '﻿' + header + '\n' + body;
}

/**
 * Create a NextResponse with CSV content for download.
 */
export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
