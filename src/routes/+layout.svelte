<script lang="ts">
  import '../app.css';
  import ThemeToggle from '$lib/components/ui/ThemeToggle.svelte';

  let { children } = $props();

  // Early theme application (SSR hydration safety)
  if (typeof document !== 'undefined') {
    try {
      const saved = localStorage.getItem('mini-bi-theme');
      if (saved === 'light' || saved === 'dark') {
        document.documentElement.setAttribute('data-theme', saved);
      }
    } catch {}
  }
</script>

<div class="minibi-scope flex min-h-screen flex-col">
  <header
    class="theme-border flex items-center justify-end gap-2 border-b bg-[var(--minibi-color-surface)] p-2 sm:p-3"
  >
    <ThemeToggle />
  </header>
  <main class="flex-1">
    {@render children()}
  </main>
</div>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,400,0,0"
  />
</svelte:head>

<style>
  header {
    box-shadow: var(--minibi-color-shadow);
  }
</style>
