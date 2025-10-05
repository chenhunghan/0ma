import React, { useState } from 'react';
import type { TableColumn } from '../../types';

interface TableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  error?: string;
  empty?: React.ReactNode;
  striped?: boolean;
  bordered?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  className?: string;
  onRowClick?: (record: T, index: number) => void;
  selection?: {
    selectedRows: T[];
    onSelectAll: (selected: boolean) => void;
    onSelectRow: (record: T, selected: boolean) => void;
  };
  pagination?: {
    currentPage: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}

export function Table<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  error,
  empty = <div className="text-center py-8 text-gray-500 dark:text-gray-400">No data available</div>,
  striped = true,
  bordered = false,
  hoverable = true,
  compact = false,
  className = '',
  onRowClick,
  selection,
  pagination,
}: TableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: TableColumn<T>) => {
    if (!column.sortable) return;

    const columnKey = column.key as string;
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const getSortedData = () => {
    if (!sortColumn) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortColumn as keyof T];
      const bValue = b[sortColumn as keyof T];

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const getPaginatedData = () => {
    if (!pagination) return getSortedData();

    const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return getSortedData().slice(startIndex, endIndex);
  };

  const getSortIcon = (column: TableColumn<T>) => {
    if (!column.sortable) return null;

    const columnKey = column.key as string;
    const isActive = sortColumn === columnKey;

    return (
      <span className={`ml-1 inline-flex flex-col ${isActive ? 'text-primary-600' : 'text-gray-400'}`}>
        <svg
          className={`w-3 h-3 ${sortDirection === 'desc' && isActive ? 'text-primary-600' : 'opacity-50'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        <svg
          className={`w-3 h-3 -mt-1 ${sortDirection === 'asc' && isActive ? 'text-primary-600' : 'opacity-50'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </span>
    );
  };

  const tableClasses = `
    w-full text-sm text-left
    ${bordered ? 'border border-gray-200 dark:border-gray-700' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const headerClasses = `
    ${compact ? 'px-3 py-2' : 'px-4 py-3'}
    ${striped ? 'bg-gray-50 dark:bg-gray-800' : ''}
    text-xs font-medium text-gray-500 uppercase tracking-wider
    ${bordered ? 'border-b border-gray-200 dark:border-gray-700' : ''}
  `.trim().replace(/\s+/g, ' ');

  const cellClasses = `
    ${compact ? 'px-3 py-2' : 'px-4 py-3'}
    ${bordered ? 'border-t border-gray-200 dark:border-gray-700' : 'border-t border-gray-100 dark:border-gray-700'}
  `.trim().replace(/\s+/g, ' ');

  const rowClasses = (index: number) => `
    ${striped && index % 2 === 1 ? 'bg-gray-50 dark:bg-gray-800/50' : ''}
    ${hoverable ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50' : ''}
    ${onRowClick ? 'cursor-pointer' : ''}
    transition-colors
  `.trim().replace(/\s+/g, ' ');

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-error-600 dark:text-error-400">{error}</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded dark:bg-gray-700"></div>
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="text-center py-8">{empty}</div>;
  }

  const sortedData = getPaginatedData();

  return (
    <div>
      <div className="overflow-x-auto">
        <table className={tableClasses}>
          <thead>
            <tr>
              {selection && (
                <th className={headerClasses}>
                  <input
                    type="checkbox"
                    checked={selection.selectedRows.length === data.length}
                    onChange={(e) => selection.onSelectAll(e.target.checked)}
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                </th>
              )}
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={headerClasses}
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(column)}
                      className="flex items-center font-medium hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none focus:text-gray-700 dark:focus:text-gray-300"
                    >
                      {column.title}
                      {getSortIcon(column)}
                    </button>
                  ) : (
                    <span className="flex items-center font-medium">
                      {column.title}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((record, index) => (
              <tr
                key={index}
                className={rowClasses(index)}
                onClick={() => onRowClick?.(record, index)}
              >
                {selection && (
                  <td className={cellClasses}>
                    <input
                      type="checkbox"
                      checked={selection.selectedRows.includes(record)}
                      onChange={(e) => selection.onSelectRow(record, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                  </td>
                )}
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className={cellClasses}>
                    {column.render
                      ? column.render(record[column.key as keyof T], record)
                      : record[column.key as keyof T]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing{' '}
            <span className="font-medium">
              {(pagination.currentPage - 1) * pagination.pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-medium">
              {Math.min(pagination.currentPage * pagination.pageSize, pagination.total)}
            </span>{' '}
            of{' '}
            <span className="font-medium">{pagination.total}</span> results
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => pagination.onChange(pagination.currentPage - 1, pagination.pageSize)}
              disabled={pagination.currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Page {pagination.currentPage}
            </span>
            <button
              onClick={() => pagination.onChange(pagination.currentPage + 1, pagination.pageSize)}
              disabled={pagination.currentPage * pagination.pageSize >= pagination.total}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}