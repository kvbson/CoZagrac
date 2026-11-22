import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type SortDir = 'asc' | 'desc';

export type SortState = { id: string; dir: SortDir } | null;

export type GameColumn<T> = {
  id: string;
  label: string;
  /** header becomes a clickable asc/desc toggle when sortValue is given */
  sortValue?: (row: T) => number | string;
  render: (row: T) => ReactNode;
};

type Props<T> = {
  columns: GameColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => number | string;
  initialSort?: SortState;
  emptyLabel?: string;
};

function compareValues(a: number | string, b: number | string): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

/**
 * Windows Explorer-style "details" view: a column grid with clickable
 * sortable headers (asc/desc). Pure UI state - sorting never touches the
 * server, it only reorders the rows the caller already loaded.
 */
export function GameTable<T>({
  columns,
  rows,
  getRowKey,
  initialSort = null,
  emptyLabel = 'Nothing here yet.',
}: Props<T>) {
  const [sort, setSort] = useState<SortState>(initialSort);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;

    const sortValue = columns.find((column) => column.id === sort.id)?.sortValue;
    if (!sortValue) return rows;

    const sorted = [...rows].sort((a, b) => compareValues(sortValue(a), sortValue(b)));
    return sort.dir === 'desc' ? sorted.reverse() : sorted;
  }, [columns, rows, sort]);

  const toggleSort = (id: string) => {
    setSort((current) =>
      current?.id === id ? { id, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { id, dir: 'asc' },
    );
  };

  return (
    <div className="gametable-wrap">
      <table className="gametable">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.id} scope="col">
                {column.sortValue ? (
                  <button
                    type="button"
                    className="gametable__sort-btn"
                    onClick={() => toggleSort(column.id)}
                  >
                    {column.label}
                    <span className="gametable__sort-mark" aria-hidden="true">
                      {sort?.id === column.id ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </button>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="muted">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            sortedRows.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((column) => (
                  <td key={column.id}>{column.render(row)}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
