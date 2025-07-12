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
    onBlockDelete(block.id);
  }
</script>

<div class="w-full h-full flex flex-col bg-white rounded-lg shadow-sm overflow-hidden">
  <div class="flex justify-between items-start py-2 sm:py-3 px-2 sm:px-4 border-b border-gray-200 bg-gray-50 gap-2 sm:gap-4">
    <div class="flex flex-col gap-1 min-w-0 flex-1">
      <h3 class="text-sm sm:text-base font-semibold text-gray-900 m-0 truncate">{block.title}</h3>
    </div>
    <div class="flex items-center gap-1 flex-shrink-0">
      {#if tableConfig?.filtering?.enabled}
        <input 
          type="text" 
          placeholder="Search..." 
          class="px-2 sm:px-3 py-1.5 border border-gray-300 rounded-md text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mr-1 w-20 sm:w-auto"
          on:input={handleSearch}
          value={searchTerm}
        />
      {/if}
      {#if showControls}
        <button class="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors touch-manipulation" on:click={handleEdit} aria-label="Edit table">
          <span class="material-symbols-outlined text-sm sm:text-base">edit</span>
        </button>
        <button class="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50 touch-manipulation" on:click={refresh} disabled={loading} aria-label="Refresh table data">
          <span class="material-symbols-outlined text-sm sm:text-base">refresh</span>
        </button>
        <button class="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors touch-manipulation" on:click={handleDelete} aria-label="Delete table">
          <span class="material-symbols-outlined text-sm sm:text-base">delete</span>
        </button>
      {/if}
    </div>
  </div>

  {#if loading}
    <div class="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
      <div class="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mb-4"></div>
      <p class="text-base">Loading table data...</p>
    </div>
  {:else if error}
    <div class="flex-1 flex flex-col items-center justify-center text-red-600 p-8">
      <p class="text-base mb-4">Error: {error}</p>
      <button class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors" on:click={refresh}>Retry</button>
    </div>
  {:else if data && tableConfig}
    <div class="flex-1 overflow-auto">
      <table class="w-full">
        <thead class="bg-gray-50 sticky top-0">
          <tr>
            {#each tableConfig.columns as column}
              <th 
                class="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 {column.sortable && tableConfig.sorting?.enabled ? 'cursor-pointer hover:bg-gray-100 select-none touch-manipulation' : ''} {sortColumn === column.key ? 'bg-gray-100' : ''}"
                style={column.width ? `width: ${column.width}px` : ''}
                on:click={() => column.sortable && handleSort(column.key)}
              >
                <div class="flex items-center justify-between">
                  <span class="truncate">{column.header}</span>
                  {#if column.sortable && tableConfig.sorting?.enabled}
                    <span class="ml-1 sm:ml-2 text-gray-400 flex-shrink-0">
                      {#if sortColumn === column.key}
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      {:else}
                        ↕
                      {/if}
                    </span>
                  {/if}
                </div>
              </th>
            {/each}
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each paginatedData as row, rowIndex}
            <tr class="hover:bg-gray-50 {rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
              {#each tableConfig.columns as column}
                <td class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                  <div class="truncate max-w-[100px] sm:max-w-none">
                    {formatCellValue(row[column.key], column)}
                  </div>
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    {#if tableConfig.pagination?.enabled && totalPages > 1}
      <div class="flex flex-col sm:flex-row items-center justify-between px-2 sm:px-4 py-2 sm:py-3 border-t border-gray-200 bg-white gap-2 sm:gap-0">
        <div class="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
          Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} entries
        </div>
        <div class="flex items-center space-x-1 sm:space-x-2">
          <button 
            class="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation" 
            disabled={currentPage === 1}
            on:click={() => goToPage(currentPage - 1)}
          >
            <span class="sm:hidden">‹</span>
            <span class="hidden sm:inline">Previous</span>
          </button>
          
          {#each Array.from({length: Math.min(5, totalPages)}, (_, i) => {
            const start = Math.max(1, currentPage - 2);
            const end = Math.min(totalPages, start + 4);
            return start + i;
          }).filter(page => page <= totalPages) as page}
            <button 
              class="px-2 sm:px-3 py-1 text-xs sm:text-sm border rounded-md transition-colors touch-manipulation {page === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'}"
              on:click={() => goToPage(page)}
            >
              {page}
            </button>
          {/each}
          
          <button 
            class="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation" 
            disabled={currentPage === totalPages}
            on:click={() => goToPage(currentPage + 1)}
          >
            <span class="sm:hidden">›</span>
            <span class="hidden sm:inline">Next</span>
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div>


