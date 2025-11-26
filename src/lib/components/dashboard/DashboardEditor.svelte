<script lang="ts">
  import type { Dashboard } from '../../types/index';
  import Modal from '../ui/Modal.svelte';

  interface Props {
    dashboard: Dashboard | null;
    isOpen: boolean;
    onSave: (updates: {
      name?: string;
      description?: string;
      layout?: Dashboard['layout'];
      public?: boolean;
    }) => void;
    onClose: () => void;
  }

  let { dashboard, isOpen, onSave, onClose }: Props = $props();

  let name = $state('');
  let description = $state('');
  let gridSize = $state(80);
  let columns = $state(20);
  let rows = $state(15);
  let gap = $state(10);
  let canvasWidthType = $state<'fixed' | 'screen'>('fixed');
  let canvasWidthValue = $state(1600);
  let canvasHeightType = $state<'fixed' | 'screen'>('fixed');
  let canvasHeightValue = $state(1000);
  let isPublic = $state(false);

  $effect(() => {
    if (dashboard && isOpen) {
      name = dashboard.name;
      description = dashboard.description || '';
      gridSize = dashboard.layout.gridSize;
      columns = dashboard.layout.columns;
      rows = dashboard.layout.rows;
      gap = dashboard.layout.gap;
      canvasWidthType = dashboard.layout.canvasWidth.type;
      canvasWidthValue = dashboard.layout.canvasWidth.value || 1600;
      canvasHeightType = dashboard.layout.canvasHeight.type;
      canvasHeightValue = dashboard.layout.canvasHeight.value || 1000;
      isPublic = dashboard.public || false;
    }
  });

  function handleSave() {
    const updates: {
      name: string;
      description: string;
      layout: Dashboard['layout'];
      public?: boolean;
    } = {
      name: name.trim(),
      description: description.trim(),
      layout: {
        gridSize,
        columns,
        rows,
        gap,
        canvasWidth: {
          type: canvasWidthType,
          value: canvasWidthType === 'fixed' ? canvasWidthValue : undefined
        },
        canvasHeight: {
          type: canvasHeightType,
          value: canvasHeightType === 'fixed' ? canvasHeightValue : undefined
        }
      }
    };

    if (dashboard?.publicToggleable) {
      updates.public = isPublic;
    }

    onSave(updates);
    onClose();
  }

  function handleCancel() {
    onClose();
  }
</script>

<Modal {isOpen} close={handleCancel} size="large">
  <div class="flex h-full flex-col p-6">
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Edit Dashboard</h2>
      <p class="mt-2 text-sm text-gray-600">
        Update dashboard name, description, and layout settings
      </p>
    </div>

    <div class="-mr-2 flex-1 space-y-6 overflow-y-auto pr-2">
      <div>
        <label for="dashboard-name" class="mb-2 block text-sm font-medium text-gray-700">
          Dashboard Name *
        </label>
        <input
          id="dashboard-name"
          type="text"
          bind:value={name}
          placeholder="Enter dashboard name"
          maxlength="100"
          class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label for="dashboard-description" class="mb-2 block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="dashboard-description"
          bind:value={description}
          placeholder="Optional description"
          rows="3"
          maxlength="500"
          class="w-full resize-none rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        ></textarea>
      </div>

      {#if dashboard?.publicToggleable}
        <div class="flex items-center justify-between rounded-lg border border-gray-200 p-4">
          <div>
            <label for="dashboard-visibility" class="text-sm font-medium text-gray-700">
              Visibility
            </label>
            <p class="text-xs text-gray-500">
              {isPublic
                ? 'Anyone can view this dashboard'
                : 'Only you can view and edit this dashboard'}
            </p>
          </div>
          <button
            id="dashboard-visibility"
            type="button"
            class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
            class:bg-blue-600={isPublic}
            class:bg-gray-200={!isPublic}
            role="switch"
            aria-checked={isPublic}
            aria-label={isPublic ? 'Make dashboard private' : 'Make dashboard public'}
            onclick={() => (isPublic = !isPublic)}
          >
            <span
              class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
              class:translate-x-5={isPublic}
              class:translate-x-0={!isPublic}
            ></span>
          </button>
        </div>
      {/if}

      <div class="mt-2 border-t border-gray-200 pt-6">
        <h3 class="mb-5 text-lg font-semibold text-gray-900">Layout Settings</h3>

        <div class="space-y-5">
          <div>
            <span class="mb-3 block text-sm font-medium text-gray-700">Canvas Width</span>
            <div class="space-y-3">
              <div class="flex gap-6">
                <label class="flex items-center">
                  <input type="radio" bind:group={canvasWidthType} value="screen" class="mr-2" />
                  <span class="text-sm">Full Screen</span>
                </label>
                <label class="flex items-center">
                  <input type="radio" bind:group={canvasWidthType} value="fixed" class="mr-2" />
                  <span class="text-sm">Fixed Width</span>
                </label>
              </div>
              {#if canvasWidthType === 'fixed'}
                <div>
                  <input
                    type="number"
                    bind:value={canvasWidthValue}
                    min="800"
                    max="4000"
                    step="100"
                    class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Width in pixels"
                  />
                  <p class="mt-1.5 text-xs text-gray-500">
                    Recommended: 1600px (min: 800px, max: 4000px)
                  </p>
                </div>
              {/if}
            </div>
          </div>

          <div>
            <span class="mb-3 block text-sm font-medium text-gray-700">Canvas Height</span>
            <div class="space-y-3">
              <div class="flex gap-6">
                <label class="flex items-center">
                  <input type="radio" bind:group={canvasHeightType} value="screen" class="mr-2" />
                  <span class="text-sm">Full Screen</span>
                </label>
                <label class="flex items-center">
                  <input type="radio" bind:group={canvasHeightType} value="fixed" class="mr-2" />
                  <span class="text-sm">Fixed Height</span>
                </label>
              </div>
              {#if canvasHeightType === 'fixed'}
                <div>
                  <input
                    type="number"
                    bind:value={canvasHeightValue}
                    min="600"
                    max="3000"
                    step="100"
                    class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Height in pixels"
                  />
                  <p class="mt-1.5 text-xs text-gray-500">
                    Recommended: 1000px (min: 600px, max: 3000px)
                  </p>
                </div>
              {/if}
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="grid-size" class="mb-2 block text-sm font-medium text-gray-700">
                Grid Size (px)
              </label>
              <input
                id="grid-size"
                type="number"
                bind:value={gridSize}
                min="20"
                max="200"
                step="5"
                class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p class="mt-1.5 text-xs text-gray-500">Size of each grid cell</p>
            </div>

            <div>
              <label for="grid-gap" class="mb-2 block text-sm font-medium text-gray-700">
                Grid Gap (px)
              </label>
              <input
                id="grid-gap"
                type="number"
                bind:value={gap}
                min="0"
                max="50"
                step="5"
                class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p class="mt-1.5 text-xs text-gray-500">Space between blocks</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="grid-columns" class="mb-2 block text-sm font-medium text-gray-700">
                Grid Columns
              </label>
              <input
                id="grid-columns"
                type="number"
                bind:value={columns}
                min="5"
                max="50"
                step="1"
                class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p class="mt-1.5 text-xs text-gray-500">Number of columns in grid</p>
            </div>

            <div>
              <label for="grid-rows" class="mb-2 block text-sm font-medium text-gray-700">
                Grid Rows
              </label>
              <input
                id="grid-rows"
                type="number"
                bind:value={rows}
                min="5"
                max="50"
                step="1"
                class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p class="mt-1.5 text-xs text-gray-500">Number of rows in grid</p>
            </div>
          </div>

          <div class="mt-2 rounded-lg bg-blue-50 p-4">
            <div class="flex">
              <span class="material-symbols-outlined mr-3 text-base text-blue-600">info</span>
              <div class="text-sm text-blue-800">
                <p class="font-medium">Layout Tips:</p>
                <ul class="mt-2 list-disc space-y-1 pl-5">
                  <li>Grid size determines the snap-to precision for blocks</li>
                  <li>More columns allow finer horizontal positioning</li>
                  <li>Changing layout won't affect existing block positions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-6 flex flex-shrink-0 justify-end gap-3 border-t border-gray-200 pt-5">
      <button
        type="button"
        class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        onclick={handleCancel}
      >
        Cancel
      </button>
      <button
        type="button"
        class="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        onclick={handleSave}
        disabled={!name.trim()}
      >
        Save Changes
      </button>
    </div>
  </div>
</Modal>
