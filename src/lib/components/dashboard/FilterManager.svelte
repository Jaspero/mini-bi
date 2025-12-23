<script lang="ts">
  import Modal from '../ui/Modal.svelte';
  import type { Filter, IDashboardService, FilterOption, QueryColumn } from '../../types/index';

  let {
    filters = $bindable([]),
    isOpen = false,
    onClose = () => {},
    onFiltersChange = () => {},
    dashboardId = '',
    dashboardService
  }: {
    filters: Filter[];
    isOpen: boolean;
    onClose: () => void;
    onFiltersChange: (filters: Filter[]) => void;
    dashboardId?: string;
    dashboardService?: IDashboardService;
  } = $props();

  let editingFilter: Filter | null = $state(null);
  let showFilterEditor = $state(false);
  let newFilter: Partial<Filter> = $state({});

  let initialDateRangeStart = $state('');
  let initialDateRangeEnd = $state('');
  let initialRangeStart: number = $state(0);
  let initialRangeEnd: number = $state(100);
  let useQueryForOptions = $state(false);
  let queryTestResult: FilterOption[] | null = $state(null);
  let queryTestError: string | null = $state(null);
  let testingQuery = $state(false);

  function formatDateForInput(date: Date | string): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  }

  function createNewFilter() {
    newFilter = {
      key: '',
      name: '',
      type: 'string',
      active: true,
      initialValue: '',
      currentValue: '',
      placeholder: '',
      description: ''
    };
    initialDateRangeStart = formatDateForInput(new Date());
    initialDateRangeEnd = formatDateForInput(new Date());
    initialRangeStart = 0;
    initialRangeEnd = 100;
    useQueryForOptions = false;
    queryTestResult = null;
    queryTestError = null;
    editingFilter = null;
    showFilterEditor = true;
  }

  function editFilter(filter: Filter) {
    editingFilter = filter;
    newFilter = { ...filter };
    if (filter.type === 'date_range' && Array.isArray(filter.initialValue)) {
      initialDateRangeStart = formatDateForInput(filter.initialValue[0]);
      initialDateRangeEnd = formatDateForInput(filter.initialValue[1]);
    }
    if (
      (filter.type === 'integer_range' || filter.type === 'float_range') &&
      Array.isArray(filter.initialValue)
    ) {
      initialRangeStart = filter.initialValue[0];
      initialRangeEnd = filter.initialValue[1];
    }
    useQueryForOptions = !!filter.optionsQuery;
    queryTestResult = null;
    queryTestError = null;
    showFilterEditor = true;
  }

  function saveFilter() {
    if (!newFilter.key || !newFilter.name) {
      return;
    }

    const filterId = editingFilter?.id || 'filter-' + Math.random().toString(36).substr(2, 9);

    let initialValue = newFilter.initialValue ?? getDefaultValueForType(newFilter.type!);
    if (newFilter.type === 'date_range') {
      initialValue = [new Date(initialDateRangeStart), new Date(initialDateRangeEnd)];
    } else if (newFilter.type === 'integer_range' || newFilter.type === 'float_range') {
      initialValue = [initialRangeStart, initialRangeEnd];
    }

    const savedFilter: Filter = {
      id: filterId,
      key: newFilter.key!,
      name: newFilter.name!,
      type: newFilter.type!,
      active: newFilter.active ?? true,
      initialValue: initialValue,
      currentValue: initialValue,
      options: useQueryForOptions ? [] : newFilter.options || [],
      optionsQuery: useQueryForOptions ? newFilter.optionsQuery : undefined,
      labelColumn: useQueryForOptions ? newFilter.labelColumn : undefined,
      valueColumn: useQueryForOptions ? newFilter.valueColumn : undefined,
      min: newFilter.min,
      max: newFilter.max,
      placeholder: newFilter.placeholder,
      description: newFilter.description,
      useNow: newFilter.useNow,
      useNowEnd: newFilter.useNowEnd
    };

    if (editingFilter) {
      const editId = editingFilter.id;
      filters = filters.map((f) => (f.id === editId ? savedFilter : f));
    } else {
      filters = [...filters, savedFilter];
    }

    onFiltersChange(filters);
    closeFilterEditor();
  }

  function deleteFilter(filterId: string) {
    filters = filters.filter((f) => f.id !== filterId);
    onFiltersChange(filters);
  }

  function updateFilterValue(filterId: string, value: any) {
    filters = filters.map((f) => (f.id === filterId ? { ...f, currentValue: value } : f));
    onFiltersChange(filters);
  }

  function closeFilterEditor() {
    showFilterEditor = false;
    editingFilter = null;
    newFilter = {};
  }

  function getTypedValue(value: any, type: string): any {
    if (value === null || value === undefined || value === '') {
      return getDefaultValueForType(type);
    }

    switch (type) {
      case 'integer':
        return parseInt(value) || 0;
      case 'float':
        return parseFloat(value) || 0;
      case 'boolean':
        return Boolean(value);
      case 'date':
        return value instanceof Date ? value : new Date(value);
      case 'date_range':
        return Array.isArray(value) ? value : [new Date(), new Date()];
      case 'integer_range':
      case 'float_range':
        return Array.isArray(value) ? value : [0, 100];
      case 'list':
        return Array.isArray(value) ? value : [];
      default:
        return String(value);
    }
  }

  function getDefaultValueForType(type: string): any {
    switch (type) {
      case 'integer':
        return 0;
      case 'float':
        return 0.0;
      case 'boolean':
        return false;
      case 'date':
        return new Date();
      case 'date_range':
        return [new Date(), new Date()];
      case 'integer_range':
      case 'float_range':
        return [0, 100];
      case 'list':
        return [];
      default:
        return '';
    }
  }

  function addFilterOption() {
    if (!newFilter.options) {
      newFilter.options = [];
    }
    newFilter.options = [...newFilter.options, { label: '', value: '' }];
  }

  function removeFilterOption(index: number) {
    if (newFilter.options) {
      newFilter.options = newFilter.options.filter((_, i) => i !== index);
    }
  }

  async function testOptionsQuery() {
    if (!newFilter.optionsQuery || !dashboardService) {
      return;
    }

    testingQuery = true;
    queryTestError = null;
    queryTestResult = null;

    try {
      const result = await dashboardService.getQueryPreview(newFilter.optionsQuery, 100);

      if (result.error) {
        queryTestError = result.error;
        return;
      }

      if (result.columns.length < 1) {
        queryTestError = 'Query must return at least one column';
        return;
      }

      const labelCol = newFilter.labelColumn || result.columns[0].name;
      const valueCol = newFilter.valueColumn || result.columns[1]?.name || result.columns[0].name;

      const labelIndex = result.columns.findIndex((c: QueryColumn) => c.name === labelCol);
      const valueIndex = result.columns.findIndex((c: QueryColumn) => c.name === valueCol);

      if (labelIndex === -1) {
        queryTestError = `Label column "${labelCol}" not found in query results`;
        return;
      }
      if (valueIndex === -1) {
        queryTestError = `Value column "${valueCol}" not found in query results`;
        return;
      }

      queryTestResult = result.rows.map((row: any[]) => ({
        label: String(row[labelIndex]),
        value: row[valueIndex]
      }));

      if (!newFilter.labelColumn) {
        newFilter.labelColumn = labelCol;
      }
      if (!newFilter.valueColumn) {
        newFilter.valueColumn = valueCol;
      }
    } catch (err) {
      queryTestError = err instanceof Error ? err.message : 'Failed to execute query';
    } finally {
      testingQuery = false;
    }
  }

  function formatFilterValue(filter: Filter): string {
    const value = filter.currentValue ?? filter.initialValue;

    switch (filter.type) {
      case 'date':
        return value instanceof Date ? value.toLocaleDateString() : String(value);
      case 'date_range':
        return Array.isArray(value)
          ? `${value[0]?.toLocaleDateString()} - ${value[1]?.toLocaleDateString()}`
          : '';
      case 'integer_range':
      case 'float_range':
        return Array.isArray(value) ? `${value[0]} - ${value[1]}` : '';
      case 'list':
        return Array.isArray(value) ? value.join(', ') : '';
      case 'boolean':
        return value ? 'True' : 'False';
      default:
        return String(value);
    }
  }
</script>

<div class="space-y-6">
  <!-- Filter List -->
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-medium text-gray-900">Filters</h3>
      <button
        class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
        onclick={createNewFilter}
      >
        <span class="material-symbols-outlined text-sm">add</span>
        Add Filter
      </button>
    </div>

    {#if filters.length === 0}
      <div class="py-8 text-center">
        <svg
          class="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z"
          ></path>
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No filters</h3>
        <p class="mt-1 text-sm text-gray-500">Get started by creating a new filter.</p>
      </div>
    {:else}
      <div class="space-y-3">
        {#each filters as filter (filter.id)}
          <div
            class="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h4 class="truncate text-sm font-medium text-gray-900">{filter.name}</h4>
                <span
                  class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800"
                >
                  {filter.type}
                </span>
                {#if filter.active}
                  <span
                    class="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                    >Active</span
                  >
                {:else}
                  <span
                    class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500"
                    >Inactive</span
                  >
                {/if}
              </div>
              <div class="mt-1 flex items-center gap-4 text-sm text-gray-500">
                <span
                  >Key: <code class="rounded bg-gray-100 px-1 py-0.5 text-xs">{filter.key}</code
                  ></span
                >
                <span>Value: {formatFilterValue(filter)}</span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button
                class="text-gray-400 hover:text-gray-600"
                onclick={() => editFilter(filter)}
                title="Edit filter"
              >
                <span class="material-symbols-outlined text-sm">edit</span>
              </button>
              <button
                class="text-red-400 hover:text-red-600"
                onclick={() => deleteFilter(filter.id)}
                title="Delete filter"
              >
                <span class="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Filter Editor Modal -->
<Modal
  isOpen={showFilterEditor}
  title={editingFilter ? 'Edit Filter' : 'Create Filter'}
  size="medium"
  close={closeFilterEditor}
>
  <div class="space-y-6 p-6">
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <!-- Filter Name -->
      <div>
        <label for="filter-name" class="block text-sm font-medium text-gray-700">Name</label>
        <input
          id="filter-name"
          type="text"
          bind:value={newFilter.name}
          class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:text-sm"
          placeholder="Filter display name"
        />
      </div>

      <!-- Filter Key -->
      <div>
        <label for="filter-key" class="block text-sm font-medium text-gray-700">Key</label>
        <input
          id="filter-key"
          type="text"
          bind:value={newFilter.key}
          class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:text-sm"
          placeholder="filter_key"
        />
      </div>

      <!-- Filter Type -->
      <div>
        <label for="filter-type" class="block text-sm font-medium text-gray-700">Type</label>
        <select
          id="filter-type"
          bind:value={newFilter.type}
          class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:text-sm"
        >
          <option value="string">String</option>
          <option value="integer">Integer</option>
          <option value="float">Float</option>
          <option value="boolean">Boolean</option>
          <option value="date">Date</option>
          <option value="date_range">Date Range</option>
          <option value="integer_range">Integer Range</option>
          <option value="float_range">Float Range</option>
          <option value="list">List</option>
        </select>
      </div>

      <!-- Active Toggle -->
      <div class="flex items-center">
        <input
          id="filter-active"
          type="checkbox"
          bind:checked={newFilter.active}
          class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label for="filter-active" class="ml-2 block text-sm text-gray-900">Active</label>
      </div>
    </div>

    <!-- Initial Value -->
    <div>
      <label class="block text-sm font-medium text-gray-700">Initial Value</label>
      {#if newFilter.type === 'boolean'}
        <select
          id="filter-initial-value"
          bind:value={newFilter.initialValue}
          class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:text-sm"
        >
          <option value={true}>True</option>
          <option value={false}>False</option>
        </select>
      {:else if newFilter.type === 'date'}
        <div class="mt-1 space-y-2">
          <div class="flex items-center">
            <input
              id="filter-use-now"
              type="checkbox"
              bind:checked={newFilter.useNow}
              class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label for="filter-use-now" class="ml-2 block text-sm text-gray-900"
              >Use current date (now)</label
            >
          </div>
          {#if !newFilter.useNow}
            <input
              id="filter-initial-value"
              type="date"
              bind:value={newFilter.initialValue}
              class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:text-sm"
            />
          {/if}
        </div>
      {:else if newFilter.type === 'date_range'}
        <div class="mt-1 space-y-3">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="date-range-start" class="mb-1 block text-xs text-gray-500"
                >Start Date</label
              >
              <input
                id="date-range-start"
                type="date"
                bind:value={initialDateRangeStart}
                class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:text-sm"
              />
            </div>
            <div>
              <label for="date-range-end" class="mb-1 block text-xs text-gray-500">End Date</label>
              {#if !newFilter.useNowEnd}
                <input
                  id="date-range-end"
                  type="date"
                  bind:value={initialDateRangeEnd}
                  class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:text-sm"
                />
              {:else}
                <div
                  class="flex h-[38px] items-center rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500"
                >
                  Now (current date)
                </div>
              {/if}
            </div>
          </div>
          <div class="flex items-center">
            <input
              id="filter-use-now-end"
              type="checkbox"
              bind:checked={newFilter.useNowEnd}
              class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label for="filter-use-now-end" class="ml-2 block text-sm text-gray-900"
              >Use current date for end (now)</label
            >
          </div>
        </div>
      {:else if newFilter.type === 'integer_range'}
        <div class="mt-1 grid grid-cols-2 gap-4">
          <div>
            <label for="int-range-start" class="mb-1 block text-xs text-gray-500">Start Value</label
            >
            <input
              id="int-range-start"
              type="number"
              step="1"
              bind:value={initialRangeStart}
              class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:text-sm"
            />
          </div>
          <div>
            <label for="int-range-end" class="mb-1 block text-xs text-gray-500">End Value</label>
            <input
              id="int-range-end"
              type="number"
              step="1"
              bind:value={initialRangeEnd}
              class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:text-sm"
            />
          </div>
        </div>
      {:else if newFilter.type === 'float_range'}
        <div class="mt-1 grid grid-cols-2 gap-4">
          <div>
            <label for="float-range-start" class="mb-1 block text-xs text-gray-500"
              >Start Value</label
            >
            <input
              id="float-range-start"
              type="number"
              step="0.01"
              bind:value={initialRangeStart}
              class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:text-sm"
            />
          </div>
          <div>
            <label for="float-range-end" class="mb-1 block text-xs text-gray-500">End Value</label>
            <input
              id="float-range-end"
              type="number"
              step="0.01"
              bind:value={initialRangeEnd}
              class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:text-sm"
            />
          </div>
        </div>
      {:else if newFilter.type === 'integer' || newFilter.type === 'float'}
        <input
          id="filter-initial-value"
          type="number"
          step={newFilter.type === 'float' ? '0.01' : '1'}
          bind:value={newFilter.initialValue}
          class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:text-sm"
        />
      {:else if newFilter.type === 'list'}
        <p class="mt-1 text-sm text-gray-500">
          Initial value will be set from selected options below
        </p>
      {:else}
        <input
          id="filter-initial-value"
          type="text"
          bind:value={newFilter.initialValue}
          class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:text-sm"
          placeholder="Default value"
        />
      {/if}
    </div>

    <!-- Range Min/Max for range types -->
    {#if newFilter.type?.includes('range')}
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="filter-min" class="block text-sm font-medium text-gray-700">Minimum</label>
          <input
            id="filter-min"
            type="number"
            step={newFilter.type === 'float_range' ? '0.01' : '1'}
            bind:value={newFilter.min}
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:text-sm"
          />
        </div>
        <div>
          <label for="filter-max" class="block text-sm font-medium text-gray-700">Maximum</label>
          <input
            id="filter-max"
            type="number"
            step={newFilter.type === 'float_range' ? '0.01' : '1'}
            bind:value={newFilter.max}
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:text-sm"
          />
        </div>
      </div>
    {/if}

    <!-- Options for list type -->
    {#if newFilter.type === 'list'}
      <div class="space-y-4">
        <div class="flex items-center gap-4">
          <label class="flex items-center gap-2">
            <input
              type="radio"
              name="options-source"
              checked={!useQueryForOptions}
              onchange={() => {
                useQueryForOptions = false;
              }}
              class="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700">Manual Options</span>
          </label>
          <label class="flex items-center gap-2">
            <input
              type="radio"
              name="options-source"
              checked={useQueryForOptions}
              onchange={() => {
                useQueryForOptions = true;
              }}
              class="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700">Generate from Query</span>
          </label>
        </div>

        {#if useQueryForOptions}
          <div class="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div>
              <label for="options-query" class="block text-sm font-medium text-gray-700"
                >SQL Query</label
              >
              <textarea
                id="options-query"
                rows="3"
                bind:value={newFilter.optionsQuery}
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="SELECT label, value FROM table"
              ></textarea>
              <p class="mt-1 text-xs text-gray-500">
                Query should return columns for label and value
              </p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="label-column" class="block text-sm font-medium text-gray-700"
                  >Label Column</label
                >
                <input
                  id="label-column"
                  type="text"
                  bind:value={newFilter.labelColumn}
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  placeholder="First column if empty"
                />
              </div>
              <div>
                <label for="value-column" class="block text-sm font-medium text-gray-700"
                  >Value Column</label
                >
                <input
                  id="value-column"
                  type="text"
                  bind:value={newFilter.valueColumn}
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  placeholder="Second column if empty"
                />
              </div>
            </div>

            <div class="flex items-center gap-3">
              <button
                type="button"
                onclick={testOptionsQuery}
                disabled={!newFilter.optionsQuery || testingQuery || !dashboardService}
                class="inline-flex items-center gap-2 rounded-md bg-gray-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {#if testingQuery}
                  <span class="material-symbols-outlined animate-spin text-sm"
                    >progress_activity</span
                  >
                  Testing...
                {:else}
                  <span class="material-symbols-outlined text-sm">play_arrow</span>
                  Test Query
                {/if}
              </button>
              {#if !dashboardService}
                <span class="text-xs text-amber-600">Dashboard service required for testing</span>
              {/if}
            </div>

            {#if queryTestError}
              <div class="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {queryTestError}
              </div>
            {/if}

            {#if queryTestResult}
              <div class="space-y-2">
                <div class="text-sm font-medium text-gray-700">
                  Preview ({queryTestResult.length} options)
                </div>
                <div class="max-h-40 overflow-y-auto rounded-md border border-gray-200 bg-white">
                  <table class="min-w-full divide-y divide-gray-200 text-sm">
                    <thead class="bg-gray-50">
                      <tr>
                        <th class="px-3 py-2 text-left font-medium text-gray-500">Label</th>
                        <th class="px-3 py-2 text-left font-medium text-gray-500">Value</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                      {#each queryTestResult.slice(0, 10) as opt}
                        <tr>
                          <td class="px-3 py-2 text-gray-900">{opt.label}</td>
                          <td class="px-3 py-2 text-gray-500">{opt.value}</td>
                        </tr>
                      {/each}
                      {#if queryTestResult.length > 10}
                        <tr>
                          <td colspan="2" class="px-3 py-2 text-center text-gray-500">
                            ... and {queryTestResult.length - 10} more
                          </td>
                        </tr>
                      {/if}
                    </tbody>
                  </table>
                </div>
              </div>
            {/if}
          </div>
        {:else}
          <div>
            <div class="flex items-center justify-between">
              <div class="block text-sm font-medium text-gray-700">Options</div>
              <button
                type="button"
                onclick={addFilterOption}
                class="text-sm text-blue-600 hover:text-blue-500"
              >
                Add Option
              </button>
            </div>
            <div class="mt-2 space-y-2">
              {#each newFilter.options || [] as option, index}
                <div class="flex gap-2">
                  <input
                    type="text"
                    bind:value={option.label}
                    placeholder="Label"
                    class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    bind:value={option.value}
                    placeholder="Value"
                    class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onclick={() => removeFilterOption(index)}
                    class="text-red-600 hover:text-red-500"
                    aria-label="Remove option"
                  >
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                      ></path>
                    </svg>
                  </button>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Description -->
    <div>
      <label for="filter-description" class="block text-sm font-medium text-gray-700"
        >Description</label
      >
      <textarea
        id="filter-description"
        rows="3"
        bind:value={newFilter.description}
        class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:text-sm"
        placeholder="Optional description"
      ></textarea>
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-3">
      <button
        type="button"
        onclick={closeFilterEditor}
        class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
      >
        Cancel
      </button>
      <button
        type="button"
        onclick={saveFilter}
        disabled={!newFilter.key || !newFilter.name}
        class="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        {editingFilter ? 'Update' : 'Create'} Filter
      </button>
    </div>
  </div>
</Modal>
