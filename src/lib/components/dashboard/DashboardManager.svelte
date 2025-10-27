<script lang="ts">
  import { onMount } from 'svelte';
  import type {
    DashboardListItem,
    IDashboardService,
    CreateDashboardRequest
  } from '../../types/index';
  import { validateDashboard } from '../../utils/validation';
  import ConfirmationModal from '../ui/ConfirmationModal.svelte';

  interface Props {
    dashboardService: IDashboardService;
    currentDashboardId?: string | null;
    onDashboardSelected?: (dashboardId: string | null) => void;
    onDashboardCreated?: (dashboard: DashboardListItem) => void;
    onDashboardDeleted?: (dashboardId: string) => void;
    onClose?: () => void;
  }

  let {
    dashboardService,
    currentDashboardId = null,
    onDashboardSelected = () => {},
    onDashboardCreated = () => {},
    onDashboardDeleted = () => {},
    onClose = () => {}
  }: Props = $props();

  let dashboards: DashboardListItem[] = $state([]);
  let loading = $state(true);
  let showCreateForm = $state(false);
  let creating = $state(false);
  let deleting = $state(false);
  let error = $state('');

  let showConfirmModal = $state(false);
  let dashboardToDelete: DashboardListItem | null = $state(null);

  let newDashboardName = $state('');
  let newDashboardDescription = $state('');
  let gridSize = $state(80);
  let columns = $state(20);
  let rows = 15;
  let canvasWidthType = $state('fixed');
  let canvasWidthValue = $state(1600);
  let canvasHeightType = $state('fixed');
  let canvasHeightValue = $state(1000);

  onMount(() => {
    loadDashboards();
  });

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
    onDashboardSelected(dashboardId);
  }

  function showCreateDashboard() {
    showCreateForm = true;
    newDashboardName = '';
    newDashboardDescription = '';
    gridSize = 80;
    columns = 20;
    rows = 15;
    canvasWidthType = 'fixed';
    canvasWidthValue = 1600;
    canvasHeightType = 'fixed';
    canvasHeightValue = 1000;
  }

  function hideCreateForm() {
    showCreateForm = false;
    newDashboardName = '';
    newDashboardDescription = '';
    canvasWidthType = 'fixed';
    canvasWidthValue = 1600;
    canvasHeightType = 'fixed';
    canvasHeightValue = 1000;
  }

  async function createDashboard() {
    if (!newDashboardName.trim()) {
      error = 'Dashboard name is required';
      return;
    }

    const request: CreateDashboardRequest = {
      name: newDashboardName.trim(),
      description: newDashboardDescription.trim() || '',
      layout: {
        gridSize,
        columns,
        rows,
        gap: 10,
        canvasWidth: {
          type: canvasWidthType as 'fixed' | 'screen',
          value: canvasWidthType === 'fixed' ? canvasWidthValue : undefined
        },
        canvasHeight: {
          type: canvasHeightType as 'fixed' | 'screen',
          value: canvasHeightType === 'fixed' ? canvasHeightValue : undefined
        }
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
      const dashboardListItem: DashboardListItem = { id: newDashboard.id, name: newDashboard.name };
      dashboards = [...dashboards, dashboardListItem];
      showCreateForm = false;
      onDashboardCreated(dashboardListItem);
      onDashboardSelected(newDashboard.id);
      creating = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create dashboard';
      creating = false;
    }
  }

  async function deleteDashboard(dashboard: DashboardListItem, event: Event) {
    event.stopPropagation();
    dashboardToDelete = dashboard;
    showConfirmModal = true;
  }

  async function confirmDeleteDashboard() {
    if (!dashboardToDelete) {
      return;
    }

    const dashboardId = dashboardToDelete.id;

    try {
      deleting = true;
      await dashboardService.deleteDashboard(dashboardId);
      dashboards = dashboards.filter((d) => d.id !== dashboardId);
      onDashboardDeleted(dashboardId);
      deleting = false;
      dashboardToDelete = null;
      showConfirmModal = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to delete dashboard';
      deleting = false;
      dashboardToDelete = null;
      showConfirmModal = false;
    }
  }

  function cancelDeleteDashboard() {
    dashboardToDelete = null;
    showConfirmModal = false;
  }
</script>

<!-- Dashboard Manager Content -->
<div class="flex h-full flex-col">
  {#if error}
    <div class="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>
  {/if}

  {#if showCreateForm}
    <!-- Dashboard Creation Form -->
    <div class="flex h-full flex-col">
      <!-- Fixed Header -->
      <div class="mb-4 flex flex-shrink-0 items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900">New Dashboard</h3>
        <button
          class="flex items-center justify-center p-2 text-gray-500 transition-colors hover:text-gray-700"
          onclick={hideCreateForm}
        >
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- Scrollable Content Area -->
      <div class="-mr-2 flex-1 overflow-y-auto pr-2">
        <div class="space-y-4">
          <div>
            <label
              for="sidebar-dashboard-name"
              class="mb-2 block text-sm font-medium text-gray-700"
            >
              Dashboard Name *
            </label>
            <input
              id="sidebar-dashboard-name"
              type="text"
              bind:value={newDashboardName}
              placeholder="Enter dashboard name"
              maxlength="100"
              disabled={creating}
              class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              for="sidebar-dashboard-description"
              class="mb-2 block text-sm font-medium text-gray-700"
            >
              Description
            </label>
            <textarea
              id="sidebar-dashboard-description"
              bind:value={newDashboardDescription}
              placeholder="Optional description"
              rows="3"
              maxlength="500"
              disabled={creating}
              class="w-full resize-none rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            ></textarea>
          </div>

          <!-- Canvas Size Configuration -->
          <div class="border-t border-gray-200 pt-4">
            <h4 class="mb-3 text-sm font-semibold text-gray-900">Canvas Size</h4>

            <div class="space-y-4">
              <!-- Canvas Width -->
              <div>
                <span class="mb-2 block text-sm font-medium text-gray-700">Width</span>
                <div class="space-y-2">
                  <div class="flex gap-4">
                    <label class="flex items-center">
                      <input
                        type="radio"
                        bind:group={canvasWidthType}
                        value="screen"
                        class="mr-2"
                      />
                      <span class="text-sm">Screen</span>
                    </label>
                    <label class="flex items-center">
                      <input type="radio" bind:group={canvasWidthType} value="fixed" class="mr-2" />
                      <span class="text-sm">Fixed</span>
                    </label>
                  </div>
                  {#if canvasWidthType === 'fixed'}
                    <input
                      type="number"
                      bind:value={canvasWidthValue}
                      min="800"
                      max="4000"
                      step="100"
                      class="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="Width in pixels"
                    />
                  {/if}
                </div>
              </div>

              <!-- Canvas Height -->
              <div>
                <span class="mb-2 block text-sm font-medium text-gray-700">Height</span>
                <div class="space-y-2">
                  <div class="flex gap-4">
                    <label class="flex items-center">
                      <input
                        type="radio"
                        bind:group={canvasHeightType}
                        value="screen"
                        class="mr-2"
                      />
                      <span class="text-sm">Screen</span>
                    </label>
                    <label class="flex items-center">
                      <input
                        type="radio"
                        bind:group={canvasHeightType}
                        value="fixed"
                        class="mr-2"
                      />
                      <span class="text-sm">Fixed</span>
                    </label>
                  </div>
                  {#if canvasHeightType === 'fixed'}
                    <input
                      type="number"
                      bind:value={canvasHeightValue}
                      min="600"
                      max="3000"
                      step="100"
                      class="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="Height in pixels"
                    />
                  {/if}
                </div>
              </div>

              <!-- Grid Settings -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label
                    for="sidebar-grid-size"
                    class="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Grid Size
                  </label>
                  <input
                    id="sidebar-grid-size"
                    type="number"
                    bind:value={gridSize}
                    min="20"
                    max="200"
                    step="5"
                    disabled={creating}
                    class="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
                  />
                </div>
                <div>
                  <label for="sidebar-columns" class="mb-2 block text-sm font-medium text-gray-700">
                    Columns
                  </label>
                  <input
                    id="sidebar-columns"
                    type="number"
                    bind:value={columns}
                    min="5"
                    max="50"
                    step="1"
                    disabled={creating}
                    class="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Add some bottom padding to ensure content doesn't get hidden behind the footer -->
          <div class="h-4"></div>
        </div>
      </div>

      <!-- Fixed Footer -->
      <div class="flex flex-shrink-0 justify-end space-x-3 border-t border-gray-200 bg-white pt-4">
        <button
          type="button"
          class="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          onclick={hideCreateForm}
          disabled={creating}
        >
          Cancel
        </button>
        <button
          type="button"
          class="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
          onclick={createDashboard}
          disabled={creating || !newDashboardName.trim()}
        >
          {creating ? 'Creating...' : 'Create Dashboard'}
        </button>
      </div>
    </div>
  {:else}
    <!-- Dashboard List -->
    <div class="flex h-full flex-col">
      <div class="mb-4 flex flex-shrink-0 items-center justify-between">
        <h3 class="text-lg font-medium text-gray-900">Dashboards ({dashboards.length})</h3>
        <button
          class="inline-flex items-center rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          onclick={showCreateDashboard}
          disabled={showCreateForm || creating}
        >
          <span class="material-symbols-outlined mr-2 text-base">add</span>
          New Dashboard
        </button>
      </div>

      <div class="flex-1 overflow-y-auto">
        <div class="space-y-3">
          {#if loading}
            <div class="flex flex-col items-center justify-center py-8 text-gray-500">
              <div
                class="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600"
              ></div>
              <p class="text-xs">Loading dashboards...</p>
            </div>
          {:else if dashboards.length === 0}
            <div class="py-8 text-center text-gray-500">
              <span class="material-symbols-outlined mb-3 block text-4xl opacity-50">dashboard</span
              >
              <p class="mb-2 text-xs font-medium">No Dashboards Found</p>
              <p class="text-xs">Create your first dashboard to get started</p>
            </div>
          {:else}
            {#each dashboards as dashboard}
              <div
                class="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                class:border-blue-500={currentDashboardId === dashboard.id}
                class:bg-blue-50={currentDashboardId === dashboard.id}
                onclick={() => selectDashboard(dashboard.id)}
                onkeydown={(e) => e.key === 'Enter' && selectDashboard(dashboard.id)}
                role="button"
                tabindex="0"
              >
                <div class="flex items-start justify-between">
                  <div class="mr-2 flex flex-1 items-center gap-2">
                    <h4 class="truncate text-sm font-medium text-gray-900">
                      {dashboard.name}
                    </h4>
                    {#if dashboard.public}
                      <span
                        class="material-symbols-outlined text-sm text-blue-600"
                        title="Public Dashboard"
                        aria-label="Public Dashboard"
                      >
                        public
                      </span>
                    {/if}
                  </div>
                  {#if !dashboard.public}
                    <button
                      class="rounded p-1 text-gray-400 transition-colors hover:text-red-600"
                      onclick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        deleteDashboard(dashboard, e);
                      }}
                      disabled={deleting}
                      aria-label="Delete dashboard"
                    >
                      <span class="material-symbols-outlined text-sm">delete</span>
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Confirmation Modal -->
<ConfirmationModal
  isOpen={showConfirmModal}
  title="Delete Dashboard"
  message={dashboardToDelete
    ? `Are you sure you want to delete "${dashboardToDelete.name}"? This action cannot be undone.`
    : ''}
  confirmText="Delete"
  cancelText="Cancel"
  onConfirm={confirmDeleteDashboard}
  onCancel={cancelDeleteDashboard}
/>
