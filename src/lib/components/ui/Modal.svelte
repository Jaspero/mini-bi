<script lang="ts">
  import { onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import type { Snippet } from 'svelte';

  let {
    isOpen = false,
    title = null,
    size = 'medium',
    showCloseButton = true,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    header,
    children,
    footer,
    close = () => {}
  }: {
    isOpen?: boolean;
    title?: string | null;
    size?: 'small' | 'medium' | 'large' | 'xlarge' | 'full';
    showCloseButton?: boolean;
    closeOnOverlayClick?: boolean;
    closeOnEscape?: boolean;
    header?: Snippet;
    children?: Snippet;
    footer?: Snippet;
    close?: () => void;
  } = $props();

  let modalElement = $state() as HTMLDivElement;

  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-2xl',
    large: 'max-w-4xl',
    xlarge: 'max-w-6xl',
    full: 'max-w-[95vw]'
  };

  $effect(() => {
    if (browser && isOpen && modalElement) {
      modalElement.focus();
    }
  });

  $effect(() => {
    if (browser) {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  });

  onDestroy(() => {
    if (browser) {
      document.body.style.overflow = '';
    }
  });

  function handleClose() {
    close();
  }

  function handleOverlayClick(event: MouseEvent) {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      handleClose();
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (closeOnEscape && event.key === 'Escape') {
      handleClose();
    }
  }
</script>

{#if isOpen}
  <div
    bind:this={modalElement}
    class="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4 backdrop-blur-xs"
    onclick={handleOverlayClick}
    onkeydown={handleKeyDown}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div
      class="w-full rounded-lg bg-white shadow-2xl {sizeClasses[
        size
      ]} flex max-h-[90vh] flex-col overflow-hidden"
      role="document"
    >
      {#if header}
        {@render header()}
      {:else if title || showCloseButton}
        <div
          class="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 p-6"
        >
          {#if title}
            <h2 class="text-xl font-semibold text-gray-900">{title}</h2>
          {:else}
            <div></div>
          {/if}

          {#if showCloseButton}
            <button
              class="p-1 text-gray-400 transition-colors hover:text-gray-600"
              onclick={handleClose}
              aria-label="Close"
            >
              <span class="material-symbols-outlined text-2xl">close</span>
            </button>
          {/if}
        </div>
      {/if}

      <div class="flex-1 overflow-y-auto">
        {@render children?.()}
      </div>

      {@render footer?.()}
    </div>
  </div>
{/if}
