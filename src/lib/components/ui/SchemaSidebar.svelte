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

<div class="flex h-full flex-col">
  <!-- SQL Templates Section -->
  <div class="mb-6">
    <h3 class="mb-3 text-sm font-semibold tracking-wide text-gray-700 uppercase">SQL Templates</h3>
    <div class="flex flex-col gap-2">
      {#each sqlTemplates as template}
        <button
          class="flex w-full cursor-pointer items-center gap-2 rounded-md border-0 bg-blue-600 px-3 py-2.5 text-left text-sm text-white transition-colors hover:bg-blue-700"
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
    <h3 class="mb-3 text-sm font-semibold tracking-wide text-gray-700 uppercase">
      Database Schema
    </h3>
    <div class="space-y-3">
      {#each mockSchema.tables as table}
        <div class="overflow-hidden rounded-lg border border-gray-200">
          <!-- Table Header -->
          <div
            class="flex cursor-pointer items-center gap-3 border-b border-gray-200 bg-gray-50 p-3 transition-colors hover:bg-gray-100"
            on:click={() => selectTable(table)}
            on:keydown={(e) => e.key === 'Enter' && selectTable(table)}
            role="button"
            tabindex="0"
          >
            <span class="material-symbols-outlined text-lg text-gray-600">table_view</span>
            <div class="flex-1">
              <h4 class="m-0 text-sm font-medium text-gray-900">{table.name}</h4>
              <p class="m-0 mt-0.5 text-xs text-gray-500">{table.columns.length} columns</p>
            </div>
            <div class="flex gap-1">
              <button
                class="flex h-7 w-7 cursor-pointer items-center justify-center rounded border-0 bg-blue-600 text-xs text-white transition-colors hover:bg-blue-700"
                on:click|stopPropagation={() => insertTableName(table.name)}
                title="Insert table name"
              >
                <span class="material-symbols-outlined text-sm">add</span>
              </button>
              <button
                class="flex h-7 w-7 cursor-pointer items-center justify-center rounded border-0 bg-green-600 text-xs text-white transition-colors hover:bg-green-700"
                on:click|stopPropagation={() => insertSelectAll(table.name)}
                title="SELECT * FROM table"
              >
                <span class="material-symbols-outlined text-sm">play_arrow</span>
              </button>
            </div>
            <span
              class="material-symbols-outlined text-gray-400 transition-transform duration-200"
              class:rotate-180={selectedTable === table}
            >
              expand_more
            </span>
          </div>

          <!-- Table Columns -->
          {#if selectedTable === table}
            <div class="divide-y divide-gray-100">
              {#each table.columns as column}
                <div
                  class="flex cursor-pointer items-center justify-between p-3 transition-colors hover:bg-blue-50"
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
                      <span class="font-mono text-xs text-gray-500">{column.type}</span>
                    </div>
                  </div>
                  <div class="flex gap-1">
                    {#if column.primary}
                      <span
                        class="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800"
                        title="Primary Key"
                      >
                        PK
                      </span>
                    {/if}
                    {#if !column.nullable}
                      <span
                        class="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800"
                        title="Not Null"
                      >
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
