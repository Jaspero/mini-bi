<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let mockSchema: any;
  export let sqlTemplates: any[] = [];

  const dispatch = createEventDispatcher<{
    'insert-text': { text: string };
    'insert-template': { template: string };
    'set-editor-value': { value: string };
  }>();

  let selectedTable: any = null;

  function selectTable(table: any) {
    selectedTable = selectedTable === table ? null : table;
  }

  function insertTableName(tableName: string) {
    dispatch('insert-text', { text: tableName });
  }

  function insertColumnName(tableName: string, columnName: string) {
    dispatch('insert-text', { text: `${tableName}.${columnName}` });
  }

  function insertSelectAll(tableName: string) {
    const selectQuery = `SELECT * FROM ${tableName}`;
    dispatch('set-editor-value', { value: selectQuery });
  }

  function insertTemplate(template: string) {
    dispatch('set-editor-value', { value: template });
  }
</script>

<div class="flex flex-col h-full">
  <!-- SQL Templates Section -->
  <div class="mb-6">
    <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">SQL Templates</h3>
    <div class="flex flex-col gap-2">
      {#each sqlTemplates as template}
        <button 
          class="flex items-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-md text-sm cursor-pointer transition-colors text-left w-full" 
          on:click={() => insertTemplate(template.sql)}
          title="Click to insert template"
        >
          <span class="material-symbols-outlined text-lg">description</span>
          <span>{template.name}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Database Schema Section -->
  <div class="flex-1 overflow-y-auto">
    <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Database Schema</h3>
    <div class="space-y-3">
      {#each mockSchema.tables as table}
        <div class="border border-gray-200 rounded-lg overflow-hidden">
          <!-- Table Header -->
          <div 
            class="flex items-center gap-3 p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors border-b border-gray-200" 
            on:click={() => selectTable(table)} 
            on:keydown={(e) => e.key === 'Enter' && selectTable(table)} 
            role="button" 
            tabindex="0"
          >
            <span class="material-symbols-outlined text-lg text-gray-600">table_view</span>
            <div class="flex-1">
              <h4 class="font-medium text-gray-900 text-sm m-0">{table.name}</h4>
              <p class="text-xs text-gray-500 m-0 mt-0.5">{table.columns.length} columns</p>
            </div>
            <div class="flex gap-1">
              <button 
                class="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white border-0 rounded w-7 h-7 text-xs cursor-pointer transition-colors" 
                on:click|stopPropagation={() => insertTableName(table.name)} 
                title="Insert table name"
              >
                <span class="material-symbols-outlined text-sm">add</span>
              </button>
              <button 
                class="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white border-0 rounded w-7 h-7 text-xs cursor-pointer transition-colors" 
                on:click|stopPropagation={() => insertSelectAll(table.name)} 
                title="SELECT * FROM table"
              >
                <span class="material-symbols-outlined text-sm">play_arrow</span>
              </button>
            </div>
            <span class="material-symbols-outlined text-gray-400 transition-transform duration-200" class:rotate-180={selectedTable === table}>
              expand_more
            </span>
          </div>
          
          <!-- Table Columns -->
          {#if selectedTable === table}
            <div class="divide-y divide-gray-100">
              {#each table.columns as column}
                <div 
                  class="flex justify-between items-center p-3 cursor-pointer hover:bg-blue-50 transition-colors" 
                  on:click={() => insertColumnName(table.name, column.name)} 
                  on:keydown={(e) => e.key === 'Enter' && insertColumnName(table.name, column.name)} 
                  role="button" 
                  tabindex="0"
                  title="Click to insert {table.name}.{column.name}"
                >
                  <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-sm text-gray-400">
                      {column.primary ? 'key' : 'table_rows'}
                    </span>
                    <div class="flex flex-col">
                      <span class="text-sm font-medium text-gray-900">{column.name}</span>
                      <span class="text-xs text-gray-500 font-mono">{column.type}</span>
                    </div>
                  </div>
                  <div class="flex gap-1">
                    {#if column.primary}
                      <span class="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full font-medium" title="Primary Key">
                        PK
                      </span>
                    {/if}
                    {#if !column.nullable}
                      <span class="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full font-medium" title="Not Null">
                        NN
                      </span>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>
