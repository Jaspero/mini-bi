<script lang="ts">
  import { onMount } from 'svelte';
  import type { Block, TextBlockConfig } from '../../types/index.js';
  import { processTemplate, sanitizeHtml, type TemplateContext } from '../../utils/template.js';

  export let block: Block;
  export let dashboardVariables: Record<string, any> = {};
  export let onBlockUpdate: (block: Block) => void = () => {};
  export let onBlockEdit: (block: Block) => void = () => {};
  export let onBlockDelete: (blockId: string) => void = () => {};
  export let showControls = false;

  let textConfig: TextBlockConfig;
  let processedContent = '';
  let element: HTMLDivElement;

  $: {
    textConfig = block.config as TextBlockConfig;
    updateContent();
  }

  function updateContent() {
    if (textConfig) {
      const context: TemplateContext = {
        variables: textConfig.variables || {},
        dashboardVariables
      };

      const rawContent = processTemplate(textConfig.content || '', context);
      processedContent = sanitizeHtml(rawContent);
    }
  }

  function getStyleString(): string {
    if (!textConfig?.styling) return '';

    const styles = textConfig.styling;
    return `
      font-size: ${styles.fontSize}px;
      font-family: ${styles.fontFamily};
      color: ${styles.color};
      ${styles.backgroundColor ? `background-color: ${styles.backgroundColor};` : ''}
      padding: ${styles.padding}px;
      text-align: ${styles.textAlign};
      font-weight: ${styles.fontWeight};
      font-style: ${styles.fontStyle};
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      overflow: auto;
    `;
  }

  onMount(() => {
    updateContent();
  });

  function handleEdit(event: MouseEvent) {
    event.stopPropagation();
    onBlockEdit(block);
  }

  function handleDelete(event: MouseEvent) {
    event.stopPropagation();
    if (confirm(`Are you sure you want to delete the "${block.title}" text block?`)) {
      onBlockDelete(block.id);
    }
  }
</script>

<div class="w-full h-full flex flex-col bg-white rounded-lg shadow-sm overflow-hidden" bind:this={element}>
  {#if showControls}
    <div class="flex justify-between items-center px-4 py-3 border-b border-gray-200 bg-gray-50">
      <h3 class="text-base font-semibold text-gray-900 m-0">{block.title}</h3>
      <div class="flex items-center gap-1">
        <button class="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" on:click={handleEdit} aria-label="Edit text">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41L18.37 3.29a.996.996 0 0 0-1.41 0L15.13 5.12l3.75 3.75 1.83-1.83z"/>
          </svg>
        </button>
        <button class="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors" on:click={handleDelete} aria-label="Delete text">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </button>
      </div>
    </div>
  {/if}
  <div class="flex-1 flex flex-col leading-relaxed text-content" style={getStyleString()}>
    {@html processedContent}
  </div>
</div>

<!-- CSS has been migrated to Tailwind classes. Global content styles are preserved via the .text-content class. -->
<style>
  /* Content styling preserved for HTML content within text blocks */
  .text-content :global(h1),
  .text-content :global(h2),
  .text-content :global(h3),
  .text-content :global(h4),
  .text-content :global(h5),
  .text-content :global(h6) {
    margin: 0 0 1em 0;
    font-weight: bold;
  }

  .text-content :global(p) {
    margin: 0 0 1em 0;
  }

  .text-content :global(strong) {
    font-weight: bold;
  }

  .text-content :global(em) {
    font-style: italic;
  }

  .text-content :global(a) {
    color: #3b82f6;
    text-decoration: underline;
  }

  .text-content :global(a:hover) {
    color: #1d4ed8;
  }

  .text-content :global(ul),
  .text-content :global(ol) {
    margin: 0 0 1em 0;
    padding-left: 2em;
  }

  .text-content :global(li) {
    margin: 0.25em 0;
  }

  .text-content :global(blockquote) {
    margin: 1em 0;
    padding: 1em;
    background: #f3f4f6;
    border-left: 4px solid #d1d5db;
    font-style: italic;
  }

  .text-content :global(code) {
    background: #f3f4f6;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: 'Monaco', 'Consolas', monospace;
    font-size: 0.9em;
  }

  .text-content :global(pre) {
    background: #f3f4f6;
    padding: 1em;
    border-radius: 6px;
    overflow-x: auto;
    font-family: 'Monaco', 'Consolas', monospace;
  }

  .text-content :global(hr) {
    border: none;
    border-top: 1px solid #d1d5db;
    margin: 2em 0;
  }
</style>
