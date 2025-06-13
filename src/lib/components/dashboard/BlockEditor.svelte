<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import type { Block } from '../../types/index.js';

  export let block: Block | null = null;
  export let isOpen = false;

  const dispatch = createEventDispatcher<{
    'block-updated': { block: Block };
    close: {};
  }>();

  let editedBlock: Block | null = null;
  let editorInstance: any = null;
  let editorElement: HTMLElement;
  let ckeditorLoaded = false;
  let ckeditorError = false;

  $: if (block && isOpen) {
    editedBlock = structuredClone(block);
    ckeditorLoaded = false;
    ckeditorError = false;
    // Initialize CKEditor when opening text block
    if (editedBlock?.type === 'text') {
      setTimeout(() => initializeCKEditor(), 100);
    }
  }

  $: if (!isOpen && editorInstance) {
    destroyCKEditor();
  }

  onDestroy(() => {
    destroyCKEditor();
  });

  async function initializeCKEditor() {
    if (typeof window === 'undefined') return;

    try {
      // Dynamically import CKEditor 5 Classic Build
      const { default: ClassicEditor } = await import('@ckeditor/ckeditor5-build-classic');
      
      if (editorElement && !editorInstance) {
        // Set initial content in the textarea before CKEditor initialization
        if (editedBlock && editedBlock.type === 'text') {
          const content = (editedBlock.config as any).content || '';
          editorElement.value = content;
        }

        editorInstance = await ClassicEditor.create(editorElement, {
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

{#if isOpen && editedBlock}
  <div
    class="modal-overlay"
    on:click={handleOverlayClick}
    on:keydown={handleKeyDown}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h2>Edit Block</h2>
        <button class="close-btn" on:click={handleClose} aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            />
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="block-title">Title</label>
          <input
            id="block-title"
            type="text"
            bind:value={editedBlock.title}
            placeholder="Enter block title"
          />
        </div>

        <div class="form-group">
          <label for="block-description">Description</label>
          <textarea
            id="block-description"
            bind:value={editedBlock.title}
            placeholder="Enter block description (optional)"
            rows="3"
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="block-x">X Position</label>
            <input id="block-x" type="number" bind:value={editedBlock.position.x} min="0" />
          </div>

          <div class="form-group">
            <label for="block-y">Y Position</label>
            <input id="block-y" type="number" bind:value={editedBlock.position.y} min="0" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="block-width">Width</label>
            <input id="block-width" type="number" bind:value={editedBlock.size.width} min="1" />
          </div>

          <div class="form-group">
            <label for="block-height">Height</label>
            <input id="block-height" type="number" bind:value={editedBlock.size.height} min="1" />
          </div>
        </div>

        {#if editedBlock.type === 'text'}
          <div class="form-group">
            <label for="text-content">Content</label>
            {#if ckeditorError}
              <!-- Fallback textarea if CKEditor fails to load -->
              <textarea
                id="text-content"
                bind:value={(editedBlock.config as any).content}
                placeholder="Enter text content (supports HTML)"
                rows="6"
              ></textarea>
            {:else}
              <!-- CKEditor 5 source element -->
              <textarea 
                bind:this={editorElement} 
                id="text-content-editor" 
                class="ckeditor-source"
                placeholder="Enter text content..."
              ></textarea>
            {/if}
          </div>
        {/if}
      </div>

      <div class="modal-footer">
        <button class="cancel-btn" on:click={handleClose}> Cancel </button>
        <button class="save-btn" on:click={handleSave}> Save Changes </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: white;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #e5e7eb;
    background: #f9fafb;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #1f2937;
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    color: #6b7280;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: #e5e7eb;
    color: #374151;
  }

  .modal-body {
    padding: 24px;
    overflow-y: auto;
    flex: 1;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .form-group label {
    display: block;
    margin-bottom: 6px;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
  }

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 14px;
    transition: border-color 0.2s;
    box-sizing: border-box;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 1px #3b82f6;
  }

  .ckeditor-source {
    min-height: 200px;
    resize: vertical;
  }

  /* CKEditor 5 styling adjustments */
  :global(.ck-editor) {
    min-height: 200px;
  }

  :global(.ck-editor__editable) {
    min-height: 200px !important;
    border: 1px solid #d1d5db !important;
    border-radius: 6px !important;
  }

  :global(.ck-editor__editable:focus) {
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 1px #3b82f6 !important;
  }

  :global(.ck-toolbar) {
    border: 1px solid #d1d5db !important;
    border-bottom: none !important;
    border-radius: 6px 6px 0 0 !important;
    background: #f9fafb !important;
  }

  :global(.ck-editor__editable_inline) {
    border-radius: 0 0 6px 6px !important;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 20px 24px;
    border-top: 1px solid #e5e7eb;
    background: #f9fafb;
  }

  .cancel-btn {
    padding: 8px 16px;
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .cancel-btn:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .save-btn {
    padding: 8px 16px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .save-btn:hover {
    background: #2563eb;
  }
</style>
