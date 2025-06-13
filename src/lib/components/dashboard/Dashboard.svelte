<script lang="ts">
  import { onMount, createEventDispatcher, onDestroy } from 'svelte';
  import type { Dashboard, Block, IDashboardService, BlockConfig, Query } from '../../types/index.js';
  import DashboardCanvas from './DashboardCanvas.svelte';
  import BlockEditor from './BlockEditor.svelte';

  export let dashboardId: string | null = null;
  export let dashboardService: IDashboardService;
  export let queries: Query[] = [];
  export let editable = true;

  const dispatch = createEventDispatcher<{
    'dashboard-loaded': { dashboard: Dashboard };
    'dashboard-updated': { dashboard: Dashboard };
    'dashboard-saved': { dashboard: Dashboard };
    'block-edit': { block: Block };
    'block-delete': { blockId: string };
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
      const foundDashboard = dashboards.find(d => d.id === dashboardId);
      
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
        gap: 10
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
      dashboard.blocks = dashboard.blocks.filter(block => block.id !== event.detail.blockId);
      hasUnsavedChanges = true;
      dispatch('dashboard-updated', { dashboard });
      dispatch('block-delete', { blockId: event.detail.blockId });
    }
  }

  function handleBlockEditorSave(event: CustomEvent<{ block: Block }>) {
    if (dashboard) {
      dashboard.blocks = dashboard.blocks.map(b => 
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
    <div class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p class="text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  {:else if error}
    <div class="flex items-center justify-center min-h-screen">
      <div class="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
        <h2 class="text-xl font-semibold text-red-600 mb-4">Error Loading Dashboard</h2>
        <p class="text-gray-600 mb-6">{error}</p>
        <button class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600" on:click={refresh}>
          Try Again
        </button>
      </div>
    </div>
  {:else if dashboard}
    <div class="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-4">
          <div class="flex-1">
            <h1 class="text-2xl font-bold text-gray-900">{dashboard.name}</h1>
            {#if dashboard.description}
              <p class="text-gray-600 mt-1">{dashboard.description}</p>
            {/if}
          </div>
          
          {#if editable}
            <div class="flex items-center space-x-4">
              {#if hasUnsavedChanges}
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 001.414 1.414l2.293-2.293 4.293 4.293a1 1 0 001.414-1.414l-5-5z" clip-rule="evenodd" />
                  </svg>
                  Unsaved changes
                </span>
              {/if}
              <div class="relative">
                <button 
                  class="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  on:click={toggleAddBlockDropdown}
                  aria-label="Add new block"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="mr-2">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                  Add Block
                </button>
                {#if showAddBlockDropdown}
                  <div class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <div class="py-1">
                      <button 
                        class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        on:click={() => handleAddBlock('table')}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="mr-3">
                          <path d="M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h18v2H3v-2zm0 4h18v2H3v-2z"/>
                        </svg>
                        Table Block
                      </button>
                      <button 
                        class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        on:click={() => handleAddBlock('graph')}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="mr-3">
                          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                        </svg>
                        Graph Block
                      </button>
                      <button 
                        class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        on:click={() => handleAddBlock('text')}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="mr-3">
                          <path d="M5 4v3h5.5v12h3V7H19V4H5z"/>
                        </svg>
                        Text Block
                      </button>
                    </div>
                  </div>
                {/if}
              </div>
              <button 
                class="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                class:animate-pulse={saving}
                disabled={saving || !hasUnsavedChanges}
                on:click={saveDashboard}
              >
                {#if saving}
                  <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                {:else}
                  Save Dashboard
                {/if}
              </button>
              <button class="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md" on:click={refresh} aria-label="Refresh dashboard">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
                </svg>
              </button>
              <button 
                class="inline-flex items-center px-3 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
                class:bg-purple-600={editMode}
                on:click={toggleEditMode} 
                aria-label={editMode ? 'Switch to move mode' : 'Switch to edit mode'}
              >
                {#if editMode}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="mr-2">
                    <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM19 20H5V9h14v11z"/>
                  </svg>
                  Move Mode
                {:else}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="mr-2">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41L18.37 3.29a.996.996 0 0 0-1.41 0L15.13 5.12l3.75 3.75 1.83-1.83z"/>
                  </svg>
                  Edit Mode
                {/if}
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-auto">
      <DashboardCanvas 
        {dashboard} 
        {dashboardService}
        {queries}
        editable={editable && !editMode}
        editMode={editable && editMode}
        on:dashboard-updated={handleDashboardUpdated}
        on:block-moved={handleBlockMoved}
        on:block-resized={handleBlockResized}
        on:block-edit={handleBlockEdit}
        on:block-delete={handleBlockDelete}
      />
    </div>
  {/if}
</div>

<!-- Block Editor Modal -->
<BlockEditor 
  block={editingBlock}
  isOpen={showBlockEditor}
  queries={queries}
  on:block-updated={handleBlockEditorSave}
  on:close={handleBlockEditorClose}
/>


