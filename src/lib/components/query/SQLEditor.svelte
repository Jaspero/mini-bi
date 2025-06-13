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

<div class="sql-editor-container">
  <!-- Schema Panel -->
  <div class="schema-panel" class:open={showSchema}>
    <div class="schema-header">
      <h3>Database Schema</h3>
      <button class="close-schema-btn" on:click={() => showSchema = false} aria-label="Close schema panel">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
        </svg>
      </button>
    </div>
    
    <div class="schema-content">
      <!-- SQL Templates Section -->
      <div class="templates-section">
        <h4>SQL Templates</h4>
        <div class="templates-list">
          {#each sqlTemplates as template}
            <button 
              class="template-item" 
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
      <div class="schema-section">
        <h4>Database Schema</h4>
        {#each mockSchema.tables as table}
          <div class="table-item">
            <div class="table-header" on:click={() => selectTable(table)} on:keydown={(e) => e.key === 'Enter' && selectTable(table)} role="button" tabindex="0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h10v2H7v-2z"/>
              </svg>
              <span class="table-name">{table.name}</span>
              <span class="table-actions">
                <button class="insert-btn" on:click|stopPropagation={() => insertTableName(table.name)} title="Insert table name">
                  +
                </button>
                <button class="select-btn" on:click|stopPropagation={() => insertSelectAll(table.name)} title="SELECT * FROM table">
                  ★
                </button>
              </span>
            </div>
            
            {#if selectedTable === table}
              <div class="columns-list">
                {#each table.columns as column}
                  <div class="column-item" on:click={() => insertColumnName(table.name, column.name)} on:keydown={(e) => e.key === 'Enter' && insertColumnName(table.name, column.name)} role="button" tabindex="0">
                    <div class="column-info">
                      <span class="column-name">{column.name}</span>
                      <span class="column-type">{column.type}</span>
                    </div>
                    <div class="column-flags">
                      {#if column.primary}
                        <span class="flag primary" title="Primary Key">PK</span>
                      {/if}
                      {#if !column.nullable}
                        <span class="flag not-null" title="Not Null">NN</span>
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
  <div class="editor-area">
    <div class="editor-toolbar">
      <button class="schema-toggle-btn" on:click={() => showSchema = !showSchema} title="Toggle Schema Panel">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 3h6v6H3V3zm8 0h6v6h-6V3zM3 11h6v6H3v-6zm8 0h6v6h-6v-6z"/>
        </svg>
        Schema
      </button>
      
      <button class="format-btn" on:click={formatSQL} title="Format SQL (Shift+Alt+F)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
        </svg>
        Format
      </button>
      
      <div class="editor-info">
        SQL Editor with IntelliSense • Ctrl+Enter to execute • Ctrl+S to save
      </div>
    </div>
    
    <div class="monaco-editor" bind:this={editorContainer}>
      {#if !isInitialized}
        <div class="editor-loading">
          <div class="loading-spinner"></div>
          <p>Loading SQL Editor...</p>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .sql-editor-container {
    display: flex;
    height: 500px;
    border: 1px solid #e1e5e9;
    border-radius: 6px;
    overflow: hidden;
    position: relative;
    resize: vertical;
    min-height: 300px;
    max-height: 80vh;
  }

  .schema-panel {
    width: 0;
    overflow: hidden;
    background: #f8f9fa;
    border-right: 1px solid #e1e5e9;
    transition: width 0.3s ease;
    flex-shrink: 0;
  }

  .schema-panel.open {
    width: 300px;
  }

  .schema-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    border-bottom: 1px solid #e1e5e9;
    background: #fff;
  }

  .schema-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
  }

  .close-schema-btn {
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
  }

  .close-schema-btn:hover {
    background: #f3f4f6;
    color: #374151;
  }

  .schema-content {
    overflow-y: auto;
    height: calc(100% - 49px);
    padding: 8px;
  }

  .templates-section, .schema-section {
    margin-bottom: 16px;
  }

  .templates-section h4, .schema-section h4 {
    margin: 0 0 8px 0;
    font-size: 12px;
    font-weight: 600;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .templates-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 16px;
  }

  .template-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    transition: background 0.2s;
    text-align: left;
  }

  .template-item:hover {
    background: #2563eb;
  }

  .table-item {
    margin-bottom: 8px;
  }

  .table-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: #fff;
    border: 1px solid #e1e5e9;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .table-header:hover {
    border-color: #3b82f6;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .table-name {
    flex: 1;
    font-weight: 500;
    color: #374151;
    font-size: 13px;
  }

  .table-actions {
    display: flex;
    gap: 4px;
  }

  .insert-btn, .select-btn {
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 3px;
    width: 20px;
    height: 20px;
    font-size: 11px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .select-btn {
    background: #10b981;
  }

  .insert-btn:hover, .select-btn:hover {
    opacity: 0.8;
  }

  .columns-list {
    margin-top: 4px;
    padding-left: 24px;
  }

  .column-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 8px;
    background: #fff;
    border: 1px solid #f3f4f6;
    border-radius: 3px;
    margin-bottom: 2px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .column-item:hover {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .column-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .column-name {
    font-size: 12px;
    font-weight: 500;
    color: #374151;
  }

  .column-type {
    font-size: 11px;
    color: #6b7280;
    font-family: monospace;
  }

  .column-flags {
    display: flex;
    gap: 4px;
  }

  .flag {
    font-size: 9px;
    padding: 2px 4px;
    border-radius: 2px;
    font-weight: 600;
  }

  .flag.primary {
    background: #fef3c7;
    color: #d97706;
  }

  .flag.not-null {
    background: #ddd6fe;
    color: #7c3aed;
  }

  .editor-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .editor-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #f8f9fa;
    border-bottom: 1px solid #e1e5e9;
    gap: 8px;
  }

  .schema-toggle-btn, .format-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #3b82f6;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .format-btn {
    background: #10b981;
  }

  .schema-toggle-btn:hover {
    background: #2563eb;
  }

  .format-btn:hover {
    background: #059669;
  }

  .editor-info {
    font-size: 12px;
    color: #6b7280;
  }

  .monaco-editor {
    flex: 1;
    overflow: hidden;
    position: relative;
  }

  .editor-loading {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #ffffff;
    z-index: 10;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #f3f4f6;
    border-top: 3px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 12px;
  }

  .editor-loading p {
    color: #6b7280;
    font-size: 14px;
    margin: 0;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Global Monaco Editor Styles */
  :global(.monaco-editor) {
    --vscode-editor-background: #ffffff;
    --vscode-editor-foreground: #24292e;
  }
</style>
