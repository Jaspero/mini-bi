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
  }

  function cancelCreate() {
    showCreateForm = false;
    newDashboardName = '';
    newDashboardDescription = '';
  }

  function handleOverlayClick(event: Event) {
    // Only close if clicking the overlay itself, not its contents
    if (event.target === event.currentTarget) {
      cancelCreate();
    }
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
        gap: 10
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

<div class="dashboard-manager">
  <div class="manager-header">
    <h2>Dashboard Manager</h2>
    <button class="create-btn" on:click={showCreateDashboard} disabled={showCreateForm}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
      </svg>
      New Dashboard
    </button>
  </div>

  {#if error}
    <div class="error-message">
      <p>{error}</p>
      <button on:click={() => error = ''}>×</button>
    </div>
  {/if}

  <!-- Dashboard Creation Modal -->
  {#if showCreateForm}
    <div class="modal-overlay" on:click={handleOverlayClick} on:keydown={handleOverlayClick} role="dialog" aria-modal="true" tabindex="-1">
      <div class="modal-content" role="document">
        <header class="modal-header">
          <h2>Create New Dashboard</h2>
          <button class="close-btn" on:click={cancelCreate} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
            </svg>
          </button>
        </header>

        <div class="modal-body">
          {#if error}
            <div class="error-message">{error}</div>
          {/if}

          <div class="form-content">
            <div class="form-group">
              <label for="dashboard-name">Dashboard Name *</label>
              <input 
                id="dashboard-name"
                type="text" 
                bind:value={newDashboardName} 
                placeholder="Enter dashboard name"
                maxlength="100"
                disabled={creating}
              />
            </div>

            <div class="form-group">
              <label for="dashboard-description">Description</label>
              <textarea 
                id="dashboard-description"
                bind:value={newDashboardDescription} 
                placeholder="Optional description"
                rows="3"
                maxlength="500"
                disabled={creating}
              ></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="grid-size">Grid Size (px)</label>
                <input 
                  id="grid-size"
                  type="number" 
                  bind:value={gridSize} 
                  min="20" 
                  max="200" 
                  step="10"
                  disabled={creating}
                />
              </div>

              <div class="form-group">
                <label for="columns">Columns</label>
                <input 
                  id="columns"
                  type="number" 
                  bind:value={columns} 
                  min="6" 
                  max="50"
                  disabled={creating}
                />
              </div>

              <div class="form-group">
                <label for="rows">Rows</label>
                <input 
                  id="rows"
                  type="number" 
                  bind:value={rows} 
                  min="6" 
                  max="30"
                  disabled={creating}
                />
              </div>
            </div>
          </div>
        </div>

        <div class="form-footer">
          <button class="cancel-btn" on:click={cancelCreate} disabled={creating}>
            Cancel
          </button>
          <button class="submit-btn" on:click={createDashboard} disabled={creating}>
            {#if creating}
              <div class="spinner"></div>
              Creating...
            {:else}
              Create Dashboard
            {/if}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <div class="dashboard-list">
    {#if loading}
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading dashboards...</p>
      </div>
    {:else if dashboards.length === 0}
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
        </svg>
        <h3>No Dashboards Found</h3>
        <p>Create your first dashboard to get started</p>
      </div>
    {:else}
      <div class="dashboard-grid">
        <div 
          class="dashboard-card new-dashboard" 
          class:disabled={showCreateForm}
          on:click={showCreateDashboard}
          on:keydown={(e) => e.key === 'Enter' && showCreateDashboard()}
          role="button"
          tabindex="0"
        >
          <div class="card-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
            </svg>
          </div>
          <h4>Create New Dashboard</h4>
          <p>Start building a new dashboard</p>
        </div>

        {#each dashboards as dashboard}
          <div 
            class="dashboard-card" 
            class:active={currentDashboardId === dashboard.id}
            on:click={() => selectDashboard(dashboard.id)}
            on:keydown={(e) => e.key === 'Enter' && selectDashboard(dashboard.id)}
            role="button"
            tabindex="0"
          >
            <div class="card-header">
              <h4>{dashboard.name}</h4>
              <button 
                class="delete-btn" 
                on:click={(e) => deleteDashboard(dashboard, e)}
                disabled={deleting}
                aria-label="Delete dashboard"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
              </button>
            </div>
            
            {#if dashboard.description}
              <p class="card-description">{dashboard.description}</p>
            {/if}
            
            <div class="card-meta">
              <span class="block-count">{dashboard.blocks.length} blocks</span>
              <span class="last-modified">Modified {formatDate(dashboard.lastModified)}</span>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .dashboard-manager {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px;
  }

  .manager-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  .manager-header h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: #1f2937;
  }

  .create-btn {
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
    transition: background-color 0.2s;
  }

  .create-btn:hover:not(:disabled) {
    background: #2563eb;
  }

  .create-btn:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }

  .error-message {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 6px;
    color: #dc2626;
    padding: 12px 16px;
    margin-bottom: 16px;
  }

  .error-message button {
    background: none;
    border: none;
    color: #dc2626;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    width: 100%;
    max-width: 600px;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #e5e7eb;
    background: #f9fafb;
    flex-shrink: 0;
  }

  .modal-header h2 {
    margin: 0;
    color: #111827;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #6b7280;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .close-btn:hover {
    color: #374151;
    background: #e5e7eb;
  }

  .modal-body {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 20px 24px;
  }

  .form-content {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .form-footer {
    padding: 20px 24px;
    border-top: 1px solid #e5e7eb;
    background: #f9fafb;
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    flex-shrink: 0;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    margin-bottom: 16px;
  }

  .form-group label {
    margin-bottom: 6px;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
  }

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.2s;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-group textarea {
    resize: vertical;
  }

  .form-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 16px;
  }

  .cancel-btn, .submit-btn {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .cancel-btn {
    background: #6b7280;
    color: white;
    border: none;
  }

  .cancel-btn:hover:not(:disabled) {
    background: #4b5563;
  }

  .submit-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #3b82f6;
    color: white;
    border: none;
  }

  .submit-btn:hover:not(:disabled) {
    background: #2563eb;
  }

  .cancel-btn:disabled, .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: #6b7280;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid #e5e7eb;
    border-top: 2px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 12px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: #6b7280;
    text-align: center;
  }

  .empty-state svg {
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .empty-state h3 {
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 600;
  }

  .empty-state p {
    margin: 0;
    font-size: 14px;
  }

  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
  }

  .dashboard-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .dashboard-card:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  }

  .dashboard-card.active {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .dashboard-card.new-dashboard {
    border: 2px dashed #d1d5db;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    min-height: 140px;
    color: #6b7280;
  }

  .dashboard-card.new-dashboard:hover:not(.disabled) {
    border-color: #3b82f6;
    color: #3b82f6;
  }

  .dashboard-card.new-dashboard.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .card-icon {
    margin-bottom: 12px;
    opacity: 0.7;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
  }

  .card-header h4 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
    flex: 1;
  }

  .delete-btn {
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
    margin-left: 8px;
  }

  .delete-btn:hover:not(:disabled) {
    background: #fee2e2;
    color: #dc2626;
  }

  .delete-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .card-description {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #6b7280;
    line-height: 1.4;
  }

  .card-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: #9ca3af;
  }

  .block-count {
    font-weight: 500;
  }

  @media (max-width: 768px) {
    .modal-content {
      max-width: 95vw;
      max-height: 90vh;
    }
    
    .form-footer {
      flex-direction: column;
    }
    
    .cancel-btn, .submit-btn {
      width: 100%;
    }

    .form-row {
      grid-template-columns: 1fr;
    }
  }
</style>
