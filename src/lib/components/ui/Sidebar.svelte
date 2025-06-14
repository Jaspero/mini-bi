<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fly, fade } from 'svelte/transition';

  export let isOpen = false;
  export let title = '';
  export let width = 'w-96'; // Default width class
  export let position: 'left' | 'right' = 'right';

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

  function handleClose() {
    dispatch('close');
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <!-- Backdrop -->
  <div 
    class="fixed inset-0 bg-black/30 z-40 transition-opacity"
    on:click={handleBackdropClick}
    on:keydown={handleKeydown}
    role="button"
    tabindex="-1"
    in:fade={{ duration: 200 }}
    out:fade={{ duration: 200 }}
  ></div>

  <!-- Sidebar -->
  <div 
    class="fixed top-0 {position === 'right' ? 'right-0' : 'left-0'} h-full {width} bg-white shadow-2xl z-50 flex flex-col"
    in:fly={{ x: position === 'right' ? 400 : -400, duration: 300 }}
    out:fly={{ x: position === 'right' ? 400 : -400, duration: 300 }}
  >
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
      <h2 class="text-lg font-semibold text-gray-900">{title}</h2>
      <button 
        class="p-1 hover:bg-gray-200 rounded-md transition-colors text-gray-400 hover:text-gray-600" 
        on:click={handleClose}
        aria-label="Close sidebar"
      >
        <span class="material-symbols-outlined text-xl">close</span>
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-4 h-full">
      <slot />
    </div>

    <!-- Footer slot (optional) -->
    {#if $$slots.footer}
      <div class="border-t border-gray-200 bg-gray-50 p-4">
        <slot name="footer" />
      </div>
    {/if}
  </div>
{/if}
