<script lang="ts">
  import { onMount } from 'svelte';
  import MonacoEditor from '../ui/MonacoEditor.svelte';
  import Modal from '../ui/Modal.svelte';
  import type { DatabaseSchema } from '../../types/index';

  let {
    value = $bindable(''),
    disabled = false,
    dashboardService = null,
    onChange = () => {},
    onExecute = () => {},
    onSave = () => {},
    onOpenSchema = (schemaData: any) => {},
    onToggleSchema = () => {}
  }: {
    value?: string;
    disabled?: boolean;
    dashboardService?: any;
    onChange?: (value: string) => void;
    onExecute?: () => void;
    onSave?: () => void;
    onOpenSchema?: (schemaData: any) => void;
    onToggleSchema?: () => void;
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

  function insertText(text: string) {
    if (editor && editor.insertText) {
      editor.insertText(text);
    }
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

    onOpenSchema({
      schema: null,
      sqlTemplates,
      loading: true,
      mockSchema: { tables: [] },
      insertTemplate: insertTemplate,
      insertSelectAll: insertSelectAll,
      insertText: insertText
    });

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
        loading: schemaLoading,
        mockSchema: {
          tables: schema.tables.map((table: any) => ({
            name: table.name,
            columns: table.columns.map((col: any) => ({
              name: col.name,
              type: col.type
            }))
          }))
        },
        insertTemplate: insertTemplate,
        insertSelectAll: insertSelectAll,
        insertText: insertText
      });
    }
  });
</script>

<div class="flex h-full flex-col">
  <div class="mb-2 flex items-center gap-2">
    {#if dashboardService}
      <button
        class="cursor-pointer rounded border-none bg-blue-500 px-3 py-1.5 text-xs text-white hover:bg-blue-600"
        onclick={onToggleSchema}
        title="Toggle Database Schema"
      >
        📊 Schema
      </button>
      <button
        class="cursor-pointer rounded border-none bg-purple-500 px-3 py-1.5 text-xs text-white hover:bg-purple-600"
        onclick={openAIModal}
        title="Generate SQL with AI"
      >
        ✨ AI
      </button>
    {/if}
  </div>

  <!-- Monaco Editor -->
  <div class="flex-1">
    <MonacoEditor
      bind:this={monacoEditor}
      bind:value
      language="sql"
      theme="vs"
      {disabled}
      placeholder="Enter your SQL query here..."
    />
  </div>
</div>

<Modal isOpen={isAIModalOpen} title="Generate SQL with AI" close={closeAIModal} size="large">
  <div class="p-6">
    <div class="mb-6">
      <label
        for="ai-prompt"
        class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Describe what you want to query
      </label>
      <textarea
        id="ai-prompt"
        bind:value={aiPrompt}
        placeholder="e.g., 'Find all users who registered in the last 30 days and have made at least one purchase'"
        class="w-full rounded-lg border border-gray-300 bg-white p-4 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:border-purple-400 dark:focus:ring-purple-400"
        rows="6"
        disabled={aiGenerating}
      ></textarea>
      <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
        💡 Tip: Be specific about the tables, columns, and conditions you want to include in your
        query.
      </p>
    </div>

    <div
      class="flex items-center justify-between gap-3 border-t border-gray-200 pt-6 dark:border-gray-700"
    >
      <div class="text-xs text-gray-500 dark:text-gray-400">
        {#if aiGenerating}
          <span class="flex items-center gap-2">
            <svg
              class="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
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
            Generating your SQL query...
          </span>
        {/if}
      </div>
      <div class="flex gap-3">
        <button
          type="button"
          onclick={closeAIModal}
          class="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-gray-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
          disabled={aiGenerating}
        >
          Cancel
        </button>
        <button
          type="button"
          onclick={generateSQLFromAI}
          disabled={!aiPrompt.trim() || aiGenerating}
          class="rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-purple-800 focus:ring-2 focus:ring-purple-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {#if aiGenerating}
            <span class="flex items-center gap-2">
              <svg
                class="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
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
            <span class="flex items-center gap-2"> ✨ Generate SQL </span>
          {/if}
        </button>
      </div>
    </div>
  </div>
</Modal>
