<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';

  export let value = '';
  export let disabled = false;

  const dispatch = createEventDispatcher();

  let editorContainer: HTMLElement;
  let editor: any = null;
  let monaco: any = null;
  let isInitialized = false;

  // Mock database schema for demonstration
  const mockSchema = {
    tables: [
      {
        name: 'users',
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false, primary: true },
          { name: 'username', type: 'VARCHAR(255)', nullable: false },
          { name: 'email', type: 'VARCHAR(255)', nullable: false },
          { name: 'created_at', type: 'TIMESTAMP', nullable: false },
          { name: 'updated_at', type: 'TIMESTAMP', nullable: true }
        ]
      },
      {
        name: 'products',
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false, primary: true },
          { name: 'name', type: 'VARCHAR(255)', nullable: false },
          { name: 'price', type: 'DECIMAL(10,2)', nullable: false },
          { name: 'category_id', type: 'INTEGER', nullable: true },
          { name: 'description', type: 'TEXT', nullable: true },
          { name: 'created_at', type: 'TIMESTAMP', nullable: false }
        ]
      },
      {
        name: 'orders',
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false, primary: true },
          { name: 'user_id', type: 'INTEGER', nullable: false },
          { name: 'total_amount', type: 'DECIMAL(10,2)', nullable: false },
          { name: 'status', type: 'VARCHAR(50)', nullable: false },
          { name: 'created_at', type: 'TIMESTAMP', nullable: false }
        ]
      },
      {
        name: 'order_items',
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false, primary: true },
          { name: 'order_id', type: 'INTEGER', nullable: false },
          { name: 'product_id', type: 'INTEGER', nullable: false },
          { name: 'quantity', type: 'INTEGER', nullable: false },
          { name: 'price', type: 'DECIMAL(10,2)', nullable: false }
        ]
      },
      {
        name: 'categories',
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false, primary: true },
          { name: 'name', type: 'VARCHAR(255)', nullable: false },
          { name: 'parent_id', type: 'INTEGER', nullable: true }
        ]
      }
    ]
  };

  // Update editor when value prop changes
  $: if (editor && value !== editor.getValue()) {
    editor.setValue(value);
  }

  // Handle disabled state
  $: if (editor) {
    editor.updateOptions({ readOnly: disabled });
  }

  // Initialize editor when container becomes available
  $: if (editorContainer && !isInitialized) {
    initializeEditor();
  }

  async function initializeEditor() {
    if (isInitialized || !editorContainer) return;

    try {
      // Check if container is visible and has dimensions
      const containerRect = editorContainer.getBoundingClientRect();
      if (containerRect.width === 0 || containerRect.height === 0) {
        // Container is not visible yet, try again later
        setTimeout(() => {
          if (!isInitialized) initializeEditor();
        }, 100);
        return;
      }

      console.log('Initializing Monaco editor...');

      // Dynamically import Monaco Editor
      const monacoModule = await import('monaco-editor');
      monaco = monacoModule.default;

      // Configure Monaco for SQL
      monaco.languages.registerCompletionItemProvider('sql', {
        provideCompletionItems: (model: any, position: any) => {
          const suggestions = [];

          // Add table names
          for (const table of mockSchema.tables) {
            suggestions.push({
              label: table.name,
              kind: monaco.languages.CompletionItemKind.Class,
              insertText: table.name,
              detail: 'Table',
              documentation: `Table with ${table.columns.length} columns`
            });

            // Add column names for each table
            for (const column of table.columns) {
              suggestions.push({
                label: `${table.name}.${column.name}`,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: `${table.name}.${column.name}`,
                detail: `${column.type}${column.nullable ? ' (nullable)' : ''}`,
                documentation: `Column from ${table.name} table`
              });
            }
          }

          // Add SQL keywords
          const sqlKeywords = [
            'SELECT',
            'FROM',
            'WHERE',
            'JOIN',
            'INNER JOIN',
            'LEFT JOIN',
            'RIGHT JOIN',
            'FULL JOIN',
            'ORDER BY',
            'GROUP BY',
            'HAVING',
            'LIMIT',
            'OFFSET',
            'UNION',
            'UNION ALL',
            'INSERT',
            'INTO',
            'VALUES',
            'UPDATE',
            'SET',
            'DELETE',
            'TRUNCATE',
            'CREATE TABLE',
            'CREATE INDEX',
            'CREATE VIEW',
            'DROP TABLE',
            'DROP INDEX',
            'DROP VIEW',
            'ALTER TABLE',
            'ADD COLUMN',
            'DROP COLUMN',
            'MODIFY COLUMN',
            'PRIMARY KEY',
            'FOREIGN KEY',
            'REFERENCES',
            'CONSTRAINT',
            'INDEX',
            'NOT NULL',
            'NULL',
            'DEFAULT',
            'UNIQUE',
            'CHECK',
            'AUTO_INCREMENT',
            'AND',
            'OR',
            'NOT',
            'IN',
            'NOT IN',
            'EXISTS',
            'NOT EXISTS',
            'BETWEEN',
            'NOT BETWEEN',
            'LIKE',
            'NOT LIKE',
            'ILIKE',
            'REGEXP',
            'RLIKE',
            'IS NULL',
            'IS NOT NULL',
            'CASE',
            'WHEN',
            'THEN',
            'ELSE',
            'END',
            'IF',
            'IFNULL',
            'COALESCE',
            'NULLIF',
            'CAST',
            'CONVERT',
            'EXTRACT',
            'DATE_FORMAT',
            'SUBSTRING',
            'CONCAT',
            'LENGTH',
            'TRIM',
            'UPPER',
            'LOWER',
            'REPLACE',
            'ROUND',
            'CEIL',
            'FLOOR',
            'ABS',
            'SQRT',
            'POWER',
            'COUNT',
            'SUM',
            'AVG',
            'MIN',
            'MAX',
            'STDDEV',
            'VARIANCE',
            'DISTINCT',
            'ALL',
            'AS',
            'ASC',
            'DESC',
            'OVER',
            'PARTITION BY',
            'ROW_NUMBER',
            'RANK',
            'WITH',
            'RECURSIVE',
            'CTE',
            'WINDOW',
            'FRAME',
            'ROWS',
            'RANGE',
            'PRECEDING',
            'FOLLOWING',
            'CURRENT ROW',
            'UNBOUNDED',
            'FIRST_VALUE',
            'LAST_VALUE',
            'LAG',
            'LEAD'
          ];

          for (const keyword of sqlKeywords) {
            suggestions.push({
              label: keyword,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: keyword,
              detail: 'SQL Keyword'
            });
          }

          return { suggestions };
        }
      });

      // Create the editor
      editor = monaco.editor.create(editorContainer, {
        value: value || 'SELECT * FROM users;',
        language: 'sql',
        theme: 'vs',
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 14,
        lineNumbers: 'on',
        roundedSelection: false,
        scrollbar: {
          vertical: 'visible',
          horizontal: 'visible'
        },
        wordWrap: 'on',
        suggest: {
          insertMode: 'replace'
        }
      });

      // Listen for content changes
      editor.onDidChangeModelContent(() => {
        const newValue = editor.getValue();
        value = newValue;
        dispatch('change', { value: newValue });
      });

      // Add keyboard shortcuts
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        // Ctrl/Cmd + Enter to execute query (dispatch custom event)
        dispatch('execute', { value: editor.getValue() });
      });

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        // Ctrl/Cmd + S to save query (dispatch custom event)
        dispatch('save', { value: editor.getValue() });
      });

      isInitialized = true;
      console.log('Monaco editor initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Monaco editor:', error);
      isInitialized = false;
    }
  }

  onMount(() => {
    // Use an intersection observer to detect when the editor becomes visible
    if (editorContainer) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isInitialized) {
            // Element is visible, initialize the editor
            setTimeout(() => initializeEditor(), 100);
          }
        });
      });

      observer.observe(editorContainer);

      // Cleanup
      return () => {
        observer.disconnect();
      };
    }

    console.log('SQLEditor component mounted');
  });

  onDestroy(() => {
    if (editor) {
      editor.dispose();
    }
  });

  function insertText(text: string) {
    if (editor) {
      const position = editor.getPosition();
      editor.executeEdits('', [
        {
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          ),
          text: text
        }
      ]);
      editor.focus();
    }
  }

  function formatSQL() {
    if (editor && monaco) {
      editor.getAction('editor.action.formatDocument')?.run();
    }
  }

  function insertTemplate(template: string) {
    if (editor) {
      editor.setValue(template);
      editor.focus();
    }
  }

  function openSchemaSidebar() {
    dispatch('open-schema', {
      mockSchema,
      sqlTemplates,
      insertText,
      insertTemplate,
      insertSelectAll: (tableName: string) => {
        const selectQuery = `SELECT * FROM ${tableName}`;
        if (editor) {
          editor.setValue(selectQuery);
          editor.focus();
        }
      }
    });
  }

  const sqlTemplates = [
    {
      name: 'Basic SELECT',
      sql: 'SELECT column1, column2\nFROM table_name\nWHERE condition;'
    },
    {
      name: 'JOIN Query',
      sql: 'SELECT a.column1, b.column2\nFROM table_a a\nJOIN table_b b ON a.id = b.table_a_id\nWHERE condition;'
    },
    {
      name: 'GROUP BY',
      sql: 'SELECT column1, COUNT(*) as count\nFROM table_name\nGROUP BY column1\nHAVING COUNT(*) > 1\nORDER BY count DESC;'
    },
    {
      name: 'INSERT',
      sql: 'INSERT INTO table_name (column1, column2)\nVALUES (value1, value2);'
    },
    {
      name: 'UPDATE',
      sql: 'UPDATE table_name\nSET column1 = value1\nWHERE condition;'
    }
  ];
</script>

<div
  class="relative flex h-[500px] max-h-[80vh] min-h-[300px] resize-y overflow-hidden rounded-md border border-gray-300"
>
  <!-- Editor Area -->
  <div class="flex flex-1 flex-col overflow-hidden">
    <div
      class="flex items-center justify-between gap-2 border-b border-gray-300 bg-gray-50 px-3 py-2"
    >
      <button
        class="flex cursor-pointer items-center gap-1.5 rounded border-0 bg-blue-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-blue-700"
        on:click={openSchemaSidebar}
        title="Open Schema Sidebar"
      >
        <span class="material-symbols-outlined text-sm">schema</span>
        Schema
      </button>

      <button
        class="flex cursor-pointer items-center gap-1.5 rounded border-0 bg-green-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-green-700"
        on:click={formatSQL}
        title="Format SQL (Shift+Alt+F)"
      >
        <span class="material-symbols-outlined text-sm">code</span>
        Format
      </button>

      <div class="text-xs text-gray-500">
        SQL Editor with IntelliSense • Ctrl+Enter to execute • Ctrl+S to save
      </div>
    </div>

    <div class="relative flex-1 overflow-hidden" bind:this={editorContainer}>
      {#if !isInitialized}
        <div class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white">
          <div
            class="mb-3 h-8 w-8 animate-spin rounded-full border-3 border-gray-100 border-t-blue-600"
          ></div>
          <p class="m-0 text-sm text-gray-500">Loading SQL Editor...</p>
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- Global Monaco Editor Styles -->
<style>
  :global(.monaco-editor) {
    --vscode-editor-background: #ffffff;
    --vscode-editor-foreground: #24292e;
  }
</style>
