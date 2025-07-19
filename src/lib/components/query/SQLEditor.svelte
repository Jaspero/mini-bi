<script lang="ts">
  import { onMount } from 'svelte';
  import MonacoEditor from '../ui/MonacoEditor.svelte';
  import Modal from '../ui/Modal.svelte';
  import type { DatabaseSchema } from '../../types/index.ts';

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

  const sqlTemplates = [
    { name: 'Basic SELECT', sql: 'SELECT * FROM table_name WHERE condition;' },
    { name: 'JOIN', sql: 'SELECT a.*, b.* FROM table_a a\nJOIN table_b b ON a.id = b.table_a_id;' },
    {
      name: 'GROUP BY',
      sql: 'SELECT column, COUNT(*) FROM table_name\nGROUP BY column\nORDER BY COUNT(*) DESC;'
    },
    {
      name: 'WITH (CTE)',
      sql: 'WITH cte AS (\n  SELECT column FROM table_name\n)\nSELECT * FROM cte;'
    }
  ];

  let editor: any = null;

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
      console.error('Error loading schema:', error);
      schemaError = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      schemaLoading = false;
    }
  }

  const monacoKeyBindings = [
    {
      key: 'Mod+Enter',
      command: 'execute',
      callback: () => onExecute()
    },
    {
      key: 'Mod+S',
      command: 'save',
      callback: () => onSave()
    }
  ];

  function insertTemplate(template: string) {
    if (editor) {
      editor.setValue(template);
    }
    value = template;
    onChange(value);
  }

  function insertSelectAll(tableName: string) {
    const selectQuery = `SELECT * FROM ${tableName};`;
    if (editor) {
      editor.setValue(selectQuery);
    }
    value = selectQuery;
    onChange(value);
  }

  async function generateSQLFromAI() {
    if (!dashboardService || !aiPrompt.trim()) return;

    aiGenerating = true;

    try {
      const generatedSQL = await dashboardService.generateSQLFromText(aiPrompt.trim());
      if (editor) {
        editor.setValue(generatedSQL);
      }
      value = generatedSQL;
      onChange(value);

      isAIModalOpen = false;
      aiPrompt = '';
    } catch (error) {
      console.error('AI generation error:', error);
    } finally {
      aiGenerating = false;
    }
  }

  function openAIModal() {
    isAIModalOpen = true;
  }

  function closeAIModal() {
    isAIModalOpen = false;
    aiPrompt = '';
    aiGenerating = false;
  }

  onMount(async () => {
    if (!value) {
      value = 'SELECT * FROM users;';
    }
    await loadSchema();
  });

  $effect(() => {
    if (monacoEditor) {
      editor = monacoEditor;
    }
  });

  $effect(() => {
    if (schema) {
      onOpenSchema({
        schema: schema,
        sqlTemplates,
        mockSchema: {
          tables: schema.tables.map((table: any) => ({
            name: table.name,
            columns: table.columns.map((col: any) => ({
              name: col.name,
              type: col.type
            }))
          }))
        }
      });
    }
  });
</script>

<div class="flex h-full flex-col">
  <div class="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex flex-wrap items-center gap-1 sm:gap-2">
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
          const target = e.target as HTMLSelectElement;
          const selectedTemplate = sqlTemplates.find((t) => t.name === target.value);
          if (selectedTemplate) {
            insertTemplate(selectedTemplate.sql);
          }
          target.value = '';
        }}
      >
        <option value="">Templates</option>
        {#each sqlTemplates as template}
          <option value={template.name}>{template.name}</option>
        {/each}
      </select>
    </div>

    <!-- Right side: Schema actions -->
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
          {#each schema.tables.filter((table: any) => table.showInActions).slice(0, 3) as table}
            <button
              class="cursor-pointer rounded border-none bg-green-500 px-2 py-1 text-xs text-white hover:bg-green-600"
              onclick={() => insertSelectAll(table.name)}
              title="SELECT * FROM {table.name}"
            >
              <span class="hidden sm:inline">{table.name}</span>
              <span class="sm:hidden">{table.name.substring(0, 3)}</span>
            </button>
          {/each}
          {#if schema.tables.filter((table: any) => table.showInActions).length > 4}
            <span class="text-xs text-gray-400"
              >+{schema.tables.filter((table: any) => table.showInActions).length - 4} more</span
            >
          {/if}
        {/if}
      {/if}
    </div>
  </div>

  <!-- Monaco Editor -->
  <div class="flex-1">
    <MonacoEditor
      bind:this={monacoEditor}
      bind:value
      language="sql"
      theme="vs"
      {disabled}
      {variables}
      placeholder="Enter your SQL query here..."
    />
  </div>
</div>

<!-- AI Modal -->
<Modal isOpen={isAIModalOpen} title="Generate SQL with AI">
  <div class="space-y-4">
    <div>
      <label for="ai-prompt" class="block text-sm font-medium text-gray-700">
        Describe what you want to query
      </label>
      <textarea
        id="ai-prompt"
        bind:value={aiPrompt}
        placeholder="e.g., 'Find all users who registered in the last 30 days and have made at least one purchase'"
        class="mt-1 w-full rounded-md border border-gray-300 p-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        rows="4"
      ></textarea>
    </div>

    <div class="flex justify-end gap-2">
      <button
        type="button"
        onclick={closeAIModal}
        class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        disabled={aiGenerating}
      >
        Cancel
      </button>
      <button
        type="button"
        onclick={generateSQLFromAI}
        disabled={!aiPrompt.trim() || aiGenerating}
        class="rounded-md bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
      >
        {aiGenerating ? 'Generating...' : 'Generate SQL'}
      </button>
    </div>
  </div>
</Modal>
