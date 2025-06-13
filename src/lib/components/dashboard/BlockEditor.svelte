<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import type { Block, ChartType, Query } from '../../types/index.js';
  import Modal from '../ui/Modal.svelte';

  export let block: Block | null = null;
  export let isOpen = false;
  export let queries: Query[] = [];

  const dispatch = createEventDispatcher<{
    'block-updated': { block: Block };
    close: {};
  }>();

  let editedBlock: Block | null = null;
  let editorInstance: any = null;
  let editorElement: HTMLTextAreaElement;
  let ckeditorLoaded = false;
  let ckeditorError = false;
  
  // Reactive variables for data source binding
  let dataSourceType: 'api' | 'static' | 'mock' | 'query' = 'mock';
  let selectedQueryId: string = '';

  // Initialize editedBlock when modal opens or block changes
  $: if (block && isOpen && (!editedBlock || editedBlock.id !== block.id)) {
    console.log('Initializing editedBlock with:', block);
    editedBlock = structuredClone(block);
    
    // Initialize dataSource if it doesn't exist
    if (!editedBlock.dataSource) {
      editedBlock.dataSource = {
        type: 'mock'
      };
    }
    
    // Sync reactive variables with editedBlock
    dataSourceType = editedBlock.dataSource.type;
    selectedQueryId = editedBlock.dataSource.queryId || '';
    
    console.log('editedBlock initialized:', editedBlock);
    
    ckeditorLoaded = false;
    ckeditorError = false;
    // Initialize CKEditor when opening text block
    if (editedBlock?.type === 'text') {
      setTimeout(() => initializeCKEditor(), 100);
    }
  }

  // Sync data source changes back to editedBlock when user changes the form
  function updateDataSource() {
    if (editedBlock?.dataSource) {
      editedBlock.dataSource.type = dataSourceType;
      if (dataSourceType === 'query') {
        editedBlock.dataSource.queryId = selectedQueryId;
      } else {
        delete editedBlock.dataSource.queryId;
      }
    }
  }

  $: if (!isOpen && editorInstance) {
    destroyCKEditor();
  }

  // Sync data source changes back to editedBlock when user changes the form
  $: if (editedBlock && dataSourceType) {
    editedBlock.dataSource = {
      ...editedBlock.dataSource,
      type: dataSourceType,
      queryId: selectedQueryId || undefined
    };
  }

  // Prevent body scroll when modal is open - now handled by Modal component
  // $: if (isOpen) {
  //   document.body.style.overflow = 'hidden';
  // } else {
  //   document.body.style.overflow = '';
  // }

  onDestroy(() => {
    // Cleanup CKEditor - scroll cleanup now handled by Modal component
    // document.body.style.overflow = '';
    if (editorInstance) {
      try {
        editorInstance.destroy();
      } catch (error) {
        console.warn('Error destroying CKEditor:', error);
      }
    }
  });

  async function initializeCKEditor() {
    if (typeof window === 'undefined') return;

    try {
      // Dynamically import CKEditor 5 Classic Build
      const CKEditorModule = await import('@ckeditor/ckeditor5-build-classic');
      const ClassicEditor = CKEditorModule.default;
      
      if (editorElement && !editorInstance) {
        // Set initial content in the textarea before CKEditor initialization
        if (editedBlock && editedBlock.type === 'text') {
          const content = (editedBlock.config as any).content || '';
          editorElement.value = content;
        }

        editorInstance = await (ClassicEditor as any).create(editorElement, {
          toolbar: {
            items: [
              'undo', 'redo',
              '|',
              'heading',
              '|',
              'bold', 'italic', 'underline',
              '|',
              'link', 'insertTable', 'blockQuote',
              '|',
              'bulletedList', 'numberedList', 'outdent', 'indent'
            ]
          },
          heading: {
            options: [
              { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
              { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
              { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
              { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' }
            ]
          }
        });

        // Listen for content changes
        editorInstance.model.document.on('change:data', () => {
          if (editedBlock && editedBlock.type === 'text') {
            (editedBlock.config as any).content = editorInstance.getData();
          }
        });

        ckeditorLoaded = true;
      }
    } catch (error) {
      console.error('Failed to initialize CKEditor:', error);
      ckeditorError = true;
    }
  }

  function destroyCKEditor() {
    if (editorInstance) {
      try {
        editorInstance.destroy();
        editorInstance = null;
      } catch (error) {
        console.error('Error destroying CKEditor:', error);
      }
    }
  }

  function handleClose() {
    destroyCKEditor();
    editedBlock = null;
    dispatch('close', {});
  }

  function handleSave() {
    if (editedBlock) {
      // Make sure we get the latest content from CKEditor for text blocks
      if (editedBlock.type === 'text' && editorInstance) {
        (editedBlock.config as any).content = editorInstance.getData();
      }
      dispatch('block-updated', { block: editedBlock });
      dispatch('close', {});
    }
  }

  function handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleClose();
    }
  }
</script>

{#if editedBlock}
<Modal {isOpen} title="Edit Block" size="medium" on:close={handleClose}>
  <div class="p-6 space-y-6">
    <div class="space-y-2">
      <label for="block-title" class="block text-sm font-medium text-gray-700">Title</label>
      <input
        id="block-title"
        type="text"
        bind:value={editedBlock.title}
        placeholder="Enter block title"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        on:input={() => console.log('Title changed to:', editedBlock?.title)}
      />
      <small class="text-xs text-gray-500">Current value: {editedBlock.title}</small>
    </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <label for="block-x" class="block text-sm font-medium text-gray-700">X Position</label>
            <input 
              id="block-x" 
              type="number" 
              bind:value={editedBlock.position.x} 
              min="0"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              on:input={() => console.log('X position changed to:', editedBlock?.position.x)}
            />
            <small class="text-xs text-gray-500">Current X: {editedBlock.position.x}</small>
          </div>

          <div class="space-y-2">
            <label for="block-y" class="block text-sm font-medium text-gray-700">Y Position</label>
            <input 
              id="block-y" 
              type="number" 
              bind:value={editedBlock.position.y} 
              min="0"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              on:input={() => console.log('Y position changed to:', editedBlock?.position.y)}
            />
            <small class="text-xs text-gray-500">Current Y: {editedBlock.position.y}</small>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <label for="block-width" class="block text-sm font-medium text-gray-700">Width</label>
            <input 
              id="block-width" 
              type="number" 
              bind:value={editedBlock.size.width} 
              min="1" 
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div class="space-y-2">
            <label for="block-height" class="block text-sm font-medium text-gray-700">Height</label>
            <input 
              id="block-height" 
              type="number" 
              bind:value={editedBlock.size.height} 
              min="1" 
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {#if editedBlock.type === 'table' || editedBlock.type === 'graph'}
          <div class="space-y-2">
            <label for="data-source" class="block text-sm font-medium text-gray-700">Data Source</label>
            <select 
              id="data-source" 
              bind:value={dataSourceType} 
              on:change={updateDataSource}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="mock">Mock Data</option>
              <option value="static">Static Data</option>
              <option value="query">SQL Query</option>
              <option value="api">API Endpoint</option>
            </select>
          </div>

          {#if dataSourceType === 'query'}
            <div class="space-y-2">
              <label for="query-select" class="block text-sm font-medium text-gray-700">Select Query</label>
              <select 
                id="query-select" 
                bind:value={selectedQueryId} 
                on:change={updateDataSource}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select a query --</option>
                {#each queries.filter(q => q.isActive) as query}
                  <option value={query.id}>{query.name}</option>
                {/each}
              </select>
              {#if queries.filter(q => q.isActive).length === 0}
                <p class="text-sm text-gray-600">No active queries available. Create queries in the Query Manager.</p>
              {/if}
            </div>
          {/if}
        {/if}

        {#if editedBlock.type === 'graph'}
          <div class="space-y-2">
            <label for="chart-type" class="block text-sm font-medium text-gray-700">Chart Type</label>
            <select 
              id="chart-type" 
              bind:value={(editedBlock.config as any).chartType}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="pie">Pie Chart</option>
              <option value="area">Area Chart</option>
              <option value="scatter">Scatter Plot</option>
              <option value="donut">Donut Chart</option>
              <option value="gauge">Gauge Chart</option>
              <option value="heatmap">Heatmap</option>
            </select>
          </div>
        {/if}

        {#if editedBlock.type === 'text'}
          <div class="space-y-2">
            <label for="text-content" class="block text-sm font-medium text-gray-700">Content</label>
            {#if ckeditorError}
              <!-- Fallback textarea if CKEditor fails to load -->
              <textarea
                id="text-content"
                bind:value={(editedBlock.config as any).content}
                placeholder="Enter text content (supports HTML)"
                rows="6"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
            {:else}
              <!-- CKEditor 5 source element -->
              <textarea 
                bind:this={editorElement} 
                id="text-content-editor" 
                class="ckeditor-source w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-32"
                placeholder="Enter text content..."
              ></textarea>
            {/if}
          </div>
        {/if}
      </div>

  <div slot="footer" class="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
    <button 
      class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" 
      on:click={handleClose}
    > 
      Cancel 
    </button>
    <button 
      class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" 
      on:click={handleSave}
    > 
      Save Changes 
    </button>
  </div>
</Modal>
{/if}


