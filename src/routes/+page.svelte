<script lang="ts">
  import { onMount } from 'svelte';
  import {
    DashboardComponent,
    DashboardManager,
    GlobalQueryManager,
    MockDashboardService,
    SchemaSidebar,
    type Dashboard,
    type Query
  } from '$lib';
  import Sidebar from '$lib/components/ui/Sidebar.svelte';

  let dashboardService = new MockDashboardService();
  let selectedDashboardId: string | null = null;
  let availableDashboards: Dashboard[] = [];
  let globalQueries: Query[] = [];
  let loading = true;
  let showDashboardSidebar = false;
  let showQuerySidebar = false;
  let showSchemaSidebar = false;
  let schemaData: any = null;

  onMount(async () => {
    availableDashboards = await dashboardService.loadDashboards();
    globalQueries = await dashboardService.loadGlobalQueries();

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
    availableDashboards = availableDashboards.filter((d) => d.id !== event.detail.dashboardId);
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
    const index = globalQueries.findIndex((q) => q.id === event.detail.query.id);
    if (index !== -1) {
      globalQueries[index] = event.detail.query;
      globalQueries = [...globalQueries];
    }
  }

  function handleQueryDeleted(event: CustomEvent<{ queryId: string }>) {
    globalQueries = globalQueries.filter((q) => q.id !== event.detail.queryId);
  }

  function toggleDashboardSidebar() {
    showDashboardSidebar = !showDashboardSidebar;
    if (showDashboardSidebar) {
      showQuerySidebar = false;
      // Keep schema sidebar open if it was already open
    }
  }

  function toggleQuerySidebar() {
    showQuerySidebar = !showQuerySidebar;
    if (showQuerySidebar) {
      showDashboardSidebar = false;
      // Keep schema sidebar open if it was already open
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

  function handleOpenSchema(event: CustomEvent) {
    schemaData = event.detail;
    showSchemaSidebar = true;
  }

  function handleSchemaInsertText(event: CustomEvent<{ text: string }>) {
    if (schemaData && schemaData.insertText) {
      schemaData.insertText(event.detail.text);
    }
  }

  function handleSchemaInsertTemplate(event: CustomEvent<{ template: string }>) {
    if (schemaData && schemaData.insertTemplate) {
      schemaData.insertTemplate(event.detail.template);
    }
  }

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

<svelte:window on:keydown={handleKeydown} />

{#if !loading}
  <DashboardComponent
    dashboardId={selectedDashboardId}
    {dashboardService}
    queries={globalQueries}
    editable={true}
    queryManagerOpen={showQuerySidebar}
    dashboardManagerOpen={showDashboardSidebar}
    availableDashboardsCount={availableDashboards.length}
    on:dashboard-loaded={handleDashboardLoaded}
    on:dashboard-updated={handleDashboardUpdated}
    on:dashboard-saved={handleDashboardSaved}
    on:block-edit={handleBlockEdit}
    on:block-delete={handleBlockDelete}
    on:toggle-query-manager={toggleQuerySidebar}
    on:toggle-dashboard-manager={toggleDashboardSidebar}
  />

  <Sidebar
    isOpen={showDashboardSidebar}
    title="Dashboard Management"
    width="w-96 sm:w-96"
    position="right"
    on:close={closeDashboardSidebar}
  >
    <DashboardManager
      {dashboardService}
      currentDashboardId={selectedDashboardId}
      on:dashboard-selected={handleDashboardSelected}
      on:dashboard-created={handleDashboardCreated}
      on:dashboard-deleted={handleDashboardDeleted}
    />
  </Sidebar>

  <Sidebar
    isOpen={showQuerySidebar}
    title="Query Management"
    width="w-full sm:w-[32rem]"
    position="right"
    on:close={closeQuerySidebar}
  >
    <GlobalQueryManager
      {dashboardService}
      on:query-created={handleQueryCreated}
      on:query-updated={handleQueryUpdated}
      on:query-deleted={handleQueryDeleted}
      on:open-schema={handleOpenSchema}
    />
  </Sidebar>

  {#if showSchemaSidebar && !showQuerySidebar && !showDashboardSidebar}
    <div
      class="fixed inset-0 z-30 bg-black/30 transition-opacity"
      on:click={closeSchemaSidebar}
      on:keydown={(e) => e.key === 'Escape' && closeSchemaSidebar()}
      role="button"
      tabindex="-1"
    ></div>
  {/if}

  {#if showSchemaSidebar}
    <div
      class="fixed top-0 flex h-full w-full sm:w-96 flex-col bg-white shadow-2xl transition-all duration-300"
      class:z-40={!showQuerySidebar && !showDashboardSidebar}
      class:z-45={showQuerySidebar || showDashboardSidebar}
      style="right: {showQuerySidebar ? (typeof window !== 'undefined' && window.innerWidth < 640 ? '0' : '32rem') : '0'}"
    >
      <div class="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-4">
        <h2 class="text-lg font-semibold text-gray-900">Database Schema</h2>
        <button
          class="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
          on:click={closeSchemaSidebar}
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
            on:insert-text={handleSchemaInsertText}
            on:insert-template={handleSchemaInsertTemplate}
            on:set-editor-value={handleSchemaSetEditorValue}
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
