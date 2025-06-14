<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { Query, IDashboardService } from '../../types/index.js';
  import SQLEditor from './SQLEditor_Reliable.svelte';

  export let dashboardService: IDashboardService;

  const dispatch = createEventDispatcher<{
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

<!-- Query Manager Content -->
<div class="h-full flex flex-col">
  {#if error}
    <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">{error}</div>
  {/if}

  {#if loading}
    <div class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <span class="ml-2 text-gray-600">Loading...</span>
    </div>
  {/if}

  {#if showQueryEditor}
    <!-- Query Editor Form -->
    <div class="h-full flex flex-col">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-semibold text-gray-900">
          {selectedQuery ? 'Edit Query' : 'New Query'}
        </h3>
        <button 
          class="p-2 text-gray-500 hover:text-gray-700 transition-colors"
          on:click={resetForm}
        >
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="flex-1 flex flex-col space-y-4">
        <div class="grid grid-cols-1 gap-4 flex-shrink-0">
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

        <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button 
            type="button" 
            class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50" 
            on:click={resetForm} 
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            type="button" 
            class="px-4 py-2 text-blue-700 bg-blue-50 border border-blue-300 rounded-md hover:bg-blue-100 disabled:opacity-50" 
            on:click={testQuery} 
            disabled={loading || !sql.trim()}
          >
            Test Query
          </button>
          <button 
            type="submit" 
            class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50" 
            on:click={saveQuery} 
            disabled={loading || !name.trim() || !sql.trim()}
          >
            {selectedQuery ? 'Update' : 'Create'} Query
          </button>
        </div>
      </div>
    </div>
  {:else}
    <!-- Query List -->
    <div class="h-full flex flex-col">
      <div class="flex justify-between items-center mb-4 flex-shrink-0">
        <h3 class="text-lg font-medium text-gray-900">Queries ({queries.length})</h3>
        <button 
          class="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed" 
          on:click={startNewQuery} 
          disabled={loading}
        >
          <span class="material-symbols-outlined text-base mr-2">add</span>
          New Query
        </button>
      </div>

      <div class="flex-1 overflow-y-auto">
        <div class="space-y-3">
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
                <button 
                  class="flex-1 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50" 
                  on:click={() => editQuery(query)} 
                  disabled={loading}
                >
                  Edit
                </button>
                <button 
                  class="flex-1 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:opacity-50" 
                  on:click={() => deleteQuery(query)} 
                  disabled={loading}
                >
                  Delete
                </button>
              </div>
            </div>
          {/each}

          {#if queries.length === 0 && !loading}
            <div class="text-center py-12">
              <div class="text-gray-500 mb-4">
                <span class="material-symbols-outlined text-5xl text-gray-400 mx-auto mb-4">description</span>
              </div>
              <h3 class="text-lg font-medium text-gray-900 mb-2">No queries yet</h3>
              <p class="text-gray-500 mb-4">Create your first global query to get started</p>
              <button 
                class="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600" 
                on:click={startNewQuery}
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


