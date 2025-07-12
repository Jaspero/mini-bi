<script lang="ts">
  import { onMount, createEventDispatcher, onDestroy } from 'svelte';
  import type {
    Dashboard,
    Block,
    IDashboardService,
    BlockConfig,
    Query
  } from '../../types/index.js';
  import DashboardCanvas from './DashboardCanvas.svelte';
  import BlockEditor from './BlockEditor.svelte';
  import ConfirmationModal from '../ui/ConfirmationModal.svelte';

  export let dashboardId: string | null = null;
  export let dashboardService: IDashboardService;
  export let queries: Query[] = [];
  export let editable = true;
  export let queryManagerOpen: boolean = false;
  export let dashboardManagerOpen: boolean = false;
  export let availableDashboardsCount: number = 0;

  const dispatch = createEventDispatcher<{
    'dashboard-loaded': { dashboard: Dashboard };
    'dashboard-updated': { dashboard: Dashboard };
    'dashboard-saved': { dashboard: Dashboard };
    'block-edit': { block: Block };
    'block-delete': { blockId: string };
    'toggle-query-manager': void;
    'toggle-dashboard-manager': void;
  }>();

  let dashboard: Dashboard | null = null;
  let loading = true;
  let error = '';
  let saving = false;
  let hasUnsavedChanges = false;
  let editingBlock: Block | null = null;
  let showBlockEditor = false;
  let editMode = true; // true = edit mode (controls visible, no drag/resize), false = move mode (drag/resize enabled, no controls)
  let showAddBlockDropdown = false;

  // Block deletion confirmation modal state
  let showBlockDeleteModal = false;
  let blockToDelete: Block | null = null;

  // Reactive statement to reload dashboard when dashboardId changes
  $: if (dashboardId) {
    loadDashboard();
  } else if (dashboardId === null) {
    dashboard = null;
    loading = false;
  }

  onMount(async () => {
    if (dashboardId) {
      await loadDashboard();
    } else {
      // Create a new dashboard
      dashboard = createNewDashboard();
      loading = false;
    }

    // Add global click listener for dropdown
    window.addEventListener('click', handleClickOutside);
  });

  onDestroy(() => {
    window.removeEventListener('click', handleClickOutside);
  });

  async function loadDashboard() {
    if (!dashboardId) return;

    try {
      loading = true;
      error = '';

      const dashboards = await dashboardService.loadDashboards();
      const foundDashboard = dashboards.find((d) => d.id === dashboardId);

      if (!foundDashboard) {
        throw new Error(`Dashboard with ID ${dashboardId} not found`);
      }

      dashboard = foundDashboard;
      dispatch('dashboard-loaded', { dashboard });
      loading = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load dashboard';
      loading = false;
    }
  }

  function createNewDashboard(): Dashboard {
    return {
      id: '',
      name: 'New Dashboard',
      description: '',
      created: new Date(),
      lastModified: new Date(),
      layout: {
        gridSize: 80,
        columns: 20,
        rows: 15,
        gap: 10,
        canvasWidth: { type: 'fixed', value: 1600 },
        canvasHeight: { type: 'fixed', value: 1000 }
      },
      blocks: [],
      variables: {}
    };
  }

  async function saveDashboard() {
    if (!dashboard) return;

    try {
      saving = true;

      let savedDashboard: Dashboard;
      if (dashboard.id) {
        // Update existing dashboard
        savedDashboard = await dashboardService.updateDashboard(dashboard.id, {
          name: dashboard.name,
          description: dashboard.description,
          layout: dashboard.layout,
          blocks: dashboard.blocks,
          variables: dashboard.variables
        });
      } else {
        // Create new dashboard
        savedDashboard = await dashboardService.createDashboard({
          name: dashboard.name,
          description: dashboard.description,
          layout: dashboard.layout,
          blocks: dashboard.blocks,
          variables: dashboard.variables
        });
      }

      dashboard = savedDashboard;
      hasUnsavedChanges = false;
      dispatch('dashboard-saved', { dashboard });
      saving = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save dashboard';
      saving = false;
    }
  }

  function handleDashboardUpdated(event: CustomEvent<{ dashboard: Dashboard }>) {
    dashboard = event.detail.dashboard;
    hasUnsavedChanges = true;
    dispatch('dashboard-updated', { dashboard });
  }

  function handleBlockMoved(event: CustomEvent<{ blockId: string; position: any }>) {
    hasUnsavedChanges = true;
  }

  function handleBlockResized(event: CustomEvent<{ blockId: string; size: any }>) {
    hasUnsavedChanges = true;
  }

  function handleBlockEdit(event: CustomEvent<{ block: Block }>) {
    editingBlock = event.detail.block;
    showBlockEditor = true;
  }

  function handleBlockDelete(event: CustomEvent<{ blockId: string }>) {
    // Remove the block from the dashboard
    if (dashboard) {
      dashboard.blocks = dashboard.blocks.filter((block) => block.id !== event.detail.blockId);
      hasUnsavedChanges = true;
      dispatch('dashboard-updated', { dashboard });
      dispatch('block-delete', { blockId: event.detail.blockId });
    }
  }

  function requestBlockDeletion(event: CustomEvent<{ block: Block }>) {
    blockToDelete = event.detail.block;
    showBlockDeleteModal = true;
  }

  function confirmBlockDeletion() {
    if (!blockToDelete) return;
    
    // Call the existing delete handler with the block ID
    handleBlockDelete(new CustomEvent('block-delete', { 
      detail: { blockId: blockToDelete.id } 
    }));
    
    blockToDelete = null;
    showBlockDeleteModal = false;
  }

  function cancelBlockDeletion() {
    blockToDelete = null;
    showBlockDeleteModal = false;
  }

  function handleBlockEditorSave(event: CustomEvent<{ block: Block }>) {
    if (dashboard) {
      dashboard.blocks = dashboard.blocks.map((b) =>
        b.id === event.detail.block.id ? event.detail.block : b
      );
      hasUnsavedChanges = true;
      dispatch('dashboard-updated', { dashboard });
    }
  }

  function handleBlockEditorClose() {
    showBlockEditor = false;
    editingBlock = null;
  }

  function toggleEditMode() {
    editMode = !editMode;
  }

  async function refresh() {
    if (dashboardId) {
      await loadDashboard();
    }
  }

  function generateBlockId(): string {
    return 'block-' + Math.random().toString(36).substr(2, 9);
  }

  function addNewBlock(type: 'table' | 'graph' | 'text') {
    if (!dashboard) return;

    // Find a good position for the new block
    const gridSize = dashboard.layout.gridSize;
    const defaultSize = { width: 4, height: 3 };

    // Simple placement algorithm - try to place blocks in a grid pattern
    const blocksPerRow = Math.floor(dashboard.layout.columns / defaultSize.width);
    const existingBlocks = dashboard.blocks.length;
    const row = Math.floor(existingBlocks / blocksPerRow);
    const col = existingBlocks % blocksPerRow;

    const position = {
      x: col * defaultSize.width,
      y: row * defaultSize.height
    };

    // Create the new block based on type
    const newBlock: Block = {
      id: generateBlockId(),
      type,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Block`,
      position,
      size: defaultSize,
      config: getDefaultConfig(type)
    };

    // Add the block to the dashboard
    dashboard.blocks = [...dashboard.blocks, newBlock];
    hasUnsavedChanges = true;
    dispatch('dashboard-updated', { dashboard });
  }

  function getDefaultConfig(type: 'table' | 'graph' | 'text'): BlockConfig {
    switch (type) {
      case 'table':
        return {
          columns: [
            {
              key: 'name',
              header: 'Name',
              type: 'string',
              sortable: true,
              filterable: true
            },
            {
              key: 'value',
              header: 'Value',
              type: 'string',
              sortable: true,
              filterable: true
            }
          ],
          pagination: {
            enabled: false,
            pageSize: 10
          },
          sorting: {
            enabled: true
          },
          filtering: {
            enabled: false,
            type: 'text'
          }
        } as any;
      case 'graph':
        return {
          chartType: 'bar',
          series: [
            {
              name: 'Series 1',
              dataKey: 'value'
            }
          ],
          xAxis: {
            type: 'category',
            name: 'Category'
          },
          yAxis: {
            type: 'value',
            name: 'Value'
          },
          legend: {
            show: true,
            position: 'top',
            align: 'center'
          },
          colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'],
          animations: {
            enabled: true,
            duration: 750,
            easing: 'quadraticOut'
          }
        } as any;
      case 'text':
        return {
          content: '<p>This is a new text block. Click edit to customize its content.</p>',
          variables: {},
          styling: {
            fontSize: 14,
            fontFamily: 'Arial, sans-serif',
            color: '#374151',
            padding: 16,
            textAlign: 'left',
            fontWeight: 'normal',
            fontStyle: 'normal'
          }
        } as any;
      default:
        return {};
    }
  }

  function toggleAddBlockDropdown() {
    showAddBlockDropdown = !showAddBlockDropdown;
  }

  function handleAddBlock(type: 'table' | 'graph' | 'text') {
    addNewBlock(type);
    showAddBlockDropdown = false;
  }

  function handleClickOutside(event: MouseEvent) {
    if (showAddBlockDropdown) {
      const target = event.target as HTMLElement;
      const addBlockContainer = document.querySelector('.add-block-container');

      if (addBlockContainer && !addBlockContainer.contains(target)) {
        showAddBlockDropdown = false;
      }
    }
  }
</script>

<div class="min-h-screen bg-gray-50">
  {#if loading}
    <div class="flex min-h-screen items-center justify-center">
      <div class="text-center">
        <div
          class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"
        ></div>
        <p class="text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  {:else if error}
    <div class="flex min-h-screen items-center justify-center">
      <div class="max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
        <h2 class="mb-4 text-xl font-semibold text-red-600">Error Loading Dashboard</h2>
        <p class="mb-6 text-gray-600">{error}</p>
        <button
          class="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          on:click={refresh}
        >
          Try Again
        </button>
      </div>
    </div>
  {:else if dashboard}
    <div class="sticky top-0 z-30 border-b border-gray-200 bg-white">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between py-2 sm:py-4 gap-2">
          <div class="flex flex-1 items-baseline gap-2 sm:gap-4 min-w-0">
            <div class="min-w-0 flex-1">
              <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5">
                <h2 class="text-lg sm:text-2xl font-bold text-gray-900 truncate">{dashboard.name}</h2>
                <div class="flex items-center gap-2">
                  <button
                    class="inline-flex h-8 w-8 items-center justify-center rounded-md text-purple-600 transition-colors hover:bg-purple-50 hover:text-purple-700 touch-manipulation"
                    class:!bg-purple-100={dashboardManagerOpen}
                    class:!text-purple-700={dashboardManagerOpen}
                    on:click={() => dispatch('toggle-dashboard-manager')}
                    title="{dashboardManagerOpen
                      ? 'Close'
                      : 'Manage'} Dashboards ({availableDashboardsCount} available)"
                    aria-label="{dashboardManagerOpen ? 'Close' : 'Manage'} dashboards"
                  >
                    <span class="material-symbols-outlined text-lg">dashboard</span>
                  </button>
                  <button
                    class="inline-flex h-8 w-8 items-center justify-center rounded-md text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 touch-manipulation"
                    class:!bg-blue-100={queryManagerOpen}
                    class:!text-blue-700={queryManagerOpen}
                    on:click={() => dispatch('toggle-query-manager')}
                    title="{queryManagerOpen
                      ? 'Close'
                      : 'Manage'} Queries ({queries.length} available)"
                    aria-label="{queryManagerOpen ? 'Close' : 'Manage'} queries"
                  >
                    <span class="material-symbols-outlined text-lg">database</span>
                  </button>
                </div>
              </div>
              {#if dashboard.description}
                <p class="hidden mt-1 text-sm text-gray-600 truncate lg:block">{dashboard.description}</p>
              {/if}
            </div>
          </div>

          {#if editable}
            <div class="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
              {#if hasUnsavedChanges}
                <span
                  class="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800"
                >
                  <span class="material-symbols-outlined mr-1 text-xs">warning</span>
                  <span class="hidden sm:inline">Unsaved changes</span>
                  <span class="sm:hidden">Unsaved</span>
                </span>
              {/if}

              <div class="add-block-container relative">
                <button
                  class="inline-flex h-8 sm:h-10 w-8 sm:w-10 items-center justify-center rounded-md text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 touch-manipulation"
                  on:click={toggleAddBlockDropdown}
                  title="Add new block"
                  aria-label="Add new block"
                >
                  <span class="material-symbols-outlined text-lg sm:text-xl">add</span>
                </button>
                {#if showAddBlockDropdown}
                  <div
                    class="ring-opacity-5 absolute right-0 z-50 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black"
                  >
                    <div class="py-1">
                      <button
                        class="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 touch-manipulation"
                        on:click={() => handleAddBlock('table')}
                      >
                        <span class="material-symbols-outlined mr-3 text-base">table</span>
                        Table Block
                      </button>
                      <button
                        class="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 touch-manipulation"
                        on:click={() => handleAddBlock('graph')}
                      >
                        <span class="material-symbols-outlined mr-3 text-base">bar_chart</span>
                        Graph Block
                      </button>
                      <button
                        class="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 touch-manipulation"
                        on:click={() => handleAddBlock('text')}
                      >
                        <span class="material-symbols-outlined mr-3 text-base">text_fields</span>
                        Text Block
                      </button>
                    </div>
                  </div>
                {/if}
              </div>

              <button
                class="inline-flex h-8 sm:h-10 w-8 sm:w-10 items-center justify-center rounded-md text-green-600 transition-colors hover:bg-green-50 hover:text-green-700 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
                class:animate-pulse={saving}
                disabled={saving || !hasUnsavedChanges}
                on:click={saveDashboard}
                title={saving ? 'Saving...' : 'Save Dashboard'}
                aria-label={saving ? 'Saving dashboard' : 'Save dashboard'}
              >
                {#if saving}
                  <div class="h-4 w-4 sm:h-5 sm:w-5 animate-spin rounded-full border-b-2 border-current"></div>
                {:else}
                  <span class="material-symbols-outlined text-lg sm:text-xl">save</span>
                {/if}
              </button>

              <button
                class="inline-flex h-8 sm:h-10 w-8 sm:w-10 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-700 touch-manipulation"
                on:click={refresh}
                title="Refresh dashboard"
                aria-label="Refresh dashboard"
              >
                <span class="material-symbols-outlined text-lg sm:text-xl">refresh</span>
              </button>

              <button
                class="inline-flex h-8 sm:h-10 w-8 sm:w-10 items-center justify-center rounded-md text-purple-600 transition-colors hover:bg-purple-50 hover:text-purple-700 touch-manipulation"
                class:!bg-purple-100={editMode}
                class:!text-purple-700={editMode}
                on:click={toggleEditMode}
                title={editMode ? 'Switch to move mode' : 'Switch to edit mode'}
                aria-label={editMode ? 'Switch to move mode' : 'Switch to edit mode'}
              >
                {#if editMode}
                  <span class="material-symbols-outlined text-lg sm:text-xl">open_with</span>
                {:else}
                  <span class="material-symbols-outlined text-lg sm:text-xl">edit</span>
                {/if}
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <div class="flex-1">
      <DashboardCanvas
        {dashboard}
        {dashboardService}
        editable={editable && !editMode}
        editMode={editable && editMode}
        on:dashboard-updated={handleDashboardUpdated}
        on:block-moved={handleBlockMoved}
        on:block-resized={handleBlockResized}
        on:block-edit={handleBlockEdit}
        on:block-delete={handleBlockDelete}
        on:block-delete-request={requestBlockDeletion}
      />
    </div>
  {/if}
</div>

<BlockEditor
  block={editingBlock}
  isOpen={showBlockEditor}
  {queries}
  on:block-updated={handleBlockEditorSave}
  on:close={handleBlockEditorClose}
/>

<!-- Block Deletion Confirmation Modal -->
<ConfirmationModal
  isOpen={showBlockDeleteModal}
  title="Delete Block"
  message={blockToDelete ? `Are you sure you want to delete the "${blockToDelete.title}" ${blockToDelete.type}? This action cannot be undone.` : ''}
  confirmText="Delete"
  cancelText="Cancel"
  on:confirm={confirmBlockDeletion}
  on:cancel={cancelBlockDeletion}
/>
