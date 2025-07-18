<script lang="ts">
  import { onMount } from 'svelte';
  import MonacoEditor from '../ui/MonacoEditor.svelte';
  import type { DatabaseSchema } from '../../types/index.ts';

  let {
    value = $bindable(''),
    disabled = false,
    dashboardService = null,
    onChange = () => {},
    onExecute = () => {},
    onSave = () => {},
    onOpenSchema = (schemaData: any) => {}
  }: {
    value?: string;
    disabled?: boolean;
    dashboardService?: any;
    onChange?: (value: string) => void;
    onExecute?: () => void;
    onSave?: () => void;
    onOpenSchema?: (schemaData: any) => void;
  } = $props();

  let monacoEditor: any = $state(null);
  let schema: DatabaseSchema | null = $state(null);
  let schemaLoading = $state(false);
  let schemaError = $state<string | null>(null);

  async function loadSchema() {
    if (!dashboardService) {
      console.warn('Dashboard service not provided, schema will not be available');
      return;
    }

    schemaLoading = true;
    schemaError = null;

    try {
      schema = await dashboardService.getDatabaseSchema();
    } catch (error) {
      console.error('Failed to load database schema:', error);
      schemaError = error instanceof Error ? error.message : 'Failed to load schema';
      schema = null;
    } finally {
      schemaLoading = false;
    }
  }

  // Keyboard shortcuts for the Monaco editor
  const keyboardShortcuts = [
    {
      key: 'Ctrl+Enter',
      command: 'execute',
      callback: () => onExecute()
    },
    {
      key: 'Ctrl+S',
      command: 'save',
      callback: () => onSave()
    }
  ];

  function insertTemplate(template: string) {
    if (monacoEditor) {
      monacoEditor.setValue(template);
    }

    value = template;
    onChange(value);
  }

  function insertSelectAll(tableName: string) {
    const selectQuery = `SELECT * FROM ${tableName}`;
    if (monacoEditor) {
      monacoEditor.setValue(selectQuery);
    }
    value = selectQuery;
    onChange(value);
  }

  onMount(async () => {
    if (!value) {
      value = 'SELECT * FROM users;';
    }

    // Load schema when component mounts
    await loadSchema();
  });

  const sqlTemplates = [
    {
      name: 'Basic SELECT',
      sql: 'SELECT column1, column2\nFROM table_name\nWHERE condition;'
    },
    {
      name: 'JOIN Query',
      sql: 'SELECT a.column1, b.column2\nFROM table_a a\nJOIN table_b b ON a.id = b.table_a_id;'
    },
    {
      name: 'GROUP BY',
      sql: 'SELECT column1, COUNT(*) as count\nFROM table_name\nGROUP BY column1\nORDER BY count DESC;'
    }
  ];

  function openSchemaSidebar() {
    if (!schema) {
      console.warn('No schema available to display');
      return;
    }

    onOpenSchema({
      schema: schema,
      sqlTemplates,
      insertText: (text: string) => {
        if (monacoEditor) {
          monacoEditor.insertText(text);
        }
      },
      insertSelectAll: (tableName: string) => {
        insertSelectAll(tableName);
      },
      insertTemplate: (template: string) => {
        insertTemplate(template);
      },
      // Legacy support for existing schema sidebar
      mockSchema: {
        tables: schema.tables.map((table) => ({
          name: table.name,
          columns: table.columns.map((col) => ({
            name: col.name,
            type: col.type,
            nullable: col.nullable,
            primary: col.primary
          }))
        }))
      }
    });
  }
</script>

<div
  class="relative flex h-[500px] max-h-[80vh] min-h-[300px] resize-y overflow-hidden rounded-md border border-gray-300"
>
  <div class="flex flex-1 flex-col overflow-hidden">
    <div class="flex items-center justify-between gap-2 border-b border-gray-300 bg-gray-50 p-2">
      <div class="flex items-center gap-2">
        {#if schema}
          <button
            class="cursor-pointer rounded border-none bg-blue-500 px-3 py-1.5 text-xs text-white hover:bg-blue-600"
            onclick={openSchemaSidebar}
          >
            Schema
          </button>
        {/if}

        <!-- Template Dropdown -->
        <select
          class="cursor-pointer rounded border border-gray-300 px-2 py-1 text-xs"
          onchange={(e) => {
            const selectedTemplate = sqlTemplates.find((t) => t.name === e.target.value);
            if (selectedTemplate) {
              insertTemplate(selectedTemplate.sql);
            }
            e.target.value = '';
          }}
        >
          <option value="">Templates</option>
          {#each sqlTemplates as template}
            <option value={template.name}>{template.name}</option>
          {/each}
        </select>
      </div>

      <div class="flex items-center gap-2">
        {#if dashboardService}
          <span class="text-xs text-gray-500">Actions:</span>
          {#if schemaLoading}
            <span class="text-xs text-gray-400">Loading schema...</span>
          {:else if schemaError}
            <span class="text-xs text-red-500">Schema error</span>
            <button
              class="cursor-pointer rounded border-none bg-yellow-500 px-2 py-1 text-xs text-white hover:bg-yellow-600"
              onclick={loadSchema}
            >
              Retry
            </button>
          {:else if schema}
            {#each schema.tables.filter((table) => table.showInActions).slice(0, 3) as table}
              <button
                class="cursor-pointer rounded border-none bg-green-500 px-2 py-1 text-xs text-white hover:bg-green-600"
                onclick={() => insertSelectAll(table.name)}
                title="SELECT * FROM {table.name}"
              >
                {table.name}
              </button>
            {/each}
            {#if schema.tables.filter((table) => table.showInActions).length > 4}
              <span class="text-xs text-gray-400"
                >+{schema.tables.filter((table) => table.showInActions).length - 4} more</span
              >
            {/if}
          {/if}
        {/if}
      </div>
    </div>

    <MonacoEditor
      bind:this={monacoEditor}
      bind:value
      language="sql"
      theme="vs"
      {disabled}
      placeholder="Enter your SQL query here..."
      fontSize={14}
      wordWrap="on"
      lineNumbers="on"
      minimap={false}
      autoFormat={true}
      {keyboardShortcuts}
    />
  </div>
</div>
