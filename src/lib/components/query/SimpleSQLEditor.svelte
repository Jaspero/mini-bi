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
      await new Promise((resolve) => setTimeout(resolve, 200));

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

<div class="h-96 overflow-hidden rounded border border-gray-300">
  <div class="relative h-full w-full" bind:this={editorContainer}>
    {#if loading}
      <div class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white">
        <div
          class="mb-2.5 h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500"
        ></div>
        <p class="m-0 text-sm text-gray-600">Loading SQL Editor...</p>
      </div>
    {/if}
  </div>
</div>
