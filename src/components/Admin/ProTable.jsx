import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Download } from 'lucide-react';
import Papa from 'papaparse';

const defaultCompare = (left, right) => {
  const a = left ?? '';
  const b = right ?? '';
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
};

const ProTable = ({
  data = [],
  columns = [],
  loading = false,
  rowKey = 'id',
  pageSize = 10,
  emptyText = 'No data available',
  onRowClick,
  exportName = 'admin-table-export'
}) => {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: '', direction: 'asc' });

  const sortedRows = useMemo(() => {
    if (!sort.key) {
      return data;
    }
    const column = columns.find((col) => col.key === sort.key);
    const compare = column?.compare || defaultCompare;
    const copied = [...data];
    copied.sort((a, b) => {
      const result = compare(a[sort.key], b[sort.key], a, b);
      return sort.direction === 'asc' ? result : -result;
    });
    return copied;
  }, [columns, data, sort.direction, sort.key]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const changeSort = (key) => {
    setPage(1);
    setSort((previous) => {
      if (previous.key !== key) {
        return { key, direction: 'asc' };
      }
      return { key, direction: previous.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  const exportCsv = () => {
    const csvRows = sortedRows.map((row) => {
      const item = {};
      columns.forEach((column) => {
        item[column.label] = row[column.key];
      });
      return item;
    });
    const csv = Papa.unparse(csvRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${exportName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="admin-pro-table admin-glass">
      <div className="admin-table-toolbar">
        <p>{sortedRows.length} records</p>
        <button type="button" className="admin-btn admin-btn-muted" onClick={exportCsv}>
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) =>
              <th key={column.key} style={{ textAlign: column.align || 'left' }}>
                  {column.sortable === false ?
                <span>{column.label}</span> :

                <button type="button" className="admin-sort-btn" onClick={() => changeSort(column.key)}>
                      {column.label}
                      {sort.key === column.key ?
                  sort.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} /> :

                  <ArrowDown size={14} className="admin-sort-hint" />
                  }
                    </button>
                }
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {loading &&
            [...Array(Math.min(5, pageSize))].map((_, index) =>
            <tr key={`skeleton-${index}`}>
                  {columns.map((column) =>
              <td key={`${column.key}-${index}`}>
                      <span className="admin-skeleton" />
                    </td>
              )}
                </tr>
            )
            }

            {!loading && pageRows.length === 0 &&
            <tr>
                <td colSpan={columns.length} className="admin-empty-row">
                  {emptyText}
                </td>
              </tr>
            }

            {!loading &&
            pageRows.map((row) =>
            <tr
              key={row[rowKey]}
              className={onRowClick ? 'admin-row-clickable' : ''}
              onClick={() => onRowClick?.(row)}>
              
                  {columns.map((column) =>
              <td key={`${row[rowKey]}-${column.key}`} style={{ textAlign: column.align || 'left' }}>
                      {column.render ? column.render(row[column.key], row) : row[column.key] ?? '-'}
                    </td>
              )}
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 &&
      <div className="admin-pagination">
          <button type="button" disabled={currentPage === 1} onClick={() => setPage((prev) => prev - 1)}>
            Previous
          </button>
          <span>
            Page {currentPage} / {totalPages}
          </span>
          <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => setPage((prev) => prev + 1)}>
          
            Next
          </button>
        </div>
      }
    </section>);

};

export default ProTable;
