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

  let showSchema = false;
  let selectedTable: any = null;

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
            'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN',
            'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'UNION ALL',
            'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'TRUNCATE',
            'CREATE TABLE', 'CREATE INDEX', 'CREATE VIEW', 'DROP TABLE', 'DROP INDEX', 'DROP VIEW',
            'ALTER TABLE', 'ADD COLUMN', 'DROP COLUMN', 'MODIFY COLUMN',
            'PRIMARY KEY', 'FOREIGN KEY', 'REFERENCES', 'CONSTRAINT', 'INDEX',
            'NOT NULL', 'NULL', 'DEFAULT', 'UNIQUE', 'CHECK', 'AUTO_INCREMENT',
            'AND', 'OR', 'NOT', 'IN', 'NOT IN', 'EXISTS', 'NOT EXISTS', 'BETWEEN', 'NOT BETWEEN',
            'LIKE', 'NOT LIKE', 'ILIKE', 'REGEXP', 'RLIKE', 'IS NULL', 'IS NOT NULL',
            'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'IF', 'IFNULL', 'COALESCE', 'NULLIF',
            'CAST', 'CONVERT', 'EXTRACT', 'DATE_FORMAT', 'SUBSTRING', 'CONCAT', 'LENGTH', 'TRIM',
            'UPPER', 'LOWER', 'REPLACE', 'ROUND', 'CEIL', 'FLOOR', 'ABS', 'SQRT', 'POWER',
            'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'STDDEV', 'VARIANCE',
            'DISTINCT', 'ALL', 'AS', 'ASC', 'DESC', 'OVER', 'PARTITION BY', 'ROW_NUMBER', 'RANK',
            'WITH', 'RECURSIVE', 'CTE', 'WINDOW', 'FRAME', 'ROWS', 'RANGE', 'PRECEDING', 'FOLLOWING',
            'CURRENT ROW', 'UNBOUNDED', 'FIRST_VALUE', 'LAST_VALUE', 'LAG', 'LEAD'
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
      editor.executeEdits('', [{
        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
        text: text
      }]);
      editor.focus();
    }
  }

  function selectTable(table: any) {
    selectedTable = selectedTable === table ? null : table;
  }

  function insertTableName(tableName: string) {
    insertText(tableName);
  }

  function insertColumnName(tableName: string, columnName: string) {
    insertText(`${tableName}.${columnName}`);
  }

  function insertSelectAll(tableName: string) {
    const selectQuery = `SELECT * FROM ${tableName}`;
    if (editor) {
      editor.setValue(selectQuery);
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

<div class="flex h-[500px] border border-gray-300 rounded-md overflow-hidden relative resize-y min-h-[300px] max-h-[80vh]">
  <!-- Schema Panel -->
  <div class="w-0 overflow-hidden bg-gray-50 border-r border-gray-300 transition-[width] duration-300 ease-in-out flex-shrink-0" class:!w-[300px]={showSchema}>
    <div class="flex justify-between items-center p-3 border-b border-gray-300 bg-white">
      <h3 class="m-0 text-sm font-semibold text-gray-700">Database Schema</h3>
      <button class="bg-transparent border-0 text-gray-500 hover:bg-gray-100 hover:text-gray-700 cursor-pointer p-1 rounded" on:click={() => showSchema = false} aria-label="Close schema panel">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
        </svg>
      </button>
    </div>
    
    <div class="overflow-y-auto h-[calc(100%-49px)] p-2">
      <!-- SQL Templates Section -->
      <div class="mb-4">
        <h4 class="m-0 mb-2 text-xs font-semibold text-gray-700 uppercase tracking-wide">SQL Templates</h4>
        <div class="flex flex-col gap-1 mb-4">
          {#each sqlTemplates as template}
            <button 
              class="flex items-center gap-1.5 px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white border-0 rounded text-[11px] cursor-pointer transition-colors text-left" 
              on:click={() => insertTemplate(template.sql)}
              title="Click to insert template"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
              </svg>
              {template.name}
            </button>
          {/each}
        </div>
      </div>

      <!-- Database Schema Section -->
      <div class="mb-4">
        <h4 class="m-0 mb-2 text-xs font-semibold text-gray-700 uppercase tracking-wide">Database Schema</h4>
        {#each mockSchema.tables as table}
          <div class="mb-2">
            <div class="flex items-center gap-2 p-2 bg-white border border-gray-300 rounded cursor-pointer hover:border-blue-600 hover:shadow-sm transition-all" on:click={() => selectTable(table)} on:keydown={(e) => e.key === 'Enter' && selectTable(table)} role="button" tabindex="0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h10v2H7v-2z"/>
              </svg>
              <span class="flex-1 font-medium text-gray-700 text-sm">{table.name}</span>
              <span class="flex gap-1">
                <button class="flex items-center justify-center bg-blue-600 hover:opacity-80 text-white border-0 rounded-sm w-5 h-5 text-[11px] cursor-pointer" on:click|stopPropagation={() => insertTableName(table.name)} title="Insert table name">
                  +
                </button>
                <button class="flex items-center justify-center bg-green-600 hover:opacity-80 text-white border-0 rounded-sm w-5 h-5 text-[11px] cursor-pointer" on:click|stopPropagation={() => insertSelectAll(table.name)} title="SELECT * FROM table">
                  ★
                </button>
              </span>
            </div>
            
            {#if selectedTable === table}
              <div class="mt-1 pl-6">
                {#each table.columns as column}
                  <div class="flex justify-between items-center p-1.5 bg-white border border-gray-100 rounded-sm mb-0.5 cursor-pointer hover:border-blue-600 hover:bg-blue-50 transition-all" on:click={() => insertColumnName(table.name, column.name)} on:keydown={(e) => e.key === 'Enter' && insertColumnName(table.name, column.name)} role="button" tabindex="0">
                    <div class="flex flex-col gap-0.5">
                      <span class="text-xs font-medium text-gray-700">{column.name}</span>
                      <span class="text-[11px] text-gray-500 font-mono">{column.type}</span>
                    </div>
                    <div class="flex gap-1">
                      {#if column.primary}
                        <span class="bg-yellow-100 text-yellow-700 text-[9px] px-1 py-0.5 rounded-sm font-semibold" title="Primary Key">PK</span>
                      {/if}
                      {#if !column.nullable}
                        <span class="bg-purple-100 text-purple-700 text-[9px] px-1 py-0.5 rounded-sm font-semibold" title="Not Null">NN</span>
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

  <!-- Editor Area -->
  <div class="flex-1 flex flex-col overflow-hidden">
    <div class="flex justify-between items-center px-3 py-2 bg-gray-50 border-b border-gray-300 gap-2">
      <button class="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white border-0 px-3 py-1.5 rounded text-xs cursor-pointer transition-colors" on:click={() => showSchema = !showSchema} title="Toggle Schema Panel">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 3h6v6H3V3zm8 0h6v6h-6V3zM3 11h6v6H3v-6zm8 0h6v6h-6v-6z"/>
        </svg>
        Schema
      </button>
      
      <button class="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white border-0 px-3 py-1.5 rounded text-xs cursor-pointer transition-colors" on:click={formatSQL} title="Format SQL (Shift+Alt+F)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
        </svg>
        Format
      </button>
      
      <div class="text-xs text-gray-500">
        SQL Editor with IntelliSense • Ctrl+Enter to execute • Ctrl+S to save
      </div>
    </div>
    
    <div class="flex-1 overflow-hidden relative" bind:this={editorContainer}>
      {#if !isInitialized}
        <div class="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
          <div class="w-8 h-8 border-3 border-gray-100 border-t-blue-600 rounded-full animate-spin mb-3"></div>
          <p class="text-gray-500 text-sm m-0">Loading SQL Editor...</p>
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
