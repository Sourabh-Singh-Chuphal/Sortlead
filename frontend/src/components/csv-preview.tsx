'use client';

import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';

interface CSVPreviewProps {
  data: any[];
  headers: string[];
}

export function CSVPreview({ data, headers }: CSVPreviewProps) {
  // Preview first 50 rows for optimal DOM rendering performance
  const previewData = React.useMemo(() => data.slice(0, 50), [data]);

  const columns = React.useMemo(() => {
    return headers.map((header) => ({
      accessorKey: header,
      header: header,
      cell: (info: any) => {
        const value = info.getValue();
        return (
          <span className="font-mono text-xs text-ink-muted whitespace-pre-wrap break-all">
            {value === null || value === undefined ? '' : String(value)}
          </span>
        );
      },
    }));
  }, [headers]);

  const table = useReactTable({
    data: previewData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-dashed border-line rounded-lg">
        <p className="text-sm text-ink-muted">No parsed data to preview.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-paper border border-line rounded-lg overflow-hidden shadow-sm">
      {/* Header Info */}
      <div className="px-4 py-3 bg-paper border-b border-line flex justify-between items-center">
        <div>
          <h3 className="font-display font-medium text-sm text-ink uppercase tracking-wide">
            Raw Spreadsheet Preview
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Showing first {previewData.length} of {data.length} records. Let&apos;s verify mapping before import.
          </p>
        </div>
        <div>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-line text-ink-muted uppercase tracking-wider">
            RAW MONOSPACE DATA
          </span>
        </div>
      </div>

      {/* Responsive Scrolling Container */}
      <div className="flex-1 overflow-auto max-h-[380px] custom-scrollbar border-b border-line">
        <table className="w-full border-collapse text-left">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="sticky top-0 bg-ink text-paper-muted px-4 py-3 font-mono text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap border-b border-line z-10"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-line bg-paper">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-line/20 transition-colors duration-75"
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-2 border-r border-line/30 last:border-r-0 max-w-[220px]"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
