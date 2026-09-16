'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import Button from './Button';

// -------------------------------------------------------------
// Shadcn Table Primitives
// -------------------------------------------------------------

export function TableContainer({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative w-full overflow-x-auto rounded-xl border border-border bg-card shadow-sm',
        className
      )}
      {...props}
    />
  );
}

const TableRoot = React.forwardRef<
  HTMLTableElement,
  React.TableHTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <table
    ref={ref}
    className={cn('w-full caption-bottom text-sm text-left', className)}
    {...props}
  />
));
TableRoot.displayName = 'TableRoot';

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn('bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold', className)}
    {...props}
  />
));
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('divide-y divide-border/60 [&_tr:last-child]:border-0', className)}
    {...props}
  />
));
TableBody.displayName = 'TableBody';

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn('border-t border-border bg-muted/50 font-medium [&>tr]:last:border-b-0', className)}
    {...props}
  />
));
TableFooter.displayName = 'TableFooter';

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'border-b border-border/40 transition-colors hover:bg-muted/40 data-[state=selected]:bg-muted',
      className
    )}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-11 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap',
      className
    )}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn('p-4 align-middle text-foreground whitespace-nowrap text-sm', className)}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn('mt-4 text-sm text-muted-foreground', className)}
    {...props}
  />
));
TableCaption.displayName = 'TableCaption';

// -------------------------------------------------------------
// High-Level Data Table Component (Backward-compatible with ERP)
// -------------------------------------------------------------

export interface ColumnDef<T> {
  header: string;
  accessor: keyof T | string;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  hideOnMobile?: boolean;
}

interface TableProps<T> {
  data?: T[];
  columns?: ColumnDef<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  totalPages?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  children?: React.ReactNode;
  className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  key: string | null;
  direction: SortDirection;
}

const LoadingSkeleton = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
  <>
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <tr key={rowIdx} className="border-b border-border/40">
        {Array.from({ length: cols }).map((_, colIdx) => (
          <td key={colIdx} className="p-4">
            <div className="h-4 bg-muted animate-pulse rounded" />
          </td>
        ))}
      </tr>
    ))}
  </>
);

function DataTable<T extends Record<string, any>>({
  data,
  columns,
  isLoading = false,
  emptyMessage = 'No data available',
  onRowClick,
  pageSize = 10,
  totalPages = 1,
  currentPage = 1,
  onPageChange,
  children,
  className,
  ...props
}: TableProps<T> & React.TableHTMLAttributes<HTMLTableElement>) {
  // If used as primitive table without columns & data
  if (!columns || !data) {
    return (
      <TableContainer className={className}>
        <TableRoot {...props}>{children}</TableRoot>
      </TableContainer>
    );
  }

  const [sortConfig, setSortConfig] = React.useState<SortConfig>({
    key: null,
    direction: null,
  });

  const handleSort = (accessor: keyof T) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === String(accessor) && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === String(accessor) && sortConfig.direction === 'desc') {
      direction = null;
    }
    setSortConfig({
      key: direction ? String(accessor) : null,
      direction,
    });
  };

  const sortedData = React.useMemo(() => {
    let sorted = [...data];
    if (sortConfig.key && sortConfig.direction) {
      sorted.sort((a, b) => {
        let aValue = a[sortConfig.key as keyof T];
        let bValue = b[sortConfig.key as keyof T];

        if (aValue && typeof aValue === 'object') {
          aValue = aValue.companyName || aValue.name || aValue.couponNo || aValue.title || aValue.code || String(aValue);
        }
        if (bValue && typeof bValue === 'object') {
          bValue = bValue.companyName || bValue.name || bValue.couponNo || bValue.title || bValue.code || String(bValue);
        }

        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }

        const strA = String(aValue);
        const strB = String(bValue);

        // Natural numeric alphanumeric comparison (e.g. 01995, LIFT-001, LIFT-2, LIFT-10)
        const cmp = strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      });
    }
    return sorted;
  }, [data, sortConfig]);

  return (
    <TableContainer className={className}>
      <TableRoot>
        <TableHeader>
          <tr>
            {columns.map((column) => (
              <TableHead
                key={String(column.accessor)}
                className={column.hideOnMobile ? 'hidden md:table-cell' : ''}
              >
                {column.sortable ? (
                  <button
                    onClick={() => handleSort(column.accessor)}
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                  >
                    <span>{column.header}</span>
                    <span className="text-xs text-muted-foreground">
                      {sortConfig.key === String(column.accessor)
                        ? sortConfig.direction === 'asc'
                          ? '↑'
                          : '↓'
                        : '⇅'}
                    </span>
                  </button>
                ) : (
                  column.header
                )}
              </TableHead>
            ))}
          </tr>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <LoadingSkeleton rows={pageSize} cols={columns.length} />
          ) : sortedData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="p-8 text-center text-sm text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row, rowIdx) => (
              <TableRow
                key={rowIdx}
                onClick={() => onRowClick?.(row)}
                className={cn(onRowClick && 'cursor-pointer hover:bg-muted/50')}
              >
                {columns.map((column) => (
                  <TableCell
                    key={String(column.accessor)}
                    className={column.hideOnMobile ? 'hidden md:table-cell' : ''}
                  >
                    {column.render
                      ? column.render(row[column.accessor], row)
                      : row[column.accessor]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </TableRoot>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-border bg-card gap-3">
          <div className="text-xs text-muted-foreground">
            Page <span className="font-medium text-foreground">{currentPage}</span> of{' '}
            <span className="font-medium text-foreground">{totalPages}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </TableContainer>
  );
}

export {
  DataTable as Table,
  TableRoot,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};

export default DataTable;
