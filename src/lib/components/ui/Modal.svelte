<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { browser } from '$app/environment';

  export let isOpen = false;
  export let title: string | null = null;
  export let size: 'small' | 'medium' | 'large' | 'xlarge' | 'full' = 'medium';
  export let showCloseButton = true;
  export let closeOnOverlayClick = true;
  export let closeOnEscape = true;

  const dispatch = createEventDispatcher<{
    close: {};
  }>();

  let modalElement: HTMLDivElement;

  // Size variants
  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-2xl',
    large: 'max-w-4xl',
    xlarge: 'max-w-6xl',
    full: 'max-w-[95vw]'
  };

  // Focus management and keyboard event handling
  $: if (browser && isOpen && modalElement) {
    modalElement.focus();
  }

  // Prevent body scroll when modal is open
  $: if (browser) {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  onDestroy(() => {
    // Cleanup: restore scroll when component is destroyed
    if (browser) {
      document.body.style.overflow = '';
    }
  });

  function handleClose() {
    dispatch('close', {});
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
    class="fixed inset-0 bg-transparent backdrop-blur-xs flex items-center justify-center p-4 z-50"
    on:click={handleOverlayClick}
    on:keydown={handleKeyDown}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div 
      class="bg-white rounded-lg shadow-2xl w-full {sizeClasses[size]} max-h-[90vh] flex flex-col overflow-hidden"
      role="document"
    >
      <!-- Header slot or default header -->
      <slot name="header">
        {#if title || showCloseButton}
          <div class="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50 flex-shrink-0">
            {#if title}
              <h2 class="text-xl font-semibold text-gray-900">{title}</h2>
            {:else}
              <div></div>
            {/if}
            
            {#if showCloseButton}
              <button 
                class="text-gray-400 hover:text-gray-600 transition-colors p-1" 
                on:click={handleClose} 
                aria-label="Close"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            {/if}
          </div>
        {/if}
      </slot>

      <!-- Content slot -->
      <div class="flex-1 overflow-y-auto">
        <slot></slot>
      </div>

      <!-- Footer slot -->
      <slot name="footer"></slot>
    </div>
  </div>
{/if}
