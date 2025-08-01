<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { Block, Query } from '../../types/index.ts';
  import Modal from '../ui/Modal.svelte';
  import MonacoEditor from '../ui/MonacoEditor.svelte';

  let {
    block = null,
    isOpen = false,
    queries = [],
    blockUpdated = (block: Block) => {},
    close = () => {}
  }: {
    block?: Block | null;
    isOpen?: boolean;
    queries?: Query[];
    blockUpdated?: (block: Block) => void;
    close?: () => void;
  } = $props();

  let editedBlock: Block | null = $state(null);
  let editorInstance: any = $state(null);
  let editorElement: HTMLTextAreaElement | null = $state(null);
  let ckeditorLoaded = false;
  let ckeditorError = $state(false);
  let dataSourceType: 'api' | 'static' | 'mock' | 'query' = $state('mock');
  let selectedQueryId: string = $state('');
  let draggedIndex: number | null = $state(null);
  let dragOverIndex: number | null = $state(null);
  let staticDataJson: string = $state('[]');
  let apiEndpoint: string = $state('');
  let apiMethod: 'GET' | 'POST' = $state('GET');
  let apiToken: string = $state('');

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
            enabled: true
          },
          filtering: {
            enabled: false,
            type: 'text'
          }
        };
      }

      // Sync reactive variables with editedBlock
      dataSourceType = editedBlock.dataSource.type;
      selectedQueryId = editedBlock.dataSource.queryId || '';
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
        delete editedBlock.dataSource.staticData;
        delete editedBlock.dataSource.endpoint;
        delete editedBlock.dataSource.method;
        delete editedBlock.dataSource.headers;
      } else if (dataSourceType === 'static') {
        try {
          editedBlock.dataSource.staticData = JSON.parse(staticDataJson);
        } catch (e) {
          // Keep existing static data if JSON is invalid
          console.warn('Invalid JSON in static data:', e);
        }
        delete editedBlock.dataSource.queryId;
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
        delete editedBlock.dataSource.staticData;
      } else {
        delete editedBlock.dataSource.queryId;
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

  function onsubmit(event: SubmitEvent) {
    event.preventDefault();

    if (editedBlock) {
      // Make sure we get the latest content from CKEditor for text blocks
      if (editedBlock.type === 'text' && editorInstance) {
        (editedBlock.config as any).content = editorInstance.getData();
      }
      blockUpdated(editedBlock);
      close();
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

      {#if editedBlock.type === 'table' || editedBlock.type === 'graph'}
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
          <h3 class="text-lg font-medium text-gray-900">Table Configuration</h3>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="block text-sm font-medium text-gray-700">Columns</div>
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
            </div>

            {#if editedBlock.config.columns}
              <div class="space-y-2 overflow-y-auto">
                {#each editedBlock.config.columns as column, index}
                  <div
                    class="space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3 transition-all duration-200 hover:border-gray-300 hover:shadow-sm {draggedIndex ===
                    index
                      ? 'opacity-50'
                      : ''} {dragOverIndex === index ? 'border-blue-400 bg-blue-50' : ''}"
                    draggable="true"
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
                      </div>
                    </div>

                    <!-- Column Configuration Fields -->
                    <div class="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-center sm:gap-2">
                      <div class="sm:col-span-3">
                        <label class="block text-xs font-medium text-gray-600 sm:hidden">Key</label>
                        <input
                          type="text"
                          placeholder="Column key"
                          bind:value={column.key}
                          class="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div class="sm:col-span-3">
                        <label class="block text-xs font-medium text-gray-600 sm:hidden"
                          >Header</label
                        >
                        <input
                          type="text"
                          placeholder="Header"
                          bind:value={column.header}
                          class="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div class="sm:col-span-2">
                        <label class="block text-xs font-medium text-gray-600 sm:hidden">Type</label
                        >
                        <select
                          bind:value={column.type}
                          class="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="string">String</option>
                          <option value="number">Number</option>
                          <option value="date">Date</option>
                          <option value="boolean">Boolean</option>
                        </select>
                      </div>
                      <div class="sm:col-span-1">
                        <label class="block text-xs font-medium text-gray-600 sm:hidden"
                          >Width</label
                        >
                        <input
                          type="number"
                          placeholder="Width"
                          bind:value={column.width}
                          class="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div class="sm:col-span-1">
                        <label class="flex items-center">
                          <input
                            type="checkbox"
                            bind:checked={column.sortable}
                            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span class="ml-1 text-xs text-gray-600">Sort</span>
                        </label>
                      </div>
                      <div class="sm:col-span-1">
                        <label class="flex items-center">
                          <input
                            type="checkbox"
                            bind:checked={column.filterable}
                            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span class="ml-1 text-xs text-gray-600">Filter</span>
                        </label>
                      </div>
                      <div class="sm:col-span-1">
                        <button
                          type="button"
                          class="w-full rounded bg-red-100 px-2 py-1 text-xs text-red-600 transition-colors hover:bg-red-200 sm:w-auto"
                          onclick={() => {
                            if (editedBlock) {
                              const config = editedBlock.config as any;
                              config.columns = config.columns.filter(
                                (_: any, i: number) => i !== index
                              );
                              editedBlock = { ...editedBlock };
                            }
                          }}
                        >
                          Remove
                        </button>
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
                  bind:checked={editedBlock.config.sorting.enabled}
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
              {#if editedBlock.config.filtering?.enabled}
                <div class="flex items-center space-x-2">
                  <label for="filter-type" class="text-sm text-gray-600">Filter type:</label>
                  <select
                    id="filter-type"
                    bind:value={editedBlock.config.filtering.type}
                    class="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="text">Text</option>
                    <option value="select">Select</option>
                    <option value="date">Date</option>
                    <option value="number">Number</option>
                  </select>
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/if}

      {#if editedBlock.type === 'graph'}
        <div class="space-y-2">
          <label for="chart-type" class="block text-sm font-medium text-gray-700">Chart Type</label>
          <select
            id="chart-type"
            bind:value={editedBlock.config.chartType}
            class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
              bind:value={editedBlock.config.content}
              placeholder="Enter text content (supports HTML)"
              rows="6"
              class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            ></textarea>
          {:else}
            <!-- CKEditor 5 source element -->
            <textarea
              bind:this={editorElement}
              id="text-content-editor"
              class="ckeditor-source min-h-32 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Enter text content..."
            ></textarea>
          {/if}
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
