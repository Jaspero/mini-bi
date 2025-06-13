<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import type { Dashboard, Block, Position, Size, IDashboardService } from '../../types/index.js';
  import TableBlock from '../blocks/TableBlock.svelte';
  import GraphBlock from '../blocks/GraphBlock.svelte';
  import TextBlock from '../blocks/TextBlock.svelte';

  export let dashboard: Dashboard;
  export let dashboardService: IDashboardService;
  export let editable = true;
  export let editMode = false; // Controls whether block edit controls are shown

  const dispatch = createEventDispatcher<{
    'block-moved': { blockId: string; position: Position };
    'block-resized': { blockId: string; size: Size };
    'dashboard-updated': { dashboard: Dashboard };
    'block-edit': { block: Block };
    'block-delete': { blockId: string };
  }>();

  let canvasElement: HTMLDivElement;
  let draggedBlock: Block | null = null;
  let dragOffset = { x: 0, y: 0 };
  let resizingBlock: Block | null = null;
  let resizeMode = '';
  let isDragging = false;
  let isResizing = false;
  let canvasWidth = 1600;
  let canvasHeight = 1000;

  // Grid settings
  $: gridSize = dashboard.layout.gridSize;
  
  // Update canvas size based on container and content
  onMount(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  });

  function updateCanvasSize() {
    if (canvasElement) {
      const containerWidth = canvasElement.clientWidth - 40; // Account for margins
      const containerHeight = canvasElement.clientHeight - 40;
      
      const minWidth = dashboard.layout.columns * gridSize;
      const minHeight = dashboard.layout.rows * gridSize;
      
      canvasWidth = Math.max(minWidth, containerWidth);
      canvasHeight = Math.max(minHeight, containerHeight);
    }
  }

  onMount(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  });

  function getBlockStyle(block: Block): string {
    const x = block.position.x * gridSize;
    const y = block.position.y * gridSize;
    const width = block.size.width * gridSize - dashboard.layout.gap;
    const height = block.size.height * gridSize - dashboard.layout.gap;

    return `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: ${width}px;
      height: ${height}px;
      z-index: ${draggedBlock === block ? 1000 : 1};
    `;
  }

  function handleBlockMouseDown(event: MouseEvent, block: Block) {
    if (!editable || editMode) return; // Don't allow dragging in edit mode
    
    event.preventDefault();
    event.stopPropagation();

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const canvasRect = canvasElement.getBoundingClientRect();
    
    draggedBlock = block;
    dragOffset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    isDragging = true;
  }

  function handleResizeMouseDown(event: MouseEvent, block: Block, mode: string) {
    if (!editable || editMode) return; // Don't allow resizing in edit mode
    
    event.preventDefault();
    event.stopPropagation();

    resizingBlock = block;
    resizeMode = mode;
    isResizing = true;
  }

  function handleMouseMove(event: MouseEvent) {
    if (isDragging && draggedBlock) {
      const canvasRect = canvasElement.getBoundingClientRect();
      const x = event.clientX - canvasRect.left - dragOffset.x;
      const y = event.clientY - canvasRect.top - dragOffset.y;

      // Snap to grid
      const gridX = Math.round(x / gridSize);
      const gridY = Math.round(y / gridSize);

      // Ensure block stays within bounds
      const maxX = dashboard.layout.columns - draggedBlock.size.width;
      const maxY = dashboard.layout.rows - draggedBlock.size.height;

      const newPosition: Position = {
        x: Math.max(0, Math.min(maxX, gridX)),
        y: Math.max(0, Math.min(maxY, gridY))
      };

      updateBlockPosition(draggedBlock.id, newPosition);
    }

    if (isResizing && resizingBlock) {
      const canvasRect = canvasElement.getBoundingClientRect();
      const x = event.clientX - canvasRect.left;
      const y = event.clientY - canvasRect.top;

      const blockRect = {
        left: resizingBlock.position.x * gridSize,
        top: resizingBlock.position.y * gridSize,
        right: (resizingBlock.position.x + resizingBlock.size.width) * gridSize,
        bottom: (resizingBlock.position.y + resizingBlock.size.height) * gridSize
      };

      let newSize = { ...resizingBlock.size };

      switch (resizeMode) {
        case 'se': // southeast
          newSize.width = Math.max(2, Math.round((x - blockRect.left) / gridSize));
          newSize.height = Math.max(2, Math.round((y - blockRect.top) / gridSize));
          break;
        case 'sw': // southwest
          newSize.width = Math.max(2, Math.round((blockRect.right - x) / gridSize));
          newSize.height = Math.max(2, Math.round((y - blockRect.top) / gridSize));
          break;
        case 'ne': // northeast
          newSize.width = Math.max(2, Math.round((x - blockRect.left) / gridSize));
          newSize.height = Math.max(2, Math.round((blockRect.bottom - y) / gridSize));
          break;
        case 'nw': // northwest
          newSize.width = Math.max(2, Math.round((blockRect.right - x) / gridSize));
          newSize.height = Math.max(2, Math.round((blockRect.bottom - y) / gridSize));
          break;
        case 'e': // east
          newSize.width = Math.max(2, Math.round((x - blockRect.left) / gridSize));
          break;
        case 'w': // west
          newSize.width = Math.max(2, Math.round((blockRect.right - x) / gridSize));
          break;
        case 's': // south
          newSize.height = Math.max(2, Math.round((y - blockRect.top) / gridSize));
          break;
        case 'n': // north
          newSize.height = Math.max(2, Math.round((blockRect.bottom - y) / gridSize));
          break;
      }

      // Ensure block doesn't exceed canvas bounds
      newSize.width = Math.min(newSize.width, dashboard.layout.columns - resizingBlock.position.x);
      newSize.height = Math.min(newSize.height, dashboard.layout.rows - resizingBlock.position.y);

      updateBlockSize(resizingBlock.id, newSize);
    }
  }

  function handleMouseUp() {
    if (isDragging && draggedBlock) {
      dispatch('block-moved', { 
        blockId: draggedBlock.id, 
        position: draggedBlock.position 
      });
    }

    if (isResizing && resizingBlock) {
      dispatch('block-resized', { 
        blockId: resizingBlock.id, 
        size: resizingBlock.size 
      });
    }

    draggedBlock = null;
    resizingBlock = null;
    isDragging = false;
    isResizing = false;
    resizeMode = '';
  }

  function updateBlockPosition(blockId: string, position: Position) {
    dashboard.blocks = dashboard.blocks.map(block => 
      block.id === blockId ? { ...block, position } : block
    );
  }

  function updateBlockSize(blockId: string, size: Size) {
    dashboard.blocks = dashboard.blocks.map(block => 
      block.id === blockId ? { ...block, size } : block
    );
  }

  function handleBlockUpdate(block: Block) {
    dashboard.blocks = dashboard.blocks.map(b => 
      b.id === block.id ? block : b
    );
    dispatch('dashboard-updated', { dashboard });
  }

  function handleBlockEdit(block: Block) {
    dispatch('block-edit', { block });
  }

  function handleBlockDelete(blockId: string) {
    dispatch('block-delete', { blockId });
  }
</script>

<div class="dashboard-canvas" bind:this={canvasElement}>
  <div 
    class="canvas-content"
    style="width: {canvasWidth}px; height: {canvasHeight}px;"
  >
    <!-- Grid background -->
    <div class="grid-background" style="
      background-size: {gridSize}px {gridSize}px;
      width: {canvasWidth}px; 
      height: {canvasHeight}px;
    "></div>

    <!-- Blocks -->
    {#each dashboard.blocks as block (block.id)}
      <div 
        class="block-container"
        class:dragging={draggedBlock === block}
        class:resizing={resizingBlock === block}
        class:edit-mode={editMode}
        style={getBlockStyle(block)}
        on:mousedown={(e) => handleBlockMouseDown(e, block)}
        role="button"
        tabindex="0"
      >
        <!-- Block content -->
        <div class="block-content">
          {#if block.type === 'table'}
            <TableBlock 
              {block} 
              {dashboardService} 
              showControls={editMode}
              onBlockUpdate={(updatedBlock) => handleBlockUpdate(updatedBlock)}
              onBlockEdit={(editBlock) => handleBlockEdit(editBlock)}
              onBlockDelete={(blockId) => handleBlockDelete(blockId)}
            />
          {:else if block.type === 'graph'}
            <GraphBlock 
              {block} 
              {dashboardService} 
              showControls={editMode}
              onBlockUpdate={(updatedBlock) => handleBlockUpdate(updatedBlock)}
              onBlockEdit={(editBlock) => handleBlockEdit(editBlock)}
              onBlockDelete={(blockId) => handleBlockDelete(blockId)}
            />
          {:else if block.type === 'text'}
            <TextBlock 
              {block} 
              dashboardVariables={dashboard.variables}
              showControls={editMode}
              onBlockUpdate={(updatedBlock) => handleBlockUpdate(updatedBlock)}
              onBlockEdit={(editBlock) => handleBlockEdit(editBlock)}
              onBlockDelete={(blockId) => handleBlockDelete(blockId)}
            />
          {/if}
        </div>

        <!-- Resize handles -->
        {#if editable && !editMode}
          <div class="resize-handles">
            <!-- Corner handles -->
            <div 
              class="resize-handle nw" 
              on:mousedown={(e) => handleResizeMouseDown(e, block, 'nw')}
              role="button"
              tabindex="0"
              aria-label="Resize northwest"
            ></div>
            <div 
              class="resize-handle ne" 
              on:mousedown={(e) => handleResizeMouseDown(e, block, 'ne')}
              role="button"
              tabindex="0"
              aria-label="Resize northeast"
            ></div>
            <div 
              class="resize-handle sw" 
              on:mousedown={(e) => handleResizeMouseDown(e, block, 'sw')}
              role="button"
              tabindex="0"
              aria-label="Resize southwest"
            ></div>
            <div 
              class="resize-handle se" 
              on:mousedown={(e) => handleResizeMouseDown(e, block, 'se')}
              role="button"
              tabindex="0"
              aria-label="Resize southeast"
            ></div>
            
            <!-- Edge handles -->
            <div 
              class="resize-handle n" 
              on:mousedown={(e) => handleResizeMouseDown(e, block, 'n')}
              role="button"
              tabindex="0"
              aria-label="Resize north"
            ></div>
            <div 
              class="resize-handle s" 
              on:mousedown={(e) => handleResizeMouseDown(e, block, 's')}
              role="button"
              tabindex="0"
              aria-label="Resize south"
            ></div>
            <div 
              class="resize-handle e" 
              on:mousedown={(e) => handleResizeMouseDown(e, block, 'e')}
              role="button"
              tabindex="0"
              aria-label="Resize east"
            ></div>
            <div 
              class="resize-handle w" 
              on:mousedown={(e) => handleResizeMouseDown(e, block, 'w')}
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

<style>
  .dashboard-canvas {
    width: 100%;
    height: 100%;
    overflow: auto;
    background: #f8fafc;
    position: relative;
  }

  .canvas-content {
    position: relative;
    margin: 20px;
    min-width: 100%;
    min-height: 100%;
  }

  .grid-background {
    position: absolute;
    top: 0;
    left: 0;
    background-image: 
      linear-gradient(to right, #e5e7eb 1px, transparent 1px),
      linear-gradient(to bottom, #e5e7eb 1px, transparent 1px);
    opacity: 0.5;
    pointer-events: none;
  }

  .block-container {
    user-select: none;
    cursor: move;
    transition: box-shadow 0.2s ease;
  }

  .block-container.edit-mode {
    cursor: default;
  }

  .block-container:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .block-container.dragging {
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
    transform: rotate(2deg);
  }

  .block-container.resizing {
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }

  .block-content {
    width: 100%;
    height: 100%;
    pointer-events: auto;
  }

  .resize-handles {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
  }

  .resize-handle {
    position: absolute;
    background: #3b82f6;
    border: 1px solid white;
    pointer-events: auto;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .block-container:hover .resize-handle {
    opacity: 1;
  }

  /* Corner handles */
  .resize-handle.nw {
    top: -4px;
    left: -4px;
    width: 8px;
    height: 8px;
    cursor: nw-resize;
  }

  .resize-handle.ne {
    top: -4px;
    right: -4px;
    width: 8px;
    height: 8px;
    cursor: ne-resize;
  }

  .resize-handle.sw {
    bottom: -4px;
    left: -4px;
    width: 8px;
    height: 8px;
    cursor: sw-resize;
  }

  .resize-handle.se {
    bottom: -4px;
    right: -4px;
    width: 8px;
    height: 8px;
    cursor: se-resize;
  }

  /* Edge handles */
  .resize-handle.n {
    top: -4px;
    left: 50%;
    transform: translateX(-50%);
    width: 8px;
    height: 8px;
    cursor: n-resize;
  }

  .resize-handle.s {
    bottom: -4px;
    left: 50%;
    transform: translateX(-50%);
    width: 8px;
    height: 8px;
    cursor: s-resize;
  }

  .resize-handle.e {
    right: -4px;
    top: 50%;
    transform: translateY(-50%);
    width: 8px;
    height: 8px;
    cursor: e-resize;
  }

  .resize-handle.w {
    left: -4px;
    top: 50%;
    transform: translateY(-50%);
    width: 8px;
    height: 8px;
    cursor: w-resize;
  }

  /* Disable pointer events on block content during drag/resize */
  .block-container.dragging .block-content,
  .block-container.resizing .block-content {
    pointer-events: none;
  }
</style>
