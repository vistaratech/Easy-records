import { Search, Filter, Trash2, Hash, FileText, Eye, Columns, Minus, Plus, Maximize2, Minimize2 } from 'lucide-react';
import { memo, useState } from 'react';
import type { Column } from '../../lib/api';
import { FilterModal, type FilterRule } from './modals/FilterModal';

interface RegisterToolbarProps {
  search: string;
  setSearch: (s: string) => void;
  filters: FilterRule[];
  activeFilters: FilterRule[];
  setFilters: (f: FilterRule[]) => void;
  setActiveFilters: (f: FilterRule[]) => void;
  filterModal: boolean;
  setFilterModal: (v: boolean) => void;
  addEntryMutation: any;
  setNewColName: (v: string) => void;
  setNewColType: (v: string) => void;
  setNewColDropdownOpts: (v: string) => void;
  setNewColFormula: (v: string) => void;
  setNewColumnModal: (v: boolean) => void;
  hiddenColumns: Set<number>;
  selectedRows: Set<number>;
  rowCount: number;
  columns: Column[];
  bulkDeleteMutation: any;
  setRowCountMutation?: any;
  setManageColsMenu: (v: { rect: DOMRect } | null) => void;
  entries: any[];
  canEdit?: boolean;
  allColumnsCount?: number;
  selectedColumns: Set<number>;
  isPreviewSelectedColumns: boolean;
  setIsPreviewSelectedColumns: (v: boolean) => void;
  isSaving?: boolean;
  uploadingImagesCount?: number;
  pendingDebounceCount?: number;
  pendingTempRowEditsCount?: number;
  onOpenStorageOptimizer?: (tab?: 'analytics' | 'config' | 'sandbox' | 'chunks' | 'ledger') => void;
}

export const RegisterToolbar = memo(function RegisterToolbar({
  search, setSearch, filters, activeFilters, setFilters, setActiveFilters, filterModal, setFilterModal,
  hiddenColumns,
  selectedRows, rowCount, columns, bulkDeleteMutation,
  setManageColsMenu,
  entries,
  canEdit = true,
  allColumnsCount,
  selectedColumns,
  isPreviewSelectedColumns,
  setIsPreviewSelectedColumns,
  isSaving = false,
  uploadingImagesCount = 0,
  pendingDebounceCount = 0,
  pendingTempRowEditsCount = 0,
  onOpenStorageOptimizer
}: RegisterToolbarProps) {

  const isSyncing = isSaving || uploadingImagesCount > 0 || pendingDebounceCount > 0 || pendingTempRowEditsCount > 0;

  // Zoom & Fullscreen state
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleZoomChange = (delta: number) => {
    setZoomLevel(prev => {
      const next = Math.max(70, Math.min(180, prev + delta));
      document.documentElement.style.setProperty('--table-zoom', `${next / 100}`);
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
    document.documentElement.style.setProperty('--table-zoom', '1');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  return (
    <div className="pages-actions-right">
      {/* Stats */}
      <span className="pab-stat" title={rowCount < entries.length ? `Showing ${rowCount} of ${entries.length} total rows` : `${rowCount} rows total`}>
        <Hash size={11} />
        {rowCount < entries.length ? `${rowCount} / ${entries.length}` : rowCount} rows
      </span>
      <span className="pab-stat" style={{ marginRight: isSyncing ? '4px' : '0px' }} title={columns.length < (allColumnsCount || columns.length) ? `Showing ${columns.length} of ${allColumnsCount} total columns` : `${columns.length} columns total`}>
        <FileText size={11} />
        {columns.length < (allColumnsCount || columns.length) ? `${columns.length} / ${allColumnsCount}` : columns.length} cols
      </span>

      <div className="pab-divider" />

      {/* Elegant background syncing status indicator (repositioned next to search bar & styled in premium Green!) */}
      {isSyncing && (
        <div 
          className="header-sync-status-badge"
          onClick={() => onOpenStorageOptimizer?.('ledger')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3.5px 9px',
            borderRadius: '12px',
            fontSize: '10.5px',
            fontWeight: 600,
            transition: 'all 0.3s ease',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            color: '#059669', // Premium Emerald Green
            border: '1px solid rgba(16, 185, 129, 0.18)',
            marginRight: '8px',
            userSelect: 'none',
            cursor: 'pointer',
          }}
          title={
            uploadingImagesCount > 0 
              ? `Compressing & uploading ${uploadingImagesCount} photo(s)... Click to view sync log.`
              : pendingTempRowEditsCount > 0
                ? `Buffered ${pendingTempRowEditsCount} offline edit(s)... Click to view sync log.`
                : pendingDebounceCount > 0
                  ? `Saving ${pendingDebounceCount} change(s)... Click to view sync log.`
                  : 'Saving updates in the background... Click to view sync log.'
          }
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.08)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <span 
            className="mini-sync-spinner"
            style={{
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              border: '1.5px solid rgba(16, 185, 129, 0.25)',
              borderLeftColor: 'currentColor',
              display: 'inline-block',
              animation: 'spin 0.8s linear infinite'
            }}
          />
          <span className="mini-sync-text" style={{ letterSpacing: '0.1px' }}>
            {uploadingImagesCount > 0 
              ? `Uploading Photos (${uploadingImagesCount})...`
              : pendingTempRowEditsCount > 0
                ? `Offline (${pendingTempRowEditsCount})`
                : pendingDebounceCount > 0
                  ? `Saving (${pendingDebounceCount})...`
                  : 'Saving...'
            }
          </span>
        </div>
      )}

      {/* Search */}
      <div className={`pab-search${search ? ' active' : ''}`} id="pab-search-wrap">
        <Search size={13} className="pab-search-icon" />
        <input
          id="pab-search-input"
          className="pab-search-input"
          placeholder="Search records..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') setSearch(''); }}
        />
        {search && (
          <button className="pab-search-clear" onClick={() => setSearch('')} title="Clear search">×</button>
        )}
      </div>

      {/* Preview Selected Columns Toggle */}
      {selectedColumns.size > 0 && (
        <button
          className={`pab-icon-btn${isPreviewSelectedColumns ? ' active' : ''}`}
          title={isPreviewSelectedColumns ? "Show all columns" : `Show only ${selectedColumns.size} selected columns`}
          onClick={() => setIsPreviewSelectedColumns(!isPreviewSelectedColumns)}
          aria-label="Preview Selected Columns"
          style={{ marginRight: '8px' }}
        >
          <Columns size={14} />
          <span className="pab-badge" style={{ backgroundColor: 'var(--primary)', color: 'white' }}>
            {selectedColumns.size}
          </span>
        </button>
      )}

      {/* Filter */}
      <div className="pab-filter-wrapper">
        <button
          className={`pab-icon-btn${activeFilters.length > 0 ? ' active' : ''}`}
          title={`Filter${activeFilters.length > 0 ? ` (${activeFilters.length} active)` : ''}`}
          onClick={() => setFilterModal(!filterModal)}
          aria-label="Filter"
        >
          <Filter size={14} />
          {activeFilters.length > 0 && <span className="pab-badge">{activeFilters.length}</span>}
        </button>

        <FilterModal
          filterModal={filterModal}
          setFilterModal={setFilterModal}
          filters={filters}
          setFilters={setFilters}
          setActiveFilters={setActiveFilters}
          columns={columns}
          entries={entries}
        />
      </div>

      {/* Spreadsheet Table Zoom & Fullscreen Control Widget */}
      <div 
        className="zoom-toolbar-widget"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '2px',
          background: 'var(--bg-secondary, #f1f5f9)',
          borderRadius: '8px',
          padding: '2px 5px',
          border: '1px solid #cbd5e1',
          margin: '0 4px'
        }}
      >
        <button
          onClick={() => handleZoomChange(-10)}
          title="Zoom Out (decrease table size)"
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: '2px 4px',
            borderRadius: '4px',
            color: '#475569',
            display: 'flex',
            alignItems: 'center'
          }}
          className="interactive-btn"
        >
          <Minus size={12} strokeWidth={2.5} />
        </button>

        <span
          onClick={handleResetZoom}
          title="Click to reset zoom to 100%"
          style={{
            fontSize: '11px',
            fontWeight: 800,
            color: '#0f172a',
            cursor: 'pointer',
            padding: '0 4px',
            minWidth: '34px',
            textAlign: 'center',
            userSelect: 'none'
          }}
        >
          {zoomLevel}%
        </span>

        <button
          onClick={() => handleZoomChange(10)}
          title="Zoom In (increase table size)"
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: '2px 4px',
            borderRadius: '4px',
            color: '#475569',
            display: 'flex',
            alignItems: 'center'
          }}
          className="interactive-btn"
        >
          <Plus size={12} strokeWidth={2.5} />
        </button>

        <div style={{ width: '1px', height: '12px', background: '#cbd5e1', margin: '0 2px' }} />

        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: '2px 4px',
            borderRadius: '4px',
            color: isFullscreen ? '#1d4ed8' : '#475569',
            display: 'flex',
            alignItems: 'center'
          }}
          className="interactive-btn"
        >
          {isFullscreen ? <Minimize2 size={12} strokeWidth={2} /> : <Maximize2 size={12} strokeWidth={2} />}
        </button>
      </div>

      <div className="pab-divider" />

      {/* Manage Columns - Eye Icon */}
      <button 
        className={`pab-icon-btn${hiddenColumns.size > 0 ? ' active' : ''}`} 
        title={`Manage columns (${hiddenColumns.size} hidden)`}
        onClick={(e) => setManageColsMenu({ rect: e.currentTarget.getBoundingClientRect() })}
        aria-label="Manage columns"
      >
        <Eye size={13} />
        {hiddenColumns.size > 0 && <span className="pab-badge">{hiddenColumns.size}</span>}
      </button>

      {/* Bulk delete */}
      {canEdit && selectedRows.size > 0 && (
        <button className="pab-icon-btn danger" title={`Delete ${selectedRows.size} rows`}
          onClick={() => { if (confirm(`Delete ${selectedRows.size} rows?`)) bulkDeleteMutation.mutate(); }}>
          <Trash2 size={13} />
          <span className="pab-badge">{selectedRows.size}</span>
        </button>
      )}
    </div>
  );
});
