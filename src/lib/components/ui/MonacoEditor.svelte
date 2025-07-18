<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import loader from '@monaco-editor/loader';

  let {
    value = $bindable(''),
    language = 'sql',
    theme = 'vs',
    disabled = false,
    placeholder = 'Enter your code here...',
    fontSize = 14,
    wordWrap = 'on',
    lineNumbers = 'on',
    minimap = false,
    autoFormat = false,
    onKeyboardShortcut = () => {},
    keyboardShortcuts = []
  }: {
    value?: string;
    language?: string;
    theme?: string;
    disabled?: boolean;
    placeholder?: string;
    fontSize?: number;
    wordWrap?: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
    lineNumbers?: 'on' | 'off' | 'relative' | 'interval';
    minimap?: boolean;
    autoFormat?: boolean;
    onKeyboardShortcut?: (shortcut: string) => void;
    keyboardShortcuts?: Array<{
      key: string;
      command: string;
      callback: () => void;
    }>;
  } = $props();

  let editorContainer = $state() as HTMLElement;
  let textareaElement = $state() as HTMLTextAreaElement;
  let editor: any | null = null;
  let useMonaco = $state(false);
  let monaco: any | null = null;
  let monacoInitialized = false;
  let initializationAttempts = $state(0);

  export function insertText(text: string) {
    if (useMonaco && editor) {
      const position = editor.getPosition()!;
      editor.executeEdits('', [
        {
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          ),
          text: text
        }
      ]);
      editor.focus();
    } else if (textareaElement) {
      const start = textareaElement.selectionStart;
      const end = textareaElement.selectionEnd;
      const newValue = value.substring(0, start) + text + value.substring(end);
      value = newValue;

      // Set cursor position after inserted text
      setTimeout(() => {
        textareaElement.setSelectionRange(start + text.length, start + text.length);
        textareaElement.focus();
      }, 0);
    }
  }

  export function setValue(newValue: string) {
    value = newValue;
    if (useMonaco && editor) {
      editor.setValue(newValue);
      editor.focus();
    } else if (textareaElement) {
      textareaElement.focus();
    }
  }

  function retryMonacoInitialization() {
    initializationAttempts = 0;
    monacoInitialized = false;
    setTimeout(tryInitializeMonaco, 100);
  }

  function formatCode() {
    if (useMonaco && editor && monaco) {
      editor.getAction('editor.action.formatDocument')!.run();
    }
  }

  async function tryInitializeMonaco() {
    if (monacoInitialized || initializationAttempts >= 3) return;

    initializationAttempts++;

    try {
      // Wait for container to be properly rendered and visible
      if (!editorContainer) {
        console.log('Editor container not ready');
        return;
      }

      // Check container visibility
      const rect = editorContainer.getBoundingClientRect();
      if (rect.width < 100 || rect.height < 50) {
        console.log('Container not visible or too small:', rect);
        return;
      }

      monaco = await loader.init()

      // Create editor
      editor = monaco.editor.create(editorContainer, {
        value: value || '',
        language: language,
        theme: theme,
        automaticLayout: true,
        minimap: { enabled: minimap },
        fontSize: fontSize,
        wordWrap: wordWrap,
        lineNumbers: lineNumbers,
        scrollBeyondLastLine: false,
        folding: false,
        readOnly: disabled
      });

      // Listen for changes
      editor.onDidChangeModelContent(() => {
        const newValue = editor!.getValue();
        value = newValue;
      });

      // Add keyboard shortcuts
      keyboardShortcuts.forEach((shortcut) => {
        const keys = shortcut.key.split('+');
        let keyMod = 0;
        let keyCode = 0;

        keys.forEach((key) => {
          switch (key.toLowerCase()) {
            case 'ctrl':
            case 'cmd':
              keyMod |= monaco.KeyMod.CtrlCmd;
              break;
            case 'shift':
              keyMod |= monaco.KeyMod.Shift;
              break;
            case 'alt':
              keyMod |= monaco.KeyMod.Alt;
              break;
            case 'enter':
              keyCode = monaco.KeyCode.Enter;
              break;
            case 's':
              keyCode = monaco.KeyCode.KeyS;
              break;
          }
        });

        if (keyCode) {
          editor!.addCommand(keyMod | keyCode, () => {
            shortcut.callback();
            onKeyboardShortcut(shortcut.command);
          });
        }
      });

      useMonaco = true;
      monacoInitialized = true;
    } catch (error) {
      console.warn(`Monaco initialization attempt ${initializationAttempts} failed:`, error);

      if (initializationAttempts >= 3) {
        console.log('Giving up on Monaco, using textarea fallback');
      }
    }
  }

  onMount(() => {
    if (textareaElement) {
      textareaElement.focus();
    }

    tryInitializeMonaco();

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !monacoInitialized) {
          setTimeout(tryInitializeMonaco, 100);
        }
      });
    });

    if (editorContainer) {
      observer.observe(editorContainer);
    }

    return () => {
      observer.disconnect();
    };
  });

  onDestroy(() => {
    if (editor) {
      editor.dispose();
    }
  });

  function handleTextareaInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    value = target.value;
  }

  function handleKeydown(event: KeyboardEvent) {
    keyboardShortcuts.forEach((shortcut) => {
      const keys = shortcut.key.toLowerCase().split('+');
      const isCtrlOrCmd = keys.includes('ctrl') || keys.includes('cmd');
      const isShift = keys.includes('shift');
      const isAlt = keys.includes('alt');
      const key = keys[keys.length - 1]; // Last key is the main key

      const ctrlOrCmdPressed = event.ctrlKey || event.metaKey;
      const shiftPressed = event.shiftKey;
      const altPressed = event.altKey;
      const keyPressed = event.key.toLowerCase();

      if (
        (isCtrlOrCmd ? ctrlOrCmdPressed : !ctrlOrCmdPressed) &&
        (isShift ? shiftPressed : !shiftPressed) &&
        (isAlt ? altPressed : !altPressed) &&
        keyPressed === key
      ) {
        event.preventDefault();
        shortcut.callback();
        onKeyboardShortcut(shortcut.command);
      }
    });
  }
</script>

<div class="relative h-full flex-1 overflow-hidden">
  <!-- Always show textarea (Monaco will overlay when ready) -->
  <textarea
    bind:this={textareaElement}
    bind:value
    oninput={handleTextareaInput}
    onkeydown={handleKeydown}
    {disabled}
    class="absolute inset-0 resize-none border-none bg-white p-3 font-mono text-sm leading-relaxed text-gray-700 transition-opacity duration-300 outline-none focus:outline-none"
    class:opacity-0={useMonaco}
    class:pointer-events-none={useMonaco}
    {placeholder}
    spellcheck="false"
  ></textarea>

  <!-- Monaco container (overlays textarea when ready) -->
  <div
    class="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
    class:!opacity-100={useMonaco}
    class:!pointer-events-auto={useMonaco}
    bind:this={editorContainer}
  ></div>
</div>

<!-- Status and controls -->
<div class="flex items-center justify-between gap-2 border-t border-gray-300 bg-gray-50 p-2">
  <div class="flex items-center gap-2">
    <span class="text-xs text-gray-500">
      {useMonaco
        ? `Monaco ${language.toUpperCase()} Editor`
        : `Basic ${language.toUpperCase()} Editor`}
    </span>
    {#if keyboardShortcuts.length > 0}
      <span class="text-xs text-gray-400">
        • {keyboardShortcuts.map((s) => s.key).join(', ')} shortcuts available
      </span>
    {/if}
  </div>

  <div class="flex items-center gap-2">
    {#if useMonaco && autoFormat}
      <button
        class="cursor-pointer rounded border-none bg-blue-500 px-3 py-1.5 text-xs text-white hover:bg-blue-600"
        onclick={formatCode}
      >
        Format
      </button>
    {/if}

    {#if !useMonaco && initializationAttempts < 3}
      <button
        class="cursor-pointer rounded border-none bg-yellow-500 px-3 py-1.5 text-xs text-white hover:bg-yellow-600"
        onclick={retryMonacoInitialization}
      >
        Try Monaco
      </button>
    {/if}
  </div>
</div>
