<script lang="ts">
  import Sidebar from '../ui/Sidebar.svelte';
  import type { Filter, IDashboardService, FilterOption, QueryColumn } from '../../types/index';

  let {
    isOpen = false,
    filters = $bindable([]),
    readOnly = false,
    onClose = () => {},
    onFilterValueChange = () => {},
    onToggleFilterManager = () => {},
    onToggleFilterActive = () => {},
    dashboardService
  }: {
    isOpen: boolean;
    filters: Filter[];
    readOnly?: boolean;
    onClose: () => void;
    onFilterValueChange: (filterId: string, value: any) => void;
    onToggleFilterManager: () => void;
    onToggleFilterActive: (filterId: string) => void;
    dashboardService?: IDashboardService;
  } = $props();

  let queryOptions: Record<string, FilterOption[]> = $state({});
  let loadingOptions: Record<string, boolean> = $state({});

  $effect(() => {
    for (const filter of filters) {
      if (filter.optionsQuery && !queryOptions[filter.id] && !loadingOptions[filter.id]) {
        loadQueryOptions(filter);
      }
    }
  });

  async function loadQueryOptions(filter: Filter) {
    if (!filter.optionsQuery || !dashboardService) {
      return;
    }

    loadingOptions[filter.id] = true;
    try {
      const result = await dashboardService.getQueryPreview(filter.optionsQuery, 1000);

      if (result.error || result.columns.length < 1) {
        queryOptions[filter.id] = [];
        return;
      }

      const labelCol = filter.labelColumn || result.columns[0].name;
      const valueCol = filter.valueColumn || result.columns[1]?.name || result.columns[0].name;

      const labelIndex = result.columns.findIndex((c: QueryColumn) => c.name === labelCol);
      const valueIndex = result.columns.findIndex((c: QueryColumn) => c.name === valueCol);

      if (labelIndex === -1 || valueIndex === -1) {
        queryOptions[filter.id] = [];
        return;
      }

      queryOptions[filter.id] = result.rows.map((row: any[]) => ({
        label: String(row[labelIndex]),
        value: row[valueIndex]
      }));
    } catch {
      queryOptions[filter.id] = [];
    } finally {
      loadingOptions[filter.id] = false;
    }
  }

  function getFilterOptions(filter: Filter): FilterOption[] {
    if (filter.optionsQuery) {
      return queryOptions[filter.id] || [];
    }
    return filter.options || [];
  }

  function updateFilterValue(filter: Filter, value: any) {
    onFilterValueChange(filter.id, value);
  }

  function resetFilter(filter: Filter) {
    onFilterValueChange(filter.id, filter.initialValue);
  }

  function formatDateForInput(date: Date | string): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  }

  function handleDateChange(filter: Filter, event: Event) {
    const target = event.target as HTMLInputElement;
    const newDate = new Date(target.value);
    if (filter.useNow) {
      filter.useNow = false;
    }
    updateFilterValue(filter, newDate);
  }

  function handleRangeChange(filter: Filter, index: number, value: any) {
    const currentValue = Array.isArray(filter.currentValue)
      ? [...filter.currentValue]
      : [filter.initialValue, filter.initialValue];
    currentValue[index] = filter.type.includes('float') ? parseFloat(value) : parseInt(value);
    updateFilterValue(filter, currentValue);
  }

  function handleDateRangeChange(filter: Filter, index: number, event: Event) {
    const target = event.target as HTMLInputElement;
    const newDate = new Date(target.value);
    const currentValue = Array.isArray(filter.currentValue)
      ? [...filter.currentValue]
      : [new Date(), new Date()];
    currentValue[index] = newDate;
    if (index === 1 && filter.useNowEnd) {
      filter.useNowEnd = false;
    }
    updateFilterValue(filter, currentValue);
  }

  function handleListChange(filter: Filter, event: Event) {
    const target = event.target as HTMLSelectElement;
    const selectedOptions = Array.from(target.selectedOptions);
    const selectedValues = selectedOptions.map((option) => {
      const numValue = parseFloat(option.value);
      return isNaN(numValue) ? option.value : numValue;
    });
    updateFilterValue(filter, selectedValues);
  }
</script>

<Sidebar {isOpen} {onClose} title="Filters">
  {#snippet children()}
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold tracking-wide text-gray-700 uppercase">Filters</h3>
        {#if !readOnly}
          <button
            class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
            onclick={onToggleFilterManager}
          >
            <span class="material-symbols-outlined text-sm">tune</span>
            Manage
          </button>
        {/if}
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
          <p class="mt-1 text-sm text-gray-500">Create filters using the Manage button above.</p>
        </div>
      {:else}
        {#each filters as filter (filter.id)}
          <div
            class="space-y-3 border-b border-gray-200 pb-4 last:border-b-0 {!filter.active
              ? 'opacity-50'
              : ''}"
          >
            <div class="flex items-center justify-between gap-3">
              <button class="flex-shrink-0" onclick={() => onToggleFilterActive(filter.id)}>
                <div
                  class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none {filter.active
                    ? 'bg-blue-600'
                    : 'bg-gray-200'}"
                >
                  <span class="sr-only">Toggle filter</span>
                  <span
                    class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out {filter.active
                      ? 'translate-x-4'
                      : 'translate-x-0'}"
                  ></span>
                </div>
              </button>
              <div class="min-w-0 flex-1">
                <h4 class="text-sm font-medium text-gray-900">{filter.name}</h4>
                {#if filter.description}
                  <p class="mt-1 text-xs text-gray-500">{filter.description}</p>
                {/if}
              </div>
              <button
                onclick={() => resetFilter(filter)}
                class="text-xs text-blue-600 hover:text-blue-500"
                title="Reset to default value"
              >
                Reset
              </button>
            </div>

            {#if filter.active}
              <!-- String Input -->
              {#if filter.type === 'string'}
                <input
                  type="text"
                  value={filter.currentValue ?? filter.initialValue}
                  oninput={(e) =>
                    updateFilterValue(filter, (e.target as HTMLInputElement)?.value || '')}
                  placeholder={filter.placeholder || 'Enter value...'}
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />

                <!-- Integer Input -->
              {:else if filter.type === 'integer'}
                <input
                  type="number"
                  step="1"
                  value={filter.currentValue ?? filter.initialValue}
                  oninput={(e) =>
                    updateFilterValue(
                      filter,
                      parseInt((e.target as HTMLInputElement)?.value || '0') || 0
                    )}
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />

                <!-- Float Input -->
              {:else if filter.type === 'float'}
                <input
                  type="number"
                  step="0.01"
                  value={filter.currentValue ?? filter.initialValue}
                  oninput={(e) =>
                    updateFilterValue(
                      filter,
                      parseFloat((e.target as HTMLInputElement)?.value || '0') || 0
                    )}
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />

                <!-- Boolean Select -->
              {:else if filter.type === 'boolean'}
                <select
                  value={filter.currentValue ?? filter.initialValue}
                  onchange={(e) =>
                    updateFilterValue(filter, (e.target as HTMLSelectElement)?.value === 'true')}
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value={true}>True</option>
                  <option value={false}>False</option>
                </select>

                <!-- Date Input -->
              {:else if filter.type === 'date'}
                <input
                  type="date"
                  value={formatDateForInput(
                    filter.useNow ? new Date() : (filter.currentValue ?? filter.initialValue)
                  )}
                  onchange={(e) => handleDateChange(filter, e)}
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />

                <!-- Date Range -->
              {:else if filter.type === 'date_range'}
                {@const currentRange = Array.isArray(filter.currentValue)
                  ? filter.currentValue
                  : Array.isArray(filter.initialValue)
                    ? filter.initialValue
                    : [new Date(), new Date()]}
                <div class="space-y-2">
                  <div>
                    <label for="from" class="mb-1 block text-xs font-medium text-gray-700"
                      >From</label
                    >
                    <input
                      id="from"
                      type="date"
                      value={formatDateForInput(currentRange[0])}
                      onchange={(e) => handleDateRangeChange(filter, 0, e)}
                      class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label for="to" class="mb-1 block text-xs font-medium text-gray-700">To</label>
                    <input
                      id="to"
                      type="date"
                      value={formatDateForInput(filter.useNowEnd ? new Date() : currentRange[1])}
                      onchange={(e) => handleDateRangeChange(filter, 1, e)}
                      class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <!-- Integer Range -->
              {:else if filter.type === 'integer_range'}
                {@const currentRange = Array.isArray(filter.currentValue)
                  ? filter.currentValue
                  : Array.isArray(filter.initialValue)
                    ? filter.initialValue
                    : [filter.min || 0, filter.max || 100]}
                <div class="space-y-2">
                  <div>
                    <label for="min" class="mb-1 block text-xs font-medium text-gray-700">Min</label
                    >
                    <input
                      id="min"
                      type="number"
                      step="1"
                      min={filter.min}
                      max={filter.max}
                      value={currentRange[0]}
                      oninput={(e) =>
                        handleRangeChange(filter, 0, (e.target as HTMLInputElement)?.value || '')}
                      class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label for="max" class="mb-1 block text-xs font-medium text-gray-700">Max</label
                    >
                    <input
                      id="max"
                      type="number"
                      step="1"
                      min={filter.min}
                      max={filter.max}
                      value={currentRange[1]}
                      oninput={(e) =>
                        handleRangeChange(filter, 1, (e.target as HTMLInputElement)?.value || '')}
                      class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <!-- Float Range -->
              {:else if filter.type === 'float_range'}
                {@const currentRange = Array.isArray(filter.currentValue)
                  ? filter.currentValue
                  : Array.isArray(filter.initialValue)
                    ? filter.initialValue
                    : [filter.min || 0, filter.max || 100]}
                <div class="space-y-2">
                  <div>
                    <label for="min" class="mb-1 block text-xs font-medium text-gray-700">Min</label
                    >
                    <input
                      id="min"
                      type="number"
                      step="0.01"
                      min={filter.min}
                      max={filter.max}
                      value={currentRange[0]}
                      oninput={(e) =>
                        handleRangeChange(filter, 0, (e.target as HTMLInputElement)?.value || '')}
                      class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label for="max" class="mb-1 block text-xs font-medium text-gray-700">Max</label
                    >
                    <input
                      id="max"
                      type="number"
                      step="0.01"
                      min={filter.min}
                      max={filter.max}
                      value={currentRange[1]}
                      oninput={(e) =>
                        handleRangeChange(filter, 1, (e.target as HTMLInputElement)?.value || '')}
                      class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <!-- List Select -->
              {:else if filter.type === 'list'}
                {@const options = getFilterOptions(filter)}
                {#if loadingOptions[filter.id]}
                  <div class="flex items-center justify-center py-4 text-sm text-gray-500">
                    <span class="material-symbols-outlined mr-2 animate-spin text-sm"
                      >progress_activity</span
                    >
                    Loading options...
                  </div>
                {:else if options.length > 0}
                  <select
                    multiple
                    value={Array.isArray(filter.currentValue)
                      ? filter.currentValue
                      : Array.isArray(filter.initialValue)
                        ? filter.initialValue
                        : []}
                    onchange={(e) => handleListChange(filter, e)}
                    class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    style="min-height: 80px;"
                  >
                    {#each options as option}
                      <option value={option.value}>{option.label}</option>
                    {/each}
                  </select>
                  <p class="text-xs text-gray-500">Hold Ctrl/Cmd to select multiple options</p>
                {:else}
                  <p class="text-xs text-gray-500">No options available</p>
                {/if}
              {/if}

              <!-- Current Value Display -->
              <div class="text-xs text-gray-500">
                Key: <code class="rounded bg-gray-100 px-1 py-0.5">{filter.key}</code>
              </div>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  {/snippet}
</Sidebar>
