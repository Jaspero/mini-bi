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
    resetForm();
    isCreating = true;
    editForm.id = 'query-' + Math.random().toString(36).substr(2, 9);
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

  function deleteQuery(queryId: string) {
    if (confirm('Are you sure you want to delete this query?')) {
      queries = queries.filter(q => q.id !== queryId);
      resetForm();
      dispatch('queries-updated', { queries });
    }
  }

  async function saveQuery() {
    if (!editForm.name.trim() || !editForm.sql.trim()) {
      alert('Please provide both a name and SQL query.');
      return;
    }

    // Validate SQL
    try {
      const validation = await dashboardService.validateQuery(editForm.sql);
      if (!validation.isValid) {
        alert(`SQL Error: ${validation.error}`);
        return;
      }
    } catch (error) {
      console.error('Error validating query:', error);
      alert('Failed to validate query. Please check your SQL syntax.');
      return;
    }

    const now = new Date();
    const queryData: Query = {
      id: editForm.id,
      name: editForm.name,
      description: editForm.description,
      sql: editForm.sql,
      parameters: [], // TODO: Parse parameters from SQL
      created: isCreating ? now : (selectedQuery?.created || now),
      lastModified: now,
      isActive: editForm.isActive
    };

    if (isCreating) {
      queries = [...queries, queryData];
    } else {
      queries = queries.map(q => q.id === queryData.id ? queryData : q);
    }

    resetForm();
    dispatch('queries-updated', { queries });
  }

  async function executeQuery(query: Query) {
    try {
      isExecuting = true;
      queryResult = await dashboardService.executeQuery(query.id);
      showPreview = true;
      
      // Update lastExecuted
      queries = queries.map(q => 
        q.id === query.id 
          ? { ...q, lastExecuted: new Date() }
          : q
      );
      dispatch('queries-updated', { queries });
    } catch (error) {
      console.error('Error executing query:', error);
      alert('Failed to execute query: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      isExecuting = false;
    }
  }

  async function previewQuery() {
    if (!editForm.sql.trim()) return;

    try {
      isExecuting = true;
      queryResult = await dashboardService.getQueryPreview(editForm.sql, 10);
      showPreview = true;
    } catch (error) {
      console.error('Error previewing query:', error);
      alert('Failed to preview query: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      isExecuting = false;
    }
  }

  function formatDate(date: Date | undefined) {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
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
                <div class="query-actions">
                  <button 
                    class="btn-execute" 
                    on:click={() => executeQuery(query)}
                    disabled={isExecuting || !query.isActive}
                    title="Execute Query"
                    aria-label="Execute Query"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </button>
                  <button 
                    class="btn-edit" 
                    on:click={() => editQuery(query)}
                    title="Edit Query"
                    aria-label="Edit Query"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41L18.37 3.29a.996.996 0 0 0-1.41 0L15.13 5.12l3.75 3.75 1.83-1.83z"/>
                    </svg>
                  </button>
                  <button 
                    class="btn-delete" 
                    on:click={() => deleteQuery(query.id)}
                    title="Delete Query"
                    aria-label="Delete Query"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                  </button>
                </div>
              </div>
            {/each}

            {#if queries.length === 0}
              <div class="empty-state">
                <p>No queries yet. Create your first SQL query to get started.</p>
              </div>
            {/if}
          </div>
        {:else}
          <!-- Query Editor View -->
          <div class="query-editor">
            <div class="editor-header">
              <h3>{isCreating ? 'Create New Query' : 'Edit Query'}</h3>
              <button class="btn-back" on:click={resetForm}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.42-1.41L7.83 13H20v-2z"/>
                </svg>
                Back
              </button>
            </div>

            <div class="form-group">
              <label for="query-name">Query Name</label>
              <input
                id="query-name"
                type="text"
                bind:value={editForm.name}
                placeholder="Enter query name"
                required
              />
            </div>

            <div class="form-group">
              <label for="query-description">Description (Optional)</label>
              <input
                id="query-description"
                type="text"
                bind:value={editForm.description}
                placeholder="Enter query description"
              />
            </div>

            <div class="form-group">
              <div class="sql-header">
                <label for="query-sql">SQL Query</label>
                <button 
                  class="btn-preview" 
                  on:click={previewQuery}
                  disabled={isExecuting || !editForm.sql.trim()}
                >
                  {isExecuting ? 'Executing...' : 'Preview'}
                </button>
              </div>
              <textarea
                id="query-sql"
                bind:value={editForm.sql}
                placeholder="SELECT * FROM table_name WHERE..."
                rows="8"
                required
              ></textarea>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  bind:checked={editForm.isActive}
                />
                Active Query
              </label>
            </div>
          </div>
        {/if}

        {#if showPreview && queryResult}
          <div class="query-result">
            <div class="result-header">
              <h4>Query Result</h4>
              <button class="btn-close-preview" on:click={() => showPreview = false} aria-label="Close preview">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            
            {#if queryResult.error}
              <div class="error-message">
                <strong>Error:</strong> {queryResult.error}
              </div>
            {:else}
              <div class="result-meta">
                <span>{queryResult.rowCount} rows</span>
                <span>Executed in {queryResult.executionTime}ms</span>
              </div>
              
              <div class="result-table">
                <table>
                  <thead>
                    <tr>
                      {#each queryResult.columns as column}
                        <th>{column.name}</th>
                      {/each}
                    </tr>
                  </thead>
                  <tbody>
                    {#each queryResult.rows.slice(0, 10) as row}
                      <tr>
                        {#each row as cell}
                          <td>{cell ?? 'NULL'}</td>
                        {/each}
                      </tr>
                    {/each}
                  </tbody>
                </table>
                {#if queryResult.rows.length > 10}
                  <p class="table-note">Showing first 10 rows of {queryResult.rowCount} total</p>
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
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" 
        on:click={saveQuery}
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


  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: white;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    width: 90%;
    max-width: 900px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
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
    font-size: 20px;
    font-weight: 600;
    color: #1f2937;
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    color: #6b7280;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: #e5e7eb;
    color: #374151;
  }

  .modal-body {
    padding: 24px;
    overflow-y: auto;
    flex: 1;
  }

  .queries-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .queries-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;
  }

  .btn-primary {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-primary:hover {
    background: #2563eb;
  }

  .queries-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .query-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 16px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: white;
    transition: all 0.2s;
  }

  .query-item:hover {
    border-color: #d1d5db;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .query-item.inactive {
    opacity: 0.6;
    background: #f9fafb;
  }

  .query-info {
    flex: 1;
  }

  .query-info h4 {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
  }

  .query-description {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #6b7280;
    line-height: 1.5;
  }

  .query-meta {
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: #9ca3af;
  }

  .query-actions {
    display: flex;
    gap: 8px;
    margin-left: 16px;
  }

  .btn-execute, .btn-edit, .btn-delete {
    padding: 8px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-execute {
    background: #10b981;
    color: white;
  }

  .btn-execute:hover:not(:disabled) {
    background: #059669;
  }

  .btn-execute:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }

  .btn-edit {
    background: #f3f4f6;
    color: #374151;
  }

  .btn-edit:hover {
    background: #e5e7eb;
  }

  .btn-delete {
    background: #fee2e2;
    color: #dc2626;
  }

  .btn-delete:hover {
    background: #fecaca;
  }

  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #6b7280;
  }

  .query-editor {
    max-width: 100%;
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  .editor-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;
  }

  .btn-back {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #f3f4f6;
    color: #374151;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-back:hover {
    background: #e5e7eb;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    margin-bottom: 6px;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
  }

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 14px;
    transition: border-color 0.2s;
    box-sizing: border-box;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 1px #3b82f6;
  }

  .form-group textarea {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    resize: vertical;
  }

  .sql-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .btn-preview {
    padding: 6px 12px;
    background: #8b5cf6;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-preview:hover:not(:disabled) {
    background: #7c3aed;
  }

  .btn-preview:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    width: auto;
  }

  .query-result {
    margin-top: 24px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #f9fafb;
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #e5e7eb;
    background: white;
    border-radius: 8px 8px 0 0;
  }

  .result-header h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #1f2937;
  }

  .btn-close-preview {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    color: #6b7280;
    transition: color 0.2s;
  }

  .btn-close-preview:hover {
    color: #374151;
  }

  .error-message {
    padding: 16px;
    color: #dc2626;
    background: #fef2f2;
    border-radius: 4px;
    margin: 16px;
    font-size: 14px;
  }

  .result-meta {
    padding: 12px 16px;
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: #6b7280;
    background: white;
  }

  .result-table {
    padding: 0 16px 16px;
    background: white;
    border-radius: 0 0 8px 8px;
  }

  .result-table table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  .result-table th {
    background: #f3f4f6;
    padding: 8px 12px;
    text-align: left;
    font-weight: 600;
    color: #374151;
    border: 1px solid #e5e7eb;
  }

  .result-table td {
    padding: 8px 12px;
    border: 1px solid #e5e7eb;
    color: #1f2937;
  }

  .table-note {
    margin: 12px 0 0 0;
    font-size: 12px;
    color: #6b7280;
    text-align: center;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 20px 24px;
    border-top: 1px solid #e5e7eb;
    background: #f9fafb;
    flex-shrink: 0;
  }

  .btn-cancel, .btn-save {
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-cancel {
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .btn-cancel:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .btn-save {
    background: #3b82f6;
    color: white;
    border: none;
    font-weight: 500;
  }

  .btn-save:hover {
    background: #2563eb;
  }

