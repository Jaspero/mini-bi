<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import html2canvas from 'html2canvas-pro';
  import type {
    Dashboard,
    Block,
    IDashboardService,
    BlockConfig,
    Query,
    Filter
  } from '../../types/index';
  import DashboardCanvas from './DashboardCanvas.svelte';
  import BlockEditor from './BlockEditor.svelte';
  import ConfirmationModal from '../ui/ConfirmationModal.svelte';
  import FilterSidebar from './FilterSidebar.svelte';
  import FilterManager from './FilterManager.svelte';

  interface Props {
    dashboardId?: string | null;
    dashboardService: IDashboardService;
    queries?: Query[];
    editable?: boolean;
    queryManagerOpen?: boolean;
    dashboardManagerOpen?: boolean;
    availableDashboardsCount?: number;
    toggleQueryManager?: () => void;
    toggleDashboardManager?: () => void;
  }

  let {
    dashboardId = null,
    dashboardService,
    queries = [],
    editable = true,
    queryManagerOpen = false,
    dashboardManagerOpen = false,
    availableDashboardsCount = 0,
    toggleQueryManager = () => {},
    toggleDashboardManager = () => {}
  }: Props = $props();

  let dashboard: Dashboard | null = $state(null);
  let loading = $state(true);
  let error = $state('');
  let saving = $state(false);
  let hasUnsavedChanges = $state(false);
  let editingBlock: Block | null = $state(null);
  let showBlockEditor = $state(false);
  let editMode = $state(true);
  let showAddBlockDropdown = $state(false);
  let isExporting = $state(false);

  // Block deletion confirmation modal state
  let showBlockDeleteModal = $state(false);
  let blockToDelete: Block | null = $state(null);

  // Filter management state
  let filters: Filter[] = $state([]);
  let showFilterSidebar = $state(false);
  let showFilterManager = $state(false);

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

  $effect(() => {
    if (dashboardId) {
      loadDashboard();
    } else if (dashboardId === null) {
      dashboard = null;
      loading = false;
    }
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
      filters = foundDashboard.filters || [];
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
      variables: {},
      filters: []
    };
  }

  // Filter management functions
  function toggleFilterSidebar() {
    showFilterSidebar = !showFilterSidebar;
  }

  function toggleFilterManager() {
    showFilterManager = !showFilterManager;
  }

  function closeFilterManager() {
    showFilterManager = false;
  }

  function onFiltersChange(newFilters: Filter[]) {
    filters = newFilters;
    hasUnsavedChanges = true;
  }

  function onFilterValueChange(filterId: string, value: any) {
    filters = filters.map((f) => (f.id === filterId ? { ...f, currentValue: value } : f));
    // Filters changing values doesn't mark as unsaved since these are runtime values
  }

  // Get active filter values for use in queries
  function getActiveFilterValues(): Record<string, any> {
    const activeFilters = filters.filter((f) => f.active);
    const filterValues: Record<string, any> = {};

    for (const filter of activeFilters) {
      filterValues[filter.key] = filter.currentValue ?? filter.initialValue;
    }

    return filterValues;
  }

  async function saveDashboard() {
    if (!dashboard) return;

    try {
      saving = true;

      let savedDashboard: Dashboard;
      if (dashboard.id) {
        savedDashboard = await dashboardService.updateDashboard(dashboard.id, {
          name: dashboard.name,
          description: dashboard.description,
          layout: dashboard.layout,
          blocks: dashboard.blocks,
          variables: dashboard.variables,
          filters: filters
        });
      } else {
        savedDashboard = await dashboardService.createDashboard({
          name: dashboard.name,
          description: dashboard.description,
          layout: dashboard.layout,
          blocks: dashboard.blocks,
          variables: dashboard.variables,
          filters: filters
        });
      }

      dashboard = savedDashboard;
      hasUnsavedChanges = false;
      saving = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save dashboard';
      saving = false;
    }
  }

  function onDashboardUpdated(d: Dashboard) {
    dashboard = d;
    hasUnsavedChanges = true;
  }

  function onBlockMoved() {
    hasUnsavedChanges = true;
  }

  function onBlockResized() {
    hasUnsavedChanges = true;
  }

  function onBlockEdit(block: Block) {
    editingBlock = block;
    showBlockEditor = true;
  }

  function onBlockDeleteRequest(block: Block) {
    blockToDelete = block;
    showBlockDeleteModal = true;
  }

  function confirmBlockDeletion() {
    if (!blockToDelete) {
      return;
    }

    if (dashboard) {
      dashboard.blocks = dashboard.blocks.filter((block) => block.id !== blockToDelete!.id);
      hasUnsavedChanges = true;
    }

    blockToDelete = null;
    showBlockDeleteModal = false;
  }

  function cancelBlockDeletion() {
    blockToDelete = null;
    showBlockDeleteModal = false;
  }

  function blockUpdated(block: Block) {
    if (dashboard) {
      dashboard.blocks = dashboard.blocks.map((b) => (b.id === block.id ? block : b));
      hasUnsavedChanges = true;
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
          colors: [
            'var(--color-primary)',
            'var(--color-danger)',
            'var(--color-accent)',
            'var(--color-warning)'
          ],
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
            color: 'var(--color-text)',
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

  async function exportDashboardAsImage() {
    if (!dashboard) return;

    try {
      isExporting = true;

      // Find the dashboard canvas element
      const canvasElement = document.querySelector('.dashboard-canvas') as HTMLElement;

      if (!canvasElement) {
        throw new Error('Dashboard canvas not found');
      }

      const canvas = await html2canvas(canvasElement, {
        scrollX: -window.scrollX,
        scrollY: -window.scrollY,
        background:
          getComputedStyle(document.documentElement).getPropertyValue('--color-bg') || '#f9fafb',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: canvasElement.scrollWidth,
        height: canvasElement.scrollHeight
      } as any);

      // Create download link
      const link = document.createElement('a');
      link.download = `${dashboard.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_dashboard.png`;
      link.href = canvas.toDataURL('image/png', 1);

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      isExporting = false;
    } catch (err) {
      console.error('Failed to export dashboard:', err);
      error = err instanceof Error ? err.message : 'Failed to export dashboard';
      isExporting = false;
    }
  }

  const themeColors = [
    'var(--color-primary)',
    'var(--color-danger)',
    'var(--color-accent)',
    'var(--color-warning)'
  ];
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
          onclick={refresh}
        >
          Try Again
        </button>
      </div>
    </div>
  {:else if dashboard}
    <div class="sticky top-0 z-30 border-b border-gray-200 bg-white">
      <div class="px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between gap-2 py-2 sm:py-4">
          <div class="flex min-w-0 flex-1 items-baseline gap-2 sm:gap-4">
            <div class="min-w-0 flex-1">
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
                <h2 class="truncate text-lg font-bold text-gray-900 sm:text-2xl">
                  {dashboard.name}
                </h2>
                <div class="flex items-center gap-2">
                  <button
                    class="inline-flex h-8 w-8 touch-manipulation items-center justify-center rounded-md text-purple-600 transition-colors hover:bg-purple-50 hover:text-purple-700"
                    class:!bg-purple-100={dashboardManagerOpen}
                    class:!text-purple-700={dashboardManagerOpen}
                    onclick={() => toggleDashboardManager()}
                    title="{dashboardManagerOpen
                      ? 'Close'
                      : 'Manage'} Dashboards ({availableDashboardsCount} available)"
                    aria-label="{dashboardManagerOpen ? 'Close' : 'Manage'} dashboards"
                  >
                    <span class="material-symbols-outlined text-lg">dashboard</span>
                  </button>
                  <button
                    class="inline-flex h-8 w-8 touch-manipulation items-center justify-center rounded-md text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
                    class:!bg-blue-100={queryManagerOpen}
                    class:!text-blue-700={queryManagerOpen}
                    onclick={() => toggleQueryManager()}
                    title="{queryManagerOpen
                      ? 'Close'
                      : 'Manage'} Queries ({queries.length} available)"
                    aria-label="{queryManagerOpen ? 'Close' : 'Manage'} queries"
                  >
                    <span class="material-symbols-outlined text-lg">database</span>
                  </button>
                  <button
                    class="inline-flex h-8 w-8 touch-manipulation items-center justify-center rounded-md text-green-600 transition-colors hover:bg-green-50 hover:text-green-700"
                    class:!bg-green-100={showFilterSidebar}
                    class:!text-green-700={showFilterSidebar}
                    onclick={() => toggleFilterSidebar()}
                    title="{showFilterSidebar ? 'Close' : 'Show'} Filters ({filters.filter(
                      (f) => f.active
                    ).length} active)"
                    aria-label="{showFilterSidebar ? 'Close' : 'Show'} filters"
                  >
                    <span class="material-symbols-outlined text-lg">filter_alt</span>
                  </button>
                </div>
              </div>
              {#if dashboard.description}
                <p class="mt-1 hidden truncate text-sm text-gray-600 lg:block">
                  {dashboard.description}
                </p>
              {/if}
            </div>
          </div>

          {#if editable}
            <div class="flex flex-shrink-0 items-center space-x-1 sm:space-x-2">
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
                  class="inline-flex h-8 w-8 touch-manipulation items-center justify-center rounded-md text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 sm:h-10 sm:w-10"
                  onclick={toggleAddBlockDropdown}
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
                        class="flex w-full touch-manipulation items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onclick={() => handleAddBlock('table')}
                      >
                        <span class="material-symbols-outlined mr-3 text-base">table</span>
                        Table Block
                      </button>
                      <button
                        class="flex w-full touch-manipulation items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onclick={() => handleAddBlock('graph')}
                      >
                        <span class="material-symbols-outlined mr-3 text-base">bar_chart</span>
                        Graph Block
                      </button>
                      <button
                        class="flex w-full touch-manipulation items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onclick={() => handleAddBlock('text')}
                      >
                        <span class="material-symbols-outlined mr-3 text-base">text_fields</span>
                        Text Block
                      </button>
                    </div>
                  </div>
                {/if}
              </div>

              <button
                class="inline-flex h-8 w-8 touch-manipulation items-center justify-center rounded-md text-green-600 transition-colors hover:bg-green-50 hover:text-green-700 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-10"
                class:animate-pulse={saving}
                disabled={saving || !hasUnsavedChanges}
                onclick={saveDashboard}
                title={saving ? 'Saving...' : 'Save Dashboard'}
                aria-label={saving ? 'Saving dashboard' : 'Save dashboard'}
              >
                {#if saving}
                  <div
                    class="h-4 w-4 animate-spin rounded-full border-b-2 border-current sm:h-5 sm:w-5"
                  ></div>
                {:else}
                  <span class="material-symbols-outlined text-lg sm:text-xl">save</span>
                {/if}
              </button>

              <button
                class="inline-flex h-8 w-8 touch-manipulation items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-700 sm:h-10 sm:w-10"
                onclick={refresh}
                title="Refresh dashboard"
                aria-label="Refresh dashboard"
              >
                <span class="material-symbols-outlined text-lg sm:text-xl">refresh</span>
              </button>

              <button
                class="inline-flex h-8 w-8 touch-manipulation items-center justify-center rounded-md text-orange-600 transition-colors hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-10"
                class:animate-pulse={isExporting}
                disabled={isExporting}
                onclick={exportDashboardAsImage}
                title={isExporting ? 'Exporting...' : 'Export dashboard as image'}
                aria-label={isExporting ? 'Exporting dashboard' : 'Export dashboard as image'}
              >
                {#if isExporting}
                  <div
                    class="h-4 w-4 animate-spin rounded-full border-b-2 border-current sm:h-5 sm:w-5"
                  ></div>
                {:else}
                  <span class="material-symbols-outlined text-lg sm:text-xl">download</span>
                {/if}
              </button>

              <button
                class="inline-flex h-8 w-8 touch-manipulation items-center justify-center rounded-md text-purple-600 transition-colors hover:bg-purple-50 hover:text-purple-700 sm:h-10 sm:w-10"
                class:!bg-purple-100={editMode}
                class:!text-purple-700={editMode}
                onclick={toggleEditMode}
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
        filterParams={getActiveFilterValues()}
        {onDashboardUpdated}
        {onBlockMoved}
        {onBlockResized}
        {onBlockEdit}
        {onBlockDeleteRequest}
      />
    </div>
  {/if}
</div>

<BlockEditor
  block={editingBlock}
  isOpen={showBlockEditor}
  {queries}
  {blockUpdated}
  close={handleBlockEditorClose}
/>

<!-- Block Deletion Confirmation Modal -->
<ConfirmationModal
  isOpen={showBlockDeleteModal}
  title="Delete Block"
  message={blockToDelete
    ? `Are you sure you want to delete the "${blockToDelete.title}" ${blockToDelete.type}? This action cannot be undone.`
    : ''}
  confirmText="Delete"
  cancelText="Cancel"
  onConfirm={confirmBlockDeletion}
  onCancel={cancelBlockDeletion}
/>

<!-- Filter Sidebar -->
<FilterSidebar
  isOpen={showFilterSidebar}
  bind:filters
  onClose={() => (showFilterSidebar = false)}
  {onFilterValueChange}
  onToggleFilterManager={toggleFilterManager}
/>

<!-- Filter Manager Sidebar -->
{#if showFilterManager}
  <div
    class="fixed inset-0 z-30 bg-black/30 transition-opacity"
    onclick={closeFilterManager}
    onkeydown={(e) => e.key === 'Escape' && closeFilterManager()}
    role="button"
    tabindex="-1"
  ></div>

  <div
    class="fixed top-0 flex h-full w-full flex-col bg-white shadow-2xl transition-all duration-300 sm:w-[500px]"
    class:z-40={true}
    style="right: {showFilterSidebar
      ? typeof window !== 'undefined' && window.innerWidth < 640
        ? '0'
        : '24rem'
      : '0'}"
  >
    <div class="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-4">
      <h2 class="text-lg font-semibold text-gray-900">Filter Management</h2>
      <button
        class="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
        onclick={closeFilterManager}
        aria-label="Close filter manager"
      >
        <span class="material-symbols-outlined text-xl">close</span>
      </button>
    </div>
    <div class="h-full flex-1 overflow-y-auto p-4">
      <FilterManager
        isOpen={true}
        onClose={closeFilterManager}
        dashboardId={dashboardId || ''}
        bind:filters
        {onFiltersChange}
      />
    </div>
  </div>
{/if}

<style>
  /* Removed unused .dashboard-surface selector */
</style>
