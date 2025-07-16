<script>
  import Modal from '$lib/components/ui/Modal.svelte';

  let showBasicModal = false;
  let showCustomModal = false;
  let showNoEscapeModal = false;
</script>

<div class="space-y-4 p-8">
  <h1 class="mb-6 text-2xl font-bold">Modal Escape Key Tests</h1>

  <div class="space-y-4">
    <button
      class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      on:click={() => (showBasicModal = true)}
    >
      Open Basic Modal (Escape enabled)
    </button>

    <button
      class="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
      on:click={() => (showCustomModal = true)}
    >
      Open Custom Modal (Escape enabled)
    </button>

    <button
      class="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
      on:click={() => (showNoEscapeModal = true)}
    >
      Open Modal (Escape disabled)
    </button>
  </div>

  <div class="mt-8 rounded bg-gray-100 p-4">
    <h2 class="mb-2 font-semibold">Test Instructions:</h2>
    <ul class="list-inside list-disc space-y-1 text-sm">
      <li>Click any button to open a modal</li>
      <li>
        Press <kbd class="rounded border bg-white px-2 py-1">Escape</kbd> to close (except red button
        modal)
      </li>
      <li>Click outside the modal to close</li>
      <li>Try the close button (X) in the header</li>
    </ul>
  </div>
</div>

<!-- Basic Modal -->
<Modal isOpen={showBasicModal} title="Basic Modal" on:close={() => (showBasicModal = false)}>
  <div class="p-6">
    <p>This is a basic modal with Escape key enabled.</p>
    <p class="mt-2 text-sm text-gray-600">
      Press <kbd class="rounded bg-gray-200 px-1 py-0.5">Escape</kbd> to close this modal.
    </p>
  </div>
</Modal>

<!-- Custom Modal with Footer -->
<Modal
  isOpen={showCustomModal}
  title="Custom Modal with Footer"
  size="large"
  on:close={() => (showCustomModal = false)}
>
  <div class="p-6">
    <p>This modal has a custom footer and larger size.</p>
    <p class="mt-2 text-sm text-gray-600">
      Press <kbd class="rounded bg-gray-200 px-1 py-0.5">Escape</kbd> to close this modal.
    </p>
  </div>

  <div slot="footer" class="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 p-6">
    <button
      class="rounded border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
      on:click={() => (showCustomModal = false)}
    >
      Cancel
    </button>
    <button
      class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      on:click={() => (showCustomModal = false)}
    >
      Save
    </button>
  </div>
</Modal>

<!-- Modal with Escape Disabled -->
<Modal
  isOpen={showNoEscapeModal}
  title="Escape Disabled Modal"
  closeOnEscape={false}
  on:close={() => (showNoEscapeModal = false)}
>
  <div class="p-6">
    <p>This modal has Escape key disabled.</p>
    <p class="mt-2 text-sm text-red-600">
      <kbd class="rounded bg-gray-200 px-1 py-0.5">Escape</kbd> key will NOT close this modal.
    </p>
    <p class="mt-2 text-sm text-gray-600">Use the close button (X) or click outside to close.</p>
  </div>
</Modal>
