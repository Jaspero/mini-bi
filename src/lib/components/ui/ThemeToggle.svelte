<script lang="ts">
  import { onMount } from 'svelte';
  const STORAGE_KEY = 'mini-bi-theme';
  let theme: 'light' | 'dark' = 'light';
  let system: 'light' | 'dark' = 'light';

  function detectSystem() {
    if (typeof window === 'undefined') return;
    system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(t: 'light' | 'dark') {
    theme = t;
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', t);
    }
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {}
    const event = new CustomEvent('themechange', { detail: { theme: t } });
    window.dispatchEvent(event);
  }

  function toggle() {
    applyTheme(theme === 'light' ? 'dark' : 'light');
  }

  onMount(() => {
    detectSystem();
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as 'light' | 'dark' | null;
      if (saved === 'light' || saved === 'dark') {
        applyTheme(saved);
      } else {
        applyTheme(system);
      }
    } catch {
      applyTheme(system);
    }

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      detectSystem();
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) applyTheme(system); // follow system only if user hasn't chosen
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  });
</script>

<button
  class="theme-border inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--color-bg-alt)]"
  onclick={toggle}
  aria-label="Toggle dark mode"
>
  <span class="material-symbols-outlined text-base"
    >{theme === 'dark' ? 'dark_mode' : 'light_mode'}</span
  >
  <span class="hidden sm:inline">{theme === 'dark' ? 'Dark' : 'Light'}</span>
</button>

<style>
  button {
    background: var(--color-surface);
    color: var(--color-text);
  }
  button:hover {
    background: var(--color-bg-alt);
  }
</style>
