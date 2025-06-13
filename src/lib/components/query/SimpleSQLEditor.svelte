<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';

  export let value = '';
  export let disabled = false;

  const dispatch = createEventDispatcher();

  let editorContainer: HTMLElement;
  let editor: any = null;
  let monaco: any = null;
  let loading = true;

  onMount(async () => {
    try {
      console.log('Starting Monaco editor initialization...');
      
      // Import Monaco
      const monacoModule = await import('monaco-editor');
      monaco = monacoModule.default;
      
      console.log('Monaco imported successfully');
      
      // Wait a bit to ensure the container is ready
      await new Promise(resolve => setTimeout(resolve, 200));
      
      if (!editorContainer) {
        throw new Error('Editor container not found');
      }
      
      console.log('Creating Monaco editor...');
      
      // Create editor with minimal configuration
      editor = monaco.editor.create(editorContainer, {
        value: value || 'SELECT * FROM users;',
        language: 'sql',
        theme: 'vs',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: 'on'
      });
      
      // Listen for changes
      editor.onDidChangeModelContent(() => {
        const newValue = editor.getValue();
        value = newValue;
        dispatch('change', { value: newValue });
      });
      
      loading = false;
      console.log('Monaco editor created successfully!');
      
    } catch (error) {
      console.error('Failed to initialize Monaco editor:', error);
      loading = false;
    }
  });

  onDestroy(() => {
    if (editor) {
      editor.dispose();
    }
  });

  // Update editor when value changes
  $: if (editor && value !== editor.getValue()) {
    editor.setValue(value);
  }
</script>

<div class="simple-sql-editor">
  <div class="editor-container" bind:this={editorContainer}>
    {#if loading}
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading SQL Editor...</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .simple-sql-editor {
    height: 400px;
    border: 1px solid #ccc;
    border-radius: 4px;
    overflow: hidden;
  }

  .editor-container {
    width: 100%;
    height: 100%;
    position: relative;
  }

  .loading {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: white;
    z-index: 10;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 10px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .loading p {
    margin: 0;
    color: #666;
    font-size: 14px;
  }
</style>
