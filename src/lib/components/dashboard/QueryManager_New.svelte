<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Query, QueryResult, IDashboardService } from '../../types/index.js';
  import Modal from '../ui/Modal.svelte';

  export let queries: Query[] = [];
  export let dashboardService: IDashboardService;
  export let isOpen = false;

  const dispatch = createEventDispatcher<{
    'queries-updated': { queries: Query[] };
    'close': {};
  }>();

  let selectedQuery: Query | null = null;
  let isEditing = false;
  let isCreating = false;
  let queryResult: QueryResult | null = null;
  let isExecuting = false;
  let showPreview = false;

  // Form state for editing/creating queries
  let editForm = {
    id: '',
    name: '',
    description: '',
    sql: '',
    isActive: true
  };

  function handleClose() {
    resetForm();
    dispatch('close', {});
  }

  function resetForm() {
    selectedQuery = null;
    isEditing = false;
    isCreating = false;
    queryResult = null;
    showPreview = false;
    editForm = {
      id: '',
      name: '',
      description: '',
      sql: '',
      isActive: true
    };
  }

  function createNewQuery() {
    isCreating = true;
    isEditing = false;
    selectedQuery = null;
    editForm = {
      id: '',
      name: '',
      description: '',
      sql: '',
      isActive: true
    };
  }

  function editQuery(query: Query) {
    selectedQuery = query;
    isEditing = true;
    isCreating = false;
    editForm = {
      id: query.id,
      name: query.name,
      description: query.description || '',
      sql: query.sql,
      isActive: query.isActive
    };
  }

  async function executeQuery(query: Query) {
    if (!dashboardService) return;
    
    isExecuting = true;
    try {
      queryResult = await dashboardService.executeQuery(query.sql);
    } catch (error) {
      console.error('Query execution failed:', error);
      queryResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: [],
        columns: [],
        executionTime: 0
      };
    } finally {
      isExecuting = false;
    }
  }

  async function saveQuery() {
    if (!editForm.name.trim() || !editForm.sql.trim()) return;

    const queryData: Partial<Query> = {
      name: editForm.name,
      description: editForm.description,
      sql: editForm.sql,
      isActive: editForm.isActive
    };

    try {
      if (isCreating) {
        const newQuery = await dashboardService.createQuery(queryData);
        queries = [...queries, newQuery];
      } else if (selectedQuery) {
        const updatedQuery = await dashboardService.updateQuery(selectedQuery.id, queryData);
        const index = queries.findIndex(q => q.id === selectedQuery!.id);
        queries[index] = updatedQuery;
        queries = queries;
      }

      dispatch('queries-updated', { queries });
      resetForm();
    } catch (error) {
      console.error('Failed to save query:', error);
    }
  }

  async function deleteQuery(query: Query) {
    if (confirm(`Are you sure you want to delete "${query.name}"?`)) {
      try {
        await dashboardService.deleteQuery(query.id);
        queries = queries.filter(q => q.id !== query.id);
        dispatch('queries-updated', { queries });
      } catch (error) {
        console.error('Failed to delete query:', error);
      }
    }
  }

  async function previewQuery() {
    if (!editForm.sql.trim()) return;
    
    isExecuting = true;
    showPreview = true;
    
    try {
      queryResult = await dashboardService.executeQuery(editForm.sql);
    } catch (error) {
      console.error('Query preview failed:', error);
      queryResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: [],
        columns: [],
        executionTime: 0
      };
    } finally {
      isExecuting = false;
    }
  }

  function formatDate(date: Date | string | undefined): string {
    if (!date) return 'Never';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  }
</script>

<Modal {isOpen} title="Query Manager" size="xlarge" on:close={handleClose}>
  <div class="p-6">
    {#if !isEditing && !isCreating}
      <!-- Query List View -->
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-lg font-semibold text-gray-900">SQL Queries</h3>
        <button 
          class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          on:click={createNewQuery}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="mr-2">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          New Query
        </button>
      </div>

      <div class="space-y-4">
        {#each queries as query (query.id)}
          <div class="border border-gray-200 rounded-lg p-4 bg-white hover:border-gray-300 transition-colors" class:opacity-50={!query.isActive}>
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <h4 class="text-lg font-medium text-gray-900 mb-1">{query.name}</h4>
                {#if query.description}
                  <p class="text-sm text-gray-600 mb-3">{query.description}</p>
                {/if}
                <div class="flex flex-wrap gap-4 text-xs text-gray-500">
                  <span>Last executed: {formatDate(query.lastExecuted)}</span>
                  <span>Modified: {formatDate(query.lastModified)}</span>
                </div>
              </div>
              
              <div class="flex gap-2 ml-4">
                <button 
                  class="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                  on:click={() => executeQuery(query)}
                  disabled={isExecuting}
                >
                  {#if isExecuting}
                    <svg class="w-4 h-4 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                  {:else}
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1m-6 4h.01M14 20h.01"></path>
                    </svg>
                  {/if}
                  Execute
                </button>
                
                <button 
                  class="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  on:click={() => editQuery(query)}
                >
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                  Edit
                </button>
                
                <button 
                  class="inline-flex items-center px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  on:click={() => deleteQuery(query)}
                >
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          </div>
        {/each}

        {#if queries.length === 0}
          <div class="text-center py-12">
            <div class="text-gray-500 mb-4">
              <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No queries yet</h3>
            <p class="text-gray-600 mb-4">Create your first SQL query to get started</p>
            <button 
              class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              on:click={createNewQuery}
            >
              Create your first query
            </button>
          </div>
        {/if}
      </div>
    {:else}
      <!-- Query Editor View -->
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900">
            {isCreating ? 'Create New Query' : `Edit "${selectedQuery?.name}"`}
          </h3>
          <button 
            class="inline-flex items-center px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            on:click={resetForm}
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Back to List
          </button>
        </div>

        <div class="space-y-4">
          <div class="space-y-2">
            <label for="query-name" class="block text-sm font-medium text-gray-700">Query Name *</label>
            <input
              id="query-name"
              type="text"
              bind:value={editForm.name}
              placeholder="Enter query name"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div class="space-y-2">
            <label for="query-description" class="block text-sm font-medium text-gray-700">Description</label>
            <input
              id="query-description"
              type="text"
              bind:value={editForm.description}
              placeholder="Enter description (optional)"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <label for="query-sql" class="block text-sm font-medium text-gray-700">SQL Query *</label>
              <button 
                class="inline-flex items-center px-3 py-1 text-sm bg-blue-50 text-blue-700 border border-blue-300 rounded hover:bg-blue-100 disabled:opacity-50"
                on:click={previewQuery}
                disabled={isExecuting || !editForm.sql.trim()}
              >
                {#if isExecuting}
                  <svg class="w-4 h-4 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                {:else}
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                  </svg>
                {/if}
                Preview
              </button>
            </div>
            <textarea
              id="query-sql"
              bind:value={editForm.sql}
              placeholder="Enter your SQL query here..."
              rows="8"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            ></textarea>
          </div>

          <div class="flex items-center">
            <input
              id="query-active"
              type="checkbox"
              bind:checked={editForm.isActive}
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label for="query-active" class="ml-2 block text-sm text-gray-700">
              Active query (available for use in blocks)
            </label>
          </div>
        </div>

        {#if showPreview && queryResult}
          <div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h4 class="text-sm font-medium text-gray-900 mb-3">Query Preview</h4>
            
            {#if queryResult.success}
              <div class="text-xs text-green-700 mb-2">
                ✓ Query executed successfully in {queryResult.executionTime}ms
              </div>
              
              {#if queryResult.data && queryResult.data.length > 0}
                <div class="bg-white border border-gray-300 rounded overflow-hidden">
                  <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                      <tr>
                        {#each queryResult.columns as column}
                          <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {column}
                          </th>
                        {/each}
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                      {#each queryResult.data.slice(0, 5) as row}
                        <tr>
                          {#each queryResult.columns as column}
                            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                              {row[column] || ''}
                            </td>
                          {/each}
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
                
                {#if queryResult.data.length > 5}
                  <div class="text-xs text-gray-500 mt-2">
                    Showing first 5 of {queryResult.data.length} rows
                  </div>
                {/if}
              {:else}
                <div class="text-sm text-gray-600">Query returned no results</div>
              {/if}
            {:else}
              <div class="text-sm text-red-700">
                ✗ Query failed: {queryResult.error}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <div slot="footer" class="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
    {#if isEditing || isCreating}
      <button 
        class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" 
        on:click={resetForm}
      >
        Cancel
      </button>
      <button 
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50" 
        on:click={saveQuery}
        disabled={!editForm.name.trim() || !editForm.sql.trim()}
      >
        {isCreating ? 'Create Query' : 'Save Changes'}
      </button>
    {:else}
      <button 
        class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" 
        on:click={handleClose}
      >
        Close
      </button>
    {/if}
  </div>
</Modal>
