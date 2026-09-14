import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import Spinner from './Spinner';

/**
 * DataTable — feature-rich table component.
 *
 * Props:
 *  columns     Array<{ key, label, render?, sortable?, width? }>
 *  data        Array<object>
 *  loading     bool
 *  selectable  bool        — shows checkbox column
 *  selected    Set<string> — controlled selected IDs
 *  onSelect    (id) => void
 *  onSelectAll () => void
 *  getRowId    (row) => string (default: row.id)
 *  pagination  { page, pageSize, total, onPageChange }?
 *  onSort      (key, dir) => void?
 *  onRowClick  (row) => void?
 *  emptyText   string
 */
function SortIcon({ dir }) {
  if (dir === 'asc')  return <ChevronUp size={13} className="text-indigo-500" />;
  if (dir === 'desc') return <ChevronDown size={13} className="text-indigo-500" />;
  return <ChevronsUpDown size={13} className="text-slate-400" />;
}

// Skeleton row
function SkeletonRow({ colCount }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: colCount }).map((_, i) => (
        <td key={i} className="px-4 py-3 border-b border-slate-100">
          <div className="h-4 rounded bg-slate-200 animate-shimmer" style={{ width: `${60 + (i * 17) % 30}%` }} />
        </td>
      ))}
    </tr>
  );
}

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  selectable = false,
  selected = new Set(),
  onSelect,
  onSelectAll,
  getRowId = (row) => row.id,
  pagination,
  onSort,
  onRowClick,
  emptyText = 'No records found.',
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (key) => {
    if (!onSort) return;
    const newDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortDir(newDir);
    onSort(key, newDir);
  };

  const allSelected = data.length > 0 && data.every((row) => selected.has(String(getRowId(row))));
  const someSelected = data.some((row) => selected.has(String(getRowId(row))));

  const colCount = columns.length + (selectable ? 1 : 0);
  const showPagination = pagination && pagination.total > pagination.pageSize;
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full admin-table">
          {/* Header */}
          <thead>
            <tr>
              {selectable && (
                <th className="w-10 pl-4 pr-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={onSelectAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={col.sortable ? 'cursor-pointer select-none hover:bg-slate-100 transition-colors' : ''}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <SortIcon dir={sortKey === col.key ? sortDir : null} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} colCount={colCount} />
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={colCount}>
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Inbox size={40} className="mb-3 opacity-50" />
                    <p className="text-sm">{emptyText}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row) => {
                const rowId = String(getRowId(row));
                const isSelected = selected.has(rowId);
                return (
                  <tr
                    key={rowId}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={[
                      onRowClick ? 'cursor-pointer' : '',
                      isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50',
                      'transition-colors',
                    ].join(' ')}
                  >
                    {selectable && (
                      <td className="w-10 pl-4 pr-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelect(rowId)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key}>
                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
          <p className="text-xs text-slate-500">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total.toLocaleString()} results
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const pg = i + 1;
              return (
                <button
                  key={pg}
                  onClick={() => pagination.onPageChange(pg)}
                  className={[
                    'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                    pg === pagination.page
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-200',
                  ].join(' ')}
                >
                  {pg}
                </button>
              );
            })}
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
