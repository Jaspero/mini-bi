<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';

  export let value = '';
  export let disabled = false;

  const dispatch = createEventDispatcher();

  let editorContainer: HTMLElement;
  let textareaElement: HTMLTextAreaElement;
  let editor: any = null;
  let monaco: any = null;
  let useMonaco = false;
  let isLoading = false;

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

  let showSchema = false;
  let selectedTable: any = null;

  async function tryInitializeMonaco() {
    if (useMonaco || !editorContainer) return;
    
    try {
      isLoading = true;
      console.log('Attempting to load Monaco editor...');
      
      // Wait for container to be properly rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if container has proper dimensions
      const rect = editorContainer.getBoundingClientRect();
      console.log('Container dimensions:', rect.width, 'x', rect.height);
      
      if (rect.width < 50 || rect.height < 50) {
        console.log('Container too small, keeping textarea fallback');
        isLoading = false;
        return;
      }
      
      // Import Monaco
      const monacoModule = await import('monaco-editor');
      monaco = monacoModule.default;
      
      console.log('Creating Monaco editor...');
      
      // Create editor
      editor = monaco.editor.create(editorContainer, {
        value: value || 'SELECT * FROM users;',
        language: 'sql',
        theme: 'vs',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: 'on',
        lineNumbers: 'on',
        scrollBeyondLastLine: false
      });
      
      // Listen for changes
      editor.onDidChangeModelContent(() => {
        const newValue = editor.getValue();
        value = newValue;
        dispatch('change', { value: newValue });
      });
      
      // Add keyboard shortcuts
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        dispatch('execute', { value: editor.getValue() });
      });
      
      useMonaco = true;
      isLoading = false;
      console.log('Monaco editor loaded successfully!');
      
    } catch (error) {
      console.warn('Failed to load Monaco editor, using textarea fallback:', error);
      useMonaco = false;
      isLoading = false;
    }
  }

  onMount(() => {
    // Set default value if empty
    if (!value) {
      value = 'SELECT * FROM users;';
    }
    
    // Create an intersection observer to detect when the editor becomes visible
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !useMonaco && !isLoading) {
          console.log('Editor became visible, trying to initialize Monaco...');
          tryInitializeMonaco();
        }
      });
    });
    
    if (editorContainer) {
      observer.observe(editorContainer);
    }
    
    // Also try to initialize Monaco after a delay as fallback
    setTimeout(tryInitializeMonaco, 500);
    
    // Cleanup observer
    return () => {
      observer.disconnect();
    };
  });

  onDestroy(() => {
    if (editor) {
      editor.dispose();
    }
  });

  // Handle textarea input
  function handleTextareaInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    value = target.value;
    dispatch('change', { value });
  }

  // Handle keyboard shortcuts in textarea
  function handleKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      dispatch('execute', { value });
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      dispatch('save', { value });
    }
  }

  function insertText(text: string) {
    if (useMonaco && editor) {
      const position = editor.getPosition();
      editor.executeEdits('', [{
        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
        text: text
      }]);
      editor.focus();
    } else if (textareaElement) {
      const start = textareaElement.selectionStart;
      const end = textareaElement.selectionEnd;
      const newValue = value.substring(0, start) + text + value.substring(end);
      value = newValue;
      dispatch('change', { value });
      
      // Set cursor position after inserted text
      setTimeout(() => {
        textareaElement.selectionStart = textareaElement.selectionEnd = start + text.length;
        textareaElement.focus();
      }, 0);
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
    value = selectQuery;
    dispatch('change', { value });
    
    if (useMonaco && editor) {
      editor.setValue(selectQuery);
      editor.focus();
    } else if (textareaElement) {
      textareaElement.focus();
    }
  }

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

  function insertTemplate(template: string) {
    value = template;
    dispatch('change', { value });
    
    if (useMonaco && editor) {
      editor.setValue(template);
      editor.focus();
    } else if (textareaElement) {
      textareaElement.focus();
    }
  }

  function retryMonaco() {
    tryInitializeMonaco();
  }

  function formatSQL() {
    if (useMonaco && editor && monaco) {
      editor.getAction('editor.action.formatDocument').run();
    }
  }
</script>

<div class="sql-editor-container">
  <!-- Schema Panel -->
  <div class="schema-panel" class:open={showSchema}>
    <div class="schema-header">
      <h3>Database Schema</h3>
      <button class="close-schema-btn" on:click={() => showSchema = false}>×</button>
    </div>
    
    <div class="schema-content">
      <!-- Templates -->
      <div class="templates-section">
        <h4>SQL Templates</h4>
        {#each sqlTemplates as template}
          <button class="template-item" on:click={() => insertTemplate(template.sql)}>
            {template.name}
          </button>
        {/each}
      </div>

      <!-- Tables -->
      <div class="schema-section">
        <h4>Tables</h4>
        {#each mockSchema.tables as table}
          <div class="table-item">
            <div class="table-header" on:click={() => selectTable(table)} on:keydown={(e) => e.key === 'Enter' && selectTable(table)} role="button" tabindex="0">
              <span class="table-name">{table.name}</span>
              <div class="table-actions">
                <button on:click|stopPropagation={() => insertTableName(table.name)} title="Insert table">+</button>
                <button on:click|stopPropagation={() => insertSelectAll(table.name)} title="SELECT *">★</button>
              </div>
            </div>
            
            {#if selectedTable === table}
              <div class="columns-list">
                {#each table.columns as column}
                  <div class="column-item" on:click={() => insertColumnName(table.name, column.name)} on:keydown={(e) => e.key === 'Enter' && insertColumnName(table.name, column.name)} role="button" tabindex="0">
                    <span class="column-name">{column.name}</span>
                    <span class="column-type">{column.type}</span>
                    {#if column.primary}<span class="badge">PK</span>{/if}
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
      <button class="toolbar-btn" on:click={() => showSchema = !showSchema}>Schema</button>
      <button class="toolbar-btn" on:click={formatSQL}>Format</button>
      <span class="editor-info">SQL Editor • Ctrl+Enter to execute</span>
    </div>
    
    <!-- Monaco Editor Container -->
    {#if useMonaco}
      <div class="monaco-editor" bind:this={editorContainer}>
        {#if isLoading}
          <div class="editor-loading">
            <div class="loading-spinner"></div>
            <p>Loading SQL Editor...</p>
          </div>
        {/if}
      </div>
    {/if}
    
    <!-- Textarea fallback (shown when Monaco is not loaded) -->
    {#if !useMonaco}
      <div class="monaco-editor" bind:this={editorContainer} style="display: none;">
        {#if isLoading}
          <div class="editor-loading">
            <div class="loading-spinner"></div>
            <p>Loading SQL Editor...</p>
          </div>
        {/if}
      </div>
      
      <textarea
        bind:this={textareaElement}
        bind:value={value}
        on:input={handleTextareaInput}
        on:keydown={handleKeydown}
        {disabled}
        class="sql-textarea"
        placeholder="Enter your SQL query here..."
        spellcheck="false"
      ></textarea>
      
      {#if !isLoading}
        <div class="fallback-notice">
          <span>Using basic text editor</span>
          <button class="retry-btn" on:click={retryMonaco}>Try Monaco Editor</button>
        </div>
      {/if}
    {/if}
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
  }

  .close-schema-btn {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
  }

  .close-schema-btn:hover {
    background: #f3f4f6;
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
  }

  .template-item {
    display: block;
    width: 100%;
    padding: 6px 8px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    margin-bottom: 4px;
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
    justify-content: space-between;
    padding: 8px;
    background: #fff;
    border: 1px solid #e1e5e9;
    border-radius: 4px;
    cursor: pointer;
  }

  .table-header:hover {
    border-color: #3b82f6;
  }

  .table-name {
    font-weight: 500;
    color: #374151;
    font-size: 13px;
  }

  .table-actions {
    display: flex;
    gap: 4px;
  }

  .table-actions button {
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 3px;
    width: 20px;
    height: 20px;
    font-size: 11px;
    cursor: pointer;
  }

  .columns-list {
    margin-top: 4px;
    padding-left: 16px;
  }

  .column-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 8px;
    background: #fff;
    border: 1px solid #f3f4f6;
    border-radius: 3px;
    margin-bottom: 2px;
    cursor: pointer;
    font-size: 12px;
  }

  .column-item:hover {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .column-name {
    font-weight: 500;
  }

  .column-type {
    color: #6b7280;
    font-family: monospace;
    font-size: 10px;
  }

  .badge {
    background: #fef3c7;
    color: #d97706;
    font-size: 9px;
    padding: 2px 4px;
    border-radius: 2px;
    font-weight: 600;
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

  .toolbar-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
  }

  .toolbar-btn:hover {
    background: #2563eb;
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

  .sql-textarea {
    flex: 1;
    border: none;
    outline: none;
    padding: 12px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 14px;
    line-height: 1.5;
    resize: none;
    background: #ffffff;
    color: #374151;
  }

  .sql-textarea:focus {
    outline: none;
  }

  .fallback-notice {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #fef3c7;
    border-top: 1px solid #f59e0b;
    font-size: 12px;
    color: #92400e;
  }

  .retry-btn {
    background: #f59e0b;
    color: white;
    border: none;
    padding: 4px 8px;
    border-radius: 3px;
    font-size: 11px;
    cursor: pointer;
  }

  .retry-btn:hover {
    background: #d97706;
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
</style>
