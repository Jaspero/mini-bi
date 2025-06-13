<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { Query, IDashboardService } from '../../types/index.js';

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

{#if isOpen}
  <div class="modal-overlay" on:click={handleClose} on:keydown={handleClose} role="dialog" aria-modal="true" tabindex="-1">
    <div class="modal-content" on:click|stopPropagation on:keydown|stopPropagation role="document">
      <header class="modal-header">
        <h2>Global Query Manager</h2>
        <button class="close-btn" on:click={handleClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
          </svg>
        </button>
      </header>

      <div class="modal-body">
        {#if error}
          <div class="error-message">{error}</div>
        {/if}

        {#if loading}
          <div class="loading-spinner">Loading...</div>
        {/if}

        <div class="queries-container">
          <!-- Query List -->
          <div class="queries-list">
            <div class="list-header">
              <h3>Queries ({queries.length})</h3>
              <button class="add-btn" on:click={startNewQuery} disabled={loading}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                New Query
              </button>
            </div>

            <div class="queries-grid">
              {#each queries as query}
                <div class="query-item" class:selected={selectedQuery?.id === query.id}>
                  <div class="query-header">
                    <h4>{query.name}</h4>
                    <div class="query-status">
                      <span class="status-badge" class:active={query.isActive} class:inactive={!query.isActive}>
                        {query.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  
                  {#if query.description}
                    <p class="query-description">{query.description}</p>
                  {/if}
                  
                  <div class="query-meta">
                    <span>Modified: {query.lastModified.toLocaleDateString()}</span>
                    {#if query.lastExecuted}
                      <span>Last run: {query.lastExecuted.toLocaleDateString()}</span>
                    {/if}
                  </div>

                  <div class="query-actions">
                    <button class="edit-btn" on:click={() => editQuery(query)} disabled={loading}>
                      Edit
                    </button>
                    <button class="delete-btn" on:click={() => deleteQuery(query)} disabled={loading}>
                      Delete
                    </button>
                  </div>
                </div>
              {/each}

              {#if queries.length === 0 && !loading}
                <div class="empty-state">
                  <p>No queries created yet.</p>
                  <button class="create-first-btn" on:click={startNewQuery}>Create your first query</button>
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Query Editor Dialog -->
{#if showQueryEditor}
  <div class="modal-overlay editor-overlay" on:click={resetForm} on:keydown={resetForm} role="dialog" aria-modal="true" tabindex="-1">
    <div class="modal-content editor-modal" on:click|stopPropagation on:keydown|stopPropagation role="document">
      <header class="modal-header">
        <h2>{selectedQuery ? 'Edit Query' : 'New Query'}</h2>
        <button class="close-btn" on:click={resetForm} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
          </svg>
        </button>
      </header>

      <div class="modal-body editor-body">
        {#if error}
          <div class="error-message">{error}</div>
        {/if}

        <div class="form-content">
          <div class="form-group">
            <label for="query-name">Name *</label>
            <input 
              id="query-name" 
              type="text" 
              bind:value={name} 
              required 
              disabled={loading}
              placeholder="Enter query name"
            />
          </div>

          <div class="form-group">
            <label for="query-description">Description</label>
            <input 
              id="query-description" 
              type="text" 
              bind:value={description} 
              disabled={loading}
              placeholder="Enter query description"
            />
          </div>

          <div class="form-group">
            <label for="query-sql">SQL Query *</label>
            <textarea 
              id="query-sql" 
              bind:value={sql} 
              required 
              disabled={loading}
              placeholder="SELECT * FROM table_name;"
              rows="12"
            ></textarea>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                bind:checked={isActive} 
                disabled={loading}
              />
              Active
            </label>
          </div>
        </div>

        <div class="form-footer">
          <button type="button" class="cancel-btn" on:click={resetForm} disabled={loading}>
            Cancel
          </button>
          <button type="button" class="test-btn" on:click={testQuery} disabled={loading || !sql.trim()}>
            Test Query
          </button>
          <button type="submit" class="save-btn" on:click={saveQuery} disabled={loading || !name.trim() || !sql.trim()}>
            {selectedQuery ? 'Update' : 'Create'} Query
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    width: 100%;
    max-width: 1200px;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #e5e7eb;
    background: #f9fafb;
  }

  .modal-header h2 {
    margin: 0;
    color: #111827;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #6b7280;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .close-btn:hover {
    color: #374151;
    background: #e5e7eb;
  }

  .modal-body {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .error-message {
    background: #fef2f2;
    color: #dc2626;
    padding: 12px 16px;
    margin: 16px 24px;
    border-radius: 6px;
    border: 1px solid #fecaca;
  }

  .loading-spinner {
    text-align: center;
    padding: 40px;
    color: #6b7280;
  }

  .queries-container {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 20px 24px;
  }

  .queries-list {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .list-header h3 {
    margin: 0;
    color: #111827;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .add-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: background 0.2s;
  }

  .add-btn:hover:not(:disabled) {
    background: #2563eb;
  }

  .add-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .queries-grid {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .query-item {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 16px;
    transition: all 0.2s;
    cursor: pointer;
  }

  .query-item:hover {
    border-color: #d1d5db;
    background: #f3f4f6;
  }

  .query-item.selected {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .query-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
  }

  .query-header h4 {
    margin: 0;
    color: #111827;
    font-size: 1rem;
    font-weight: 600;
  }

  .query-status {
    display: flex;
    align-items: center;
  }

  .status-badge {
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 12px;
    font-weight: 500;
  }

  .status-badge.active {
    background: #d1fae5;
    color: #065f46;
  }

  .status-badge.inactive {
    background: #fee2e2;
    color: #991b1b;
  }

  .query-description {
    margin: 0 0 12px 0;
    color: #6b7280;
    font-size: 0.875rem;
    line-height: 1.4;
  }

  .query-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.75rem;
    color: #9ca3af;
    margin-bottom: 12px;
  }

  .query-actions {
    display: flex;
    gap: 8px;
  }

  .edit-btn, .delete-btn {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .edit-btn {
    background: #3b82f6;
    color: white;
    border: none;
  }

  .edit-btn:hover:not(:disabled) {
    background: #2563eb;
  }

  .delete-btn {
    background: #ef4444;
    color: white;
    border: none;
  }

  .delete-btn:hover:not(:disabled) {
    background: #dc2626;
  }

  .edit-btn:disabled, .delete-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #6b7280;
  }

  .empty-state p {
    margin: 0 0 16px 0;
  }

  .create-first-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .create-first-btn:hover {
    background: #2563eb;
  }

  /* Query Editor Dialog */
  .editor-overlay {
    z-index: 1100; /* Higher than main modal */
  }

  .editor-modal {
    max-width: 800px;
    max-height: 80vh;
  }

  .editor-body {
    padding: 0;
    overflow: hidden;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .form-content {
    padding: 24px;
    overflow-y: auto;
    flex: 1;
  }

  .form-footer {
    padding: 20px 24px;
    border-top: 1px solid #e5e7eb;
    background: #f9fafb;
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    flex-shrink: 0;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-group label {
    display: block;
    margin-bottom: 4px;
    color: #374151;
    font-weight: 500;
    font-size: 0.875rem;
  }

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    transition: border-color 0.2s;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-group textarea {
    resize: vertical;
    font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
  }

  .checkbox-label {
    display: flex !important;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    width: auto !important;
    margin: 0;
  }

  .cancel-btn, .test-btn, .save-btn {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .cancel-btn {
    background: #6b7280;
    color: white;
    border: none;
  }

  .cancel-btn:hover:not(:disabled) {
    background: #4b5563;
  }

  .test-btn {
    background: #8b5cf6;
    color: white;
    border: none;
  }

  .test-btn:hover:not(:disabled) {
    background: #7c3aed;
  }

  .save-btn {
    background: #10b981;
    color: white;
    border: none;
  }

  .save-btn:hover:not(:disabled) {
    background: #059669;
  }

  .cancel-btn:disabled, .test-btn:disabled, .save-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    .editor-modal {
      max-width: 95vw;
      max-height: 90vh;
    }
    
    .form-footer {
      flex-direction: column;
    }
    
    .cancel-btn, .test-btn, .save-btn {
      width: 100%;
    }
  }
</style>
