<script lang="ts">
  import { onMount } from 'svelte';
  import MonacoEditor from '../ui/MonacoEditor.svelte';
  import Modal from '../ui/Modal.svelte';
  import type { DatabaseSchema } from '../../types/index';

  let {
    value = $bindable(''),
    disabled = false,
    dashboardService = null,
    variables = [],
    onChange = () => {},
    onExecute = () => {},
    onSave = () => {},
    onOpenSchema = (schemaData: any) => {}
  }: {
    value?: string;
    disabled?: boolean;
    dashboardService?: any;
    variables?: string[];
    onChange?: (value: string) => void;
    onExecute?: () => void;
    onSave?: () => void;
    onOpenSchema?: (schemaData: any) => void;
  } = $props();

  let monacoEditor: any = $state(null);
  let schema: DatabaseSchema | null = $state(null);
  let schemaLoading = $state(false);
  let schemaError = $state<string | null>(null);
  let isAIModalOpen = $state(false);
  let aiPrompt = $state('');
  let aiGenerating = $state(false);
  let aiError = $state<string | null>(null);

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

  async function generateSQLFromAI() {
    if (!dashboardService || !aiPrompt.trim()) return;

    aiGenerating = true;
    aiError = null;

    try {
      const generatedSQL = await dashboardService.generateSQLFromText(aiPrompt.trim());

      if (monacoEditor) {
        monacoEditor.setValue(generatedSQL);
      }
      value = generatedSQL;
      onChange(value);

      // Close modal and reset state
      isAIModalOpen = false;
      aiPrompt = '';
    } catch (error) {
      console.error('Failed to generate SQL from AI:', error);
      aiError = error instanceof Error ? error.message : 'Failed to generate SQL';
    } finally {
      aiGenerating = false;
    }
  }

  function openAIModal() {
    isAIModalOpen = true;
    aiPrompt = '';
    aiError = null;
  }

  function closeAIModal() {
    isAIModalOpen = false;
    aiPrompt = '';
    aiError = null;
  }

  onMount(async () => {
    if (!value) {
      value = 'SELECT * FROM users;';
    }

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
    <div
      class="flex flex-col gap-2 border-b border-gray-300 bg-gray-50 p-2 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex flex-wrap items-center gap-2">
        {#if schema}
          <button
            class="cursor-pointer rounded border-none bg-blue-500 px-3 py-1.5 text-xs text-white hover:bg-blue-600"
            onclick={openSchemaSidebar}
          >
            Schema
          </button>
        {/if}

        {#if dashboardService}
          <button
            class="cursor-pointer rounded border-none bg-purple-500 px-3 py-1.5 text-xs text-white hover:bg-purple-600"
            onclick={openAIModal}
            title="Generate SQL with AI"
          >
            ✨ AI
          </button>
        {/if}

        <!-- Template Dropdown -->
        <select
          class="cursor-pointer rounded border border-gray-300 px-2 py-1 text-xs"
          onchange={(e) => {
            const selectedTemplate = sqlTemplates.find(
              (t) => t.name === (e.target as HTMLSelectElement).value
            );
            if (selectedTemplate) {
              insertTemplate(selectedTemplate.sql);
            }
            (e.target as HTMLSelectElement).value = '';
          }}
        >
          <option value="">Templates</option>
          {#each sqlTemplates as template}
            <option value={template.name}>{template.name}</option>
          {/each}
        </select>
      </div>

      <div class="flex flex-wrap items-center gap-1 sm:gap-2">
        {#if dashboardService}
          <span class="hidden text-xs text-gray-500 sm:inline">Actions:</span>
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
                <span class="hidden sm:inline">{table.name}</span>
                <span class="sm:hidden">{table.name.substring(0, 3)}</span>
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
      {variables}
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

<!-- AI SQL Generation Modal -->
<Modal isOpen={isAIModalOpen} title="Generate SQL with AI" size="medium" close={closeAIModal}>
  <div class="space-y-4 p-4">
    <div class="space-y-2">
      <label for="ai-prompt" class="block text-sm font-medium text-gray-700">
        Describe what you want to query
      </label>
      <textarea
        id="ai-prompt"
        bind:value={aiPrompt}
        rows="4"
        placeholder="Example: Show me the top 10 customers by total orders and spending"
        class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        disabled={aiGenerating}
      ></textarea>
      <p class="text-xs text-gray-500">
        Describe your query in natural language and AI will generate the SQL for you.
      </p>
    </div>

    {#if aiError}
      <div class="rounded-md border border-red-200 bg-red-50 p-3">
        <p class="text-sm text-red-600">{aiError}</p>
      </div>
    {/if}

    <div class="flex justify-end space-x-3">
      <button
        type="button"
        class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        onclick={closeAIModal}
        disabled={aiGenerating}
      >
        Cancel
      </button>
      <button
        type="button"
        class="rounded-md border border-transparent bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:outline-none"
        onclick={generateSQLFromAI}
        disabled={aiGenerating || !aiPrompt.trim()}
      >
        {#if aiGenerating}
          <span class="flex items-center">
            <svg class="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Generating...
          </span>
        {:else}
          ✨ Generate SQL
        {/if}
      </button>
    </div>
  </div>
</Modal>
