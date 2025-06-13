<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import type { Query, IDashboardService } from '../../types/index.js';
  import SQLEditor from './SQLEditor_Reliable.svelte';
  import Modal from '../ui/Modal.svelte';

  export let dashboardService: IDashboardService;
  export let isOpen = false;

  const dispatch = createEventDispatcher<{
    close: {};
    'query-created': { query: Query };
    'query-updated': { query: Query };
    'query-deleted': { queryId: string };
  }>();

  let queries: Query[] = [];
  let selectedQuery: Query | null = null;
  let loading = false;
  let error = '';
  let showQueryEditor = false;

  // Form state
  let name = '';
  let description = '';
  let sql = '';
  let isActive = true;

  onMount(async () => {
    if (isOpen) {
      await loadQueries();
    }
  });

  $: if (isOpen) {
    loadQueries();
  }

  // Prevent body scroll when modal is open - now handled by Modal component
  // $: if (isOpen || showQueryEditor) {
  //   document.body.style.overflow = 'hidden';
  // } else {
  //   document.body.style.overflow = '';
  // }

  onDestroy(() => {
    // Cleanup - scroll cleanup now handled by Modal component
    // document.body.style.overflow = '';
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

  function handleClose() {
    resetForm();
    dispatch('close', {});
  }

  function handleOverlayClick(event: Event) {
    // Only close if clicking the overlay itself, not its contents
    if (event.target === event.currentTarget) {
      if (showQueryEditor) {
        resetForm();
      } else {
        handleClose();
      }
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
    isActive = query.isActive;
    showQueryEditor = true;
  }

  function resetForm() {
    name = '';
    description = '';
    sql = '';
    isActive = true;
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
          isActive,
          lastModified: new Date()
        });
        
        dispatch('query-updated', { query: updatedQuery });
      } else {
        // Create new query
        const newQuery = await dashboardService.saveGlobalQuery({
          name: name.trim(),
          description: description.trim(),
          sql: sql.trim(),
          parameters: [],
          isActive,
          lastModified: new Date()
        });
        
        dispatch('query-created', { query: newQuery });
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
    if (!confirm(`Are you sure you want to delete "${query.name}"?`)) {
      return;
    }

    try {
      loading = true;
      error = '';
      await dashboardService.deleteGlobalQuery(query.id);
      dispatch('query-deleted', { queryId: query.id });
      await loadQueries();
      
      if (selectedQuery?.id === query.id) {
        resetForm();
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to delete query';
      console.error('Error deleting query:', err);
    } finally {
      loading = false;
    }
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

<Modal {isOpen} title="Global Query Manager" size="xlarge" on:close={handleClose}>
  <div class="p-6">
    {#if error}
      <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">{error}</div>
    {/if}

    {#if loading}
      <div class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span class="ml-2 text-gray-600">Loading...</span>
      </div>
    {/if}

        <div class="h-full overflow-hidden">
          <!-- Query List -->
          <div class="h-full flex flex-col">
            <div class="flex justify-between items-center mb-4 flex-shrink-0">
              <h3 class="text-lg font-medium text-gray-900">Queries ({queries.length})</h3>
              <button class="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed" on:click={startNewQuery} disabled={loading}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="mr-2">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                New Query
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
              {#each queries as query}
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow" class:ring-2={selectedQuery?.id === query.id} class:ring-blue-500={selectedQuery?.id === query.id}>
                  <div class="flex justify-between items-start mb-2">
                    <h4 class="font-medium text-gray-900 truncate">{query.name}</h4>
                    <div class="flex-shrink-0">
                      <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" class:bg-green-100={query.isActive} class:text-green-800={query.isActive} class:bg-gray-100={!query.isActive} class:text-gray-800={!query.isActive}>
                        {query.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  
                  {#if query.description}
                    <p class="text-sm text-gray-600 mb-3 line-clamp-2">{query.description}</p>
                  {/if}
                  
                  <div class="text-xs text-gray-500 mb-3 space-y-1">
                    <div>Modified: {query.lastModified.toLocaleDateString()}</div>
                    {#if query.lastExecuted}
                      <div>Last run: {query.lastExecuted.toLocaleDateString()}</div>
                    {/if}
                  </div>

                  <div class="flex space-x-2">
                    <button class="flex-1 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50" on:click={() => editQuery(query)} disabled={loading}>
                      Edit
                    </button>
                    <button class="flex-1 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:opacity-50" on:click={() => deleteQuery(query)} disabled={loading}>
                      Delete
                    </button>
                  </div>
                </div>
              {/each}

              {#if queries.length === 0 && !loading}
                <div class="col-span-full text-center py-12">
                  <div class="text-gray-500 mb-4">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 class="text-lg font-medium text-gray-900 mb-2">No queries yet</h3>
                  <p class="text-gray-500 mb-4">Create your first global query to get started</p>
                  <button class="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600" on:click={startNewQuery}>Create your first query</button>
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>
</Modal>

<!-- Query Editor Dialog -->
<Modal isOpen={showQueryEditor} title={selectedQuery ? 'Edit Query' : 'New Query'} size="full" on:close={resetForm}>
  <div class="p-6">
    {#if error}
      <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">{error}</div>
    {/if}

        <div class="h-full flex flex-col space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 flex-shrink-0">
            <div class="space-y-2">
              <label for="query-name" class="block text-sm font-medium text-gray-700">Name *</label>
              <input 
                id="query-name" 
                type="text" 
                bind:value={name} 
                required 
                disabled={loading}
                placeholder="Enter query name"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
            </div>

            <div class="space-y-2">
              <label for="query-description" class="block text-sm font-medium text-gray-700">Description</label>
              <input 
                id="query-description" 
                type="text" 
                bind:value={description} 
                disabled={loading}
                placeholder="Enter query description"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
            </div>
          </div>

          <div class="space-y-2 flex-1 flex flex-col">
            <label for="query-sql" class="block text-sm font-medium text-gray-700">SQL Query *</label>
            <div class="flex-1">
              <SQLEditor 
                bind:value={sql}
                disabled={loading}
                on:change={(e) => sql = e.detail.value}
                on:execute={() => testQuery()}
                on:save={() => saveQuery()}
              />
            </div>
          </div>

          <div class="flex-shrink-0">
            <label class="inline-flex items-center">
              <input 
                type="checkbox" 
                bind:checked={isActive} 
                disabled={loading}
                class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span class="ml-2 text-sm text-gray-700">Active</span>
            </label>
          </div>
        </div>
      </div>

  <div slot="footer" class="flex justify-end space-x-3 p-6 border-t border-gray-200">
    <button type="button" class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50" on:click={resetForm} disabled={loading}>
      Cancel
    </button>
    <button type="button" class="px-4 py-2 text-blue-700 bg-blue-50 border border-blue-300 rounded-md hover:bg-blue-100 disabled:opacity-50" on:click={testQuery} disabled={loading || !sql.trim()}>
      Test Query
    </button>
    <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50" on:click={saveQuery} disabled={loading || !name.trim() || !sql.trim()}>
      {selectedQuery ? 'Update' : 'Create'} Query
    </button>
  </div>
</Modal>


