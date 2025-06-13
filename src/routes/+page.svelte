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
        currentDashboardName={getCurrentDashboardName()}
        queryManagerOpen={showQueryManager}
        dashboardManagerOpen={showManager}
        on:dashboard-loaded={handleDashboardLoaded}
        on:dashboard-updated={handleDashboardUpdated}
        on:dashboard-saved={handleDashboardSaved}
        on:block-edit={handleBlockEdit}
        on:block-delete={handleBlockDelete}
        on:toggle-query-manager={toggleQueryManager}
        on:toggle-dashboard-manager={toggleManager}
      />
    {/if}
  </main>
</div>
