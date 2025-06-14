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

  function hideCreateForm() {
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

<!-- Dashboard Manager Content -->
<div class="h-full flex flex-col">
  {#if error}
    <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">{error}</div>
  {/if}

  {#if showCreateForm}
    <!-- Dashboard Creation Form -->
    <div class="h-full flex flex-col">
      <!-- Fixed Header -->
      <div class="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 class="text-lg font-semibold text-gray-900">New Dashboard</h3>
        <button 
          class="p-2 text-gray-500 hover:text-gray-700 transition-colors"
          on:click={hideCreateForm}
        >
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- Scrollable Content Area -->
      <div class="flex-1 overflow-y-auto pr-2 -mr-2">
        <div class="space-y-4">
          <div>
            <label for="sidebar-dashboard-name" class="block text-sm font-medium text-gray-700 mb-2">
              Dashboard Name *
            </label>
            <input 
              id="sidebar-dashboard-name"
              type="text" 
              bind:value={newDashboardName} 
              placeholder="Enter dashboard name"
              maxlength="100"
              disabled={creating}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label for="sidebar-dashboard-description" class="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea 
              id="sidebar-dashboard-description"
              bind:value={newDashboardDescription} 
              placeholder="Optional description"
              rows="3"
              maxlength="500"
              disabled={creating}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            ></textarea>
          </div>

          <!-- Canvas Size Configuration -->
          <div class="border-t border-gray-200 pt-4">
            <h4 class="text-sm font-semibold text-gray-900 mb-3">Canvas Size</h4>
            
            <div class="space-y-4">
              <!-- Canvas Width -->
              <div>
                <span class="block text-sm font-medium text-gray-700 mb-2">Width</span>
                <div class="space-y-2">
                  <div class="flex gap-4">
                    <label class="flex items-center">
                      <input
                        type="radio"
                        bind:group={canvasWidthType}
                        value="screen"
                        class="mr-2"
                      />
                      <span class="text-sm">Screen</span>
                    </label>
                    <label class="flex items-center">
                      <input
                        type="radio"
                        bind:group={canvasWidthType}
                        value="fixed"
                        class="mr-2"
                      />
                      <span class="text-sm">Fixed</span>
                    </label>
                  </div>
                  {#if canvasWidthType === 'fixed'}
                    <input
                      type="number"
                      bind:value={canvasWidthValue}
                      min="800"
                      max="4000"
                      step="100"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Width in pixels"
                    />
                  {/if}
                </div>
              </div>

              <!-- Canvas Height -->
              <div>
                <span class="block text-sm font-medium text-gray-700 mb-2">Height</span>
                <div class="space-y-2">
                  <div class="flex gap-4">
                    <label class="flex items-center">
                      <input
                        type="radio"
                        bind:group={canvasHeightType}
                        value="screen"
                        class="mr-2"
                      />
                      <span class="text-sm">Screen</span>
                    </label>
                    <label class="flex items-center">
                      <input
                        type="radio"
                        bind:group={canvasHeightType}
                        value="fixed"
                        class="mr-2"
                      />
                      <span class="text-sm">Fixed</span>
                    </label>
                  </div>
                  {#if canvasHeightType === 'fixed'}
                    <input
                      type="number"
                      bind:value={canvasHeightValue}
                      min="600"
                      max="3000"
                      step="100"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Height in pixels"
                    />
                  {/if}
                </div>
              </div>

              <!-- Grid Settings -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="sidebar-grid-size" class="block text-sm font-medium text-gray-700 mb-2">
                    Grid Size
                  </label>
                  <input
                    id="sidebar-grid-size"
                    type="number"
                    bind:value={gridSize}
                    min="20"
                    max="200"
                    step="5"
                    disabled={creating}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label for="sidebar-columns" class="block text-sm font-medium text-gray-700 mb-2">
                    Columns
                  </label>
                  <input
                    id="sidebar-columns"
                    type="number"
                    bind:value={columns}
                    min="5"
                    max="50"
                    step="1"
                    disabled={creating}
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Add some bottom padding to ensure content doesn't get hidden behind the footer -->
          <div class="h-4"></div>
        </div>
      </div>

      <!-- Fixed Footer -->
      <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
        <button 
          type="button"
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          on:click={hideCreateForm}
          disabled={creating}
        >
          Cancel
        </button>
        <button 
          type="button"
          class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          on:click={createDashboard} 
          disabled={creating || !newDashboardName.trim()}
        >
          {creating ? 'Creating...' : 'Create Dashboard'}
        </button>
      </div>
    </div>
  {:else}
    <!-- Dashboard List -->
    <div class="h-full flex flex-col">
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

      <div class="flex-1 overflow-y-auto">
        <div class="space-y-3">
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
      </div>
    </div>
  {/if}
</div>


