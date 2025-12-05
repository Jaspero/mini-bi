<script lang="ts">
  import { onMount } from 'svelte';
  import type { Dashboard, Block, Position, Size, IDashboardService } from '../../types/index';
  import TableBlock from '../blocks/TableBlock.svelte';
  import GraphBlock from '../blocks/GraphBlock.svelte';
  import TextBlock from '../blocks/TextBlock.svelte';

  let {
    dashboard = $bindable(),
    dashboardService,
    editable = true,
    editMode = false,
    readOnly = false,
    filterParams = {},
    onBlockMoved = () => {},
    onBlockResized = () => {},
    onDashboardUpdated = () => {},
    onBlockEdit = () => {},
    onBlockDeleteRequest = () => {}
  }: {
    dashboard: Dashboard;
    dashboardService: IDashboardService;
    editable?: boolean;
    editMode?: boolean;
    readOnly?: boolean;
    filterParams?: Record<string, any>;
    onBlockMoved?: (blockId: string, position: Position) => void;
    onBlockResized?: (blockId: string, size: Size) => void;
    onDashboardUpdated?: (dashboard: Dashboard) => void;
    onBlockEdit?: (block: Block) => void;
    onBlockDelete?: (blockId: string) => void;
    onBlockDeleteRequest?: (block: Block) => void;
  } = $props();

  let canvasElement = $state() as HTMLDivElement;
  let gridElement = $state() as HTMLDivElement;
  let draggedBlock: Block | null = $state(null);
  let resizingBlock: Block | null = $state(null);
  let resizeMode = '';
  let isDragging = false;
  let isResizing = false;
  let dragStartPos = { x: 0, y: 0 };
  let dragStartBlockPos = { x: 0, y: 0 };

  let columns = $derived(dashboard.layout.columns);
  let rows = $derived(dashboard.layout.rows);
  let gap = $derived(dashboard.layout.gap);
  let minRowHeight = $derived(dashboard.layout.gridSize);
  let isAutoWidth = $derived(dashboard.layout.canvasWidth?.type === 'auto');
  let isAutoHeight = $derived(dashboard.layout.canvasHeight?.type === 'auto');
  let fixedWidth = $derived(dashboard.layout.canvasWidth?.value || 1600);
  let fixedHeight = $derived(dashboard.layout.canvasHeight?.value || 1000);

  function getGridStyle(): string {
    const widthStyle = isAutoWidth ? '100%' : `${fixedWidth}px`;
    const heightStyle = isAutoHeight ? 'auto' : `${fixedHeight}px`;
    const minHeightStyle = isAutoHeight ? `${rows * minRowHeight}px` : 'auto';

    return `
      display: grid;
      grid-template-columns: repeat(${columns}, 1fr);
      grid-template-rows: repeat(${rows}, minmax(${minRowHeight}px, 1fr));
      gap: ${gap}px;
      width: ${widthStyle};
      height: ${heightStyle};
      min-height: ${minHeightStyle};
    `;
  }

  function getBlockGridStyle(block: Block): string {
    const colStart = block.position.x + 1;
    const colEnd = block.position.x + block.size.width + 1;
    const rowStart = block.position.y + 1;
    const rowEnd = block.position.y + block.size.height + 1;

    return `
      grid-column: ${colStart} / ${colEnd};
      grid-row: ${rowStart} / ${rowEnd};
      z-index: ${draggedBlock === block ? 1000 : 1};
    `;
  }

  function getCellFromPoint(clientX: number, clientY: number): { col: number; row: number } | null {
    if (!gridElement) return null;

    const rect = gridElement.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const cellWidth = rect.width / columns;
    const cellHeight = rect.height / rows;

    const col = Math.floor(x / cellWidth);
    const row = Math.floor(y / cellHeight);

    return {
      col: Math.max(0, Math.min(columns - 1, col)),
      row: Math.max(0, Math.min(rows - 1, row))
    };
  }

  onMount(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  });

  function handleBlockTouchStart(event: TouchEvent, block: Block) {
    if (!editMode) return;

    const target = event.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    const isInteractive =
      tagName === 'button' ||
      tagName === 'input' ||
      tagName === 'select' ||
      tagName === 'textarea' ||
      tagName === 'a' ||
      target.closest('button, input, select, textarea, a') !== null ||
      target.getAttribute('role') === 'button' ||
      target.classList.contains('material-symbols-outlined');

    if (isInteractive) return;

    event.preventDefault();
    event.stopPropagation();

    const touch = event.touches[0];
    draggedBlock = block;
    dragStartPos = { x: touch.clientX, y: touch.clientY };
    dragStartBlockPos = { x: block.position.x, y: block.position.y };
    isDragging = true;

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
  }

  function handleResizeTouchStart(event: TouchEvent, block: Block, mode: string) {
    if (!editMode) return;

    event.preventDefault();
    event.stopPropagation();

    const touch = event.touches[0];
    resizingBlock = block;
    resizeMode = mode;
    dragStartPos = { x: touch.clientX, y: touch.clientY };
    isResizing = true;

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
  }

  function handleTouchMove(event: TouchEvent) {
    event.preventDefault();
    const touch = event.touches[0];

    if (isDragging && draggedBlock) {
      const cell = getCellFromPoint(touch.clientX, touch.clientY);
      if (cell) {
        const maxX = columns - draggedBlock.size.width;
        const maxY = rows - draggedBlock.size.height;
        const newPosition: Position = {
          x: Math.max(0, Math.min(maxX, cell.col)),
          y: Math.max(0, Math.min(maxY, cell.row))
        };
        updateBlockPosition(draggedBlock.id, newPosition);
      }
    }

    if (isResizing && resizingBlock) {
      handleResize(touch.clientX, touch.clientY);
    }
  }

  function handleTouchEnd(event: TouchEvent) {
    event.preventDefault();

    if (isDragging && draggedBlock) {
      onBlockMoved(draggedBlock.id, draggedBlock.position);
    }

    if (isResizing && resizingBlock) {
      onBlockResized(resizingBlock.id, resizingBlock.size);
    }

    isDragging = false;
    isResizing = false;
    draggedBlock = null;
    resizingBlock = null;
    resizeMode = '';

    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
  }

  function handleBlockMouseDown(event: MouseEvent, block: Block) {
    if (!editMode) return;

    const target = event.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    const isInteractive =
      tagName === 'button' ||
      tagName === 'input' ||
      tagName === 'select' ||
      tagName === 'textarea' ||
      tagName === 'a' ||
      target.closest('button, input, select, textarea, a') !== null ||
      target.getAttribute('role') === 'button' ||
      target.classList.contains('material-symbols-outlined');

    if (isInteractive) return;

    event.preventDefault();
    event.stopPropagation();

    draggedBlock = block;
    dragStartPos = { x: event.clientX, y: event.clientY };
    dragStartBlockPos = { x: block.position.x, y: block.position.y };
    isDragging = true;
  }

  function handleResizeMouseDown(event: MouseEvent, block: Block, mode: string) {
    if (!editMode) return;

    event.preventDefault();
    event.stopPropagation();

    resizingBlock = block;
    resizeMode = mode;
    dragStartPos = { x: event.clientX, y: event.clientY };
    isResizing = true;
  }

  function handleMouseMove(event: MouseEvent) {
    if (isDragging && draggedBlock) {
      const cell = getCellFromPoint(event.clientX, event.clientY);
      if (cell) {
        const maxX = columns - draggedBlock.size.width;
        const maxY = rows - draggedBlock.size.height;
        const newPosition: Position = {
          x: Math.max(0, Math.min(maxX, cell.col)),
          y: Math.max(0, Math.min(maxY, cell.row))
        };
        updateBlockPosition(draggedBlock.id, newPosition);
      }
    }

    if (isResizing && resizingBlock) {
      handleResize(event.clientX, event.clientY);
    }
  }

  function handleResize(clientX: number, clientY: number) {
    if (!resizingBlock || !gridElement) return;

    const cell = getCellFromPoint(clientX, clientY);
    if (!cell) return;

    let newSize = { ...resizingBlock.size };
    let newPosition = { ...resizingBlock.position };

    switch (resizeMode) {
      case 'se':
        newSize.width = Math.max(1, cell.col - resizingBlock.position.x + 1);
        newSize.height = Math.max(1, cell.row - resizingBlock.position.y + 1);
        break;
      case 'sw':
        const newWidthSW = resizingBlock.position.x + resizingBlock.size.width - cell.col;
        if (newWidthSW >= 1) {
          newPosition.x = cell.col;
          newSize.width = newWidthSW;
        }
        newSize.height = Math.max(1, cell.row - resizingBlock.position.y + 1);
        break;
      case 'ne':
        newSize.width = Math.max(1, cell.col - resizingBlock.position.x + 1);
        const newHeightNE = resizingBlock.position.y + resizingBlock.size.height - cell.row;
        if (newHeightNE >= 1) {
          newPosition.y = cell.row;
          newSize.height = newHeightNE;
        }
        break;
      case 'nw':
        const newWidthNW = resizingBlock.position.x + resizingBlock.size.width - cell.col;
        const newHeightNW = resizingBlock.position.y + resizingBlock.size.height - cell.row;
        if (newWidthNW >= 1) {
          newPosition.x = cell.col;
          newSize.width = newWidthNW;
        }
        if (newHeightNW >= 1) {
          newPosition.y = cell.row;
          newSize.height = newHeightNW;
        }
        break;
      case 'e':
        newSize.width = Math.max(1, cell.col - resizingBlock.position.x + 1);
        break;
      case 'w':
        const newWidthW = resizingBlock.position.x + resizingBlock.size.width - cell.col;
        if (newWidthW >= 1) {
          newPosition.x = cell.col;
          newSize.width = newWidthW;
        }
        break;
      case 'n':
        const newHeightN = resizingBlock.position.y + resizingBlock.size.height - cell.row;
        if (newHeightN >= 1) {
          newPosition.y = cell.row;
          newSize.height = newHeightN;
        }
        break;
      case 's':
        newSize.height = Math.max(1, cell.row - resizingBlock.position.y + 1);
        break;
    }

    newSize.width = Math.min(newSize.width, columns - newPosition.x);
    newSize.height = Math.min(newSize.height, rows - newPosition.y);
    newPosition.x = Math.max(0, newPosition.x);
    newPosition.y = Math.max(0, newPosition.y);

    if (newPosition.x !== resizingBlock.position.x || newPosition.y !== resizingBlock.position.y) {
      updateBlockPosition(resizingBlock.id, newPosition);
    }
    updateBlockSize(resizingBlock.id, newSize);
  }

  function handleMouseUp() {
    if (isDragging && draggedBlock) {
      onBlockMoved(draggedBlock.id, draggedBlock.position);
    }

    if (isResizing && resizingBlock) {
      onBlockResized(resizingBlock.id, resizingBlock.size);
    }

    draggedBlock = null;
    resizingBlock = null;
    isDragging = false;
    isResizing = false;
    resizeMode = '';
  }

  function updateBlockPosition(blockId: string, position: Position) {
    const block = dashboard.blocks.find((b) => b.id === blockId);
    if (block) {
      block.position = position;
      onBlockMoved(blockId, position);
      onDashboardUpdated(dashboard);
    }
  }

  function updateBlockSize(blockId: string, size: Size) {
    const block = dashboard.blocks.find((b) => b.id === blockId);
    if (block) {
      block.size = size;
      onBlockResized(blockId, size);
      onDashboardUpdated(dashboard);
    }
  }

  function onBlockUpdate(block: Block) {
    const index = dashboard.blocks.findIndex((b) => b.id === block.id);
    if (index !== -1) {
      dashboard.blocks[index] = block;
      onDashboardUpdated(dashboard);
    }
  }

  function getGridBackgroundStyle(): string {
    return `
      background-image: 
        linear-gradient(to right, var(--minibi-color-grid-line) 1px, transparent 1px),
        linear-gradient(to bottom, var(--minibi-color-grid-line) 1px, transparent 1px);
      background-size: calc(100% / ${columns}) calc(100% / ${rows});
    `;
  }
</script>

<div class="dashboard-canvas h-full w-full overflow-auto" bind:this={canvasElement}>
  <div class="p-2 sm:p-5" class:w-full={isAutoWidth} class:h-full={isAutoHeight}>
    <div bind:this={gridElement} class="dashboard-grid relative" style={getGridStyle()}>
      {#if editMode}
        <div
          class="pointer-events-none absolute inset-0 opacity-50"
          style={getGridBackgroundStyle()}
        ></div>
      {/if}

      {#each dashboard.blocks as block (block.id)}
        <div
          class="dashboard-block group relative {editMode
            ? 'cursor-move'
            : 'cursor-default'} touch-manipulation transition-shadow duration-200 ease-in-out select-none hover:shadow-xl {draggedBlock ===
          block
            ? '[transform:rotate(2deg)] shadow-2xl'
            : ''} {resizingBlock === block ? 'shadow-lg shadow-blue-400' : ''}"
          style={getBlockGridStyle(block)}
          onmousedown={(e) => handleBlockMouseDown(e, block)}
          ontouchstart={(e) => handleBlockTouchStart(e, block)}
          role="button"
          tabindex="0"
        >
          <div
            class="pointer-events-auto h-full w-full {draggedBlock === block ||
            resizingBlock === block
              ? 'pointer-events-none'
              : ''}"
          >
            {#if block.type === 'table'}
              <TableBlock
                {block}
                {dashboardService}
                {filterParams}
                showControls={editMode}
                {readOnly}
                {onBlockUpdate}
                {onBlockEdit}
                {onBlockDeleteRequest}
              />
            {:else if block.type === 'graph'}
              <GraphBlock
                {block}
                {dashboardService}
                {filterParams}
                showControls={editMode}
                {readOnly}
                {onBlockUpdate}
                {onBlockEdit}
                {onBlockDeleteRequest}
              />
            {:else if block.type === 'text'}
              <TextBlock
                {block}
                dashboardVariables={dashboard.variables}
                {dashboardService}
                {filterParams}
                showControls={editMode}
                {readOnly}
                {onBlockUpdate}
                {onBlockEdit}
                {onBlockDeleteRequest}
              />
            {/if}
          </div>

          {#if editMode}
            <div class="pointer-events-none absolute inset-0">
              <div
                class="pointer-events-auto absolute -top-1 -left-1 h-3 w-3 cursor-nw-resize touch-manipulation border border-white bg-blue-500 opacity-0 transition-opacity duration-200 ease-in-out group-hover:opacity-100 sm:h-2 sm:w-2"
                onmousedown={(e) => handleResizeMouseDown(e, block, 'nw')}
                ontouchstart={(e) => handleResizeTouchStart(e, block, 'nw')}
                role="button"
                tabindex="0"
                aria-label="Resize northwest"
              ></div>
              <div
                class="pointer-events-auto absolute -top-1 -right-1 h-3 w-3 cursor-ne-resize touch-manipulation border border-white bg-blue-500 opacity-0 transition-opacity duration-200 ease-in-out group-hover:opacity-100 sm:h-2 sm:w-2"
                onmousedown={(e) => handleResizeMouseDown(e, block, 'ne')}
                ontouchstart={(e) => handleResizeTouchStart(e, block, 'ne')}
                role="button"
                tabindex="0"
                aria-label="Resize northeast"
              ></div>
              <div
                class="pointer-events-auto absolute -bottom-1 -left-1 h-3 w-3 cursor-sw-resize touch-manipulation border border-white bg-blue-500 opacity-0 transition-opacity duration-200 ease-in-out group-hover:opacity-100 sm:h-2 sm:w-2"
                onmousedown={(e) => handleResizeMouseDown(e, block, 'sw')}
                ontouchstart={(e) => handleResizeTouchStart(e, block, 'sw')}
                role="button"
                tabindex="0"
                aria-label="Resize southwest"
              ></div>
              <div
                class="pointer-events-auto absolute -right-1 -bottom-1 h-3 w-3 cursor-se-resize touch-manipulation border border-white bg-blue-500 opacity-0 transition-opacity duration-200 ease-in-out group-hover:opacity-100 sm:h-2 sm:w-2"
                onmousedown={(e) => handleResizeMouseDown(e, block, 'se')}
                ontouchstart={(e) => handleResizeTouchStart(e, block, 'se')}
                role="button"
                tabindex="0"
                aria-label="Resize southeast"
              ></div>

              <div
                class="pointer-events-auto absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 cursor-n-resize touch-manipulation border border-white bg-blue-500 opacity-0 transition-opacity duration-200 ease-in-out group-hover:opacity-100 sm:h-2 sm:w-2"
                onmousedown={(e) => handleResizeMouseDown(e, block, 'n')}
                ontouchstart={(e) => handleResizeTouchStart(e, block, 'n')}
                role="button"
                tabindex="0"
                aria-label="Resize north"
              ></div>
              <div
                class="pointer-events-auto absolute -bottom-1 left-1/2 h-3 w-3 -translate-x-1/2 cursor-s-resize touch-manipulation border border-white bg-blue-500 opacity-0 transition-opacity duration-200 ease-in-out group-hover:opacity-100 sm:h-2 sm:w-2"
                onmousedown={(e) => handleResizeMouseDown(e, block, 's')}
                ontouchstart={(e) => handleResizeTouchStart(e, block, 's')}
                role="button"
                tabindex="0"
                aria-label="Resize south"
              ></div>
              <div
                class="pointer-events-auto absolute top-1/2 -right-1 h-3 w-3 -translate-y-1/2 cursor-e-resize touch-manipulation border border-white bg-blue-500 opacity-0 transition-opacity duration-200 ease-in-out group-hover:opacity-100 sm:h-2 sm:w-2"
                onmousedown={(e) => handleResizeMouseDown(e, block, 'e')}
                ontouchstart={(e) => handleResizeTouchStart(e, block, 'e')}
                role="button"
                tabindex="0"
                aria-label="Resize east"
              ></div>
              <div
                class="pointer-events-auto absolute top-1/2 -left-1 h-3 w-3 -translate-y-1/2 cursor-w-resize touch-manipulation border border-white bg-blue-500 opacity-0 transition-opacity duration-200 ease-in-out group-hover:opacity-100 sm:h-2 sm:w-2"
                onmousedown={(e) => handleResizeMouseDown(e, block, 'w')}
                ontouchstart={(e) => handleResizeTouchStart(e, block, 'w')}
                role="button"
                tabindex="0"
                aria-label="Resize west"
              ></div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .dashboard-canvas {
    background: var(--minibi-color-canvas-bg);
  }
</style>
