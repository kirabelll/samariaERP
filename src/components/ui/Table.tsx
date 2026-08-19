'use client';

import React, { ReactNode, useState } from 'react';
import Button from './Button';

export interface ColumnDef<T> {
  header: string;
  accessor: keyof T;
  render?: (value: any, row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
  hideOnMobile?: boolean;
}

interface TableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  totalPages?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  key: string | null;
  direction: SortDirection;
}

const LoadingSkeleton = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
  <>
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <tr key={rowIdx} className="border-b border-[#F5F5F7]">
        {Array.from({ length: cols }).map((_, colIdx) => (
          <td key={colIdx} className="px-5 py-4">
            <div className="h-4 bg-[#E8E8ED]/60 rounded animate-pulse"></div>
          </td>
        ))}
      </tr>
    ))}
  </>
);

function Table<T extends Record<string, any>>({
  data,
  columns,
  isLoading = false,
  emptyMessage = 'No data available',
  onRowClick,
  pageSize = 10,
  totalPages = 1,
  currentPage = 1,
  onPageChange,
}: TableProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: null,
  });

  const handleSort = (accessor: keyof T) => {
    let direction: SortDirection = 'asc';

    if (
      sortConfig.key === String(accessor) &&
      sortConfig.direction === 'asc'
    ) {
      direction = 'desc';
    } else if (
      sortConfig.key === String(accessor) &&
      sortConfig.direction === 'desc'
    ) {
      direction = null;
    }

    setSortConfig({
      key: direction ? String(accessor) : null,
      direction,
    });
  };

  const getSortedData = () => {
    let sorted = [...data];

    if (sortConfig.key && sortConfig.direction) {
      sorted.sort((a, b) => {
        let aValue = a[sortConfig.key as keyof T];
        let bValue = b[sortConfig.key as keyof T];

        if (aValue && typeof aValue === 'object') {
          aValue = aValue.companyName || aValue.name || aValue.couponNo || String(aValue);
        }
        if (bValue && typeof bValue === 'object') {
          bValue = bValue.companyName || bValue.name || bValue.couponNo || String(bValue);
        }

        if (aValue == null) return 1;
        if (bValue == null) return -1;

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return sorted;
  };

  const sortedData = getSortedData();

  const getSortIcon = (accessor: keyof T) => {
    if (sortConfig.key !== String(accessor)) {
      return '⇅';
    }
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#E8E8ED]/60 -mx-3 sm:mx-0">
      <table className="w-full text-sm text-left min-w-[480px] sm:min-w-0">
        <thead className="bg-[#FAFAFA] border-b border-[#E8E8ED]">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.accessor)}
                className={`px-5 py-4 font-semibold text-[#86868B] text-[12px] uppercase tracking-wider whitespace-nowrap ${
                  column.hideOnMobile ? 'hidden md:table-cell' : ''
                }`}
              >
                {column.sortable ? (
                  <button
                    onClick={() => handleSort(column.accessor)}
                    className="flex items-center gap-1.5 hover:text-[#007AFF] transition-colors"
                  >
                    {column.header}
                    <span className="text-xs opacity-60">{getSortIcon(column.accessor)}</span>
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <LoadingSkeleton rows={pageSize} cols={columns.length} />
          ) : sortedData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-5 py-8 text-center text-[#86868B]"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-[#F5F5F7] ${
                  onRowClick ? 'cursor-pointer hover:bg-[#F5F5F7]/50 active:bg-[#F5F5F7]' : ''
                } transition-colors`}
              >
                {columns.map((column) => (
                  <td
                    key={String(column.accessor)}
                    className={`px-5 py-4 text-[#1D1D1F] text-[14px] ${
                      column.hideOnMobile ? 'hidden md:table-cell' : ''
                    }`}
                  >
                    {column.render
                      ? column.render(row[column.accessor], row)
                      : row[column.accessor]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-4 bg-white border-t border-[#E8E8ED] gap-3">
          <div className="text-xs text-[#86868B]">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Prev
            </Button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              const isCurrentPage = pageNum === currentPage;

              if (totalPages > 5) {
                if (
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                ) {
                  return (
                    <Button
                      key={pageNum}
                      size="sm"
                      variant={isCurrentPage ? 'primary' : 'outline'}
                      onClick={() => onPageChange?.(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                }
                if (
                  (pageNum === currentPage - 2 && currentPage > 3) ||
                  (pageNum === currentPage + 2 && currentPage < totalPages - 2)
                ) {
                  return (
                    <span key={pageNum} className="px-2 py-2 text-xs">
                      ...
                    </span>
                  );
                }
                return null;
              }

              return (
                <Button
                  key={pageNum}
                  size="sm"
                  variant={isCurrentPage ? 'primary' : 'outline'}
                  onClick={() => onPageChange?.(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}

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
    </div>
  );
}

export default Table;
