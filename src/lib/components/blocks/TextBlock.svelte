<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import BlockActions from '../ui/BlockActions.svelte';
  import type {
    Block,
    TextBlockConfig,
    DataSourceConfig,
    BlockData,
    IDashboardService
  } from '../../types/index';
  import { processTemplate, sanitizeHtml, type TemplateContext } from '../../utils/template';

  interface Props {
    block: Block;
    dashboardVariables?: Record<string, any>;
    dashboardService?: IDashboardService;
    filterParams?: Record<string, any>;
    onBlockUpdate?: (block: Block) => void;
    onBlockEdit?: (block: Block) => void;
    onBlockDeleteRequest?: (block: Block) => void;
    showControls?: boolean;
    readOnly?: boolean;
  }

  let {
    block,
    dashboardVariables = {},
    dashboardService,
    filterParams = {},
    onBlockUpdate = () => {},
    onBlockEdit = () => {},
    onBlockDeleteRequest = () => {},
    showControls = false,
    readOnly = false
  }: Props = $props();

  let textConfig: TextBlockConfig = $state({
    content: '',
    variables: [],
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
  let isHovered = $state(false);
  let dataSourceData: any[] = $state([]);

  async function loadDataSource() {
    if (!block.dataSource || !dashboardService) {
      dataSourceData = [];
      return;
    }

    try {
      const result: BlockData = await dashboardService.loadBlockData(
        block.id,
        block.type,
        block.config,
        block.dataSource,
        filterParams
      );
      dataSourceData = result.data || [];
    } catch (error) {
      console.error('Failed to load text block data source:', error);
      dataSourceData = [];
    }
  }

  function computeVariables(): Record<string, any> {
    const vars: Record<string, any> = {};
    const variables = textConfig.variables || [];

    if (Array.isArray(variables)) {
      for (const variable of variables) {
        if (variable.type === 'static') {
          vars[variable.name] = variable.value || '';
        } else if (variable.type === 'dynamic' && variable.transform) {
          try {
            const fn = new Function('data', variable.transform);
            vars[variable.name] = fn(dataSourceData);
          } catch (error) {
            console.error(`Error executing transform for ${variable.name}:`, error);
            vars[variable.name] = `[Error: ${variable.name}]`;
          }
        }
      }
    } else if (typeof variables === 'object') {
      Object.assign(vars, variables);
    }

    return vars;
  }

  function updateContent() {
    if (textConfig) {
      const computedVars = computeVariables();
      const context: TemplateContext = {
        variables: computedVars,
        dashboardVariables
      };

      const rawContent = processTemplate(textConfig.content || '', context);
      processedContent = sanitizeHtml(rawContent);
    }
  }

  function normalizeStyling() {
    if (textConfig?.styling) {
      const c = (textConfig.styling.color || '').toLowerCase().trim();
      const needsMap =
        !c ||
        ['#000', '#000000', '#111', '#111827', '#222', '#222222', '#1f2937', '#374151'].includes(c);
      if (needsMap) textConfig.styling.color = 'var(--minibi-color-text)';
    }
  }

  onMount(() => {
    normalizeStyling();
    loadDataSource().then(() => updateContent());
    if (typeof window !== 'undefined') {
      window.addEventListener('themechange', handleThemeChange);
    }
  });

  function handleThemeChange() {
    if (textConfig?.styling && textConfig.styling.color?.startsWith('var(')) {
      textConfig = { ...textConfig } as any;
    }
  }

  $effect(() => {
    textConfig = block.config as TextBlockConfig;
    normalizeStyling();
  });

  $effect(() => {
    const dataSourceType = block.dataSource?.type;
    const queryId = block.dataSource?.queryId;
    const staticData = block.dataSource?.staticData;
    void filterParams;
    void textConfig;
    loadDataSource().then(() => updateContent());
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('themechange', handleThemeChange);
    }
  });

  function onEdit() {
    onBlockEdit(block);
  }

  function onDelete() {
    onBlockDeleteRequest(block);
  }

  function onRefresh() {
    loadDataSource().then(() => updateContent());
  }

  function getStyleString(): string {
    if (!textConfig?.styling) return '';

    const styles = textConfig.styling;
    const colorVar = styles.color?.startsWith('var(');
    return `
      font-size: ${styles.fontSize}px;
      font-family: ${styles.fontFamily};
      ${colorVar ? '' : `color: ${styles.color || 'var(--minibi-color-text)'};`}
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

  /* Removed duplicate onMount/$effect and handlers (already defined earlier with theming logic) */
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="bi-block flex h-full w-full flex-col overflow-hidden"
  bind:this={element}
  onmouseenter={() => (isHovered = true)}
  onmouseleave={() => (isHovered = false)}
>
  <div
    class="flex h-[50px] items-center justify-between border-b border-gray-200 bg-gray-50 px-2 py-2 sm:px-4 sm:py-3"
  >
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <h3 class="m-0 truncate text-sm font-semibold text-gray-900 sm:text-base">{block.title}</h3>
    </div>
    <div class="flex flex-shrink-0 items-center gap-1">
      <BlockActions
        {block}
        showControls={showControls || isHovered}
        {readOnly}
        {onEdit}
        {onRefresh}
        {onDelete}
      />
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
    color: var(--minibi-color-primary);
    text-decoration: underline;
  }

  .text-content :global(a:hover) {
    color: var(--minibi-color-primary-hover);
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
    background: var(--minibi-color-code-block-bg);
    border-left: 4px solid var(--minibi-color-border-strong);
    font-style: italic;
  }

  .text-content :global(code) {
    background: var(--minibi-color-code-block-bg);
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: 'Monaco', 'Consolas', monospace;
    font-size: 0.9em;
  }

  .text-content :global(pre) {
    background: var(--minibi-color-code-block-bg);
    padding: 1em;
    border-radius: 6px;
    overflow-x: auto;
    font-family: 'Monaco', 'Consolas', monospace;
  }

  .text-content :global(hr) {
    border: none;
    border-top: 1px solid var(--minibi-color-border-strong);
    margin: 2em 0;
  }
</style>
