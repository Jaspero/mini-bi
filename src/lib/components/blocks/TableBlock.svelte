<script lang="ts">
  import { onMount } from 'svelte';
  import type { Block, TableBlockConfig, BlockData, IDashboardService } from '../../types/index.js';

  export let block: Block;
  export let dashboardService: IDashboardService;
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
      console.log(
        'TableBlock loaded data:',
        data,
        'for block:',
        block.id,
        'dataSource:',
        block.dataSource
      );
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
      result = result.filter((row) =>
        Object.values(row).some((value) =>
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

<div class="flex h-full w-full flex-col overflow-hidden rounded-lg bg-white shadow-sm">
  <div
    class="flex items-start justify-between gap-2 border-b border-gray-200 bg-gray-50 px-2 py-2 sm:gap-4 sm:px-4 sm:py-3"
  >
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <h3 class="m-0 truncate text-sm font-semibold text-gray-900 sm:text-base">{block.title}</h3>
    </div>
    <div class="flex flex-shrink-0 items-center gap-1">
      {#if tableConfig?.filtering?.enabled}
        <input
          type="text"
          placeholder="Search..."
          class="mr-1 w-20 rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none sm:w-auto sm:px-3 sm:text-sm"
          on:input={handleSearch}
          value={searchTerm}
        />
      {/if}
      {#if showControls}
        <button
          class="touch-manipulation rounded p-1.5 text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
          on:click={handleEdit}
          aria-label="Edit table"
        >
          <span class="material-symbols-outlined text-sm sm:text-base">edit</span>
        </button>
        <button
          class="touch-manipulation rounded p-1.5 text-gray-600 transition-colors hover:bg-green-50 hover:text-green-600 disabled:opacity-50"
          on:click={refresh}
          disabled={loading}
          aria-label="Refresh table data"
        >
          <span class="material-symbols-outlined text-sm sm:text-base">refresh</span>
        </button>
        <button
          class="touch-manipulation rounded p-1.5 text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600"
          on:click={handleDelete}
          aria-label="Delete table"
        >
          <span class="material-symbols-outlined text-sm sm:text-base">delete</span>
        </button>
      {/if}
    </div>
  </div>

  {#if loading}
    <div class="flex flex-1 flex-col items-center justify-center p-8 text-gray-500">
      <div
        class="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500"
      ></div>
      <p class="text-base">Loading table data...</p>
    </div>
  {:else if error}
    <div class="flex flex-1 flex-col items-center justify-center p-8 text-red-600">
      <p class="mb-4 text-base">Error: {error}</p>
      <button
        class="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
        on:click={refresh}>Retry</button
      >
    </div>
  {:else if data && tableConfig}
    <div class="flex-1 overflow-auto">
      <table class="w-full">
        <thead class="sticky top-0 bg-gray-50">
          <tr>
            {#each tableConfig.columns as column}
              <th
                class="border-b border-gray-200 px-2 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase sm:px-4 sm:py-3 {column.sortable &&
                tableConfig.sorting?.enabled
                  ? 'cursor-pointer touch-manipulation select-none hover:bg-gray-100'
                  : ''} {sortColumn === column.key ? 'bg-gray-100' : ''}"
                style={column.width ? `width: ${column.width}px` : ''}
                on:click={() => column.sortable && handleSort(column.key)}
              >
                <div class="flex items-center justify-between">
                  <span class="truncate">{column.header}</span>
                  {#if column.sortable && tableConfig.sorting?.enabled}
                    <span class="ml-1 flex-shrink-0 text-gray-400 sm:ml-2">
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
        <tbody class="divide-y divide-gray-200 bg-white">
          {#each paginatedData as row, rowIndex}
            <tr class="hover:bg-gray-50 {rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
              {#each tableConfig.columns as column}
                <td
                  class="px-2 py-2 text-xs whitespace-nowrap text-gray-900 sm:px-4 sm:py-3 sm:text-sm"
                >
                  <div class="max-w-[100px] truncate sm:max-w-none">
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
      <div
        class="flex flex-col items-center justify-between gap-2 border-t border-gray-200 bg-white px-2 py-2 sm:flex-row sm:gap-0 sm:px-4 sm:py-3"
      >
        <div class="text-center text-xs text-gray-700 sm:text-left sm:text-sm">
          Showing {(currentPage - 1) * pageSize + 1} to {Math.min(
            currentPage * pageSize,
            filteredData.length
          )} of {filteredData.length} entries
        </div>
        <div class="flex items-center space-x-1 sm:space-x-2">
          <button
            class="touch-manipulation rounded-md border border-gray-300 px-2 py-1 text-xs transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-sm"
            disabled={currentPage === 1}
            on:click={() => goToPage(currentPage - 1)}
          >
            <span class="sm:hidden">‹</span>
            <span class="hidden sm:inline">Previous</span>
          </button>

          {#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const start = Math.max(1, currentPage - 2);
            const end = Math.min(totalPages, start + 4);
            return start + i;
          }).filter((page) => page <= totalPages) as page}
            <button
              class="touch-manipulation rounded-md border px-2 py-1 text-xs transition-colors sm:px-3 sm:text-sm {page ===
              currentPage
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-300 hover:bg-gray-50'}"
              on:click={() => goToPage(page)}
            >
              {page}
            </button>
          {/each}

          <button
            class="touch-manipulation rounded-md border border-gray-300 px-2 py-1 text-xs transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-sm"
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
