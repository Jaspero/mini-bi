<script lang="ts">
  import { onMount } from 'svelte';
  import type { Block, TableBlockConfig, BlockData, IDashboardService } from '../../types/index.js';

  export let block: Block;
  export let dashboardService: IDashboardService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export let onBlockUpdate: (block: Block) => void = () => {};
  export let onBlockEdit: (block: Block) => void = () => {};
  export let onBlockDelete: (blockId: string) => void = () => {};
  export let showControls = false;

  let tableConfig: TableBlockConfig;
  let loading = true;
  let error = '';
  let data: BlockData | null = null;
  let filteredData: any[] = [];
  let sortColumn = '';
  let sortDirection: 'asc' | 'desc' = 'asc';
  let currentPage = 1;
  let pageSize = 10;
  let searchTerm = '';

  $: {
    tableConfig = block.config as TableBlockConfig;
    if (tableConfig?.pagination) {
      pageSize = tableConfig.pagination.pageSize;
    }
    if (tableConfig?.sorting?.defaultSort) {
      sortColumn = tableConfig.sorting.defaultSort.column;
      sortDirection = tableConfig.sorting.defaultSort.direction;
    }
  }

  $: {
    if (data) {
      updateFilteredData();
    }
  }

  $: totalPages = Math.ceil(filteredData.length / pageSize);
  $: paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    try {
      loading = true;
      error = '';
      // Pass the block configuration which includes dataSource
      const blockConfig = {
        ...block.config,
        dataSource: block.dataSource
      };
      data = await dashboardService.loadBlockData(block.id, block.type, blockConfig);
      console.log('TableBlock loaded data:', data, 'for block:', block.id, 'dataSource:', block.dataSource);
      loading = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load data';
      loading = false;
    }
  }

  function updateFilteredData() {
    if (!data) return;
    
    let result = [...data.data];

    // Apply search filter
    if (searchTerm.trim()) {
      result = result.filter(row => 
        Object.values(row).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply sorting
    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        if (aVal > bVal) comparison = 1;
        
        return sortDirection === 'desc' ? -comparison : comparison;
      });
    }

    filteredData = result;
    currentPage = 1; // Reset to first page when data changes
  }

  function handleSort(column: string) {
    if (!tableConfig?.sorting?.enabled) return;
    
    if (sortColumn === column) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = column;
      sortDirection = 'asc';
    }
  }

  function handleSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    searchTerm = target.value;
  }

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages) {
      currentPage = page;
    }
  }

  function formatCellValue(value: any, column: any): string {
    if (column.formatter) {
      return column.formatter(value);
    }
    
    if (value === null || value === undefined) {
      return '';
    }
    
    switch (column.type) {
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : String(value);
      case 'date':
        return value instanceof Date ? value.toLocaleDateString() : String(value);
      case 'boolean':
        return value ? 'Yes' : 'No';
      default:
        return String(value);
    }
  }

  async function refresh(event: MouseEvent) {
    event.stopPropagation();
    await loadData();
  }

  function handleEdit(event: MouseEvent) {
    event.stopPropagation();
    onBlockEdit(block);
  }

  function handleDelete(event: MouseEvent) {
    event.stopPropagation();
    if (confirm(`Are you sure you want to delete the "${block.title}" table?`)) {
      onBlockDelete(block.id);
    }
  }
</script>

<div class="table-block">
  <div class="table-header">
    <div class="table-title-section">
      <h3 class="table-title">{block.title}</h3>
      {#if block.dataSource?.type === 'query' && data?.metadata?.source}
        <span class="data-source-indicator">📊 {data.metadata.source}</span>
      {/if}
    </div>
    <div class="table-controls">
      {#if tableConfig?.filtering?.enabled}
        <input 
          type="text" 
          placeholder="Search..." 
          class="search-input"
          on:input={handleSearch}
          value={searchTerm}
        />
      {/if}
      {#if showControls}
        <div class="block-controls">
          <button class="control-btn edit-btn" on:click={handleEdit} aria-label="Edit table">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41L18.37 3.29a.996.996 0 0 0-1.41 0L15.13 5.12l3.75 3.75 1.83-1.83z"/>
            </svg>
          </button>
          <button class="control-btn refresh-btn" on:click={refresh} disabled={loading} aria-label="Refresh table data">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
            </svg>
          </button>
          <button class="control-btn delete-btn" on:click={handleDelete} aria-label="Delete table">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        </div>
      {/if}
    </div>
  </div>

  {#if loading}
    <div class="loading">
      <div class="loading-spinner"></div>
      <p>Loading table data...</p>
    </div>
  {:else if error}
    <div class="error">
      <p>Error: {error}</p>
      <button on:click={refresh}>Retry</button>
    </div>
  {:else if data && tableConfig}
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            {#each tableConfig.columns as column}
              <th 
                class="table-header-cell"
                class:sortable={column.sortable && tableConfig.sorting?.enabled}
                class:sorted={sortColumn === column.key}
                class:sort-asc={sortColumn === column.key && sortDirection === 'asc'}
                class:sort-desc={sortColumn === column.key && sortDirection === 'desc'}
                style={column.width ? `width: ${column.width}px` : ''}
                on:click={() => column.sortable && handleSort(column.key)}
              >
                {column.header}
                {#if column.sortable && tableConfig.sorting?.enabled}
                  <span class="sort-icon">
                    {#if sortColumn === column.key}
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    {:else}
                      ↕
                    {/if}
                  </span>
                {/if}
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each paginatedData as row, rowIndex}
            <tr class="table-row" class:even={rowIndex % 2 === 0}>
              {#each tableConfig.columns as column}
                <td class="table-cell">
                  {formatCellValue(row[column.key], column)}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    {#if tableConfig.pagination?.enabled && totalPages > 1}
      <div class="pagination">
        <div class="pagination-info">
          Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} entries
        </div>
        <div class="pagination-controls">
          <button 
            class="page-btn" 
            disabled={currentPage === 1}
            on:click={() => goToPage(currentPage - 1)}
          >
            Previous
          </button>
          
          {#each Array.from({length: Math.min(5, totalPages)}, (_, i) => {
            const start = Math.max(1, currentPage - 2);
            const end = Math.min(totalPages, start + 4);
            return start + i;
          }).filter(page => page <= totalPages) as page}
            <button 
              class="page-btn" 
              class:active={page === currentPage}
              on:click={() => goToPage(page)}
            >
              {page}
            </button>
          {/each}
          
          <button 
            class="page-btn" 
            disabled={currentPage === totalPages}
            on:click={() => goToPage(currentPage + 1)}
          >
            Next
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .table-block {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .table-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 16px;
    border-bottom: 1px solid #e5e7eb;
    background: #f9fafb;
    gap: 16px;
  }

  .table-title-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    flex: 1;
  }

  .table-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
  }

  .data-source-indicator {
    font-size: 12px;
    color: #6b7280;
    font-style: italic;
  }

  .table-controls {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    flex-shrink: 0;
  }

  .search-input {
    padding: 6px 12px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 14px;
    width: 200px;
  }

  .search-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 1px #3b82f6;
  }

  .refresh-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    color: #6b7280;
    transition: all 0.2s;
  }

  .refresh-btn:hover:not(:disabled) {
    background: #e5e7eb;
    color: #374151;
  }

  .refresh-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .block-controls {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .control-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 6px;
    border-radius: 4px;
    color: #6b7280;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .control-btn:hover:not(:disabled) {
    background: #e5e7eb;
    color: #374151;
  }

  .control-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .edit-btn:hover:not(:disabled) {
    background: #eff6ff;
    color: #3b82f6;
  }

  .delete-btn:hover:not(:disabled) {
    background: #fef2f2;
    color: #ef4444;
  }

  .table-container {
    flex: 1;
    overflow: auto;
    min-height: 0;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
  }

  .table-header-cell {
    background: #f9fafb;
    padding: 12px;
    text-align: left;
    font-weight: 600;
    color: #374151;
    border-bottom: 2px solid #e5e7eb;
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .table-header-cell.sortable {
    cursor: pointer;
    user-select: none;
    transition: background-color 0.2s;
  }

  .table-header-cell.sortable:hover {
    background: #f3f4f6;
  }

  .sort-icon {
    margin-left: 4px;
    opacity: 0.5;
  }

  .table-header-cell.sorted .sort-icon {
    opacity: 1;
    color: #3b82f6;
  }

  .table-row {
    transition: background-color 0.2s;
  }

  .table-row:hover {
    background: #f9fafb;
  }

  .table-row.even {
    background: #f8fafc;
  }

  .table-row.even:hover {
    background: #f1f5f9;
  }

  .table-cell {
    padding: 12px;
    border-bottom: 1px solid #e5e7eb;
    color: #374151;
  }

  .loading {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: #6b7280;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #e5e7eb;
    border-top: 3px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 12px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: #dc2626;
    padding: 20px;
  }

  .error button {
    margin-top: 12px;
    padding: 8px 16px;
    background: #dc2626;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .error button:hover {
    background: #b91c1c;
  }

  .pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-top: 1px solid #e5e7eb;
    background: #f9fafb;
  }

  .pagination-info {
    font-size: 14px;
    color: #6b7280;
  }

  .pagination-controls {
    display: flex;
    gap: 4px;
  }

  .page-btn {
    padding: 6px 12px;
    border: 1px solid #d1d5db;
    background: white;
    color: #374151;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
  }

  .page-btn:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .page-btn.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .page-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
