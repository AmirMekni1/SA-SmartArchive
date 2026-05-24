import React from 'react';
import { Filter, RotateCcw, Search } from 'lucide-react';

const FilterPanel = ({
  query,
  onQueryChange,
  filters = [],
  values = {},
  onValueChange,
  onReset,
  rightActions,
  loading = false,
  placeholder = 'Search by keyword, ID, or email...'
}) => {
  return (
    <section className="admin-filter-panel admin-glass">
      <div className="admin-filter-row">
        <label className="admin-filter-control admin-filter-search">
          <Search size={18} />
          <input
            type="text"
            value={query}
            onChange={(event) => onQueryChange?.(event.target.value)}
            placeholder={placeholder}
            disabled={loading} />
          
        </label>

        {filters.map((filterDef) =>
        <label key={filterDef.key} className="admin-filter-control">
            <Filter size={18} />
            <select
            value={values[filterDef.key] ?? 'all'}
            onChange={(event) => onValueChange?.(filterDef.key, event.target.value)}
            disabled={loading}
            aria-label={filterDef.label}>
            
              {(filterDef.options || []).map((option) =>
            <option key={option.value} value={option.value}>
                  {option.label}
                </option>
            )}
            </select>
          </label>
        )}
      </div>

      <div className="admin-filter-actions">
        <button type="button" className="admin-btn admin-btn-muted" onClick={onReset} disabled={loading}>
          <RotateCcw size={16} />
          Reset
        </button>
        {rightActions}
      </div>
    </section>);

};

export default FilterPanel;
