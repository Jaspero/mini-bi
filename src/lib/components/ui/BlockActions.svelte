<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import type { Block, BlockData } from '../../types/index';

  interface Props {
    block: Block;
    data?: BlockData | null;
    loading?: boolean;
    showControls?: boolean;
    readOnly?: boolean;
    onEdit?: (block: Block) => void;
    onRefresh?: () => void;
    onDelete?: (block: Block) => void;
    onExportImage?: () => void;
  }

  let {
    block,
    data = null,
    loading = false,
    showControls = false,
    readOnly = false,
    onEdit = () => {},
    onRefresh = () => {},
    onDelete = () => {},
    onExportImage = () => {}
  }: Props = $props();

  let isOpen = $state(false);
  let dropdownRef = $state() as HTMLDivElement;
  let buttonRef = $state() as HTMLButtonElement;
  let menuRef = $state() as HTMLDivElement;
  let menuStyle = $state('');

  async function toggleDropdown(event: MouseEvent) {
    event.stopPropagation();
    isOpen = !isOpen;
    if (isOpen) {
      await tick();
      positionMenu();
    }
  }

  function positionMenu() {
    if (!buttonRef || !menuRef) return;

    const buttonRect = buttonRef.getBoundingClientRect();
    const menuRect = menuRef.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    let top = buttonRect.bottom + 4;
    let left = buttonRect.right - menuRect.width;

    if (top + menuRect.height > viewportHeight - 10) {
      top = buttonRect.top - menuRect.height - 4;
    }

    if (left < 10) {
      left = 10;
    }
    if (left + menuRect.width > viewportWidth - 10) {
      left = viewportWidth - menuRect.width - 10;
    }

    menuStyle = `top: ${top}px; left: ${left}px;`;
  }

  function closeDropdown() {
    isOpen = false;
  }

  function handleEdit(event: MouseEvent) {
    event.stopPropagation();
    onEdit(block);
    closeDropdown();
  }

  function handleRefresh(event: MouseEvent) {
    event.stopPropagation();
    onRefresh();
    closeDropdown();
  }

  function handleDelete(event: MouseEvent) {
    event.stopPropagation();
    onDelete(block);
    closeDropdown();
  }

  function handleExport(event: MouseEvent, format: 'json' | 'csv') {
    event.stopPropagation();

    if (!data || !data.data.length) {
      alert('No data to export');
      return;
    }

    const filename = `${block.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}`;

    if (format === 'json') {
      exportAsJSON(data.data, filename);
    } else {
      exportAsCSV(data.data, filename);
    }

    closeDropdown();
  }

  function handleExportImage(event: MouseEvent) {
    event.stopPropagation();
    onExportImage();
    closeDropdown();
  }

  function exportAsJSON(data: any[], filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadFile(blob, `${filename}.json`);
  }

  function exportAsCSV(data: any[], filename: string) {
    if (!data.length) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            const stringValue = value === null || value === undefined ? '' : String(value);
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            return /[,"\n]/.test(stringValue)
              ? `"${stringValue.replace(/"/g, '""')}"`
              : stringValue;
          })
          .join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, `${filename}.csv`);
  }

  function downloadFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as Node;
    if (dropdownRef && !dropdownRef.contains(target) && menuRef && !menuRef.contains(target)) {
      closeDropdown();
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    window.addEventListener('scroll', closeDropdown, true);
    window.addEventListener('resize', closeDropdown);
  });

  onDestroy(() => {
    document.removeEventListener('click', handleClickOutside);
    window.removeEventListener('scroll', closeDropdown, true);
    window.removeEventListener('resize', closeDropdown);
  });
</script>

{#if showControls}
  <div class="relative" bind:this={dropdownRef}>
    <button
      class="flex cursor-pointer touch-manipulation rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-900"
      onclick={toggleDropdown}
      bind:this={buttonRef}
      aria-label="Block actions"
      aria-expanded={isOpen}
    >
      <span class="material-symbols-outlined text-sm sm:text-base">more_vert</span>
    </button>

    {#if isOpen}
      <div
        class="fixed z-[9999] w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        style={menuStyle}
        bind:this={menuRef}
      >
        {#if !readOnly}
          <button
            class="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            onclick={handleEdit}
          >
            <span class="material-symbols-outlined mr-3 text-base">edit</span>
            Edit
          </button>
        {/if}

        <button
          class="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          onclick={handleRefresh}
          disabled={loading}
        >
          <span class="material-symbols-outlined mr-3 text-base">refresh</span>
          Refresh
        </button>

        {#if data && data.data.length > 0}
          <hr class="my-1 border-gray-200" />

          <div class="px-4 py-2">
            <div class="text-xs font-medium tracking-wider text-gray-500 uppercase">Export</div>
          </div>

          {#if block.type === 'graph'}
            <button
              class="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              onclick={handleExportImage}
            >
              <span class="material-symbols-outlined mr-3 text-base">image</span>
              Export as Image
            </button>
          {/if}

          <button
            class="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            onclick={(e) => handleExport(e, 'json')}
          >
            <span class="material-symbols-outlined mr-3 text-base">download</span>
            Export as JSON
          </button>

          <button
            class="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            onclick={(e) => handleExport(e, 'csv')}
          >
            <span class="material-symbols-outlined mr-3 text-base">table_view</span>
            Export as CSV
          </button>
        {/if}

        <hr class="my-1 border-gray-200" />

        {#if !readOnly}
          <button
            class="flex w-full items-center px-4 py-2 text-left text-sm text-red-600"
            onclick={handleDelete}
          >
            <span class="material-symbols-outlined mr-3 text-base">delete</span>
            Delete
          </button>
        {/if}
      </div>
    {/if}
  </div>
{/if}
