<script lang="ts">
  import { onMount } from 'svelte';
  import BlockActions from '../ui/BlockActions.svelte';
  import type { Block, TextBlockConfig } from '../../types/index';
  import { processTemplate, sanitizeHtml, type TemplateContext } from '../../utils/template';

  interface Props {
    block: Block;
    dashboardVariables?: Record<string, any>;
    onBlockUpdate?: (block: Block) => void;
    onBlockEdit?: (block: Block) => void;
    onBlockDeleteRequest?: (block: Block) => void;
    showControls?: boolean;
  }

  let {
    block,
    dashboardVariables = {},
    onBlockUpdate = () => {},
    onBlockEdit = () => {},
    onBlockDeleteRequest = () => {},
    showControls = false
  }: Props = $props();

  let textConfig: TextBlockConfig = $state({
    content: '',
    variables: {},
    styling: {
      fontSize: 14,
      fontFamily: 'Arial, sans-serif',
      color: '#000000',
      padding: 8,
      textAlign: 'left',
      fontWeight: 'normal',
      fontStyle: 'normal'
    }
  });
  let element: HTMLDivElement | undefined = $state();
  let processedContent = $state('');

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

  $effect(() => {
    textConfig = block.config as TextBlockConfig;
    updateContent();
  });

  function onEdit() {
    onBlockEdit(block);
  }

  function onDelete() {
    onBlockDeleteRequest(block);
  }

  function onRefresh() {
    updateContent();
  }
</script>

<div
  class="flex h-full w-full flex-col overflow-hidden rounded-lg bg-white shadow-sm"
  bind:this={element}
>
  <div
    class="flex h-[50px] items-center justify-between border-b border-gray-200 bg-gray-50 px-2 py-2 sm:px-4 sm:py-3"
  >
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <h3 class="m-0 truncate text-sm font-semibold text-gray-900 sm:text-base">{block.title}</h3>
    </div>
    <div class="flex flex-shrink-0 items-center gap-1">
      <BlockActions {block} {showControls} {onEdit} {onRefresh} {onDelete} />
    </div>
  </div>
  <div class="text-content flex flex-1 flex-col leading-relaxed" style={getStyleString()}>
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
