<script lang="ts">
  import { onMount } from 'svelte';
  import MonacoEditor from '../ui/MonacoEditor.svelte';

  let { 
    value = $bindable(''), 
    disabled = false,
    onChange = () => {},
    onExecute = () => {},
    onSave = () => {},
    onOpenSchema = () => {}
  }: {
    value?: string;
    disabled?: boolean;
    onChange?: (value: string) => void;
    onExecute?: () => void;
    onSave?: () => void;
    onOpenSchema?: () => void;
  } = $props();

  let monacoEditor: any = null;

  // Mock database schema for demonstration
  const mockSchema = {
    tables: [
      {
        name: 'users',
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false, primary: true },
          { name: 'username', type: 'VARCHAR(255)', nullable: false },
          { name: 'email', type: 'VARCHAR(255)', nullable: false },
          { name: 'created_at', type: 'TIMESTAMP', nullable: false }
        ]
      },
      {
        name: 'products',
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false, primary: true },
          { name: 'name', type: 'VARCHAR(255)', nullable: false },
          { name: 'price', type: 'DECIMAL(10,2)', nullable: false },
          { name: 'category_id', type: 'INTEGER', nullable: true }
        ]
      },
      {
        name: 'orders',
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false, primary: true },
          { name: 'user_id', type: 'INTEGER', nullable: false },
          { name: 'total_amount', type: 'DECIMAL(10,2)', nullable: false },
          { name: 'status', type: 'VARCHAR(50)', nullable: false }
        ]
      }
    ]
  };

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

  function handleValueChange() {
    onChange(value);
  }

  function handleKeyboardShortcut(command: string) {
    console.log(`Keyboard shortcut executed: ${command}`);
  }

  onMount(() => {
    // Set default value if empty
    if (!value) {
      value = 'SELECT * FROM users;';
    }
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
    onOpenSchema();
  }
</script>

<div
  class="relative flex h-[500px] max-h-[80vh] min-h-[300px] resize-y overflow-hidden rounded-md border border-gray-300"
>
  <!-- Editor Area -->
  <div class="flex flex-1 flex-col overflow-hidden">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-2 border-b border-gray-300 bg-gray-50 p-2">
      <div class="flex items-center gap-2">
        <button
          class="cursor-pointer rounded border-none bg-blue-500 px-3 py-1.5 text-xs text-white hover:bg-blue-600"
          onclick={openSchemaSidebar}
        >
          Schema
        </button>
        
        <!-- Template Dropdown -->
        <select
          class="cursor-pointer rounded border border-gray-300 px-2 py-1 text-xs"
          onchange={(e) => {
            const selectedTemplate = sqlTemplates.find(t => t.name === e.target.value);
            if (selectedTemplate) {
              insertTemplate(selectedTemplate.sql);
            }
            e.target.value = '';
          }}
        >
          <option value="">Quick Templates</option>
          {#each sqlTemplates as template}
            <option value={template.name}>{template.name}</option>
          {/each}
        </select>
      </div>

      <!-- Quick Schema Actions -->
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-500">Quick actions:</span>
        {#each mockSchema.tables as table}
          <button
            class="cursor-pointer rounded border-none bg-green-500 px-2 py-1 text-xs text-white hover:bg-green-600"
            onclick={() => insertSelectAll(table.name)}
          >
            {table.name}
          </button>
        {/each}
      </div>
    </div>

    <!-- Monaco Editor Component -->
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
      onKeyboardShortcut={handleKeyboardShortcut}
      onchange={handleValueChange}
    />
  </div>
</div>
