<script lang="ts">
  import Sidebar from '../ui/Sidebar.svelte';
  import type { Filter } from '../../types/index';

  let {
    isOpen = false,
    filters = $bindable([]),
    onClose = () => {},
    onFilterValueChange = () => {},
    onToggleFilterManager = () => {}
  }: {
    isOpen: boolean;
    filters: Filter[];
    onClose: () => void;
    onFilterValueChange: (filterId: string, value: any) => void;
    onToggleFilterManager: () => void;
  } = $props();

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
    updateFilterValue(filter, currentValue);
  }

  function handleListChange(filter: Filter, event: Event) {
    const target = event.target as HTMLSelectElement;
    const selectedOptions = Array.from(target.selectedOptions);
    const selectedValues = selectedOptions.map((option) => {
      // Try to parse as number first, then return as string
      const numValue = parseFloat(option.value);
      return isNaN(numValue) ? option.value : numValue;
    });
    updateFilterValue(filter, selectedValues);
  }

  const activeFilters = $derived(filters.filter((f) => f.active));
</script>

<Sidebar {isOpen} {onClose} title="Filters">
  {#snippet children()}
    <div class="space-y-6">
      <!-- Header with Manage Button -->
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold tracking-wide text-gray-700 uppercase">Active Filters</h3>
        <button
          class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
          onclick={onToggleFilterManager}
        >
          <span class="material-symbols-outlined text-sm">tune</span>
          Manage
        </button>
      </div>

      {#if activeFilters.length === 0}
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
          <h3 class="mt-2 text-sm font-medium text-gray-900">No active filters</h3>
          <p class="mt-1 text-sm text-gray-500">Create filters using the Manage button above.</p>
        </div>
      {:else}
        {#each activeFilters as filter (filter.id)}
          <div class="space-y-3 border-b border-gray-200 pb-4 last:border-b-0">
            <div class="flex items-center justify-between">
              <div>
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
                value={formatDateForInput(filter.currentValue ?? filter.initialValue)}
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
                  <label for="from" class="mb-1 block text-xs font-medium text-gray-700">From</label
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
                    value={formatDateForInput(currentRange[1])}
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
                  <label for="min" class="mb-1 block text-xs font-medium text-gray-700">Min</label>
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
                  <label for="max" class="mb-1 block text-xs font-medium text-gray-700">Max</label>
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
                  <label for="min" class="mb-1 block text-xs font-medium text-gray-700">Min</label>
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
                  <label for="max" class="mb-1 block text-xs font-medium text-gray-700">Max</label>
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
            {:else if filter.type === 'list' && filter.options}
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
                {#each filter.options as option}
                  <option value={option.value}>{option.label}</option>
                {/each}
              </select>
              <p class="text-xs text-gray-500">Hold Ctrl/Cmd to select multiple options</p>
            {/if}

            <!-- Current Value Display -->
            <div class="text-xs text-gray-500">
              Key: <code class="rounded bg-gray-100 px-1 py-0.5">{filter.key}</code>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {/snippet}
</Sidebar>
