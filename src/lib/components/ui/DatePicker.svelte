<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    value?: Date | null;
    placeholder?: string;
    label?: string;
    disabled?: boolean;
    minDate?: Date | null;
    maxDate?: Date | null;
    onchange?: (date: Date | null) => void;
  }

  let {
    value = $bindable(null),
    placeholder = 'Select date',
    label = '',
    disabled = false,
    minDate = null,
    maxDate = null,
    onchange
  }: Props = $props();

  let isOpen = $state(false);
  let triggerRef: HTMLButtonElement | null = $state(null);
  let dropdownRef: HTMLDivElement | null = $state(null);
  let currentMonth = $state(new Date());
  let hasInitialized = $state(false);
  let pickerView = $state<'calendar' | 'months' | 'years'>('calendar');
  let dropdownStyle = $state('');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear - 10 + i);

  const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];

  const MONTHS_SHORT = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC'
  ];

  $effect(() => {
    if (value && !hasInitialized) {
      currentMonth = new Date(value.getFullYear(), value.getMonth(), 1);
      hasInitialized = true;
    }
  });

  function formatDate(date: Date | null): string {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  }

  function getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  function getFirstDayOfMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  }

  function getCalendarDays(date: Date): (number | null)[] {
    const daysInMonth = getDaysInMonth(date);
    const firstDay = getFirstDayOfMonth(date);
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  }

  function isDateDisabled(day: number): boolean {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (minDate && date < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) {
      return true;
    }
    if (maxDate && date > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())) {
      return true;
    }
    return false;
  }

  function isSelected(day: number): boolean {
    if (!value) return false;
    return (
      value.getDate() === day &&
      value.getMonth() === currentMonth.getMonth() &&
      value.getFullYear() === currentMonth.getFullYear()
    );
  }

  function isToday(day: number): boolean {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth.getMonth() &&
      today.getFullYear() === currentMonth.getFullYear()
    );
  }

  function selectDate(day: number) {
    if (isDateDisabled(day)) return;
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    value = newDate;
    onchange?.(newDate);
    isOpen = false;
  }

  function prevMonth() {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  }

  function nextMonth() {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  }

  function toggleDropdown() {
    if (disabled) return;
    if (!isOpen && triggerRef) {
      const rect = triggerRef.getBoundingClientRect();
      const dropdownWidth = 288;
      const dropdownHeight = 340;

      let top = rect.bottom + 4;
      let left = rect.left;

      if (left + dropdownWidth > window.innerWidth - 8) {
        left = window.innerWidth - dropdownWidth - 8;
      }

      if (left < 8) {
        left = 8;
      }

      if (top + dropdownHeight > window.innerHeight - 8) {
        top = rect.top - dropdownHeight - 4;
      }

      if (top < 8) {
        top = 8;
      }

      dropdownStyle = `top: ${top}px; left: ${left}px;`;
    }
    isOpen = !isOpen;
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as Node;
    if (
      dropdownRef &&
      !dropdownRef.contains(target) &&
      triggerRef &&
      !triggerRef.contains(target) &&
      !(event.target as HTMLElement)?.closest('.date-picker-trigger')
    ) {
      isOpen = false;
      pickerView = 'calendar';
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (pickerView !== 'calendar') {
        pickerView = 'calendar';
      } else {
        isOpen = false;
      }
    }
  }

  function clearDate() {
    value = null;
    onchange?.(null);
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<div class="relative inline-block w-full">
  {#if label}
    <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
      {label}
    </span>
  {/if}

  <div class="relative">
    <button
      type="button"
      bind:this={triggerRef}
      class="date-picker-trigger flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 {disabled
        ? 'cursor-not-allowed opacity-50'
        : 'hover:border-gray-400 dark:hover:border-gray-500'} {value ? 'pr-8' : ''}"
      onclick={toggleDropdown}
      {disabled}
    >
      <span class="flex items-center gap-2">
        <span class="material-symbols-outlined text-gray-400" style="font-size: 18px;"
          >calendar_today</span
        >
        <span class={value ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}>
          {value ? formatDate(value) : placeholder}
        </span>
      </span>
      {#if !value}
        <span class="material-symbols-outlined text-gray-400" style="font-size: 18px;"
          >expand_more</span
        >
      {/if}
    </button>
    {#if value}
      <button
        type="button"
        class="absolute top-1/2 right-2 flex -translate-y-1/2 items-center justify-center rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
        onclick={(e) => {
          e.stopPropagation();
          clearDate();
        }}
      >
        <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
      </button>
    {/if}
  </div>

  {#if isOpen}
    <div
      bind:this={dropdownRef}
      class="fixed z-50 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800"
      style={dropdownStyle}
    >
      <div class="mb-4 flex items-center justify-between">
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          onclick={prevMonth}
        >
          <span class="material-symbols-outlined" style="font-size: 20px;">chevron_left</span>
        </button>

        <div class="flex items-center gap-1">
          <button
            type="button"
            class="rounded-lg px-1.5 py-0.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
            onclick={() => {
              pickerView = pickerView === 'months' ? 'calendar' : 'months';
            }}
          >
            {MONTHS[currentMonth.getMonth()]}
          </button>
          <button
            type="button"
            class="rounded-lg px-1.5 py-0.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
            onclick={() => {
              pickerView = pickerView === 'years' ? 'calendar' : 'years';
            }}
          >
            {currentMonth.getFullYear()}
          </button>
        </div>

        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          onclick={nextMonth}
        >
          <span class="material-symbols-outlined" style="font-size: 20px;">chevron_right</span>
        </button>
      </div>

      {#if pickerView === 'months'}
        <div class="grid grid-cols-3 gap-1">
          {#each MONTHS as month, i (i)}
            <button
              type="button"
              class="rounded-lg px-2 py-2 text-sm transition-colors {currentMonth.getMonth() === i
                ? 'bg-blue-600 font-semibold text-white'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}"
              onclick={(e) => {
                e.stopPropagation();
                currentMonth = new Date(currentMonth.getFullYear(), i, 1);
                pickerView = 'calendar';
              }}
            >
              {MONTHS_SHORT[i]}
            </button>
          {/each}
        </div>
      {:else if pickerView === 'years'}
        <div class="grid max-h-48 grid-cols-4 gap-1 overflow-y-auto">
          {#each years as year (year)}
            <button
              type="button"
              class="rounded-lg px-2 py-2 text-sm transition-colors {currentMonth.getFullYear() ===
              year
                ? 'bg-blue-600 font-semibold text-white'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}"
              onclick={(e) => {
                e.stopPropagation();
                currentMonth = new Date(year, currentMonth.getMonth(), 1);
                pickerView = 'calendar';
              }}
            >
              {year}
            </button>
          {/each}
        </div>
      {:else}
        <div class="mb-2 grid grid-cols-7 gap-1">
          {#each DAYS as day, i (i)}
            <div
              class="flex h-8 items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400"
            >
              {day}
            </div>
          {/each}
        </div>

        <div class="grid grid-cols-7 gap-1">
          {#each getCalendarDays(currentMonth) as day, i (i)}
            {#if day === null}
              <div class="h-8"></div>
            {:else}
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors {isSelected(
                  day
                )
                  ? 'bg-blue-600 font-semibold text-white'
                  : isToday(day)
                    ? 'bg-blue-100 font-semibold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : isDateDisabled(day)
                      ? 'cursor-not-allowed text-gray-300 dark:text-gray-600'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}"
                onclick={() => selectDate(day)}
                disabled={isDateDisabled(day)}
              >
                {day}
              </button>
            {/if}
          {/each}
        </div>
      {/if}

      <div class="mt-4 flex justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          onclick={() => {
            const today = new Date();
            currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            value = today;
            onchange?.(today);
          }}
        >
          Today
        </button>
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          onclick={clearDate}
        >
          Clear
        </button>
      </div>
    </div>
  {/if}
</div>
