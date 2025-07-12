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
    'block-delete-request': { block: Block };
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
  
  // Calculate canvas dimensions based on dashboard configuration
  $: {
    if (dashboard.layout.canvasWidth) {
      if (dashboard.layout.canvasWidth.type === 'screen') {
        canvasWidth = (typeof window !== 'undefined' ? window.innerWidth : 1600) - (window.innerWidth < 640 ? 20 : 40); // Smaller margins on mobile
      } else {
        canvasWidth = dashboard.layout.canvasWidth.value || 1600;
      }
    } else {
      canvasWidth = 1600; // Default fallback
    }

    if (dashboard.layout.canvasHeight) {
      if (dashboard.layout.canvasHeight.type === 'screen') {
        canvasHeight = (typeof window !== 'undefined' ? window.innerHeight : 1000) - (window.innerWidth < 640 ? 100 : 120); // Smaller header on mobile
      } else {
        canvasHeight = dashboard.layout.canvasHeight.value || 1000;
      }
    } else {
      canvasHeight = 1000; // Default fallback
    }
  }
  
  // Update canvas size based on container and content
  onMount(() => {
    updateCanvasSize();
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  });

  function handleWindowResize() {
    // Update dimensions if using screen-based sizing
    if (dashboard.layout.canvasWidth?.type === 'screen' || dashboard.layout.canvasHeight?.type === 'screen') {
      updateCanvasSize();
    }
  }

  function updateCanvasSize() {
    if (canvasElement) {
      const containerWidth = canvasElement.parentElement?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1600);
      const containerHeight = canvasElement.parentElement?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 1000);
      
      // Update canvas dimensions based on configuration
      if (dashboard.layout.canvasWidth) {
        if (dashboard.layout.canvasWidth.type === 'screen') {
          canvasWidth = containerWidth - (typeof window !== 'undefined' && window.innerWidth < 640 ? 20 : 40); // Smaller margins on mobile
        } else {
          canvasWidth = dashboard.layout.canvasWidth.value || 1600;
        }
      }

      if (dashboard.layout.canvasHeight) {
        if (dashboard.layout.canvasHeight.type === 'screen') {
          canvasHeight = containerHeight - (typeof window !== 'undefined' && window.innerWidth < 640 ? 100 : 120); // Smaller header on mobile
        } else {
          canvasHeight = dashboard.layout.canvasHeight.value || 1000;
        }
      }
      
      // Ensure minimum size based on grid layout
      const minWidth = dashboard.layout.columns * gridSize;
      const minHeight = dashboard.layout.rows * gridSize;
      
      canvasWidth = Math.max(minWidth, canvasWidth);
      canvasHeight = Math.max(minHeight, canvasHeight);
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

  // Touch event handlers for mobile support
  function handleBlockTouchStart(event: TouchEvent, block: Block) {
    if (!editable || editMode) return;

    event.preventDefault();
    event.stopPropagation();

    const touch = event.touches[0];
    const canvasRect = canvasElement.getBoundingClientRect();
    
    draggedBlock = block;
    dragOffset = {
      x: touch.clientX - canvasRect.left - (block.position.x * gridSize),
      y: touch.clientY - canvasRect.top - (block.position.y * gridSize)
    };

    isDragging = true;
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
  }

  function handleResizeTouchStart(event: TouchEvent, block: Block, mode: string) {
    if (!editable || editMode) return;

    event.preventDefault();
    event.stopPropagation();

    resizingBlock = block;
    resizeMode = mode;
    isResizing = true;
    
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
  }

  function handleTouchMove(event: TouchEvent) {
    event.preventDefault();
    
    const touch = event.touches[0];
    
    if (isDragging && draggedBlock) {
      const canvasRect = canvasElement.getBoundingClientRect();
      const x = touch.clientX - canvasRect.left - dragOffset.x;
      const y = touch.clientY - canvasRect.top - dragOffset.y;

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
      const x = touch.clientX - canvasRect.left;
      const y = touch.clientY - canvasRect.top;

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
        case 'n': // north
          newSize.height = Math.max(2, Math.round((blockRect.bottom - y) / gridSize));
          break;
        case 's': // south
          newSize.height = Math.max(2, Math.round((y - blockRect.top) / gridSize));
          break;
      }

      // Ensure the block doesn't exceed canvas bounds
      const maxWidth = dashboard.layout.columns - resizingBlock.position.x;
      const maxHeight = dashboard.layout.rows - resizingBlock.position.y;
      newSize.width = Math.min(newSize.width, maxWidth);
      newSize.height = Math.min(newSize.height, maxHeight);

      updateBlockSize(resizingBlock.id, newSize);
    }
  }

  function handleTouchEnd(event: TouchEvent) {
    event.preventDefault();
    
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

    // Clean up
    isDragging = false;
    isResizing = false;
    draggedBlock = null;
    resizingBlock = null;
    resizeMode = '';

    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
  }

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
        case 'n': // north
          newSize.height = Math.max(2, Math.round((blockRect.bottom - y) / gridSize));
          break;
        case 's': // south
          newSize.height = Math.max(2, Math.round((y - blockRect.top) / gridSize));
          break;
      }

      // Ensure the block doesn't exceed canvas bounds
      const maxWidth = dashboard.layout.columns - resizingBlock.position.x;
      const maxHeight = dashboard.layout.rows - resizingBlock.position.y;
      newSize.width = Math.min(newSize.width, maxWidth);
      newSize.height = Math.min(newSize.height, maxHeight);

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

  function handleBlockDeleteRequest(block: Block) {
    dispatch('block-delete-request', { block });
  }
</script>

<div class="w-full h-full overflow-auto bg-slate-50 relative" bind:this={canvasElement}>
  <div 
    class="relative m-2 sm:m-5 min-w-full min-h-full"
    style="width: {canvasWidth}px; height: {canvasHeight}px;"
  >
    <!-- Grid background -->
    <div class="absolute top-0 left-0 w-full h-full opacity-50 pointer-events-none" style="
      background-image: linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px);
      background-size: {gridSize}px {gridSize}px;
    "></div>

    <!-- Blocks -->
    {#each dashboard.blocks as block (block.id)}
      <div 
        class="select-none cursor-move transition-shadow duration-200 ease-in-out hover:shadow-xl group touch-manipulation {draggedBlock === block ? 'shadow-2xl [transform:rotate(2deg)]' : ''} {resizingBlock === block ? 'shadow-lg shadow-blue-400' : ''} {editMode ? 'cursor-default' : ''}"
        style={getBlockStyle(block)}
        on:mousedown={(e) => handleBlockMouseDown(e, block)}
        on:touchstart={(e) => handleBlockTouchStart(e, block)}
        role="button"
        tabindex="0"
      >
        <!-- Block content -->
        <div class="w-full h-full pointer-events-auto {draggedBlock === block || resizingBlock === block ? 'pointer-events-none' : ''}">
          {#if block.type === 'table'}
            <TableBlock 
              {block} 
              {dashboardService} 
              showControls={editMode}
              onBlockUpdate={(updatedBlock) => handleBlockUpdate(updatedBlock)}
              onBlockEdit={(editBlock) => handleBlockEdit(editBlock)}
              onBlockDelete={() => handleBlockDeleteRequest(block)}
            />
          {:else if block.type === 'graph'}
            <GraphBlock 
              {block} 
              {dashboardService} 
              showControls={editMode}
              onBlockUpdate={(updatedBlock) => handleBlockUpdate(updatedBlock)}
              onBlockEdit={(editBlock) => handleBlockEdit(editBlock)}
              onBlockDelete={() => handleBlockDeleteRequest(block)}
            />
          {:else if block.type === 'text'}
            <TextBlock 
              {block} 
              dashboardVariables={dashboard.variables}
              showControls={editMode}
              onBlockUpdate={(updatedBlock) => handleBlockUpdate(updatedBlock)}
              onBlockEdit={(editBlock) => handleBlockEdit(editBlock)}
              onBlockDelete={() => handleBlockDeleteRequest(block)}
            />
          {/if}
        </div>

        <!-- Resize handles (only show when not in edit mode and editable) -->
        {#if editable && !editMode}
          <div class="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
            <!-- Corner handles - larger touch targets on mobile -->
            <div 
              class="absolute bg-blue-500 border border-white pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out -top-1 -left-1 w-3 h-3 sm:w-2 sm:h-2 cursor-nw-resize touch-manipulation" 
              on:mousedown={(e) => handleResizeMouseDown(e, block, 'nw')}
              on:touchstart={(e) => handleResizeTouchStart(e, block, 'nw')}
              role="button"
              tabindex="0"
              aria-label="Resize northwest"
            ></div>
            <div 
              class="absolute bg-blue-500 border border-white pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out -top-1 -right-1 w-3 h-3 sm:w-2 sm:h-2 cursor-ne-resize touch-manipulation" 
              on:mousedown={(e) => handleResizeMouseDown(e, block, 'ne')}
              on:touchstart={(e) => handleResizeTouchStart(e, block, 'ne')}
              role="button"
              tabindex="0"
              aria-label="Resize northeast"
            ></div>
            <div 
              class="absolute bg-blue-500 border border-white pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out -bottom-1 -left-1 w-3 h-3 sm:w-2 sm:h-2 cursor-sw-resize touch-manipulation" 
              on:mousedown={(e) => handleResizeMouseDown(e, block, 'sw')}
              on:touchstart={(e) => handleResizeTouchStart(e, block, 'sw')}
              role="button"
              tabindex="0"
              aria-label="Resize southwest"
            ></div>
            <div 
              class="absolute bg-blue-500 border border-white pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out -bottom-1 -right-1 w-3 h-3 sm:w-2 sm:h-2 cursor-se-resize touch-manipulation" 
              on:mousedown={(e) => handleResizeMouseDown(e, block, 'se')}
              on:touchstart={(e) => handleResizeTouchStart(e, block, 'se')}
              role="button"
              tabindex="0"
              aria-label="Resize southeast"
            ></div>
            
            <!-- Edge handles -->
            <div 
              class="absolute bg-blue-500 border border-white pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out -top-1 left-1/2 -translate-x-1/2 w-3 h-3 sm:w-2 sm:h-2 cursor-n-resize touch-manipulation" 
              on:mousedown={(e) => handleResizeMouseDown(e, block, 'n')}
              on:touchstart={(e) => handleResizeTouchStart(e, block, 'n')}
              role="button"
              tabindex="0"
              aria-label="Resize north"
            ></div>
            <div 
              class="absolute bg-blue-500 border border-white pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 sm:w-2 sm:h-2 cursor-s-resize touch-manipulation" 
              on:mousedown={(e) => handleResizeMouseDown(e, block, 's')}
              on:touchstart={(e) => handleResizeTouchStart(e, block, 's')}
              role="button"
              tabindex="0"
              aria-label="Resize south"
            ></div>
            <div 
              class="absolute bg-blue-500 border border-white pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out -right-1 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-2 sm:h-2 cursor-e-resize touch-manipulation" 
              on:mousedown={(e) => handleResizeMouseDown(e, block, 'e')}
              on:touchstart={(e) => handleResizeTouchStart(e, block, 'e')}
              role="button"
              tabindex="0"
              aria-label="Resize east"
            ></div>
            <div 
              class="absolute bg-blue-500 border border-white pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out -left-1 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-2 sm:h-2 cursor-w-resize touch-manipulation" 
              on:mousedown={(e) => handleResizeMouseDown(e, block, 'w')}
              on:touchstart={(e) => handleResizeTouchStart(e, block, 'w')}
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
