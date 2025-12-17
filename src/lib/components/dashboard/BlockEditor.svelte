<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { Block, Query, TextVariable, IDashboardService } from '../../types/index';
  import Modal from '../ui/Modal.svelte';
  import MonacoEditor from '../ui/MonacoEditor.svelte';

  let {
    block = null,
    isOpen = false,
    queries = [],
    dashboardService,
    blockUpdated = (block: Block) => {},
    close = () => {}
  }: {
    block?: Block | null;
    isOpen?: boolean;
    queries?: Query[];
    dashboardService?: IDashboardService;
    blockUpdated?: (block: Block) => void;
    close?: () => void;
  } = $props();

  let autoFillLoading = $state(false);

  let editedBlock: Block | null = $state(null);
  let editorInstance: any = $state(null);
  let editorElement: HTMLTextAreaElement | null = $state(null);
  let ckeditorLoaded = false;
  let ckeditorError = $state(false);
  let dataSourceType: 'api' | 'static' | 'mock' | 'query' = $state('mock');
  let selectedQueryId: string = $state('');
  let selectedPreprocessingId: string = $state('');
  let draggedIndex: number | null = $state(null);
  let dragOverIndex: number | null = $state(null);
  let staticDataJson: string = $state('[]');
  let apiEndpoint: string = $state('');
  let apiMethod: 'GET' | 'POST' = $state('GET');
  let apiToken: string = $state('');
  let currentChartType: string = $state('line');

  $effect(() => {
    if (editedBlock?.type === 'graph' && editedBlock.config.chartType !== currentChartType) {
      currentChartType = editedBlock.config.chartType;
    }
  });

  $effect(() => {
    if (block && isOpen && (!editedBlock || editedBlock.id !== block.id)) {
      editedBlock = structuredClone($state.snapshot(block));

      // Initialize dataSource if it doesn't exist
      if (!editedBlock.dataSource) {
        editedBlock.dataSource = {
          type: 'mock'
        };
      }

      // Initialize table config if it doesn't exist
      if (editedBlock.type === 'table' && !editedBlock.config.columns) {
        editedBlock.config = {
          ...editedBlock.config,
          columns: [
            {
              key: 'name',
              header: 'Name',
              type: 'string',
              sortable: true,
              filterable: true
            },
            {
              key: 'value',
              header: 'Value',
              type: 'string',
              sortable: true,
              filterable: true
            }
          ],
          pagination: {
            enabled: false,
            pageSize: 10
          },
          sorting: {
            enabled: false
          },
          filtering: {
            enabled: false,
            type: 'text'
          }
        };
      }

      // Initialize graph config if it doesn't exist or is incomplete
      if (editedBlock.type === 'graph') {
        const defaultGraphConfig = {
          chartType: 'line',
          series: [],
          xAxis: { type: 'category', name: '' },
          yAxis: { type: 'value', name: '' },
          legend: { show: true, position: 'top', align: 'center' },
          colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'],
          animations: { enabled: true, duration: 1000, easing: 'cubicInOut' }
        };

        if (!editedBlock.config.chartType) {
          editedBlock.config = { ...defaultGraphConfig, ...editedBlock.config };
        }
        if (!editedBlock.config.series) {
          editedBlock.config.series = [];
        }
        if (!editedBlock.config.xAxis) {
          editedBlock.config.xAxis = { type: 'category', name: '' };
        }
        if (!editedBlock.config.yAxis) {
          editedBlock.config.yAxis = { type: 'value', name: '' };
        }
        if (!editedBlock.config.legend) {
          editedBlock.config.legend = { show: true, position: 'top', align: 'center' };
        }
        if (!editedBlock.config.colors) {
          editedBlock.config.colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
        }
        if (!editedBlock.config.animations) {
          editedBlock.config.animations = { enabled: true, duration: 1000, easing: 'cubicInOut' };
        }

        currentChartType = editedBlock.config.chartType || 'line';
      }

      if (editedBlock.type === 'text') {
        if (!editedBlock.config.content) {
          editedBlock.config.content = '';
        }
        if (!editedBlock.config.variables || !Array.isArray(editedBlock.config.variables)) {
          const oldVars = editedBlock.config.variables as Record<string, string> | undefined;
          if (oldVars && typeof oldVars === 'object') {
            editedBlock.config.variables = Object.entries(oldVars).map(([name, value]) => ({
              name,
              type: 'static' as const,
              value
            }));
          } else {
            editedBlock.config.variables = [];
          }
        }
        if (!editedBlock.config.styling) {
          editedBlock.config.styling = {
            fontSize: 14,
            fontFamily: 'Arial, sans-serif',
            color: '#000000',
            padding: 8,
            textAlign: 'left',
            fontWeight: 'normal',
            fontStyle: 'normal'
          };
        } else {
          if (editedBlock.config.styling.color?.startsWith('var(')) {
            editedBlock.config.styling.color = '#000000';
          }
          if (editedBlock.config.styling.backgroundColor?.startsWith('var(')) {
            editedBlock.config.styling.backgroundColor = '#ffffff';
          }
        }
      }

      // Sync reactive variables with editedBlock
      dataSourceType = editedBlock.dataSource.type;
      selectedQueryId = editedBlock.dataSource.queryId || '';
      selectedPreprocessingId = editedBlock.dataSource.preprocessingId || '';
      staticDataJson = editedBlock.dataSource.staticData
        ? JSON.stringify(editedBlock.dataSource.staticData, null, 2)
        : '[]';
      apiEndpoint = editedBlock.dataSource.endpoint || '';
      apiMethod = editedBlock.dataSource.method || 'GET';
      apiToken = editedBlock.dataSource.headers?.Authorization?.replace('Bearer ', '') || '';

      ckeditorLoaded = false;
      ckeditorError = false;
      // Initialize CKEditor when opening text block
      if (editedBlock?.type === 'text') {
        setTimeout(() => initializeCKEditor(), 100);
      }
    }
  });

  $effect(() => {
    if (!isOpen && editorInstance) {
      destroyCKEditor();
    }
  });

  function updateDataSource() {
    if (editedBlock?.dataSource) {
      editedBlock.dataSource.type = dataSourceType;
      if (dataSourceType === 'query') {
        editedBlock.dataSource.queryId = selectedQueryId;
        editedBlock.dataSource.preprocessingId = selectedPreprocessingId || undefined;
        delete editedBlock.dataSource.staticData;
        delete editedBlock.dataSource.endpoint;
        delete editedBlock.dataSource.method;
        delete editedBlock.dataSource.headers;
      } else if (dataSourceType === 'static') {
        try {
          editedBlock.dataSource.staticData = JSON.parse(staticDataJson);
        } catch (e) {
          console.warn('Invalid JSON in static data:', e);
        }
        delete editedBlock.dataSource.queryId;
        delete editedBlock.dataSource.preprocessingId;
        delete editedBlock.dataSource.endpoint;
        delete editedBlock.dataSource.method;
        delete editedBlock.dataSource.headers;
      } else if (dataSourceType === 'api') {
        editedBlock.dataSource.endpoint = apiEndpoint;
        editedBlock.dataSource.method = apiMethod;
        if (apiToken) {
          editedBlock.dataSource.headers = {
            Authorization: `Bearer ${apiToken}`
          };
        } else {
          delete editedBlock.dataSource.headers;
        }
        delete editedBlock.dataSource.queryId;
        delete editedBlock.dataSource.preprocessingId;
        delete editedBlock.dataSource.staticData;
      } else {
        delete editedBlock.dataSource.queryId;
        delete editedBlock.dataSource.preprocessingId;
        delete editedBlock.dataSource.staticData;
        delete editedBlock.dataSource.endpoint;
        delete editedBlock.dataSource.method;
        delete editedBlock.dataSource.headers;
      }
    }
  }

  // Watch for changes in static data JSON and update the data source
  $effect(() => {
    if (dataSourceType === 'static' && staticDataJson) {
      updateDataSource();
    }
  });

  // Watch for changes in query selection and update the data source
  $effect(() => {
    if (dataSourceType === 'query' && selectedQueryId) {
      updateDataSource();
    }
  });

  // Watch for changes in preprocessing selection and update the data source
  $effect(() => {
    if (dataSourceType === 'query' && selectedQueryId) {
      updateDataSource();
    }
  });

  // Reset preprocessing when query changes
  $effect(() => {
    if (dataSourceType === 'query') {
      const query = queries.find((q) => q.id === selectedQueryId);
      if (!query || !query.preprocessing?.find((p) => p.id === selectedPreprocessingId)) {
        selectedPreprocessingId = '';
      }
    }
  });

  // Watch for changes in API configuration and update the data source
  $effect(() => {
    if (dataSourceType === 'api' && (apiEndpoint || apiMethod || apiToken)) {
      updateDataSource();
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
              'undo',
              'redo',
              '|',
              'heading',
              '|',
              'bold',
              'italic',
              'underline',
              '|',
              'link',
              'insertTable',
              'blockQuote',
              '|',
              'bulletedList',
              'numberedList',
              'outdent',
              'indent'
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

  function handleDragStart(event: DragEvent, index: number) {
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', index.toString());
    }
    draggedIndex = index;
  }

  function handleDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    dragOverIndex = index;
  }

  function handleDragLeave() {
    dragOverIndex = null;
  }

  function handleDrop(event: DragEvent, dropIndex: number) {
    event.preventDefault();

    if (draggedIndex !== null && draggedIndex !== dropIndex && editedBlock) {
      const config = editedBlock.config as any;
      const columns = [...config.columns];

      // Remove the dragged item
      const [draggedColumn] = columns.splice(draggedIndex, 1);

      // Insert it at the new position
      columns.splice(dropIndex, 0, draggedColumn);

      config.columns = columns;
      editedBlock = { ...editedBlock };
    }

    draggedIndex = null;
    dragOverIndex = null;
  }

  function handleDragEnd() {
    draggedIndex = null;
    dragOverIndex = null;
  }

  function handleClose() {
    destroyCKEditor();
    editedBlock = null;
    close();
  }

  async function autoFillColumns() {
    if (!editedBlock || editedBlock.type !== 'table' || !selectedQueryId || !dashboardService)
      return;

    const query = queries.find((q) => q.id === selectedQueryId);
    if (!query) return;

    autoFillLoading = true;
    try {
      const result = await dashboardService.getQueryPreview(query.sql, 1);
      if (result.columns && result.columns.length > 0) {
        const config = editedBlock.config as any;
        config.columns = result.columns.map((col) => ({
          key: col.name,
          header: '',
          type:
            col.type === 'integer' || col.type === 'float' || col.type === 'number'
              ? 'number'
              : col.type === 'boolean'
                ? 'boolean'
                : col.type === 'date' || col.type === 'timestamp'
                  ? 'date'
                  : 'string',
          sortable: true,
          filterable: true
        }));
        editedBlock = { ...editedBlock };
      }
    } catch (e) {
      console.error('Failed to auto-fill columns:', e);
    } finally {
      autoFillLoading = false;
    }
  }

  function onsubmit(event: SubmitEvent) {
    event.preventDefault();

    if (editedBlock) {
      if (editedBlock.type === 'text' && editorInstance) {
        (editedBlock.config as any).content = editorInstance.getData();
      }
      blockUpdated(editedBlock);
      handleClose();
    }
  }

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
</script>

{#if editedBlock}
  <Modal {isOpen} title="Edit Block" size="large" close={handleClose}>
    <form class="space-y-4 p-4 sm:space-y-6 sm:p-6" id="block-editor-form" {onsubmit}>
      <div class="space-y-2">
        <label for="block-title" class="block text-sm font-medium text-gray-700">Title</label>
        <input
          id="block-title"
          type="text"
          bind:value={editedBlock.title}
          placeholder="Enter block title"
          class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        <small class="text-xs text-gray-500">Current value: {editedBlock.title}</small>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <label for="block-x" class="block text-sm font-medium text-gray-700">X Position</label>
          <input
            id="block-x"
            type="number"
            bind:value={editedBlock.position.x}
            min="0"
            class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
            class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <small class="text-xs text-gray-500">Current Y: {editedBlock.position.y}</small>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <label for="block-width" class="block text-sm font-medium text-gray-700">Width</label>
          <input
            id="block-width"
            type="number"
            bind:value={editedBlock.size.width}
            min="1"
            class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div class="space-y-2">
          <label for="block-height" class="block text-sm font-medium text-gray-700">Height</label>
          <input
            id="block-height"
            type="number"
            bind:value={editedBlock.size.height}
            min="1"
            class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {#if editedBlock.type === 'table' || editedBlock.type === 'graph' || editedBlock.type === 'text'}
        <div class="space-y-2">
          <label for="data-source" class="block text-sm font-medium text-gray-700"
            >Data Source</label
          >
          <select
            id="data-source"
            bind:value={dataSourceType}
            onchange={updateDataSource}
            class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="mock">Mock Data</option>
            <option value="static">Static Data</option>
            <option value="query">SQL Query</option>
            <option value="api">API Endpoint</option>
          </select>
          {#if editedBlock.type === 'text'}
            <p class="text-xs text-gray-500">
              Data source is used for dynamic variables that transform data into display values.
            </p>
          {/if}
        </div>

        {#if dataSourceType === 'query'}
          <div class="space-y-2">
            <label for="query-select" class="block text-sm font-medium text-gray-700"
              >Select Query</label
            >
            <select
              id="query-select"
              bind:value={selectedQueryId}
              onchange={updateDataSource}
              class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">-- Select a query --</option>
              {#each queries.filter((q) => q.isActive) as query}
                <option value={query.id}>{query.name}</option>
              {/each}
            </select>
            {#if queries.filter((q) => q.isActive).length === 0}
              <p class="text-sm text-gray-600">
                No active queries available. Create queries in the Query Manager.
              </p>
            {/if}
          </div>

          {#if selectedQueryId}
            {@const selectedQuery = queries.find((q) => q.id === selectedQueryId)}
            {#if selectedQuery?.preprocessing && selectedQuery.preprocessing.length > 0}
              <div class="space-y-2">
                <label for="preprocessing-select" class="block text-sm font-medium text-gray-700"
                  >Preprocessing (Optional)</label
                >
                <select
                  id="preprocessing-select"
                  bind:value={selectedPreprocessingId}
                  onchange={updateDataSource}
                  class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- No preprocessing --</option>
                  {#each selectedQuery.preprocessing as prep}
                    <option value={prep.id}
                      >{prep.name}{prep.description ? ` - ${prep.description}` : ''}</option
                    >
                  {/each}
                </select>
                <p class="text-xs text-gray-500">
                  Apply a transformation function to the query results before display.
                </p>
              </div>
            {/if}
          {/if}
        {/if}

        {#if dataSourceType === 'static'}
          <div class="space-y-2">
            <label for="static-data" class="block text-sm font-medium text-gray-700"
              >Static Data (JSON)</label
            >
            <div class="h-[300px] w-full overflow-hidden rounded-md border border-gray-300">
              <MonacoEditor
                bind:value={staticDataJson}
                language="json"
                theme="vs"
                placeholder="Enter JSON data here..."
                fontSize={12}
                minimap={false}
                autoFormat={true}
                onKeyboardShortcut={(shortcut) => {
                  if (shortcut === 'save') {
                    updateDataSource();
                  }
                }}
                keyboardShortcuts={[
                  {
                    key: 'Ctrl+S',
                    command: 'save',
                    callback: () => updateDataSource()
                  }
                ]}
              />
            </div>
            <p class="text-xs text-gray-500">
              Enter your static data as valid JSON. Press Ctrl+S to save changes.
            </p>
          </div>
        {/if}

        {#if dataSourceType === 'api'}
          <div class="space-y-4">
            <div class="space-y-2">
              <label for="api-endpoint" class="block text-sm font-medium text-gray-700"
                >API Endpoint URL</label
              >
              <input
                id="api-endpoint"
                type="url"
                bind:value={apiEndpoint}
                oninput={updateDataSource}
                placeholder="https://api.example.com/data"
                class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p class="text-xs text-gray-500">Enter the full URL of your API endpoint</p>
            </div>

            <div class="space-y-2">
              <label for="api-method" class="block text-sm font-medium text-gray-700"
                >HTTP Method</label
              >
              <select
                id="api-method"
                bind:value={apiMethod}
                onchange={updateDataSource}
                class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
              <p class="text-xs text-gray-500">Select the HTTP method to use for the API request</p>
            </div>

            <div class="space-y-2">
              <label for="api-token" class="block text-sm font-medium text-gray-700"
                >Authorization Token (Optional)</label
              >
              <input
                id="api-token"
                type="password"
                bind:value={apiToken}
                oninput={updateDataSource}
                placeholder="Enter bearer token"
                class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p class="text-xs text-gray-500">
                Optional: Bearer token for API authentication. Will be sent as "Authorization:
                Bearer {apiToken}"
              </p>
            </div>
          </div>
        {/if}
      {/if}

      {#if editedBlock.type === 'table'}
        <!-- Table Configuration -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium text-gray-900">Table Configuration</h3>
            {#if dataSourceType === 'query' && selectedQueryId && dashboardService}
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                onclick={autoFillColumns}
                disabled={autoFillLoading}
              >
                {#if autoFillLoading}
                  <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    ></circle>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                {:else}
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                {/if}
                Auto Fill
              </button>
            {/if}
          </div>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div class="block text-sm font-medium text-gray-700">Columns</div>
                <label class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editedBlock.config.autoColumns ?? false}
                    onchange={(e) => {
                      if (editedBlock) {
                        editedBlock.config.autoColumns = e.currentTarget.checked;
                        editedBlock = { ...editedBlock };
                      }
                    }}
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="text-sm text-gray-600">Auto</span>
                </label>
              </div>
              {#if !editedBlock.config.autoColumns}
                <button
                  type="button"
                  class="text-sm text-blue-600 hover:text-blue-500"
                  onclick={() => {
                    if (editedBlock) {
                      const config = editedBlock.config as any;
                      if (!config.columns) config.columns = [];
                      config.columns.push({
                        key: `column_${config.columns.length + 1}`,
                        header: `Column ${config.columns.length + 1}`,
                        type: 'string',
                        sortable: true,
                        filterable: true
                      });
                      editedBlock = { ...editedBlock };
                    }
                  }}
                >
                  + Add Column
                </button>
              {/if}
            </div>

            {#if !editedBlock.config.autoColumns && editedBlock.config.columns}
              <div class="space-y-2 overflow-y-auto">
                {#each editedBlock.config.columns as column, index}
                  <div
                    class="space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3 transition-all duration-200 hover:border-gray-300 hover:shadow-sm {draggedIndex ===
                    index
                      ? 'opacity-50'
                      : ''} {dragOverIndex === index ? 'border-blue-400 bg-blue-50' : ''}"
                    draggable="true"
                    role="group"
                    aria-label={`Column ${index + 1} configuration`}
                    ondragstart={(e) => handleDragStart(e, index)}
                    ondragover={(e) => handleDragOver(e, index)}
                    ondragleave={handleDragLeave}
                    ondrop={(e) => handleDrop(e, index)}
                    ondragend={handleDragEnd}
                  >
                    <!-- Column Header with Order Controls -->
                    <div class="flex items-center justify-between border-b border-gray-200 pb-2">
                      <div class="flex items-center space-x-2">
                        <span
                          class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600"
                        >
                          {index + 1}
                        </span>
                        <span class="text-sm font-medium text-gray-700">
                          {column.header || column.key || `Column ${index + 1}`}
                        </span>
                      </div>
                      <div class="flex items-center space-x-1">
                        <!-- Move Up Button -->
                        <button
                          type="button"
                          aria-label={`Move column ${index + 1} up`}
                          disabled={index === 0}
                          class="rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                          onclick={() => {
                            if (editedBlock && index > 0) {
                              const config = editedBlock.config as any;
                              const columns = [...config.columns];
                              [columns[index - 1], columns[index]] = [
                                columns[index],
                                columns[index - 1]
                              ];
                              config.columns = columns;
                              editedBlock = { ...editedBlock };
                            }
                          }}
                          title="Move up"
                        >
                          <svg
                            class="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M5 15l7-7 7 7"
                            />
                          </svg>
                        </button>
                        <!-- Move Down Button -->
                        <button
                          type="button"
                          aria-label={`Move column ${index + 1} down`}
                          disabled={index === editedBlock.config.columns.length - 1}
                          class="rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                          onclick={() => {
                            if (editedBlock && index < editedBlock.config.columns.length - 1) {
                              const config = editedBlock.config as any;
                              const columns = [...config.columns];
                              [columns[index], columns[index + 1]] = [
                                columns[index + 1],
                                columns[index]
                              ];
                              config.columns = columns;
                              editedBlock = { ...editedBlock };
                            }
                          }}
                          title="Move down"
                        >
                          <svg
                            class="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                        <!-- Drag Handle -->
                        <div
                          class="cursor-grab rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 active:cursor-grabbing"
                          title="Drag to reorder"
                          role="button"
                          tabindex="0"
                          aria-label={`Drag handle for column ${index + 1}`}
                          onmousedown={(e) => (e.currentTarget.style.cursor = 'grabbing')}
                          onmouseup={(e) => (e.currentTarget.style.cursor = 'grab')}
                        >
                          <svg
                            class="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M4 8h16M4 16h16"
                            />
                          </svg>
                        </div>
                        <!-- Delete Button -->
                        <button
                          type="button"
                          aria-label={`Delete column ${index + 1}`}
                          class="rounded bg-red-100 p-1 text-red-600 transition-colors"
                          onclick={() => {
                            if (editedBlock) {
                              const config = editedBlock.config as any;
                              config.columns = config.columns.filter(
                                (_: any, i: number) => i !== index
                              );
                              editedBlock = { ...editedBlock };
                            }
                          }}
                          title="Delete column"
                        >
                          <svg
                            class="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <!-- Column Configuration Fields -->
                    <div class="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-center sm:gap-2">
                      <div class="sm:col-span-3">
                        <label
                          class="block text-xs font-medium text-gray-600 sm:hidden"
                          for={`col-key-${index}`}>Key</label
                        >
                        <input
                          id={`col-key-${index}`}
                          type="text"
                          placeholder="Column key"
                          bind:value={column.key}
                          class="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div class="sm:col-span-3">
                        <label
                          class="block text-xs font-medium text-gray-600 sm:hidden"
                          for={`col-header-${index}`}>Header</label
                        >
                        <input
                          id={`col-header-${index}`}
                          type="text"
                          placeholder="Header"
                          bind:value={column.header}
                          class="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div class="sm:col-span-2">
                        <label
                          class="block text-xs font-medium text-gray-600 sm:hidden"
                          for={`col-type-${index}`}>Type</label
                        >
                        <select
                          id={`col-type-${index}`}
                          bind:value={column.type}
                          class="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="string">String</option>
                          <option value="number">Number</option>
                          <option value="date">Date</option>
                          <option value="boolean">Boolean</option>
                        </select>
                      </div>
                      <div class="sm:col-span-2">
                        <label
                          class="block text-xs font-medium text-gray-600 sm:hidden"
                          for={`col-width-${index}`}>Width</label
                        >
                        <input
                          id={`col-width-${index}`}
                          type="number"
                          placeholder="Width"
                          bind:value={column.width}
                          class="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div class="sm:col-span-1">
                        <label class="flex items-center" for={`col-sort-${index}`}>
                          <input
                            id={`col-sort-${index}`}
                            type="checkbox"
                            bind:checked={column.sortable}
                            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span class="ml-1 text-xs text-gray-600">Sort</span>
                        </label>
                      </div>
                      <div class="sm:col-span-1">
                        <label class="flex items-center" for={`col-filter-${index}`}>
                          <input
                            id={`col-filter-${index}`}
                            type="checkbox"
                            bind:checked={column.filterable}
                            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span class="ml-1 text-xs text-gray-600">Filter</span>
                        </label>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          <!-- Pagination Configuration -->
          <div class="space-y-3">
            <div class="block text-sm font-medium text-gray-700">Pagination</div>
            <div
              class="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4"
            >
              <label class="flex items-center">
                <input
                  type="checkbox"
                  bind:checked={editedBlock.config.pagination.enabled}
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="ml-2 text-sm text-gray-600">Enable pagination</span>
              </label>
              {#if editedBlock.config.pagination?.enabled}
                <div class="flex items-center space-x-2">
                  <label for="page-size" class="text-sm text-gray-600">Page size:</label>
                  <input
                    id="page-size"
                    type="number"
                    bind:value={editedBlock.config.pagination.pageSize}
                    min="1"
                    max="100"
                    class="w-20 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              {/if}
            </div>
          </div>

          <!-- Sorting Configuration -->
          <div class="space-y-3">
            <div class="block text-sm font-medium text-gray-700">Sorting</div>
            <div
              class="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4"
            >
              <label class="flex items-center">
                <input
                  type="checkbox"
                  checked={editedBlock.config.sorting.enabled}
                  onchange={(e) => {
                    if (editedBlock) {
                      const isEnabled = e.currentTarget.checked;
                      if (isEnabled && !editedBlock.config.sorting.defaultSort) {
                        editedBlock.config.sorting.defaultSort = {
                          column: editedBlock.config.columns?.[0]?.key || '',
                          direction: 'asc'
                        };
                      }
                      editedBlock.config.sorting.enabled = isEnabled;
                    }
                  }}
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="ml-2 text-sm text-gray-600">Enable sorting</span>
              </label>
              {#if editedBlock.config.sorting.enabled}
                <div
                  class="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2"
                >
                  <label for="default-sort" class="text-sm text-gray-600">Default sort:</label>
                  <select
                    id="default-sort"
                    bind:value={editedBlock.config.sorting.defaultSort.column}
                    class="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">None</option>
                    {#each editedBlock.config.columns || [] as column}
                      <option value={column.key}>{column.header}</option>
                    {/each}
                  </select>
                  <select
                    bind:value={editedBlock.config.sorting.defaultSort.direction}
                    class="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
              {/if}
            </div>
          </div>

          <!-- Filtering Configuration -->
          <div class="space-y-3">
            <div class="block text-sm font-medium text-gray-700">Filtering</div>
            <div
              class="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4"
            >
              <label class="flex items-center">
                <input
                  type="checkbox"
                  bind:checked={editedBlock.config.filtering.enabled}
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="ml-2 text-sm text-gray-600">Enable filtering</span>
              </label>
            </div>
          </div>
        </div>
      {/if}

      {#if editedBlock.type === 'graph'}
        <div class="space-y-4">
          <h3 class="text-lg font-medium text-gray-900">Graph Configuration</h3>

          <div class="space-y-2">
            <label for="chart-type" class="block text-sm font-medium text-gray-700"
              >Chart Type</label
            >
            <select
              id="chart-type"
              bind:value={editedBlock.config.chartType}
              onchange={() => {
                if (editedBlock) {
                  const newChartType = editedBlock.config.chartType;
                  const oldChartType = currentChartType;
                  currentChartType = newChartType;

                  const isPieType = ['pie', 'donut'].includes(newChartType);
                  const wasAxisType = ['line', 'bar', 'area', 'scatter', 'radar'].includes(
                    oldChartType
                  );
                  const isAxisType = ['line', 'bar', 'area', 'scatter', 'radar'].includes(
                    newChartType
                  );
                  const wasPieType = ['pie', 'donut'].includes(oldChartType);

                  if (isPieType && wasAxisType) {
                    editedBlock.config.xAxis = { type: 'category', name: '' };
                    editedBlock.config.yAxis = { type: 'value', name: '' };
                    editedBlock.config.series = [];
                    if (!editedBlock.config.nameKey) editedBlock.config.nameKey = 'name';
                    if (!editedBlock.config.valueKey) editedBlock.config.valueKey = 'value';
                  }

                  if (isAxisType && wasPieType) {
                    delete editedBlock.config.nameKey;
                    delete editedBlock.config.valueKey;
                    if (!editedBlock.config.series || editedBlock.config.series.length === 0) {
                      editedBlock.config.series = [
                        { name: 'Series 1', dataKey: '', color: '#3b82f6' }
                      ];
                    }
                  }

                  editedBlock = { ...editedBlock };
                }
              }}
              class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="pie">Pie Chart</option>
              <option value="area">Area Chart</option>
              <option value="scatter">Scatter Plot</option>
              <option value="donut">Donut Chart</option>
              <option value="radar">Radar Chart</option>
            </select>
          </div>

          {#if ['pie', 'donut'].includes(currentChartType)}
            <div class="space-y-3">
              <div class="block text-sm font-medium text-gray-700">Pie Chart Data Mapping</div>
              <p class="text-xs text-gray-500">
                Configure which fields from your data source map to the chart
              </p>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label for="pie-name-key" class="block text-xs font-medium text-gray-600"
                    >Name Field</label
                  >
                  <input
                    id="pie-name-key"
                    type="text"
                    placeholder="e.g., category, month, name"
                    bind:value={editedBlock.config.nameKey}
                    class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                  <p class="mt-1 text-xs text-gray-400">Field to use as slice labels</p>
                </div>
                <div>
                  <label for="pie-value-key" class="block text-xs font-medium text-gray-600"
                    >Value Field</label
                  >
                  <input
                    id="pie-value-key"
                    type="text"
                    placeholder="e.g., sales, count, value"
                    bind:value={editedBlock.config.valueKey}
                    class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                  <p class="mt-1 text-xs text-gray-400">Field to use as slice values</p>
                </div>
              </div>
            </div>
          {/if}

          {#if ['bar', 'area'].includes(currentChartType)}
            <div class="space-y-3">
              <label class="flex items-center">
                <input
                  type="checkbox"
                  bind:checked={editedBlock.config.stacked}
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="ml-2 text-sm text-gray-600">Stacked</span>
              </label>
              <p class="text-xs text-gray-400">
                Stack series on top of each other instead of side by side
              </p>
            </div>
          {/if}

          {#if !['pie', 'donut'].includes(currentChartType)}
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div class="block text-sm font-medium text-gray-700">Series</div>
                <button
                  type="button"
                  class="text-sm text-blue-600 hover:text-blue-500"
                  onclick={() => {
                    if (editedBlock) {
                      if (!editedBlock.config.series) editedBlock.config.series = [];
                      editedBlock.config.series.push({
                        name: `Series ${editedBlock.config.series.length + 1}`,
                        dataKey: '',
                        color: '#3b82f6'
                      });
                      editedBlock = { ...editedBlock };
                    }
                  }}
                >
                  + Add Series
                </button>
              </div>

              {#if editedBlock.config.series && editedBlock.config.series.length > 0}
                <div class="space-y-2">
                  {#each editedBlock.config.series as series, index}
                    <div class="rounded-md border border-gray-200 bg-gray-50 p-3">
                      <div class="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-center">
                        <div class="sm:col-span-4">
                          <label
                            for={`series-name-${index}`}
                            class="block text-xs font-medium text-gray-600 sm:hidden">Name</label
                          >
                          <input
                            id={`series-name-${index}`}
                            type="text"
                            placeholder="Series name"
                            bind:value={series.name}
                            class="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <div class="sm:col-span-4">
                          <label
                            for={`series-datakey-${index}`}
                            class="block text-xs font-medium text-gray-600 sm:hidden"
                            >Data Key</label
                          >
                          <input
                            id={`series-datakey-${index}`}
                            type="text"
                            placeholder="Data key"
                            bind:value={series.dataKey}
                            class="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <div class="sm:col-span-3">
                          <label
                            for={`series-color-${index}`}
                            class="block text-xs font-medium text-gray-600 sm:hidden">Color</label
                          >
                          <input
                            id={`series-color-${index}`}
                            type="color"
                            bind:value={series.color}
                            class="w-full rounded border border-gray-300 px-1 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <div class="flex justify-end sm:col-span-1">
                          <button
                            type="button"
                            onclick={() => {
                              if (editedBlock) {
                                editedBlock.config.series.splice(index, 1);
                                editedBlock = { ...editedBlock };
                              }
                            }}
                            class="rounded p-1 text-red-600 hover:bg-red-50"
                            title="Remove series"
                            aria-label="Remove series"
                          >
                            <svg
                              class="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>

            <div class="space-y-3">
              <div class="block text-sm font-medium text-gray-700">X-Axis Configuration</div>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label for="xaxis-type" class="block text-xs font-medium text-gray-600"
                    >Type</label
                  >
                  <select
                    id="xaxis-type"
                    bind:value={editedBlock.config.xAxis.type}
                    class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="category">Category</option>
                    <option value="value">Value</option>
                    <option value="time">Time</option>
                  </select>
                </div>
                <div>
                  <label for="xaxis-name" class="block text-xs font-medium text-gray-600"
                    >Label</label
                  >
                  <input
                    id="xaxis-name"
                    type="text"
                    placeholder="X-Axis label"
                    bind:value={editedBlock.config.xAxis.name}
                    class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div class="sm:col-span-2">
                  <label for="xaxis-key" class="block text-xs font-medium text-gray-600"
                    >Data Key (optional)</label
                  >
                  <input
                    id="xaxis-key"
                    type="text"
                    placeholder="e.g., month, date, category (auto-detected if empty)"
                    bind:value={editedBlock.config.xAxisKey}
                    class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                  <p class="mt-1 text-xs text-gray-400">
                    Field from data to use as x-axis values. Leave empty to auto-detect.
                  </p>
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <div class="block text-sm font-medium text-gray-700">Y-Axis Configuration</div>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label for="yaxis-type" class="block text-xs font-medium text-gray-600"
                    >Type</label
                  >
                  <select
                    id="yaxis-type"
                    bind:value={editedBlock.config.yAxis.type}
                    class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="value">Value</option>
                    <option value="category">Category</option>
                  </select>
                </div>
                <div>
                  <label for="yaxis-name" class="block text-xs font-medium text-gray-600"
                    >Label</label
                  >
                  <input
                    id="yaxis-name"
                    type="text"
                    placeholder="Y-Axis label"
                    bind:value={editedBlock.config.yAxis.name}
                    class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label for="yaxis-min" class="block text-xs font-medium text-gray-600"
                    >Min Value</label
                  >
                  <input
                    id="yaxis-min"
                    type="number"
                    placeholder="Auto"
                    bind:value={editedBlock.config.yAxis.min}
                    class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label for="yaxis-max" class="block text-xs font-medium text-gray-600"
                    >Max Value</label
                  >
                  <input
                    id="yaxis-max"
                    type="number"
                    placeholder="Auto"
                    bind:value={editedBlock.config.yAxis.max}
                    class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          {/if}

          <div class="space-y-3">
            <div class="block text-sm font-medium text-gray-700">Legend Configuration</div>
            <div class="space-y-2">
              <label class="flex items-center">
                <input
                  type="checkbox"
                  bind:checked={editedBlock.config.legend.show}
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="ml-2 text-sm text-gray-600">Show legend</span>
              </label>
              {#if editedBlock.config.legend.show}
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label for="legend-position" class="block text-xs font-medium text-gray-600"
                      >Position</label
                    >
                    <select
                      id="legend-position"
                      bind:value={editedBlock.config.legend.position}
                      class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                  <div>
                    <label for="legend-align" class="block text-xs font-medium text-gray-600"
                      >Alignment</label
                    >
                    <select
                      id="legend-align"
                      bind:value={editedBlock.config.legend.align}
                      class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>
              {/if}
            </div>
          </div>

          <div class="space-y-3">
            <div class="block text-sm font-medium text-gray-700">Animation Settings</div>
            <div class="space-y-2">
              <label class="flex items-center">
                <input
                  type="checkbox"
                  bind:checked={editedBlock.config.animations.enabled}
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="ml-2 text-sm text-gray-600">Enable animations</span>
              </label>
              {#if editedBlock.config.animations.enabled}
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label for="animation-duration" class="block text-xs font-medium text-gray-600"
                      >Duration (ms)</label
                    >
                    <input
                      id="animation-duration"
                      type="number"
                      min="0"
                      max="5000"
                      step="100"
                      bind:value={editedBlock.config.animations.duration}
                      class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label for="animation-easing" class="block text-xs font-medium text-gray-600"
                      >Easing</label
                    >
                    <select
                      id="animation-easing"
                      bind:value={editedBlock.config.animations.easing}
                      class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="linear">Linear</option>
                      <option value="easeInQuad">Ease In Quad</option>
                      <option value="easeOutQuad">Ease Out Quad</option>
                      <option value="easeInOutQuad">Ease In-Out Quad</option>
                      <option value="easeInCubic">Ease In Cubic</option>
                      <option value="easeOutCubic">Ease Out Cubic</option>
                      <option value="easeInOutCubic">Ease In-Out Cubic</option>
                      <option value="easeOutBounce">Ease Out Bounce</option>
                    </select>
                  </div>
                </div>
              {/if}
            </div>
          </div>

          <div class="space-y-2">
            <div class="block text-sm font-medium text-gray-700">Color Palette</div>
            <div class="flex flex-wrap gap-2">
              {#each editedBlock.config.colors || [] as color, index}
                <div class="flex items-center gap-1">
                  <input
                    type="color"
                    bind:value={editedBlock.config.colors[index]}
                    class="h-8 w-12 cursor-pointer rounded border border-gray-300"
                    aria-label={`Color ${index + 1}`}
                  />
                  <button
                    type="button"
                    onclick={() => {
                      if (editedBlock && editedBlock.config.colors) {
                        editedBlock.config.colors.splice(index, 1);
                        editedBlock = { ...editedBlock };
                      }
                    }}
                    class="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-red-600"
                    title="Remove color"
                    aria-label={`Remove color ${index + 1}`}
                  >
                    <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              {/each}
              <button
                type="button"
                onclick={() => {
                  if (editedBlock) {
                    if (!editedBlock.config.colors) editedBlock.config.colors = [];
                    editedBlock.config.colors.push('#3b82f6');
                    editedBlock = { ...editedBlock };
                  }
                }}
                class="flex h-8 w-12 items-center justify-center rounded border-2 border-dashed border-gray-300 text-gray-400 hover:border-blue-500 hover:text-blue-500"
                title="Add color"
                aria-label="Add color to palette"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      {/if}

      {#if editedBlock.type === 'text'}
        <div class="space-y-2">
          <label for="text-content" class="block text-sm font-medium text-gray-700">Content</label>
          {#if ckeditorError}
            <textarea
              id="text-content"
              bind:value={editedBlock.config.content}
              placeholder="Enter text content (supports HTML)"
              rows="6"
              class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            ></textarea>
          {:else}
            <textarea
              bind:this={editorElement}
              id="text-content-editor"
              class="ckeditor-source min-h-32 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Enter text content..."
            ></textarea>
          {/if}
          <p class="text-xs text-gray-500">Use {'{{variableName}}'} syntax to insert variables.</p>
        </div>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium text-gray-900">Variables</h3>
            <button
              type="button"
              class="text-sm text-blue-600 hover:text-blue-500"
              onclick={() => {
                if (editedBlock) {
                  if (!editedBlock.config.variables) editedBlock.config.variables = [];
                  if (!Array.isArray(editedBlock.config.variables)) {
                    const oldVars = editedBlock.config.variables as Record<string, string>;
                    editedBlock.config.variables = Object.entries(oldVars).map(([name, value]) => ({
                      name,
                      type: 'static' as const,
                      value
                    }));
                  }
                  (editedBlock.config.variables as TextVariable[]).push({
                    name: `var${editedBlock.config.variables.length + 1}`,
                    type: 'static',
                    value: ''
                  });
                  editedBlock = { ...editedBlock };
                }
              }}
            >
              + Add Variable
            </button>
          </div>

          {#if editedBlock.config.variables && Array.isArray(editedBlock.config.variables) && editedBlock.config.variables.length > 0}
            <div class="space-y-3">
              {#each editedBlock.config.variables as variable, index}
                <div class="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-3">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span
                        class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600"
                      >
                        {index + 1}
                      </span>
                      <code class="text-sm text-gray-700">{`{{${variable.name}}}`}</code>
                    </div>
                    <button
                      type="button"
                      onclick={() => {
                        if (editedBlock && Array.isArray(editedBlock.config.variables)) {
                          editedBlock.config.variables.splice(index, 1);
                          editedBlock = { ...editedBlock };
                        }
                      }}
                      class="rounded p-1 text-red-600 hover:bg-red-50"
                      title="Remove variable"
                      aria-label="Remove variable"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        for={`var-name-${index}`}
                        class="block text-xs font-medium text-gray-600">Name</label
                      >
                      <input
                        id={`var-name-${index}`}
                        type="text"
                        placeholder="variableName"
                        bind:value={editedBlock.config.variables[index].name}
                        class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        for={`var-type-${index}`}
                        class="block text-xs font-medium text-gray-600">Type</label
                      >
                      <select
                        id={`var-type-${index}`}
                        value={variable.type}
                        onchange={(e) => {
                          const newType = e.currentTarget.value as 'static' | 'dynamic';
                          if (editedBlock && Array.isArray(editedBlock.config.variables)) {
                            const vars = editedBlock.config.variables as TextVariable[];
                            vars[index] = {
                              ...vars[index],
                              type: newType,
                              value: newType === 'static' ? vars[index].value || '' : undefined,
                              transform:
                                newType === 'dynamic'
                                  ? vars[index].transform ||
                                    '// data contains the data source array\nreturn data.length > 0 ? data[0].value : "N/A";'
                                  : undefined
                            };
                            editedBlock = { ...editedBlock };
                          }
                        }}
                        class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="static">Static Value</option>
                        <option value="dynamic">Dynamic (from Data Source)</option>
                      </select>
                    </div>
                  </div>

                  {#if variable.type === 'static'}
                    <div>
                      <label
                        for={`var-value-${index}`}
                        class="block text-xs font-medium text-gray-600">Value</label
                      >
                      <input
                        id={`var-value-${index}`}
                        type="text"
                        placeholder="Enter static value"
                        bind:value={editedBlock.config.variables[index].value}
                        class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  {:else if variable.transform !== undefined}
                    <div>
                      <label
                        for={`var-transform-${index}`}
                        class="block text-xs font-medium text-gray-600">Transform Function</label
                      >
                      <div
                        class="h-[120px] w-full overflow-hidden rounded-md border border-gray-300"
                      >
                        <MonacoEditor
                          bind:value={editedBlock.config.variables[index].transform}
                          language="javascript"
                          theme="vs"
                          placeholder="// 'data' contains the data source array\nreturn data.length > 0 ? data[0].value : 'N/A';"
                          fontSize={12}
                          minimap={false}
                        />
                      </div>
                      <p class="mt-1 text-xs text-gray-500">
                        Write JS code. Use <code class="rounded bg-gray-100 px-1">data</code> to access
                        the data source array. Return a string value.
                      </p>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <p
              class="rounded-md border border-dashed border-gray-300 py-4 text-center text-sm text-gray-500"
            >
              No variables defined. Add variables to use dynamic content in your text block.
            </p>
          {/if}
        </div>

        <div class="space-y-4">
          <h3 class="text-lg font-medium text-gray-900">Styling</h3>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <label for="text-font-size" class="block text-sm font-medium text-gray-700"
                >Font Size (px)</label
              >
              <input
                id="text-font-size"
                type="number"
                min="8"
                max="72"
                bind:value={editedBlock.config.styling.fontSize}
                class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div class="space-y-2">
              <label for="text-font-family" class="block text-sm font-medium text-gray-700"
                >Font Family</label
              >
              <select
                id="text-font-family"
                bind:value={editedBlock.config.styling.fontFamily}
                class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="Arial, sans-serif">Arial</option>
                <option value="Helvetica, sans-serif">Helvetica</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="Times New Roman, serif">Times New Roman</option>
                <option value="Courier New, monospace">Courier New</option>
                <option value="Verdana, sans-serif">Verdana</option>
              </select>
            </div>
            <div class="space-y-2">
              <label for="text-padding" class="block text-sm font-medium text-gray-700"
                >Padding (px)</label
              >
              <input
                id="text-padding"
                type="number"
                min="0"
                max="100"
                bind:value={editedBlock.config.styling.padding}
                class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div class="space-y-2">
              <label for="text-align" class="block text-sm font-medium text-gray-700"
                >Text Align</label
              >
              <select
                id="text-align"
                bind:value={editedBlock.config.styling.textAlign}
                class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
                <option value="justify">Justify</option>
              </select>
            </div>
            <div class="space-y-2">
              <label for="text-font-weight" class="block text-sm font-medium text-gray-700"
                >Font Weight</label
              >
              <select
                id="text-font-weight"
                bind:value={editedBlock.config.styling.fontWeight}
                class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
              </select>
            </div>
            <div class="space-y-2">
              <label for="text-font-style" class="block text-sm font-medium text-gray-700"
                >Font Style</label
              >
              <select
                id="text-font-style"
                bind:value={editedBlock.config.styling.fontStyle}
                class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="normal">Normal</option>
                <option value="italic">Italic</option>
              </select>
            </div>
          </div>
        </div>
      {/if}
    </form>

    {#snippet footer()}
      <div
        class="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 p-4 sm:flex-row sm:justify-end sm:p-6"
      >
        <button
          class="touch-manipulation rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
          typeof="button"
          onclick={handleClose}
        >
          Cancel
        </button>
        <button
          class="touch-manipulation rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
          form="block-editor-form"
          type="submit"
        >
          Save Changes
        </button>
      </div>
    {/snippet}
  </Modal>
{/if}
