<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Dashboard, IDashboardService, CreateDashboardRequest } from '../../types/index.js';
  import { validateDashboard, generateDashboardId } from '../../utils/validation.js';

  export let dashboardService: IDashboardService;
  export let currentDashboardId: string | null = null;

  const dispatch = createEventDispatcher();

  let dashboards: Dashboard[] = [];
  let loading = true;
  let showCreateForm = false;
  let creating = false;
  let deleting = false;
  let error = '';

  // Create form fields
  let newDashboardName = '';
  let newDashboardDescription = '';
  let gridSize = 80;
  let columns = 20;
  let rows = 15;
  let canvasWidthType = 'fixed';
  let canvasWidthValue = 1600;
  let canvasHeightType = 'fixed';
  let canvasHeightValue = 1000;

  $: loadDashboards();

  async function loadDashboards() {
    try {
      loading = true;
      error = '';
      dashboards = await dashboardService.loadDashboards();
      loading = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load dashboards';
      loading = false;
    }
  }

  function selectDashboard(dashboardId: string | null) {
    dispatch('dashboard-selected', { dashboardId });
  }

  function showCreateDashboard() {
    showCreateForm = true;
    newDashboardName = '';
    newDashboardDescription = '';
    gridSize = 80;
    columns = 20;
    rows = 15;
    canvasWidthType = 'fixed';
    canvasWidthValue = 1600;
    canvasHeightType = 'fixed';
    canvasHeightValue = 1000;
  }

  function cancelCreate() {
    showCreateForm = false;
    newDashboardName = '';
    newDashboardDescription = '';
    canvasWidthType = 'fixed';
    canvasWidthValue = 1600;
    canvasHeightType = 'fixed';
    canvasHeightValue = 1000;
  }

  async function createDashboard() {
    if (!newDashboardName.trim()) {
      error = 'Dashboard name is required';
      return;
    }

    const request: CreateDashboardRequest = {
      name: newDashboardName.trim(),
      description: newDashboardDescription.trim() || undefined,
      layout: {
        gridSize,
        columns,
        rows,
        gap: 10,
        canvasWidth: {
          type: canvasWidthType as 'fixed' | 'screen',
          value: canvasWidthType === 'fixed' ? canvasWidthValue : undefined
        },
        canvasHeight: {
          type: canvasHeightType as 'fixed' | 'screen',
          value: canvasHeightType === 'fixed' ? canvasHeightValue : undefined
        }
      },
      blocks: [],
      variables: {}
    };

    const validation = validateDashboard(request);
    if (!validation.isValid) {
      error = validation.errors.join(', ');
      return;
    }

    try {
      creating = true;
      error = '';
      const newDashboard = await dashboardService.createDashboard(request);
      dashboards = [...dashboards, newDashboard];
      showCreateForm = false;
      dispatch('dashboard-created', { dashboard: newDashboard });
      dispatch('dashboard-selected', { dashboardId: newDashboard.id });
      creating = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create dashboard';
      creating = false;
    }
  }

  async function deleteDashboard(dashboard: Dashboard, event: Event) {
    event.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete "${dashboard.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      deleting = true;
      await dashboardService.deleteDashboard(dashboard.id);
      dashboards = dashboards.filter(d => d.id !== dashboard.id);
      
      if (currentDashboardId === dashboard.id) {
        dispatch('dashboard-selected', { dashboardId: null });
      }
      
      dispatch('dashboard-deleted', { dashboardId: dashboard.id });
      deleting = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to delete dashboard';
      deleting = false;
    }
  }

  function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }
</script>

<!-- Error Display -->
{#if error}
  <div class="bg-red-50 border border-red-200 rounded-md text-red-600 px-3 py-2 mb-4 text-sm">
    <p class="m-0">{error}</p>
  </div>
{/if}



<!-- Create Dashboard Form -->
{#if showCreateForm}
  <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
    <h3 class="text-sm font-semibold text-gray-900 mb-4">Create New Dashboard</h3>
    
    <div class="space-y-4">
      <div>
        <label for="sidebar-dashboard-name" class="block text-xs font-medium text-gray-700 mb-1">
          Dashboard Name *
        </label>
        <input 
          id="sidebar-dashboard-name"
          type="text" 
          bind:value={newDashboardName} 
          placeholder="Enter dashboard name"
          maxlength="100"
          disabled={creating}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
      </div>

      <div>
        <label for="sidebar-dashboard-description" class="block text-xs font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea 
          id="sidebar-dashboard-description"
          bind:value={newDashboardDescription} 
          placeholder="Optional description"
          rows="2"
          maxlength="500"
          disabled={creating}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
        ></textarea>
      </div>

      <!-- Canvas Size Configuration -->
      <div class="border-t border-gray-300 pt-3">
        <h4 class="text-xs font-medium text-gray-900 mb-3">Canvas Size</h4>
        
        <div class="space-y-3">
          <!-- Canvas Width -->
          <div>
            <span class="block text-xs font-medium text-gray-700 mb-1">Width</span>
            <div class="space-y-1">
              <label class="flex items-center text-xs">
                <input 
                  type="radio" 
                  value="screen" 
                  bind:group={canvasWidthType}
                  disabled={creating}
                  class="mr-2 text-xs"
                />
                Screen Width
              </label>
              <label class="flex items-center text-xs">
                <input 
                  type="radio" 
                  value="fixed" 
                  bind:group={canvasWidthType}
                  disabled={creating}
                  class="mr-2"
                />
                Fixed:
                <input 
                  type="number" 
                  bind:value={canvasWidthValue}
                  min="800"
                  max="4000"
                  step="100"
                  disabled={creating || canvasWidthType !== 'fixed'}
                  class="ml-2 w-16 px-1 py-0.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                />
                <span class="ml-1 text-xs text-gray-500">px</span>
              </label>
            </div>
          </div>

          <!-- Canvas Height -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Height</label>
            <div class="space-y-1">
              <label class="flex items-center text-xs">
                <input 
                  type="radio" 
                  value="screen" 
                  bind:group={canvasHeightType}
                  disabled={creating}
                  class="mr-2"
                />
                Screen Height
              </label>
              <label class="flex items-center text-xs">
                <input 
                  type="radio" 
                  value="fixed" 
                  bind:group={canvasHeightType}
                  disabled={creating}
                  class="mr-2"
                />
                Fixed:
                <input 
                  type="number" 
                  bind:value={canvasHeightValue}
                  min="600"
                  max="3000"
                  step="100"
                  disabled={creating || canvasHeightType !== 'fixed'}
                  class="ml-2 w-16 px-1 py-0.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                />
                <span class="ml-1 text-xs text-gray-500">px</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Form Actions -->
    <div class="flex gap-2 mt-4">
      <button 
        class="flex-1 px-3 py-2 text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
        on:click={cancelCreate} 
        disabled={creating}
      >
        Cancel
      </button>
      <button 
        class="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs" 
        on:click={createDashboard} 
        disabled={creating}
      >
        {#if creating}
          <div class="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
          Creating...
        {:else}
          Create
        {/if}
      </button>
    </div>
  </div>
{/if}

<!-- Dashboard List -->
<div class="space-y-3">
  <div class="flex justify-between items-center mb-4 flex-shrink-0">
    <h3 class="text-lg font-medium text-gray-900">Dashboards ({dashboards.length})</h3>
    <button 
      class="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed" 
      on:click={showCreateDashboard} 
      disabled={showCreateForm || creating}
    >
      <span class="material-symbols-outlined text-base mr-2">add</span>
      New Dashboard
    </button>
  </div>
  
  {#if loading}
    <div class="flex flex-col items-center justify-center py-8 text-gray-500">
      <div class="w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-2"></div>
      <p class="text-xs">Loading dashboards...</p>
    </div>
  {:else if dashboards.length === 0}
    <div class="text-center py-8 text-gray-500">
      <span class="material-symbols-outlined text-4xl mb-3 opacity-50 block">dashboard</span>
      <p class="text-xs mb-2 font-medium">No Dashboards Found</p>
      <p class="text-xs">Create your first dashboard to get started</p>
    </div>
  {:else}
    {#each dashboards as dashboard}
      <div 
        class="bg-white border border-gray-200 hover:border-blue-300 rounded-lg p-3 cursor-pointer transition-all shadow-sm hover:shadow-md" 
        class:border-blue-500={currentDashboardId === dashboard.id}
        class:bg-blue-50={currentDashboardId === dashboard.id}
        on:click={() => selectDashboard(dashboard.id)}
        on:keydown={(e) => e.key === 'Enter' && selectDashboard(dashboard.id)}
        role="button"
        tabindex="0"
      >
        <div class="flex justify-between items-start mb-2">
          <h4 class="text-sm font-medium text-gray-900 truncate flex-1 mr-2">{dashboard.name}</h4>
          <button 
            class="text-gray-400 hover:text-red-600 p-1 rounded transition-colors" 
            on:click={(e) => deleteDashboard(dashboard, e)}
            disabled={deleting}
            aria-label="Delete dashboard"
          >
            <span class="material-symbols-outlined text-sm">delete</span>
          </button>
        </div>
        
        {#if dashboard.description}
          <p class="text-xs text-gray-500 mb-2 line-clamp-2">{dashboard.description}</p>
        {/if}
        
        <div class="flex justify-between text-xs text-gray-400">
          <span>{dashboard.blocks.length} blocks</span>
          <span>{formatDate(dashboard.lastModified)}</span>
        </div>
      </div>
    {/each}
  {/if}
</div>


