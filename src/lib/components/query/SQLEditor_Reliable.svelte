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
  let monacoInitialized = false;
  let initializationAttempts = 0;

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
        textareaElement.setSelectionRange(start + text.length, start + text.length);
        textareaElement.focus();
      }, 0);
    }
  }

  async function tryInitializeMonaco() {
    if (monacoInitialized || initializationAttempts >= 3) return;
    
    initializationAttempts++;
    
    try {
      console.log(`Monaco initialization attempt ${initializationAttempts}...`);
      
      // Wait for container to be properly rendered and visible
      if (!editorContainer) {
        console.log('Editor container not ready');
        return;
      }
      
      // Check container visibility
      const rect = editorContainer.getBoundingClientRect();
      if (rect.width < 100 || rect.height < 50) {
        console.log('Container not visible or too small:', rect);
        return;
      }
      
      // Import Monaco
      const monacoModule = await import('monaco-editor');
      monaco = monacoModule.default;
      
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
        scrollBeyondLastLine: false,
        folding: false
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
      monacoInitialized = true;
      console.log('Monaco editor loaded successfully!');
      
    } catch (error) {
      console.warn(`Monaco initialization attempt ${initializationAttempts} failed:`, error);
      
      // If we've exhausted attempts, give up on Monaco
      if (initializationAttempts >= 3) {
        console.log('Giving up on Monaco, using textarea fallback');
      }
    }
  }

  onMount(() => {
    // Set default value if empty
    if (!value) {
      value = 'SELECT * FROM users;';
    }
    
    // Focus on the textarea initially
    if (textareaElement) {
      textareaElement.focus();
    }
    
    // Try to initialize Monaco after component is mounted
    setTimeout(tryInitializeMonaco, 100);
    
    // Also try when container becomes visible (for modals)
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !monacoInitialized) {
          setTimeout(tryInitializeMonaco, 100);
        }
      });
    });
    
    if (editorContainer) {
      observer.observe(editorContainer);
    }
    
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

  function openSchemaSidebar() {
    dispatch('open-schema', { 
      mockSchema, 
      sqlTemplates,
      insertText,
      insertTemplate,
      insertSelectAll: (tableName: string) => {
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
    });
  }

  function formatSQL() {
    if (useMonaco && editor && monaco) {
      editor.getAction('editor.action.formatDocument').run();
    }
  }

  function retryMonaco() {
    initializationAttempts = 0;
    monacoInitialized = false;
    setTimeout(tryInitializeMonaco, 100);
  }
</script>

<div class="flex h-[500px] border border-gray-300 rounded-md overflow-hidden relative resize-y min-h-[300px] max-h-[80vh]">
  <!-- Editor Area -->
  <div class="flex-1 flex flex-col overflow-hidden">
    <div class="flex justify-between items-center p-2 bg-gray-50 border-b border-gray-300 gap-2">
      <button class="bg-blue-500 text-white border-none px-3 py-1.5 rounded text-xs cursor-pointer hover:bg-blue-600" on:click={openSchemaSidebar}>Schema</button>
      <button class="bg-blue-500 text-white border-none px-3 py-1.5 rounded text-xs cursor-pointer hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed" on:click={formatSQL} disabled={!useMonaco}>Format</button>
      <span class="text-xs text-gray-500">
        {useMonaco ? 'Monaco SQL Editor' : 'Basic SQL Editor'} • Ctrl+Enter to execute
      </span>
      {#if !useMonaco && initializationAttempts < 3}
        <button class="bg-yellow-500 text-white border-none px-3 py-1.5 rounded text-xs cursor-pointer hover:bg-yellow-600" on:click={retryMonaco}>Try Monaco</button>
      {/if}
    </div>
    
    <!-- Always show textarea (Monaco will overlay when ready) -->
    <div class="flex-1 relative overflow-hidden">
      <textarea
        bind:this={textareaElement}
        bind:value={value}
        on:input={handleTextareaInput}
        on:keydown={handleKeydown}
        {disabled}
        class="absolute inset-0 border-none outline-none p-3 font-mono text-sm leading-relaxed resize-none bg-white text-gray-700 focus:outline-none transition-opacity duration-300"
        class:opacity-0={useMonaco}
        class:pointer-events-none={useMonaco}
        placeholder="Enter your SQL query here..."
        spellcheck="false"
      ></textarea>
      
      <!-- Monaco container (overlays textarea when ready) -->
      <div 
        class="absolute inset-0 opacity-0 pointer-events-none transition-opacity duration-300"
        class:!opacity-100={useMonaco}
        class:!pointer-events-auto={useMonaco}
        bind:this={editorContainer}
      ></div>
    </div>
  </div>
</div>


