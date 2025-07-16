<script lang="ts">
  interface Props {
    isOpen?: boolean;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    confirmButtonClass?: string;
    cancelButtonClass?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }

  let {
    isOpen = $bindable(false),
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmButtonClass = 'bg-red-600 hover:bg-red-700 text-white',
    cancelButtonClass = 'bg-gray-300 hover:bg-gray-400 text-gray-700',
    onConfirm = () => {},
    onCancel = () => {}
  }: Props = $props();

  function handleConfirm() {
    onConfirm();
    isOpen = false;
  }

  function handleCancel() {
    onCancel();
    isOpen = false;
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleCancel();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleCancel();
    } else if (event.key === 'Enter') {
      handleConfirm();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    aria-describedby="modal-description"
    tabindex="-1"
  >
    <div class="mx-4 w-full max-w-md transform rounded-lg bg-white shadow-xl transition-all">
      <div class="border-b border-gray-200 px-6 py-4">
        <h3 id="modal-title" class="text-lg font-semibold text-gray-900">
          {title}
        </h3>
      </div>

      <div class="px-6 py-4">
        <p id="modal-description" class="leading-relaxed text-gray-600">
          {message}
        </p>
      </div>

      <div class="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
        <button
          type="button"
          class="rounded-md px-4 py-2 font-medium transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none {cancelButtonClass}"
          onclick={handleCancel}
        >
          {cancelText}
        </button>
        <button
          type="button"
          class="rounded-md px-4 py-2 font-medium transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none {confirmButtonClass}"
          onclick={handleConfirm}
        >
          {confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}
