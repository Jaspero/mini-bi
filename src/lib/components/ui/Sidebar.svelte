<script lang="ts">
  import { fly, fade } from 'svelte/transition';

  let {
    isOpen = false,
    title = '',
    width = 'w-96',
    position = 'right',
    children,
    footer,
    onClose = () => {}
  }: {
    isOpen?: boolean;
    title?: string;
    width?: string;
    position?: 'left' | 'right';
    children?: import('svelte').Snippet;
    footer?: import('svelte').Snippet;
    onClose?: () => void;
  } = $props();

  function handleClose() {
    onClose();
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

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <div
    class="fixed inset-0 z-40 bg-black/30 transition-opacity"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    role="button"
    tabindex="-1"
    in:fade={{ duration: 200 }}
    out:fade={{ duration: 200 }}
  ></div>

  <div
    class="fixed top-0 {position === 'right'
      ? 'right-0'
      : 'left-0'} h-full {width} z-50 flex max-w-full flex-col bg-white shadow-2xl"
    in:fly={{ x: position === 'right' ? 400 : -400, duration: 300 }}
    out:fly={{ x: position === 'right' ? 400 : -400, duration: 300 }}
  >
    <div class="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-4">
      <h2 class="text-lg font-semibold text-gray-900">{title}</h2>
      <button
        class="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
        onclick={handleClose}
        aria-label="Close sidebar"
      >
        <span class="material-symbols-outlined text-xl">close</span>
      </button>
    </div>

    <div class="h-full flex-1 overflow-y-auto p-4">
      {@render children?.()}
    </div>

    {#if footer}
      <div class="border-t border-gray-200 bg-gray-50 p-4">
        {@render footer?.()}
      </div>
    {/if}
  </div>
{/if}
