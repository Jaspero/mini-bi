<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Dashboard, IDashboardService, CreateDashboardRequest } from '../../types/index.js';
  import { validateDashboard, generateDashboardId } from '../../utils/validation.js';
  import Modal from '../ui/Modal.svelte';

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

<div class="max-w-screen-xl mx-auto p-6">
  <div class="flex justify-between items-center mb-6">
    <h2 class="m-0 text-2xl font-semibold text-gray-800">Dashboard Manager</h2>
    <button 
      class="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white border-0 rounded-md text-sm font-medium cursor-pointer transition-colors" 
      on:click={showCreateDashboard} 
      disabled={showCreateForm}
    >
      <span class="material-symbols-outlined text-base">add</span>
      New Dashboard
    </button>
  </div>

  {#if error}
    <div class="bg-red-50 border border-red-200 rounded-md text-red-600 px-4 py-3 mb-4 flex justify-between items-center">
      <p class="m-0">{error}</p>
      <button 
        class="bg-transparent border-0 text-red-600 text-lg cursor-pointer p-0 w-6 h-6 hover:bg-red-100 rounded"
        on:click={() => error = ''}
      >
        ×
      </button>
    </div>
  {/if}

  <!-- Dashboard Creation Modal -->
  <Modal 
    isOpen={showCreateForm} 
    on:close={cancelCreate}
    title="Create New Dashboard"
    size="medium"
  >
    <svelte:fragment slot="default">
      {#if error}
        <div class="bg-red-50 border border-red-200 rounded-md p-3 mb-4 text-red-800">
          {error}
        </div>
      {/if}

      <div class="space-y-4">
        <div>
          <label for="dashboard-name" class="block text-sm font-medium text-gray-700 mb-2">
            Dashboard Name *
          </label>
          <input 
            id="dashboard-name"
            type="text" 
            bind:value={newDashboardName} 
            placeholder="Enter dashboard name"
            maxlength="100"
            disabled={creating}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label for="dashboard-description" class="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea 
            id="dashboard-description"
            bind:value={newDashboardDescription} 
            placeholder="Optional description"
            rows="3"
            maxlength="500"
            disabled={creating}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
          ></textarea>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label for="grid-size" class="block text-sm font-medium text-gray-700 mb-2">
              Grid Size (px)
            </label>
            <input 
              id="grid-size"
              type="number" 
              bind:value={gridSize} 
              min="20" 
              max="200" 
              step="10"
              disabled={creating}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label for="columns" class="block text-sm font-medium text-gray-700 mb-2">
              Columns
            </label>
            <input 
              id="columns"
              type="number" 
              bind:value={columns} 
              min="6" 
              max="50"
              disabled={creating}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label for="rows" class="block text-sm font-medium text-gray-700 mb-2">
              Rows
            </label>
            <input 
              id="rows"
              type="number" 
              bind:value={rows} 
              min="6" 
              max="30"
              disabled={creating}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <!-- Canvas Size Configuration -->
        <div class="border-t border-gray-200 pt-4 mt-4">
          <h4 class="text-sm font-medium text-gray-900 mb-4">Canvas Size</h4>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Canvas Width -->
            <div>
              <fieldset>
                <legend class="block text-sm font-medium text-gray-700 mb-2">Canvas Width</legend>
                <div class="space-y-2">
                  <div class="flex items-center">
                    <input 
                      type="radio" 
                      id="width-screen" 
                      value="screen" 
                      bind:group={canvasWidthType}
                      disabled={creating}
                      class="mr-2"
                    />
                    <label for="width-screen" class="text-sm text-gray-700">Screen Width</label>
                  </div>
                  <div class="flex items-center">
                    <input 
                      type="radio" 
                      id="width-fixed" 
                      value="fixed" 
                      bind:group={canvasWidthType}
                      disabled={creating}
                      class="mr-2"
                    />
                    <label for="width-fixed" class="text-sm text-gray-700">Fixed Width:</label>
                    <input 
                      type="number" 
                      bind:value={canvasWidthValue}
                      min="800"
                      max="4000"
                      step="100"
                      disabled={creating || canvasWidthType !== 'fixed'}
                      class="ml-2 w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    />
                    <span class="ml-1 text-sm text-gray-500">px</span>
                  </div>
                </div>
              </fieldset>
            </div>

            <!-- Canvas Height -->
            <div>
              <fieldset>
                <legend class="block text-sm font-medium text-gray-700 mb-2">Canvas Height</legend>
                <div class="space-y-2">
                  <div class="flex items-center">
                    <input 
                      type="radio" 
                      id="height-screen" 
                      value="screen" 
                      bind:group={canvasHeightType}
                      disabled={creating}
                      class="mr-2"
                    />
                    <label for="height-screen" class="text-sm text-gray-700">Screen Height</label>
                  </div>
                  <div class="flex items-center">
                    <input 
                      type="radio" 
                      id="height-fixed" 
                      value="fixed" 
                      bind:group={canvasHeightType}
                      disabled={creating}
                      class="mr-2"
                    />
                    <label for="height-fixed" class="text-sm text-gray-700">Fixed Height:</label>
                    <input 
                      type="number" 
                      bind:value={canvasHeightValue}
                      min="600"
                      max="3000"
                      step="100"
                      disabled={creating || canvasHeightType !== 'fixed'}
                      class="ml-2 w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    />
                    <span class="ml-1 text-sm text-gray-500">px</span>
                  </div>
                </div>
              </fieldset>
            </div>
          </div>
        </div>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="footer">
      <div class="flex justify-end gap-3">
        <button 
          class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
          on:click={cancelCreate} 
          disabled={creating}
        >
          Cancel
        </button>
        <button 
          class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
          on:click={createDashboard} 
          disabled={creating}
        >
          {#if creating}
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Creating...
          {:else}
            Create Dashboard
          {/if}
        </button>
      </div>
    </svelte:fragment>
  </Modal>

  <div>
    {#if loading}
      <div class="flex flex-col items-center justify-center py-15 px-5 text-gray-500">
        <div class="w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
        <p class="m-0">Loading dashboards...</p>
      </div>
    {:else if dashboards.length === 0}
      <div class="flex flex-col items-center justify-center py-15 px-5 text-gray-500 text-center">
        <span class="material-symbols-outlined text-5xl mb-4 opacity-50">dashboard</span>
        <h3 class="m-0 mb-2 text-lg font-semibold">No Dashboards Found</h3>
        <p class="m-0 text-sm">Create your first dashboard to get started</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
        <div 
          class="bg-white border-2 border-dashed border-gray-300 hover:border-blue-600 hover:text-blue-600 rounded-lg p-5 cursor-pointer transition-all shadow-sm flex flex-col items-center justify-center text-center min-h-[140px] text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed" 
          class:disabled={showCreateForm}
          on:click={showCreateDashboard}
          on:keydown={(e) => e.key === 'Enter' && showCreateDashboard()}
          role="button"
          tabindex="0"
        >
          <div class="mb-3 opacity-70">
            <span class="material-symbols-outlined text-3xl opacity-70">add</span>
          </div>
          <h4 class="m-0 text-base font-semibold text-gray-800 mb-1">Create New Dashboard</h4>
          <p class="m-0 text-sm">Start building a new dashboard</p>
        </div>

        {#each dashboards as dashboard}
          <div 
            class="bg-white border border-gray-200 hover:border-blue-600 rounded-lg p-5 cursor-pointer transition-all shadow-sm hover:shadow-lg" 
            class:!border-blue-600={currentDashboardId === dashboard.id}
            class:!bg-blue-50={currentDashboardId === dashboard.id}
            on:click={() => selectDashboard(dashboard.id)}
            on:keydown={(e) => e.key === 'Enter' && selectDashboard(dashboard.id)}
            role="button"
            tabindex="0"
          >
            <div class="flex justify-between items-start mb-2">
              <h4 class="m-0 text-base font-semibold text-gray-800 flex-1">{dashboard.name}</h4>
              <button 
                class="bg-transparent border-0 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer p-1 rounded transition-all ml-2" 
                on:click={(e) => deleteDashboard(dashboard, e)}
                disabled={deleting}
                aria-label="Delete dashboard"
              >
                <span class="material-symbols-outlined text-base">delete</span>
              </button>
            </div>
            
            {#if dashboard.description}
              <p class="m-0 mb-3 text-sm text-gray-500 leading-relaxed">{dashboard.description}</p>
            {/if}
            
            <div class="flex justify-between items-center text-xs text-gray-400">
              <span class="font-medium">{dashboard.blocks.length} blocks</span>
              <span>Modified {formatDate(dashboard.lastModified)}</span>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>


