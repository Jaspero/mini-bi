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
      await new Promise((resolve) => setTimeout(resolve, 100));

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
      entries.forEach((entry) => {
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

<div
  class="relative flex h-[500px] max-h-[80vh] min-h-[300px] resize-y overflow-hidden rounded-md border border-gray-300"
>
  <!-- Schema Panel -->
  <div
    class="w-0 flex-shrink-0 overflow-hidden border-r border-gray-300 bg-gray-50 transition-[width] duration-300 ease-in-out"
    class:!w-[300px]={showSchema}
  >
    <div class="flex items-center justify-between border-b border-gray-300 bg-white p-3">
      <h3 class="m-0 text-sm font-semibold">Database Schema</h3>
      <button
        class="cursor-pointer rounded border-0 bg-transparent p-1 text-lg hover:bg-gray-100"
        on:click={() => (showSchema = false)}>×</button
      >
    </div>

    <div class="h-[calc(100%-49px)] overflow-y-auto p-2">
      <!-- Templates -->
      <div class="mb-4">
        <h4 class="m-0 mb-2 text-xs font-semibold text-gray-700 uppercase">SQL Templates</h4>
        {#each sqlTemplates as template}
          <button
            class="mb-1 block w-full cursor-pointer rounded border-0 bg-blue-600 p-1.5 text-left text-[11px] text-white hover:bg-blue-700"
            on:click={() => insertTemplate(template.sql)}
          >
            {template.name}
          </button>
        {/each}
      </div>

      <!-- Tables -->
      <div class="mb-4">
        <h4 class="m-0 mb-2 text-xs font-semibold text-gray-700 uppercase">Tables</h4>
        {#each mockSchema.tables as table}
          <div class="mb-2">
            <div
              class="flex cursor-pointer items-center justify-between rounded border border-gray-300 bg-white p-2 hover:border-blue-600"
              on:click={() => selectTable(table)}
              on:keydown={(e) => e.key === 'Enter' && selectTable(table)}
              role="button"
              tabindex="0"
            >
              <span class="text-sm font-medium text-gray-700">{table.name}</span>
              <div class="flex gap-1">
                <button
                  class="h-5 w-5 cursor-pointer rounded-sm border-0 bg-blue-600 text-[11px] text-white"
                  on:click|stopPropagation={() => insertTableName(table.name)}
                  title="Insert table">+</button
                >
                <button
                  class="h-5 w-5 cursor-pointer rounded-sm border-0 bg-blue-600 text-[11px] text-white"
                  on:click|stopPropagation={() => insertSelectAll(table.name)}
                  title="SELECT *">★</button
                >
              </div>
            </div>

            {#if selectedTable === table}
              <div class="mt-1 pl-4">
                {#each table.columns as column}
                  <div
                    class="mb-0.5 flex cursor-pointer items-center justify-between rounded-sm border border-gray-100 bg-white p-1 text-xs hover:border-blue-600 hover:bg-blue-50"
                    on:click={() => insertColumnName(table.name, column.name)}
                    on:keydown={(e) =>
                      e.key === 'Enter' && insertColumnName(table.name, column.name)}
                    role="button"
                    tabindex="0"
                  >
                    <span class="font-medium">{column.name}</span>
                    <span class="font-mono text-[10px] text-gray-500">{column.type}</span>
                    {#if column.primary}<span
                        class="rounded-sm bg-yellow-100 px-1 py-0.5 text-[9px] font-semibold text-yellow-700"
                        >PK</span
                      >{/if}
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
  <div class="flex flex-1 flex-col overflow-hidden">
    <div
      class="flex items-center justify-between gap-2 border-b border-gray-300 bg-gray-50 px-3 py-2"
    >
      <button
        class="cursor-pointer rounded border-0 bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700"
        on:click={() => (showSchema = !showSchema)}>Schema</button
      >
      <button
        class="cursor-pointer rounded border-0 bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700"
        on:click={formatSQL}>Format</button
      >
      <span class="text-xs text-gray-500">SQL Editor • Ctrl+Enter to execute</span>
    </div>

    <!-- Monaco Editor Container -->
    {#if useMonaco}
      <div class="relative flex-1 overflow-hidden" bind:this={editorContainer}>
        {#if isLoading}
          <div class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white">
            <div
              class="mb-3 h-8 w-8 animate-spin rounded-full border-3 border-gray-100 border-t-blue-600"
            ></div>
            <p class="m-0 text-sm text-gray-500">Loading SQL Editor...</p>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Textarea fallback (shown when Monaco is not loaded) -->
    {#if !useMonaco}
      <div
        class="relative flex-1 overflow-hidden"
        bind:this={editorContainer}
        style="display: none;"
      >
        {#if isLoading}
          <div class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white">
            <div
              class="mb-3 h-8 w-8 animate-spin rounded-full border-3 border-gray-100 border-t-blue-600"
            ></div>
            <p class="m-0 text-sm text-gray-500">Loading SQL Editor...</p>
          </div>
        {/if}
      </div>

      <textarea
        bind:this={textareaElement}
        bind:value
        on:input={handleTextareaInput}
        on:keydown={handleKeydown}
        {disabled}
        class="flex-1 resize-none border-0 bg-white p-3 font-mono text-sm leading-relaxed text-gray-700 outline-0 focus:outline-0"
        placeholder="Enter your SQL query here..."
        spellcheck="false"
      ></textarea>

      {#if !isLoading}
        <div
          class="flex items-center justify-between border-t border-yellow-400 bg-yellow-100 px-3 py-2 text-xs text-yellow-800"
        >
          <span>Using basic text editor</span>
          <button
            class="cursor-pointer rounded-sm border-0 bg-yellow-400 px-2 py-1 text-[11px] text-white hover:bg-yellow-500"
            on:click={retryMonaco}>Try Monaco Editor</button
          >
        </div>
      {/if}
    {/if}
  </div>
</div>
