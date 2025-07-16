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
    class="fixed inset-0 z-40 bg-black/30 transition-opacity"
    on:click={handleBackdropClick}
    on:keydown={handleKeydown}
    role="button"
    tabindex="-1"
    in:fade={{ duration: 200 }}
    out:fade={{ duration: 200 }}
  ></div>

  <!-- Sidebar -->
  <div
    class="fixed top-0 {position === 'right'
      ? 'right-0'
      : 'left-0'} h-full {width} z-50 flex max-w-full flex-col bg-white shadow-2xl"
    in:fly={{ x: position === 'right' ? 400 : -400, duration: 300 }}
    out:fly={{ x: position === 'right' ? 400 : -400, duration: 300 }}
  >
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-4">
      <h2 class="text-lg font-semibold text-gray-900">{title}</h2>
      <button
        class="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
        on:click={handleClose}
        aria-label="Close sidebar"
      >
        <span class="material-symbols-outlined text-xl">close</span>
      </button>
    </div>

    <!-- Content -->
    <div class="h-full flex-1 overflow-y-auto p-4">
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
