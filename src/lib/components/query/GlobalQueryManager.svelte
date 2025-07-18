<script lang="ts">
  import { onMount } from 'svelte';
  import type { Query, IDashboardService } from '../../types/index.ts';
  import SQLEditor from './SQLEditor.svelte';
  import ConfirmationModal from '../ui/ConfirmationModal.svelte';

  let {
    dashboardService,
    onQueryCreated = () => {},
    onQueryUpdated = () => {},
    onQueryDeleted = () => {},
    onOpenSchema = () => {}
  }: {
    dashboardService: IDashboardService;
    onQueryCreated?: (query: Query) => void;
    onQueryUpdated?: (query: Query) => void;
    onQueryDeleted?: (queryId: string) => void;
    onOpenSchema?: () => void;
  } = $props();

  let queries: Query[] = $state([]);
  let selectedQuery: Query | null = $state(null);
  let loading = $state(false);
  let error = $state('');
  let showQueryEditor = $state(false);

  let showConfirmModal = $state(false);
  let queryToDelete: Query | null = $state(null);

  let name = $state('');
  let description = $state('');
  let sql = $state('');

  onMount(async () => {
    await loadQueries();
  });

  async function loadQueries() {
    try {
      loading = true;
      error = '';
      queries = await dashboardService.loadGlobalQueries();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load queries';
      console.error('Error loading queries:', err);
    } finally {
      loading = false;
    }
  }

  function startNewQuery() {
    resetForm();
    showQueryEditor = true;
    selectedQuery = null;
  }

  function editQuery(query: Query) {
    selectedQuery = query;
    name = query.name;
    description = query.description || '';
    sql = query.sql;
    showQueryEditor = true;
  }

  function resetForm() {
    name = '';
    description = '';
    sql = '';
    showQueryEditor = false;
    selectedQuery = null;
    error = '';
  }

  async function saveQuery() {
    if (!name.trim() || !sql.trim()) {
      error = 'Name and SQL are required';
      return;
    }

    try {
      loading = true;
      error = '';

      if (selectedQuery) {
        // Update existing query
        const updatedQuery = await dashboardService.updateGlobalQuery(selectedQuery.id, {
          name: name.trim(),
          description: description.trim(),
          sql: sql.trim(),
          isActive: true,
          lastModified: new Date()
        });

        onQueryUpdated(updatedQuery);
      } else {
        // Create new query
        const newQuery = await dashboardService.saveGlobalQuery({
          name: name.trim(),
          description: description.trim(),
          sql: sql.trim(),
          parameters: [],
          isActive: true,
          lastModified: new Date()
        });

        onQueryCreated(newQuery);
      }

      await loadQueries();
      resetForm();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save query';
      console.error('Error saving query:', err);
    } finally {
      loading = false;
    }
  }

  async function deleteQuery(query: Query) {
    queryToDelete = query;
    showConfirmModal = true;
  }

  async function confirmDeleteQuery() {
    if (!queryToDelete) return;

    try {
      loading = true;
      error = '';
      await dashboardService.deleteGlobalQuery(queryToDelete.id);
      onQueryDeleted(queryToDelete.id);
      await loadQueries();

      if (selectedQuery?.id === queryToDelete.id) {
        resetForm();
      }
      queryToDelete = null;
      showConfirmModal = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to delete query';
      console.error('Error deleting query:', err);
      queryToDelete = null;
      showConfirmModal = false;
    } finally {
      loading = false;
    }
  }

  function cancelDeleteQuery() {
    queryToDelete = null;
    showConfirmModal = false;
  }

  async function testQuery() {
    if (!sql.trim()) {
      error = 'SQL is required to test the query';
      return;
    }

    try {
      loading = true;
      error = '';
      const result = await dashboardService.validateQuery(sql.trim());

      if (result.isValid) {
        error = '';
        alert('Query is valid!');
      } else {
        error = result.error || 'Query validation failed';
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to test query';
      console.error('Error testing query:', err);
    } finally {
      loading = false;
    }
  }
</script>

<div class="flex h-full flex-col">
  {#if error}
    <div class="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>
  {/if}

  {#if loading}
    <div class="flex items-center justify-center py-8">
      <div class="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
      <span class="ml-2 text-gray-600">Loading...</span>
    </div>
  {/if}

  {#if showQueryEditor}
    <div class="flex h-full flex-col">
      <div class="mb-4 flex flex-shrink-0 items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900">
          {selectedQuery ? 'Edit Query' : 'New Query'}
        </h3>
        <button class="p-2 text-gray-500 transition-colors hover:text-gray-700" onclick={resetForm}>
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="-mr-2 flex-1 overflow-y-auto pr-2">
        <div class="space-y-4">
          <div class="grid grid-cols-1 gap-4">
            <div class="space-y-2">
              <label for="query-name" class="block text-sm font-medium text-gray-700">Name *</label>
              <input
                id="query-name"
                type="text"
                bind:value={name}
                required
                disabled={loading}
                placeholder="Enter query name"
                class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
              />
            </div>

            <div class="space-y-2">
              <label for="query-description" class="block text-sm font-medium text-gray-700"
                >Description</label
              >
              <input
                id="query-description"
                type="text"
                bind:value={description}
                disabled={loading}
                placeholder="Enter query description"
                class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>

          <div class="space-y-2">
            <label for="query-sql" class="block text-sm font-medium text-gray-700"
              >SQL Query *</label
            >
            <div class="h-64">
              <SQLEditor
                bind:value={sql}
                disabled={loading}
                {dashboardService}
                onExecute={testQuery}
                onSave={saveQuery}
                {onOpenSchema}
              />
            </div>
          </div>

          <div class="h-4"></div>
        </div>
      </div>

      <div class="flex flex-shrink-0 justify-end space-x-3 border-t border-gray-200 bg-white pt-4">
        <button
          type="button"
          class="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          onclick={resetForm}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="button"
          class="rounded-md border border-blue-300 bg-blue-50 px-4 py-2 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          onclick={testQuery}
          disabled={loading || !sql.trim()}
        >
          Test Query
        </button>
        <button
          type="submit"
          class="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
          onclick={saveQuery}
          disabled={loading || !name.trim() || !sql.trim()}
        >
          {selectedQuery ? 'Update' : 'Create'} Query
        </button>
      </div>
    </div>
  {:else}
    <div class="flex h-full flex-col">
      <div class="mb-4 flex flex-shrink-0 items-center justify-between">
        <h3 class="text-lg font-medium text-gray-900">Queries ({queries.length})</h3>
        <button
          class="inline-flex items-center rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          onclick={startNewQuery}
          disabled={loading}
        >
          <span class="material-symbols-outlined mr-2 text-base">add</span>
          New Query
        </button>
      </div>

      <div class="flex-1 overflow-y-auto">
        <div class="space-y-3">
          {#each queries as query}
            <div
              class="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
              class:border-blue-500={selectedQuery?.id === query.id}
              class:bg-blue-50={selectedQuery?.id === query.id}
              onclick={() => editQuery(query)}
              onkeydown={(e) => e.key === 'Enter' && editQuery(query)}
              role="button"
              tabindex="0"
            >
              <div class="mb-2 flex items-start justify-between">
                <h4 class="mr-2 flex-1 truncate text-sm font-medium text-gray-900">{query.name}</h4>
                <button
                  class="rounded p-1 text-gray-400 transition-colors hover:text-red-600"
                  onclick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    deleteQuery(query);
                  }}
                  disabled={loading}
                  aria-label="Delete query"
                >
                  <span class="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>

              {#if query.description}
                <p class="mb-2 line-clamp-2 text-xs text-gray-500">{query.description}</p>
              {/if}

              <div class="flex justify-between text-xs text-gray-400">
                <span>Modified: {query.lastModified.toLocaleDateString()}</span>
                {#if query.lastExecuted}
                  <span>Last run: {query.lastExecuted.toLocaleDateString()}</span>
                {/if}
              </div>
            </div>
          {/each}

          {#if queries.length === 0 && !loading}
            <div class="py-12 text-center">
              <div class="mb-4 text-gray-500">
                <span class="material-symbols-outlined mx-auto mb-4 text-5xl text-gray-400"
                  >description</span
                >
              </div>
              <h3 class="mb-2 text-lg font-medium text-gray-900">No queries yet</h3>
              <p class="mb-4 text-gray-500">Create your first global query to get started</p>
              <button
                class="inline-flex items-center rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                onclick={startNewQuery}
              >
                Create your first query
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<ConfirmationModal
  isOpen={showConfirmModal}
  title="Delete Query"
  message={queryToDelete ? `Are you sure you want to delete "${queryToDelete.name}"?` : ''}
  confirmText="Delete"
  cancelText="Cancel"
  onConfirm={confirmDeleteQuery}
  onCancel={cancelDeleteQuery}
/>
