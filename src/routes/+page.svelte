<script lang="ts">
  import { onMount } from 'svelte';
  import { DashboardComponent, DashboardManager, GlobalQueryManager, MockDashboardService, type Dashboard, type Query } from '$lib';
  import Sidebar from '$lib/components/ui/Sidebar.svelte';

  let dashboardService = new MockDashboardService();
  let selectedDashboardId: string | null = null;
  let availableDashboards: Dashboard[] = [];
  let globalQueries: Query[] = [];
  let loading = true;
  let showDashboardSidebar = false;
  let showQuerySidebar = false;

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
    showDashboardSidebar = false;
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

  function toggleDashboardSidebar() {
    showDashboardSidebar = !showDashboardSidebar;
    if (showDashboardSidebar) {
      showQuerySidebar = false;
    }
  }

  function toggleQuerySidebar() {
    showQuerySidebar = !showQuerySidebar;
    if (showQuerySidebar) {
      showDashboardSidebar = false;
    }
  }

  function closeDashboardSidebar() {
    showDashboardSidebar = false;
  }

  function closeQuerySidebar() {
    showQuerySidebar = false;
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
  <main class="flex-1 min-h-0 bg-slate-50 relative">
    {#if loading}
      <div class="flex flex-col items-center justify-center h-full text-gray-500">
        <div class="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p class="text-lg">Loading demo...</p>
      </div>
    {:else}
      <!-- Main Dashboard Content -->
      <DashboardComponent
        dashboardId={selectedDashboardId}
        {dashboardService}
        queries={globalQueries}
        editable={true}
        currentDashboardName={getCurrentDashboardName()}
        queryManagerOpen={showQuerySidebar}
        dashboardManagerOpen={showDashboardSidebar}
        on:dashboard-loaded={handleDashboardLoaded}
        on:dashboard-updated={handleDashboardUpdated}
        on:dashboard-saved={handleDashboardSaved}
        on:block-edit={handleBlockEdit}
        on:block-delete={handleBlockDelete}
        on:toggle-query-manager={toggleQuerySidebar}
        on:toggle-dashboard-manager={toggleDashboardSidebar}
      />

      <!-- Dashboard Management Sidebar -->
      <Sidebar 
        isOpen={showDashboardSidebar} 
        title="Dashboard Management" 
        width="w-96"
        position="right"
        on:close={closeDashboardSidebar}
      >
        <div class="p-4">
          <DashboardManager
            {dashboardService}
            currentDashboardId={selectedDashboardId}
            on:dashboard-selected={handleDashboardSelected}
            on:dashboard-created={handleDashboardCreated}
            on:dashboard-deleted={handleDashboardDeleted}
          />
        </div>
      </Sidebar>

      <!-- Query Management Sidebar -->
      <Sidebar 
        isOpen={showQuerySidebar} 
        title="Query Management" 
        width="w-[32rem]"
        position="right"
        on:close={closeQuerySidebar}
      >
        <div class="p-4">
          <GlobalQueryManager
            {dashboardService}
            on:query-created={handleQueryCreated}
            on:query-updated={handleQueryUpdated}
            on:query-deleted={handleQueryDeleted}
          />
        </div>
      </Sidebar>
    {/if}
  </main>
</div>
