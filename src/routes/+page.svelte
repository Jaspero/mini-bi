<script lang="ts">
  import { onMount } from 'svelte';
  import { DashboardComponent, DashboardManager, GlobalQueryManager, MockDashboardService, type Dashboard, type Query } from '$lib';

  let dashboardService = new MockDashboardService();
  let selectedDashboardId: string | null = null;
  let availableDashboards: Dashboard[] = [];
  let globalQueries: Query[] = [];
  let loading = true;
  let showManager = false;
  let showQueryManager = false;

  onMount(async () => {
    // Load available dashboards and queries
    availableDashboards = await dashboardService.loadDashboards();
    globalQueries = await dashboardService.loadGlobalQueries();
    
    // Select the first dashboard by default
    if (availableDashboards.length > 0) {
      selectedDashboardId = availableDashboards[0].id;
    }
    loading = false;
  });

  function handleDashboardSelected(event: CustomEvent<{ dashboardId: string | null }>) {
    selectedDashboardId = event.detail.dashboardId;
    showManager = false;
  }

  function handleDashboardCreated(event: CustomEvent<{ dashboard: Dashboard }>) {
    availableDashboards = [...availableDashboards, event.detail.dashboard];
  }

  function handleDashboardDeleted(event: CustomEvent<{ dashboardId: string }>) {
    availableDashboards = availableDashboards.filter(d => d.id !== event.detail.dashboardId);
  }

  function handleDashboardLoaded(event: CustomEvent<{ dashboard: Dashboard }>) {
    console.log('Dashboard loaded:', event.detail.dashboard);
  }

  function handleDashboardUpdated(event: CustomEvent<{ dashboard: Dashboard }>) {
    console.log('Dashboard updated:', event.detail.dashboard);
  }

  function handleDashboardSaved(event: CustomEvent<{ dashboard: Dashboard }>) {
    console.log('Dashboard saved:', event.detail.dashboard);
  }

  function handleBlockEdit(event: CustomEvent<{ block: any }>) {
    console.log('Block edit requested:', event.detail.block);
  }

  function handleBlockDelete(event: CustomEvent<{ blockId: string }>) {
    console.log('Block deleted:', event.detail.blockId);
  }

  // Query management handlers
  function handleQueryCreated(event: CustomEvent<{ query: Query }>) {
    globalQueries = [...globalQueries, event.detail.query];
  }

  function handleQueryUpdated(event: CustomEvent<{ query: Query }>) {
    const index = globalQueries.findIndex(q => q.id === event.detail.query.id);
    if (index !== -1) {
      globalQueries[index] = event.detail.query;
      globalQueries = [...globalQueries];
    }
  }

  function handleQueryDeleted(event: CustomEvent<{ queryId: string }>) {
    globalQueries = globalQueries.filter(q => q.id !== event.detail.queryId);
  }

  function toggleManager() {
    showManager = !showManager;
    if (showManager) {
      showQueryManager = false;
    }
  }

  function toggleQueryManager() {
    showQueryManager = !showQueryManager;
    if (showQueryManager) {
      showManager = false;
    }
  }

  function getCurrentDashboardName(): string {
    if (!selectedDashboardId) return 'No Dashboard Selected';
    const dashboard = availableDashboards.find(d => d.id === selectedDashboardId);
    return dashboard?.name || 'Unknown Dashboard';
  }
</script>

<svelte:head>
  <title>Mini-BI Library Demo</title>
  <meta name="description" content="Demo of the Mini-BI dashboard library" />
</svelte:head>

<div class="demo-container">
  <header class="demo-header">
    <h1>Mini-BI Library Demo</h1>
    <p>Interactive dashboard library with draggable and resizable blocks</p>
    
    <div class="header-controls">
      <div class="current-dashboard">
        <span class="dashboard-label">Current Dashboard:</span>
        <span class="dashboard-name">{getCurrentDashboardName()}</span>
        <span class="queries-count">({globalQueries.length} queries available)</span>
      </div>
      
      <div class="control-buttons">
        <button class="manage-btn" on:click={toggleQueryManager}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 6H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM4 18V8h16v10H4zm2-8h4v2H6v-2zm6 0h8v2h-8v-2zm-6 4h4v2H6v-2zm6 0h8v2h-8v-2z"/>
          </svg>
          {showQueryManager ? 'Close Queries' : 'Manage Queries'}
        </button>
        
        <button class="manage-btn" on:click={toggleManager}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          {showManager ? 'Close Manager' : 'Manage Dashboards'}
        </button>
      </div>
    </div>
  </header>

  <main class="demo-main">
    {#if loading}
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading demo...</p>
      </div>
    {:else if showManager}
      <DashboardManager
        {dashboardService}
        currentDashboardId={selectedDashboardId}
        on:dashboard-selected={handleDashboardSelected}
        on:dashboard-created={handleDashboardCreated}
        on:dashboard-deleted={handleDashboardDeleted}
      />
    {:else if showQueryManager}
      <GlobalQueryManager
        {dashboardService}
        isOpen={showQueryManager}
        on:close={toggleQueryManager}
        on:query-created={handleQueryCreated}
        on:query-updated={handleQueryUpdated}
        on:query-deleted={handleQueryDeleted}
      />
    {:else}
      <DashboardComponent
        dashboardId={selectedDashboardId}
        {dashboardService}
        queries={globalQueries}
        editable={true}
        on:dashboard-loaded={handleDashboardLoaded}
        on:dashboard-updated={handleDashboardUpdated}
        on:dashboard-saved={handleDashboardSaved}
        on:block-edit={handleBlockEdit}
        on:block-delete={handleBlockDelete}
      />
    {/if}
  </main>
</div>

<style>
  .demo-container {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .demo-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 2rem;
    text-align: center;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }

  .demo-header h1 {
    margin: 0 0 0.5rem 0;
    font-size: 2.5rem;
    font-weight: 700;
  }

  .demo-header p {
    margin: 0 0 1.5rem 0;
    font-size: 1.2rem;
    opacity: 0.9;
  }

  .header-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2rem;
    margin-top: 1rem;
  }

  .control-buttons {
    display: flex;
    gap: 1rem;
  }

  .current-dashboard {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .queries-count {
    font-size: 0.9rem;
    opacity: 0.7;
    font-style: italic;
  }

  .dashboard-label {
    font-weight: 500;
    opacity: 0.9;
  }

  .dashboard-name {
    font-weight: 600;
    background: rgba(255, 255, 255, 0.2);
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
  }

  .manage-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .manage-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
  }

  .demo-main {
    flex: 1;
    min-height: 0;
    background: #f8fafc;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #6b7280;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #e5e7eb;
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .loading p {
    font-size: 1.1rem;
    margin: 0;
  }
</style>
