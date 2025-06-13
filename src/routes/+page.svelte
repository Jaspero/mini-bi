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

<div class="w-screen h-screen flex flex-col font-sans">
  <header class="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-8 text-center shadow-lg">
    <h1 class="text-4xl font-bold mb-2">Mini-BI Library Demo</h1>
    <p class="text-xl opacity-90 mb-6">Interactive dashboard library with draggable and resizable blocks</p>
    
    <div class="flex items-center justify-center gap-8 mt-4">
      <div class="flex items-center gap-2">
        <span class="font-medium opacity-90">Current Dashboard:</span>
        <span class="font-semibold bg-white/20 px-3 py-1 rounded">{getCurrentDashboardName()}</span>
        <span class="text-sm opacity-70 italic">({globalQueries.length} queries available)</span>
      </div>
      
      <div class="flex gap-4">
        <button class="flex items-center gap-2 px-6 py-3 bg-white/20 border-2 border-white/30 rounded-md text-base font-medium cursor-pointer transition-all hover:bg-white/30 hover:border-white/50" on:click={toggleQueryManager}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 6H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM4 18V8h16v10H4zm2-8h4v2H6v-2zm6 0h8v2h-8v-2zm-6 4h4v2H6v-2zm6 0h8v2h-8v-2z"/>
          </svg>
          {showQueryManager ? 'Close Queries' : 'Manage Queries'}
        </button>
        
        <button class="flex items-center gap-2 px-6 py-3 bg-white/20 border-2 border-white/30 rounded-md text-base font-medium cursor-pointer transition-all hover:bg-white/30 hover:border-white/50" on:click={toggleManager}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          {showManager ? 'Close Manager' : 'Manage Dashboards'}
        </button>
      </div>
    </div>
  </header>

  <main class="flex-1 min-h-0 bg-slate-50">
    {#if loading}
      <div class="flex flex-col items-center justify-center h-full text-gray-500">
        <div class="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p class="text-lg">Loading demo...</p>
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
