<script lang="ts">
  import Modal from '../ui/Modal.svelte';
  import type { Filter } from '../../types/index.ts';

  let {
    filters = $bindable([]),
    isOpen = false,
    onClose = () => {},
    onFiltersChange = () => {}
  }: {
    filters: Filter[];
    isOpen: boolean;
    onClose: () => void;
    onFiltersChange: (filters: Filter[]) => void;
  } = $props();

  let editingFilter: Filter | null = $state(null);
  let showFilterEditor = $state(false);
  let newFilter: Partial<Filter> = $state({});

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
    editingFilter = null;
    showFilterEditor = true;
  }

  function editFilter(filter: Filter) {
    editingFilter = filter;
    newFilter = { ...filter };
    showFilterEditor = true;
  }

  function saveFilter() {
    if (!newFilter.key || !newFilter.name) {
      return;
    }

    const filterId = editingFilter?.id || 'filter-' + Math.random().toString(36).substr(2, 9);
    
    const savedFilter: Filter = {
      id: filterId,
      key: newFilter.key!,
      name: newFilter.name!,
      type: newFilter.type!,
      active: newFilter.active ?? true,
      initialValue: getTypedValue(newFilter.initialValue, newFilter.type!),
      currentValue: getTypedValue(newFilter.currentValue || newFilter.initialValue, newFilter.type!),
      options: newFilter.options || [],
      min: newFilter.min,
      max: newFilter.max,
      placeholder: newFilter.placeholder,
      description: newFilter.description
    };

    if (editingFilter) {
      filters = filters.map(f => f.id === filterId ? savedFilter : f);
    } else {
      filters = [...filters, savedFilter];
    }

    onFiltersChange(filters);
    closeFilterEditor();
  }

  function deleteFilter(filterId: string) {
    filters = filters.filter(f => f.id !== filterId);
    onFiltersChange(filters);
  }

  function toggleFilterActive(filterId: string) {
    filters = filters.map(f => 
      f.id === filterId ? { ...f, active: !f.active } : f
    );
    onFiltersChange(filters);
  }

  function updateFilterValue(filterId: string, value: any) {
    filters = filters.map(f => 
      f.id === filterId ? { ...f, currentValue: value } : f
    );
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

  function formatFilterValue(filter: Filter): string {
    const value = filter.currentValue ?? filter.initialValue;
    
    switch (filter.type) {
      case 'date':
        return value instanceof Date ? value.toLocaleDateString() : String(value);
      case 'date_range':
        return Array.isArray(value) ? `${value[0]?.toLocaleDateString()} - ${value[1]?.toLocaleDateString()}` : '';
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

<Modal isOpen={isOpen} title="Filter Management" size="large" close={onClose}>
  <div class="space-y-6 p-6">
    <!-- Filter List -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-medium text-gray-900">Active Filters</h3>
        <button
          class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          onclick={createNewFilter}
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Add Filter
        </button>
      </div>

      {#if filters.length === 0}
        <div class="text-center py-8">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z"></path>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No filters</h3>
          <p class="mt-1 text-sm text-gray-500">Get started by creating a new filter.</p>
        </div>
      {:else}
        <div class="space-y-3">
          {#each filters as filter (filter.id)}
            <div class="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-3">
                  <button
                    class="flex-shrink-0"
                    onclick={() => toggleFilterActive(filter.id)}
                  >
                    <div class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 {filter.active ? 'bg-blue-600' : 'bg-gray-200'}">
                      <span class="sr-only">Toggle filter</span>
                      <span class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out {filter.active ? 'translate-x-4' : 'translate-x-0'}"></span>
                    </div>
                  </button>
                  
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <h4 class="text-sm font-medium text-gray-900 truncate">{filter.name}</h4>
                      <span class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                        {filter.type}
                      </span>
                    </div>
                    <div class="mt-1 flex items-center gap-4 text-sm text-gray-500">
                      <span>Key: <code class="text-xs bg-gray-100 px-1 py-0.5 rounded">{filter.key}</code></span>
                      <span>Value: {formatFilterValue(filter)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="flex items-center gap-2">
                <button
                  class="text-gray-400 hover:text-gray-600"
                  onclick={() => editFilter(filter)}
                  title="Edit filter"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                </button>
                <button
                  class="text-red-400 hover:text-red-600"
                  onclick={() => deleteFilter(filter.id)}
                  title="Delete filter"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</Modal>

<!-- Filter Editor Modal -->
<Modal isOpen={showFilterEditor} title={editingFilter ? 'Edit Filter' : 'Create Filter'} size="medium" close={closeFilterEditor}>
  <div class="space-y-6 p-6">
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <!-- Filter Name -->
      <div>
        <label for="filter-name" class="block text-sm font-medium text-gray-700">Name</label>
        <input
          id="filter-name"
          type="text"
          bind:value={newFilter.name}
          class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
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
          class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
          placeholder="filter_key"
        />
      </div>

      <!-- Filter Type -->
      <div>
        <label for="filter-type" class="block text-sm font-medium text-gray-700">Type</label>
        <select
          id="filter-type"
          bind:value={newFilter.type}
          class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
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
      <label for="filter-initial-value" class="block text-sm font-medium text-gray-700">Initial Value</label>
      {#if newFilter.type === 'boolean'}
        <select
          id="filter-initial-value"
          bind:value={newFilter.initialValue}
          class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
        >
          <option value={true}>True</option>
          <option value={false}>False</option>
        </select>
      {:else if newFilter.type === 'date'}
        <input
          id="filter-initial-value"
          type="date"
          bind:value={newFilter.initialValue}
          class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
        />
      {:else if newFilter.type === 'integer' || newFilter.type === 'float'}
        <input
          id="filter-initial-value"
          type="number"
          step={newFilter.type === 'float' ? '0.01' : '1'}
          bind:value={newFilter.initialValue}
          class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
        />
      {:else}
        <input
          id="filter-initial-value"
          type="text"
          bind:value={newFilter.initialValue}
          class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
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
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <label for="filter-max" class="block text-sm font-medium text-gray-700">Maximum</label>
          <input
            id="filter-max"
            type="number"
            step={newFilter.type === 'float_range' ? '0.01' : '1'}
            bind:value={newFilter.max}
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>
    {/if}

    <!-- Options for list type -->
    {#if newFilter.type === 'list'}
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
                class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                bind:value={option.value}
                placeholder="Value"
                class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onclick={() => removeFilterOption(index)}
                class="text-red-600 hover:text-red-500"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Description -->
    <div>
      <label for="filter-description" class="block text-sm font-medium text-gray-700">Description</label>
      <textarea
        id="filter-description"
        rows="3"
        bind:value={newFilter.description}
        class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
        placeholder="Optional description"
      ></textarea>
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-3">
      <button
        type="button"
        onclick={closeFilterEditor}
        class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Cancel
      </button>
      <button
        type="button"
        onclick={saveFilter}
        disabled={!newFilter.key || !newFilter.name}
        class="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {editingFilter ? 'Update' : 'Create'} Filter
      </button>
    </div>
  </div>
</Modal>
