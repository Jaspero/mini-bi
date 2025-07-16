# Modal Component

A reusable modal dialog component with transparent backdrop and scroll prevention.

## Features

- ✅ **Transparent backdrop** with blur effect (`bg-transparent backdrop-blur-md`)
- ✅ **Automatic scroll prevention** when modal is open
- ✅ **Escape key to close** - Press Escape to close any modal
- ✅ **Customizable sizes**: small, medium, large, xlarge, full
- ✅ **Flexible slots**: header, content, footer
- ✅ **Auto-focus management** - Modal receives focus when opened
- ✅ **Click outside to close** (optional)
- ✅ **ARIA accessibility** attributes
- ✅ **TypeScript support**

## Usage

### Basic Usage

```svelte
<script>
  import Modal from '$lib/components/ui/Modal.svelte';

  let isOpen = false;
</script>

<Modal {isOpen} title="My Modal" on:close={() => (isOpen = false)}>
  <p>Modal content goes here</p>
</Modal>
```

### Advanced Usage with Custom Header and Footer

```svelte
<Modal {isOpen} size="large" on:close={handleClose}>
  <div slot="header" class="custom-header">
    <h2>Custom Header</h2>
  </div>

  <div class="p-6">
    <p>Modal content</p>
  </div>

  <div slot="footer" class="flex justify-end gap-3 border-t p-6">
    <button on:click={handleClose}>Cancel</button>
    <button on:click={handleSave}>Save</button>
  </div>
</Modal>
```

## Props

| Prop                  | Type                                                   | Default    | Description                        |
| --------------------- | ------------------------------------------------------ | ---------- | ---------------------------------- |
| `isOpen`              | `boolean`                                              | `false`    | Controls modal visibility          |
| `title`               | `string \| null`                                       | `null`     | Modal title (shows default header) |
| `size`                | `'small' \| 'medium' \| 'large' \| 'xlarge' \| 'full'` | `'medium'` | Modal size                         |
| `showCloseButton`     | `boolean`                                              | `true`     | Show close button in header        |
| `closeOnOverlayClick` | `boolean`                                              | `true`     | Close when clicking backdrop       |
| `closeOnEscape`       | `boolean`                                              | `true`     | Close when pressing Escape         |

## Size Classes

- **small**: `max-w-md`
- **medium**: `max-w-2xl`
- **large**: `max-w-4xl`
- **xlarge**: `max-w-6xl`
- **full**: `max-w-[95vw]`

## Events

- `close`: Dispatched when modal should be closed

## Slots

- **default**: Main content area
- **header**: Custom header (replaces default title/close button)
- **footer**: Footer area for buttons/actions

## Styling

The modal uses Tailwind CSS classes and provides:

- Transparent backdrop with blur effect
- White content area with rounded corners and shadow
- Responsive sizing and max-height constraints
- Smooth transitions and hover effects

## Migration from Old Modals

Replace your existing modal structure:

```svelte
<!-- Before -->
{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-transparent backdrop-blur-md">
    <div class="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl">
      <!-- header, content, footer -->
    </div>
  </div>
{/if}

<!-- After -->
<Modal {isOpen} title="My Modal" on:close={handleClose}>
  <!-- content -->
  <div slot="footer">
    <!-- footer buttons -->
  </div>
</Modal>
```

## Components Using Modal

- `BlockEditor.svelte` - Block editing dialog
- `GlobalQueryManager.svelte` - Query management interface
- _(Ready for use in other components)_
