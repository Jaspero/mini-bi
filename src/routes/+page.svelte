<script lang="ts">
  import { onMount } from 'svelte';
  import {
    DashboardComponent,
    DashboardManager,
    GlobalQueryManager,
    MockDashboardService,
    SchemaSidebar,
    Sidebar,
    type Dashboard,
    type Query
  } from '$lib';

  let dashboardService = new MockDashboardService();
  let selectedDashboardId: string | null = $state(null);
  let availableDashboards: Dashboard[] = $state([]);
  let globalQueries: Query[] = $state([]);
  let loading = $state(true);
  let showDashboardSidebar = $state(false);
  let showQuerySidebar = $state(false);
  let showSchemaSidebar = $state(false);
  let schemaData: any = $state(null);

  onMount(async () => {
    availableDashboards = await dashboardService.loadDashboards();
    globalQueries = await dashboardService.loadGlobalQueries();

    if (availableDashboards.length > 0) {
      selectedDashboardId = availableDashboards[0].id;
    }
    loading = false;
  });

  function handleDashboardSelected(dashboard: Dashboard | null) {
    selectedDashboardId = dashboard?.id || null;
    showDashboardSidebar = false;
  }

  function handleDashboardCreated(dashboard: Dashboard) {
    availableDashboards = [...availableDashboards, dashboard];
  }

  function handleDashboardDeleted(dashboardId: string) {
    availableDashboards = availableDashboards.filter((d) => d.id !== dashboardId);
  }

  function handleQueryCreated(query: Query) {
    globalQueries = [...globalQueries, query];
  }

  function handleQueryUpdated(query: Query) {
    const index = globalQueries.findIndex((q) => q.id === query.id);
    if (index !== -1) {
      globalQueries[index] = query;
      globalQueries = [...globalQueries];
    }
  }

  function handleQueryDeleted(queryId: string) {
    globalQueries = globalQueries.filter((q) => q.id !== queryId);
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

  function closeSchemaSidebar() {
    showSchemaSidebar = false;
  }

  function toggleSchemaSidebar() {
    showSchemaSidebar = !showSchemaSidebar;
  }

  function handleOpenSchema(data: any) {
    schemaData = data;
    showSchemaSidebar = true;
  }

  function handleToggleSchema() {
    toggleSchemaSidebar();
  }

  function handleSchemaInsertText(event: CustomEvent<{ text: string }>) {
    if (schemaData && schemaData.insertText) {
      schemaData.insertText(event.detail.text);
    }
  }

  // function handleSchemaInsertTemplate(event: CustomEvent<{ template: string }>) {
  //   if (schemaData && schemaData.insertTemplate) {
  //     schemaData.insertTemplate(event.detail.template);
  //   }
  // }

  function handleSchemaSetEditorValue(event: CustomEvent<{ value: string }>) {
    if (schemaData && schemaData.insertSelectAll) {
      schemaData.insertSelectAll(event.detail.value.replace('SELECT * FROM ', ''));
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (showSchemaSidebar) {
        closeSchemaSidebar();
      } else if (showQuerySidebar) {
        closeQuerySidebar();
      } else if (showDashboardSidebar) {
        closeDashboardSidebar();
      }
    }
  }
</script>

<svelte:head>
  <title>Mini-BI Library Demo</title>
  <meta name="description" content="Demo of the Mini-BI dashboard library" />
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

{#if !loading}
  <DashboardComponent
    dashboardId={selectedDashboardId}
    {dashboardService}
    queries={globalQueries}
    editable={true}
    queryManagerOpen={showQuerySidebar}
    dashboardManagerOpen={showDashboardSidebar}
    availableDashboardsCount={availableDashboards.length}
    toggleQueryManager={toggleQuerySidebar}
    toggleDashboardManager={toggleDashboardSidebar}
  />

  <Sidebar
    isOpen={showDashboardSidebar}
    title="Dashboard Management"
    width="w-96 sm:w-96"
    position="right"
    onClose={closeDashboardSidebar}
  >
    <DashboardManager
      {dashboardService}
      currentDashboardId={selectedDashboardId}
      onDashboardSelected={handleDashboardSelected}
      onDashboardCreated={handleDashboardCreated}
      onDashboardDeleted={handleDashboardDeleted}
      onClose={closeDashboardSidebar}
    />
  </Sidebar>

  <Sidebar
    isOpen={showQuerySidebar}
    title="Query Management"
    width="w-full sm:w-[32rem]"
    position="right"
    onClose={closeQuerySidebar}
  >
    <GlobalQueryManager
      {dashboardService}
      onQueryCreated={handleQueryCreated}
      onQueryUpdated={handleQueryUpdated}
      onQueryDeleted={handleQueryDeleted}
      onOpenSchema={handleOpenSchema}
      onToggleSchema={handleToggleSchema}
    />
  </Sidebar>

  {#if showSchemaSidebar && !showQuerySidebar && !showDashboardSidebar}
    <div
      class="fixed inset-0 z-30 bg-black/30 transition-opacity"
      onclick={closeSchemaSidebar}
      onkeydown={(e) => e.key === 'Escape' && closeSchemaSidebar()}
      role="button"
      tabindex="-1"
    ></div>
  {/if}

  {#if showSchemaSidebar}
    <div
      class="fixed top-0 flex h-full w-full flex-col bg-white shadow-2xl transition-all duration-300 sm:w-96"
      class:z-40={!showQuerySidebar && !showDashboardSidebar}
      class:z-45={showQuerySidebar || showDashboardSidebar}
      style="right: {showQuerySidebar
        ? typeof window !== 'undefined' && window.innerWidth < 640
          ? '0'
          : '32rem'
        : '0'}"
    >
      <div class="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-4">
        <h2 class="text-lg font-semibold text-gray-900">Database Schema</h2>
        <button
          class="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
          onclick={closeSchemaSidebar}
          aria-label="Close schema sidebar"
        >
          <span class="material-symbols-outlined text-xl">close</span>
        </button>
      </div>
      <div class="h-full flex-1 overflow-y-auto p-4">
        {#if schemaData}
          <SchemaSidebar
            mockSchema={schemaData.mockSchema}
            sqlTemplates={schemaData.sqlTemplates}
            onInsertText={handleSchemaInsertText}
            onSetEditorValue={handleSchemaSetEditorValue}
          />
        {/if}
      </div>
    </div>
  {/if}
{/if}

<style>
  :global(.z-45) {
    z-index: 45;
  }
</style>
