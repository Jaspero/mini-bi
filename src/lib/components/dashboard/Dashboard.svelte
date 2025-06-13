<script lang="ts">
  import { onMount, createEventDispatcher, onDestroy } from 'svelte';
  import type { Dashboard, Block, IDashboardService, BlockConfig, Query } from '../../types/index.js';
  import DashboardCanvas from './DashboardCanvas.svelte';
  import BlockEditor from './BlockEditor.svelte';
  import QueryManager from './QueryManager.svelte';

  export let dashboardId: string | null = null;
  export let dashboardService: IDashboardService;
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
  let showQueryManager = false;

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
      queries: [],
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
          queries: dashboard.queries,
          variables: dashboard.variables
        });
      } else {
        // Create new dashboard
        savedDashboard = await dashboardService.createDashboard({
          name: dashboard.name,
          description: dashboard.description,
          layout: dashboard.layout,
          blocks: dashboard.blocks,
          queries: dashboard.queries,
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

  function openQueryManager() {
    showQueryManager = true;
  }

  function handleQueriesUpdated(event: CustomEvent<{ queries: Query[] }>) {
    if (dashboard) {
      dashboard.queries = event.detail.queries;
      hasUnsavedChanges = true;
      dispatch('dashboard-updated', { dashboard });
    }
  }

  function handleQueryManagerClose() {
    showQueryManager = false;
  }
</script>

<div class="dashboard">
  {#if loading}
    <div class="dashboard-loading">
      <div class="loading-spinner"></div>
      <p>Loading dashboard...</p>
    </div>
  {:else if error}
    <div class="dashboard-error">
      <h2>Error Loading Dashboard</h2>
      <p>{error}</p>
      <button class="retry-btn" on:click={refresh}>
        Try Again
      </button>
    </div>
  {:else if dashboard}
    <div class="dashboard-header">
      <div class="dashboard-info">
        <h1 class="dashboard-title">{dashboard.name}</h1>
        {#if dashboard.description}
          <p class="dashboard-description">{dashboard.description}</p>
        {/if}
      </div>
      
      {#if editable}
        <div class="dashboard-actions">
          {#if hasUnsavedChanges}
            <span class="unsaved-indicator">Unsaved changes</span>
          {/if}
          <div class="add-block-container">
            <button 
              class="add-block-btn"
              on:click={toggleAddBlockDropdown}
              aria-label="Add new block"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              Add Block
            </button>
            {#if showAddBlockDropdown}
              <div class="add-block-dropdown">
                <button 
                  class="dropdown-item"
                  on:click={() => handleAddBlock('table')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h18v2H3v-2zm0 4h18v2H3v-2z"/>
                  </svg>
                  Table Block
                </button>
                <button 
                  class="dropdown-item"
                  on:click={() => handleAddBlock('graph')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                  </svg>
                  Graph Block
                </button>
                <button 
                  class="dropdown-item"
                  on:click={() => handleAddBlock('text')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5 4v3h5.5v12h3V7H19V4H5z"/>
                  </svg>
                  Text Block
                </button>
              </div>
            {/if}
          </div>
          <button 
            class="queries-btn"
            on:click={openQueryManager}
            aria-label="Manage SQL queries"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            Manage Queries
          </button>
          <button 
            class="save-btn" 
            class:saving
            disabled={saving || !hasUnsavedChanges}
            on:click={saveDashboard}
          >
            {#if saving}
              <div class="button-spinner"></div>
              Saving...
            {:else}
              Save Dashboard
            {/if}
          </button>
          <button class="refresh-btn" on:click={refresh} aria-label="Refresh dashboard">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
            </svg>
          </button>
          <button 
            class="mode-toggle-btn" 
            class:edit-mode={editMode}
            on:click={toggleEditMode} 
            aria-label={editMode ? 'Switch to move mode' : 'Switch to edit mode'}
          >
            {#if editMode}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM19 20H5V9h14v11z"/>
              </svg>
              Move Mode
            {:else}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41L18.37 3.29a.996.996 0 0 0-1.41 0L15.13 5.12l3.75 3.75 1.83-1.83z"/>
              </svg>
              Edit Mode
            {/if}
          </button>
        </div>
      {/if}
    </div>

    <div class="dashboard-content">
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
      />
    </div>
  {/if}
</div>

<!-- Block Editor Modal -->
<BlockEditor 
  block={editingBlock}
  isOpen={showBlockEditor}
  queries={dashboard?.queries || []}
  on:block-updated={handleBlockEditorSave}
  on:close={handleBlockEditorClose}
/>

<!-- Query Manager Modal -->
<QueryManager 
  queries={dashboard?.queries || []}
  {dashboardService}
  isOpen={showQueryManager}
  on:queries-updated={handleQueriesUpdated}
  on:close={handleQueryManagerClose}
/>

<style>
  .dashboard {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: #f8fafc;
  }

  .dashboard-loading {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: #6b7280;
  }

  .loading-spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #e5e7eb;
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .dashboard-error {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: #dc2626;
    padding: 40px;
    text-align: center;
  }

  .dashboard-error h2 {
    margin: 0 0 16px 0;
    font-size: 24px;
    font-weight: 600;
  }

  .dashboard-error p {
    margin: 0 0 24px 0;
    font-size: 16px;
    max-width: 500px;
    line-height: 1.6;
  }

  .retry-btn {
    padding: 12px 24px;
    background: #dc2626;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .retry-btn:hover {
    background: #b91c1c;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 24px 32px;
    background: white;
    border-bottom: 1px solid #e5e7eb;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .dashboard-info {
    flex: 1;
  }

  .dashboard-title {
    margin: 0 0 8px 0;
    font-size: 28px;
    font-weight: 700;
    color: #1f2937;
  }

  .dashboard-description {
    margin: 0;
    font-size: 16px;
    color: #6b7280;
    line-height: 1.5;
  }

  .dashboard-actions {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .unsaved-indicator {
    font-size: 14px;
    color: #f59e0b;
    font-weight: 500;
  }

  .save-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .save-btn:hover:not(:disabled) {
    background: #2563eb;
  }

  .save-btn:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }

  .save-btn.saving {
    background: #6b7280;
  }

  .button-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .refresh-btn {
    padding: 12px;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    color: #374151;
    cursor: pointer;
    transition: all 0.2s;
  }

  .refresh-btn:hover {
    background: #e5e7eb;
    border-color: #9ca3af;
  }

  .mode-toggle-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    color: #374151;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .mode-toggle-btn:hover {
    background: #e5e7eb;
    border-color: #9ca3af;
  }

  .mode-toggle-btn.edit-mode {
    background: #dcfce7;
    border-color: #16a34a;
    color: #15803d;
  }

  .mode-toggle-btn.edit-mode:hover {
    background: #bbf7d0;
    border-color: #059669;
  }

  .add-block-container {
    position: relative;
  }

  .add-block-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .add-block-btn:hover {
    background: #059669;
  }

  .add-block-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    min-width: 180px;
    overflow: hidden;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px 16px;
    background: white;
    border: none;
    color: #374151;
    font-size: 14px;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .dropdown-item:hover {
    background: #f3f4f6;
  }

  .dropdown-item:not(:last-child) {
    border-bottom: 1px solid #f3f4f6;
  }

  .queries-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: #8b5cf6;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .queries-btn:hover {
    background: #7c3aed;
  }

  .dashboard-content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
</style>
