<script>
  import Modal from '$lib/components/ui/Modal.svelte';
  
  let showBasicModal = false;
  let showCustomModal = false;
  let showNoEscapeModal = false;
</script>

<div class="p-8 space-y-4">
  <h1 class="text-2xl font-bold mb-6">Modal Escape Key Tests</h1>
  
  <div class="space-y-4">
    <button 
      class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      on:click={() => showBasicModal = true}
    >
      Open Basic Modal (Escape enabled)
    </button>
    
    <button 
      class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      on:click={() => showCustomModal = true}
    >
      Open Custom Modal (Escape enabled)
    </button>
    
    <button 
      class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      on:click={() => showNoEscapeModal = true}
    >
      Open Modal (Escape disabled)
    </button>
  </div>
  
  <div class="mt-8 p-4 bg-gray-100 rounded">
    <h2 class="font-semibold mb-2">Test Instructions:</h2>
    <ul class="list-disc list-inside space-y-1 text-sm">
      <li>Click any button to open a modal</li>
      <li>Press <kbd class="px-2 py-1 bg-white border rounded">Escape</kbd> to close (except red button modal)</li>
      <li>Click outside the modal to close</li>
      <li>Try the close button (X) in the header</li>
    </ul>
  </div>
</div>

<!-- Basic Modal -->
<Modal 
  isOpen={showBasicModal} 
  title="Basic Modal" 
  on:close={() => showBasicModal = false}
>
  <div class="p-6">
    <p>This is a basic modal with Escape key enabled.</p>
    <p class="mt-2 text-sm text-gray-600">
      Press <kbd class="px-1 py-0.5 bg-gray-200 rounded">Escape</kbd> to close this modal.
    </p>
  </div>
</Modal>

<!-- Custom Modal with Footer -->
<Modal 
  isOpen={showCustomModal} 
  title="Custom Modal with Footer" 
  size="large"
  on:close={() => showCustomModal = false}
>
  <div class="p-6">
    <p>This modal has a custom footer and larger size.</p>
    <p class="mt-2 text-sm text-gray-600">
      Press <kbd class="px-1 py-0.5 bg-gray-200 rounded">Escape</kbd> to close this modal.
    </p>
  </div>
  
  <div slot="footer" class="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
    <button 
      class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
      on:click={() => showCustomModal = false}
    >
      Cancel
    </button>
    <button 
      class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      on:click={() => showCustomModal = false}
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
  on:close={() => showNoEscapeModal = false}
>
  <div class="p-6">
    <p>This modal has Escape key disabled.</p>
    <p class="mt-2 text-sm text-red-600">
      <kbd class="px-1 py-0.5 bg-gray-200 rounded">Escape</kbd> key will NOT close this modal.
    </p>
    <p class="mt-2 text-sm text-gray-600">
      Use the close button (X) or click outside to close.
    </p>
  </div>
</Modal>
