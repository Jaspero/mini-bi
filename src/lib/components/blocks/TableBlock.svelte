<script lang="ts">
  import { onMount } from 'svelte';
  import BlockActions from '../ui/BlockActions.svelte';
  import type {
    Block,
    TableBlockConfig,
    BlockData,
    IDashboardService,
    ColumnDefinition
  } from '../../types/index';

  interface ColumnFilter {
    column: string;
    type: 'string' | 'number' | 'date' | 'boolean';
    operator: string;
    value: any;
    valueTo?: any;
  }

  interface Props {
    block: Block;
    dashboardService: IDashboardService;
    filterParams?: Record<string, any>;
    onBlockUpdate?: (block: Block) => void;
    onBlockEdit?: (block: Block) => void;
    onBlockDeleteRequest?: (block: Block) => void;
    showControls?: boolean;
    readOnly?: boolean;
  }

  let {
    block,
    dashboardService,
    filterParams = {},
    onBlockEdit = () => {},
    onBlockDeleteRequest = () => {},
    showControls = false,
    readOnly = false
  }: Props = $props();

  let tableConfig: TableBlockConfig = $state({
    columns: [],
    pagination: { enabled: false, pageSize: 10 },
    sorting: { enabled: false },
    filtering: { enabled: false, type: 'text' }
  });
  let loading = $state(true);
  let error = $state('');
  let data: BlockData | null = $state(null);
  let filteredData: any[] = $state([]);
  let sortColumn = $state('');
  let sortDirection: 'asc' | 'desc' | null = $state(null);
  let currentPage = $state(1);
  let pageSize = $state(10);
  let searchTerm = $state('');
  let isHovered = $state(false);

  let columnFilters: ColumnFilter[] = $state([]);
  let activeFilterColumn: ColumnDefinition | null = $state(null);
  let filterDialogOpen = $state(false);
  let tempFilterOperator = $state('');
  let tempFilterValue = $state<any>('');
  let tempFilterValueTo = $state<any>('');
  let filterDialogPosition = $state({ top: 0, left: 0 });

  let totalPages = $derived(Math.ceil(filteredData.length / pageSize));
  let paginatedData = $derived(
    filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  );

  onMount(async () => {
    await loadData();
  });

  // Reload data when filter parameters change
  $effect(() => {
    if (filterParams) {
      loadData();
    }
  });

  async function loadData() {
    try {
      loading = true;
      error = '';

      const blockConfig = {
        ...block.config,
        dataSource: block.dataSource
      };

      data = await dashboardService.loadBlockData(
        block.id,
        block.type,
        blockConfig,
        block.dataSource,
        filterParams
      );
      loading = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load data';
      loading = false;
    }
  }

  async function refreshData() {
    try {
      loading = true;
      error = '';

      const dataSource = block.dataSource || (block.config as any)?.dataSource;

      if (dataSource?.type === 'query' && dataSource?.queryId) {
        await dashboardService.refreshQuery(dataSource.queryId, filterParams);
      }

      const blockConfig = {
        ...block.config,
        dataSource: block.dataSource
      };

      data = await dashboardService.loadBlockData(
        block.id,
        block.type,
        blockConfig,
        block.dataSource,
        filterParams
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

    if (searchTerm.trim() && tableConfig?.filtering?.enabled) {
      const filterableColumns = effectiveColumns
        .filter((col) => col.filterable)
        .map((col) => col.key);

      if (filterableColumns.length > 0) {
        result = result.filter((row) =>
          filterableColumns.some((key) =>
            String(row[key] ?? '')
              .toLowerCase()
              .includes(searchTerm.toLowerCase())
          )
        );
      }
    }

    for (const filter of columnFilters) {
      result = result.filter((row) => {
        const value = row[filter.column];
        return applyColumnFilter(value, filter);
      });
    }

    if (sortColumn && sortDirection) {
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
    currentPage = 1;
  }

  function applyColumnFilter(value: any, filter: ColumnFilter): boolean {
    if (value === null || value === undefined) {
      return filter.operator === 'isEmpty';
    }

    switch (filter.type) {
      case 'string':
        const strValue = String(value).toLowerCase();
        const filterStr = String(filter.value).toLowerCase();
        switch (filter.operator) {
          case 'contains':
            return strValue.includes(filterStr);
          case 'notContains':
            return !strValue.includes(filterStr);
          case 'equals':
            return strValue === filterStr;
          case 'notEquals':
            return strValue !== filterStr;
          case 'startsWith':
            return strValue.startsWith(filterStr);
          case 'endsWith':
            return strValue.endsWith(filterStr);
          case 'isEmpty':
            return strValue === '';
          case 'isNotEmpty':
            return strValue !== '';
          default:
            return true;
        }

      case 'number':
        const numValue = Number(value);
        const filterNum = Number(filter.value);
        const filterNumTo = Number(filter.valueTo);
        switch (filter.operator) {
          case 'equals':
            return numValue === filterNum;
          case 'notEquals':
            return numValue !== filterNum;
          case 'greaterThan':
            return numValue > filterNum;
          case 'greaterOrEqual':
            return numValue >= filterNum;
          case 'lessThan':
            return numValue < filterNum;
          case 'lessOrEqual':
            return numValue <= filterNum;
          case 'between':
            return numValue >= filterNum && numValue <= filterNumTo;
          case 'isEmpty':
            return isNaN(numValue);
          case 'isNotEmpty':
            return !isNaN(numValue);
          default:
            return true;
        }

      case 'date':
        const dateValue = new Date(value).getTime();
        const filterDate = new Date(filter.value).getTime();
        const filterDateTo = filter.valueTo ? new Date(filter.valueTo).getTime() : 0;
        switch (filter.operator) {
          case 'equals':
            return dateValue === filterDate;
          case 'notEquals':
            return dateValue !== filterDate;
          case 'after':
            return dateValue > filterDate;
          case 'afterOrOn':
            return dateValue >= filterDate;
          case 'before':
            return dateValue < filterDate;
          case 'beforeOrOn':
            return dateValue <= filterDate;
          case 'between':
            return dateValue >= filterDate && dateValue <= filterDateTo;
          case 'isEmpty':
            return isNaN(dateValue);
          case 'isNotEmpty':
            return !isNaN(dateValue);
          default:
            return true;
        }

      case 'boolean':
        switch (filter.operator) {
          case 'isTrue':
            return value === true;
          case 'isFalse':
            return value === false;
          default:
            return true;
        }

      default:
        return true;
    }
  }

  function getOperatorsForType(
    type: 'string' | 'number' | 'date' | 'boolean'
  ): { value: string; label: string }[] {
    switch (type) {
      case 'string':
        return [
          { value: 'contains', label: 'Contains' },
          { value: 'notContains', label: 'Does not contain' },
          { value: 'equals', label: 'Equals' },
          { value: 'notEquals', label: 'Not equals' },
          { value: 'startsWith', label: 'Starts with' },
          { value: 'endsWith', label: 'Ends with' },
          { value: 'isEmpty', label: 'Is empty' },
          { value: 'isNotEmpty', label: 'Is not empty' }
        ];
      case 'number':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'notEquals', label: 'Not equals' },
          { value: 'greaterThan', label: 'Greater than' },
          { value: 'greaterOrEqual', label: 'Greater or equal' },
          { value: 'lessThan', label: 'Less than' },
          { value: 'lessOrEqual', label: 'Less or equal' },
          { value: 'between', label: 'Between' },
          { value: 'isEmpty', label: 'Is empty' },
          { value: 'isNotEmpty', label: 'Is not empty' }
        ];
      case 'date':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'notEquals', label: 'Not equals' },
          { value: 'after', label: 'After' },
          { value: 'afterOrOn', label: 'After or on' },
          { value: 'before', label: 'Before' },
          { value: 'beforeOrOn', label: 'Before or on' },
          { value: 'between', label: 'Between' },
          { value: 'isEmpty', label: 'Is empty' },
          { value: 'isNotEmpty', label: 'Is not empty' }
        ];
      case 'boolean':
        return [
          { value: 'isTrue', label: 'Is true' },
          { value: 'isFalse', label: 'Is false' }
        ];
      default:
        return [];
    }
  }

  function openFilterDialog(column: ColumnDefinition, event: MouseEvent) {
    event.stopPropagation();
    activeFilterColumn = column;

    const existingFilter = columnFilters.find((f) => f.column === column.key);
    if (existingFilter) {
      tempFilterOperator = existingFilter.operator;
      tempFilterValue = existingFilter.value;
      tempFilterValueTo = existingFilter.valueTo || '';
    } else {
      const operators = getOperatorsForType(column.type);
      tempFilterOperator = operators[0]?.value || '';
      tempFilterValue = '';
      tempFilterValueTo = '';
    }

    const rect = (event.target as HTMLElement).getBoundingClientRect();
    filterDialogPosition = {
      top: rect.bottom + 4,
      left: Math.min(rect.left, window.innerWidth - 280)
    };

    filterDialogOpen = true;
  }

  function closeFilterDialog() {
    filterDialogOpen = false;
    activeFilterColumn = null;
  }

  function applyFilter() {
    if (!activeFilterColumn) return;

    const needsValue = !['isEmpty', 'isNotEmpty', 'isTrue', 'isFalse'].includes(tempFilterOperator);
    if (needsValue && (tempFilterValue === '' || tempFilterValue === null)) {
      return;
    }

    const existingIndex = columnFilters.findIndex((f) => f.column === activeFilterColumn!.key);
    const newFilter: ColumnFilter = {
      column: activeFilterColumn.key,
      type: activeFilterColumn.type,
      operator: tempFilterOperator,
      value: tempFilterValue,
      valueTo: tempFilterValueTo
    };

    if (existingIndex >= 0) {
      columnFilters[existingIndex] = newFilter;
    } else {
      columnFilters = [...columnFilters, newFilter];
    }

    closeFilterDialog();
    updateFilteredData();
  }

  function clearFilter() {
    if (!activeFilterColumn) return;
    columnFilters = columnFilters.filter((f) => f.column !== activeFilterColumn!.key);
    closeFilterDialog();
    updateFilteredData();
  }

  function hasActiveFilter(columnKey: string): boolean {
    return columnFilters.some((f) => f.column === columnKey);
  }

  function handleSort(column: string) {
    if (!tableConfig?.sorting?.enabled) return;

    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        sortDirection = 'desc';
      } else if (sortDirection === 'desc') {
        sortDirection = null;
        sortColumn = '';
      } else {
        sortDirection = 'asc';
      }
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

  async function onRefresh() {
    await refreshData();
  }

  function onEdit() {
    onBlockEdit(block);
  }

  function onDelete() {
    onBlockDeleteRequest(block);
  }

  function inferColumnType(value: any): 'string' | 'number' | 'date' | 'boolean' {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';
    if (typeof value === 'string') {
      const datePattern = /^\d{4}-\d{2}-\d{2}(T|\s)/;
      if (datePattern.test(value)) return 'date';
    }
    return 'string';
  }

  function formatHeader(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  }

  let effectiveColumns: ColumnDefinition[] = $derived.by(() => {
    if (tableConfig?.autoColumns && data && data.data && data.data.length > 0) {
      const firstRow = data.data[0];
      return Object.keys(firstRow).map((key) => ({
        key,
        header: formatHeader(key),
        type: inferColumnType(firstRow[key]),
        sortable: true,
        filterable: true
      }));
    }
    return tableConfig?.columns || [];
  });

  $effect(() => {
    tableConfig = block.config as TableBlockConfig;
    if (tableConfig?.pagination) {
      pageSize = tableConfig.pagination.pageSize;
    }
    if (tableConfig?.sorting?.defaultSort) {
      sortColumn = tableConfig.sorting.defaultSort.column;
      sortDirection = tableConfig.sorting.defaultSort.direction;
    } else {
      sortColumn = '';
      sortDirection = null;
    }
  });

  $effect(() => {
    if (data || sortColumn || sortDirection || searchTerm || columnFilters) {
      updateFilteredData();
    }
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="bi-block flex h-full w-full flex-col overflow-hidden"
  onmouseenter={() => (isHovered = true)}
  onmouseleave={() => (isHovered = false)}
>
  <div
    class="flex h-[50px] items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-2 py-2 sm:gap-4 sm:px-4 sm:py-3"
  >
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <h3 class="m-0 truncate text-sm font-semibold text-gray-900 sm:text-base">{block.title}</h3>
    </div>
    <div class="flex flex-shrink-0 items-center gap-1">
      {#if tableConfig?.filtering?.enabled}
        <input
          type="text"
          placeholder="Search..."
          class="mr-1 w-20 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:ring-2
                 focus:ring-blue-500 focus:outline-none sm:w-auto sm:px-3 sm:text-sm
                 dark:placeholder-gray-400"
          oninput={handleSearch}
          value={searchTerm}
        />
      {/if}
      <BlockActions
        {block}
        {data}
        {loading}
        showControls={showControls || isHovered}
        {readOnly}
        {onEdit}
        {onRefresh}
        {onDelete}
      />
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
        onclick={onRefresh}>Retry</button
      >
    </div>
  {:else if data && tableConfig}
    <div class="flex-1 overflow-auto">
      <table class="w-full">
        <thead class="sticky top-0 bg-gray-50">
          <tr>
            {#each effectiveColumns as column}
              <th
                class="group/col border-b border-gray-200 px-2 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase sm:px-4 sm:py-3 {column.sortable &&
                tableConfig.sorting?.enabled
                  ? 'cursor-pointer touch-manipulation select-none hover:bg-gray-100'
                  : ''} {sortColumn === column.key ? 'bg-gray-100' : ''}"
                style={column.width ? `width: ${column.width}px` : ''}
                onclick={() => column.sortable && handleSort(column.key)}
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1">
                    <span class="truncate">{column.header}</span>
                    {#if column.sortable && tableConfig.sorting?.enabled}
                      <span class="flex-shrink-0 text-gray-400">
                        {#if sortColumn === column.key && sortDirection === 'asc'}
                          ↑
                        {:else if sortColumn === column.key && sortDirection === 'desc'}
                          ↓
                        {:else}
                          ↕
                        {/if}
                      </span>
                    {/if}
                  </div>
                  <button
                    class="flex-shrink-0 rounded p-0.5 transition-colors hover:bg-gray-200 {hasActiveFilter(
                      column.key
                    ) || activeFilterColumn?.key === column.key
                      ? 'text-blue-600'
                      : 'text-gray-400 opacity-0 group-hover/col:opacity-100'}"
                    onclick={(e) => openFilterDialog(column, e)}
                    aria-label="Filter {column.header}"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-3.5 w-3.5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </th>
            {/each}
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 bg-white">
          {#each paginatedData as row, rowIndex}
            <tr class="hover:bg-gray-50 {rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
              {#each effectiveColumns as column}
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
            onclick={() => goToPage(currentPage - 1)}
          >
            <span class="sm:hidden">‹</span>
            <span class="hidden sm:inline">Previous</span>
          </button>

          {#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const start = Math.max(1, currentPage - 2);
            return start + i;
          }).filter((page) => page <= totalPages) as page}
            <button
              class="touch-manipulation rounded-md border px-2 py-1 text-xs transition-colors sm:px-3 sm:text-sm {page ===
              currentPage
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-300 hover:bg-gray-50'}"
              onclick={() => goToPage(page)}
            >
              {page}
            </button>
          {/each}

          <button
            class="touch-manipulation rounded-md border border-gray-300 px-2 py-1 text-xs transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-sm"
            disabled={currentPage === totalPages}
            onclick={() => goToPage(currentPage + 1)}
          >
            <span class="sm:hidden">›</span>
            <span class="hidden sm:inline">Next</span>
          </button>
        </div>
      </div>
    {/if}
  {/if}

  {#if filterDialogOpen && activeFilterColumn}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="fixed inset-0 z-40" onclick={closeFilterDialog}></div>
    <div
      class="fixed z-50 w-64 rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800"
      style="top: {filterDialogPosition.top}px; left: {filterDialogPosition.left}px;"
    >
      <div class="mb-3 flex items-center justify-between">
        <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100">
          Filter: {activeFilterColumn.header}
        </h4>
        <button
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          onclick={closeFilterDialog}
          aria-label="Close filter dialog"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div class="space-y-3">
        <div>
          <label
            for="filter-condition"
            class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Condition</label
          >
          <select
            id="filter-condition"
            class="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            bind:value={tempFilterOperator}
          >
            {#each getOperatorsForType(activeFilterColumn.type) as op}
              <option value={op.value}>{op.label}</option>
            {/each}
          </select>
        </div>

        {#if !['isEmpty', 'isNotEmpty', 'isTrue', 'isFalse'].includes(tempFilterOperator)}
          <div>
            <label
              for="filter-value"
              class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Value</label
            >
            {#if activeFilterColumn.type === 'number'}
              <input
                id="filter-value"
                type="number"
                class="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                bind:value={tempFilterValue}
              />
            {:else if activeFilterColumn.type === 'date'}
              <input
                id="filter-value"
                type="date"
                class="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                bind:value={tempFilterValue}
              />
            {:else}
              <input
                id="filter-value"
                type="text"
                class="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                bind:value={tempFilterValue}
                placeholder="Enter value..."
              />
            {/if}
          </div>

          {#if tempFilterOperator === 'between'}
            <div>
              <label
                for="filter-value-to"
                class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">To</label
              >
              {#if activeFilterColumn.type === 'number'}
                <input
                  id="filter-value-to"
                  type="number"
                  class="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  bind:value={tempFilterValueTo}
                />
              {:else if activeFilterColumn.type === 'date'}
                <input
                  id="filter-value-to"
                  type="date"
                  class="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  bind:value={tempFilterValueTo}
                />
              {/if}
            </div>
          {/if}
        {/if}
      </div>

      <div class="mt-4 flex justify-between gap-2">
        {#if hasActiveFilter(activeFilterColumn.key)}
          <button
            class="rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            onclick={clearFilter}
          >
            Clear
          </button>
        {:else}
          <div></div>
        {/if}
        <button
          class="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
          onclick={applyFilter}
        >
          Apply
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(.table-neutral-bg) {
    background: var(--minibi-color-surface);
  }
  :global(.table-neutral-bg-alt) {
    background: var(--minibi-color-bg-alt);
  }
  :global(.table-border) {
    border-color: var(--minibi-color-border);
  }
  :global(.table-border-strong) {
    border-color: var(--minibi-color-border-strong);
  }
  :global(.table-text-muted) {
    color: var(--minibi-color-text-muted);
  }
  :global(.table-text) {
    color: var(--minibi-color-text);
  }
  :global(.table-hover:hover) {
    background: var(--minibi-color-bg-alt);
  }
</style>
