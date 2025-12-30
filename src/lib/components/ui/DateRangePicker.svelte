<script lang="ts">
  import { onMount, untrack } from 'svelte';

  interface DateRange {
    start: Date | null;
    end: Date | null;
  }

  interface Props {
    value?: DateRange;
    placeholder?: string;
    label?: string;
    disabled?: boolean;
    minDate?: Date | null;
    maxDate?: Date | null;
    onchange?: (range: DateRange) => void;
  }

  let {
    value = $bindable({ start: null, end: null }),
    placeholder = 'Select date range',
    label = '',
    disabled = false,
    minDate = null,
    maxDate = null,
    onchange
  }: Props = $props();

  let isOpen = $state(false);
  let inputRef: HTMLButtonElement | null = $state(null);
  let dropdownRef: HTMLDivElement | null = $state(null);
  let leftMonth = $state(new Date());
  let rightMonth = $state(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1));
  let selectingEnd = $state(false);
  let hoveredDate = $state<Date | null>(null);
  let hasInitializedMonths = $state(false);
  let leftPickerView = $state<'calendar' | 'months' | 'years'>('calendar');
  let rightPickerView = $state<'calendar' | 'months' | 'years'>('calendar');
  let dropdownStyle = $state('');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear - 10 + i);

  const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
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
    if (value.start && !hasInitializedMonths) {
      hasInitializedMonths = true;
      untrack(() => {
        leftMonth = new Date(value.start!.getFullYear(), value.start!.getMonth(), 1);
        if (value.end) {
          const endMonth = new Date(value.end.getFullYear(), value.end.getMonth(), 1);
          if (endMonth.getTime() > leftMonth.getTime()) {
            rightMonth = endMonth;
          } else {
            rightMonth = new Date(leftMonth.getFullYear(), leftMonth.getMonth() + 1, 1);
          }
        } else {
          rightMonth = new Date(leftMonth.getFullYear(), leftMonth.getMonth() + 1, 1);
        }
      });
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

  function formatDisplayDate(date: Date | null): string {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit'
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

  function createDate(month: Date, day: number): Date {
    return new Date(month.getFullYear(), month.getMonth(), day);
  }

  function isDateDisabled(month: Date, day: number, isRightCalendar: boolean = false): boolean {
    const date = createDate(month, day);
    if (minDate && date < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) {
      return true;
    }
    if (maxDate && date > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())) {
      return true;
    }
    if (isRightCalendar && selectingEnd && value.start) {
      const startDate = new Date(
        value.start.getFullYear(),
        value.start.getMonth(),
        value.start.getDate()
      );
      if (date < startDate) {
        return true;
      }
    }
    return false;
  }

  function isInRange(month: Date, day: number): boolean {
    const date = createDate(month, day);

    if (value.start && value.end) {
      const start = new Date(
        value.start.getFullYear(),
        value.start.getMonth(),
        value.start.getDate()
      );
      const end = new Date(value.end.getFullYear(), value.end.getMonth(), value.end.getDate());
      return date >= start && date <= end;
    }

    if (value.start && !value.end && hoveredDate) {
      const start = new Date(
        value.start.getFullYear(),
        value.start.getMonth(),
        value.start.getDate()
      );
      const hovered = new Date(
        hoveredDate.getFullYear(),
        hoveredDate.getMonth(),
        hoveredDate.getDate()
      );
      if (hovered >= start) {
        return date >= start && date <= hovered;
      }
      return date >= hovered && date <= start;
    }

    return false;
  }

  function isRangeStart(month: Date, day: number): boolean {
    if (!value.start) return false;
    const date = createDate(month, day);
    return (
      date.getDate() === value.start.getDate() &&
      date.getMonth() === value.start.getMonth() &&
      date.getFullYear() === value.start.getFullYear()
    );
  }

  function isRangeEnd(month: Date, day: number): boolean {
    if (!value.end) return false;
    const date = createDate(month, day);
    return (
      date.getDate() === value.end.getDate() &&
      date.getMonth() === value.end.getMonth() &&
      date.getFullYear() === value.end.getFullYear()
    );
  }

  function isToday(month: Date, day: number): boolean {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === month.getMonth() &&
      today.getFullYear() === month.getFullYear()
    );
  }

  function selectDate(month: Date, day: number, isRightCalendar: boolean = false) {
    if (isDateDisabled(month, day, isRightCalendar)) return;

    const selectedDate = createDate(month, day);

    if (selectingEnd || isRightCalendar) {
      if (value.start && selectedDate >= value.start) {
        value = { start: value.start, end: selectedDate };
        selectingEnd = false;
        onchange?.(value);
        isOpen = false;
      } else if (value.start && selectedDate < value.start) {
        value = { start: selectedDate, end: value.start };
        selectingEnd = false;
        onchange?.(value);
        isOpen = false;
      } else {
        value = { start: null, end: selectedDate };
        selectingEnd = false;
      }
      return;
    }

    if (value.end && selectedDate <= value.end) {
      value = { start: selectedDate, end: value.end };
      onchange?.(value);
      isOpen = false;
    } else if (value.end && selectedDate > value.end) {
      value = { start: value.end, end: selectedDate };
      onchange?.(value);
      isOpen = false;
    } else {
      value = { start: selectedDate, end: null };
      selectingEnd = true;
    }
  }

  function prevMonths() {
    const newLeft = new Date(leftMonth.getFullYear(), leftMonth.getMonth() - 1, 1);
    leftMonth = newLeft;
    if (rightMonth.getTime() <= newLeft.getTime()) {
      rightMonth = new Date(newLeft.getFullYear(), newLeft.getMonth() + 1, 1);
    }
  }

  function nextMonths() {
    const newLeft = new Date(leftMonth.getFullYear(), leftMonth.getMonth() + 1, 1);
    leftMonth = newLeft;
    if (rightMonth.getTime() <= newLeft.getTime()) {
      rightMonth = new Date(newLeft.getFullYear(), newLeft.getMonth() + 1, 1);
    }
  }

  function toggleDropdown() {
    if (disabled) return;
    if (!isOpen && inputRef) {
      const rect = inputRef.getBoundingClientRect();
      const dropdownWidth = 570;
      const dropdownHeight = 420;

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
      inputRef &&
      !inputRef.contains(target) &&
      !(event.target as HTMLElement)?.closest('.date-range-trigger')
    ) {
      isOpen = false;
      leftPickerView = 'calendar';
      rightPickerView = 'calendar';
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (leftPickerView !== 'calendar' || rightPickerView !== 'calendar') {
        leftPickerView = 'calendar';
        rightPickerView = 'calendar';
      } else {
        isOpen = false;
      }
    }
  }

  function clearDates() {
    value = { start: null, end: null };
    selectingEnd = false;
    onchange?.({ start: null, end: null });
  }

  function handleMouseEnter(month: Date, day: number) {
    if ((value.start && !value.end) || (value.end && !value.start)) {
      hoveredDate = createDate(month, day);
    }
  }

  function handleMouseLeave() {
    hoveredDate = null;
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

<div class="relative w-full">
  {#if label}
    <span class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
      {label}
    </span>
  {/if}

  <div class="relative">
    <button
      type="button"
      bind:this={inputRef}
      class="date-range-trigger flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 {disabled
        ? 'cursor-not-allowed opacity-50'
        : 'hover:border-gray-400 dark:hover:border-gray-500'} {value.start || value.end
        ? 'pr-8'
        : ''}"
      onclick={toggleDropdown}
      {disabled}
    >
      <span class="flex items-center gap-2">
        <span class="material-symbols-outlined text-gray-400" style="font-size: 18px;"
          >date_range</span
        >
        {#if value.start && value.end}
          <span class="text-gray-900 dark:text-white">
            {formatDisplayDate(value.start)} - {formatDisplayDate(value.end)}
          </span>
        {:else if value.start}
          <span class="text-gray-900 dark:text-white">
            {formatDisplayDate(value.start)} - <span class="text-gray-400">Select end</span>
          </span>
        {:else}
          <span class="text-gray-400 dark:text-gray-500">{placeholder}</span>
        {/if}
      </span>
      {#if !(value.start || value.end)}
        <span class="material-symbols-outlined text-gray-400" style="font-size: 18px;"
          >expand_more</span
        >
      {/if}
    </button>
    {#if value.start || value.end}
      <button
        type="button"
        class="absolute top-1/2 right-2 flex -translate-y-1/2 items-center justify-center rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
        onclick={(e) => {
          e.stopPropagation();
          clearDates();
        }}
      >
        <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
      </button>
    {/if}
  </div>

  {#if isOpen}
    <div
      bind:this={dropdownRef}
      class="fixed z-50 flex rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
      style={dropdownStyle}
    >
      <div class="p-4">
        <div class="mb-4 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-gray-400" style="font-size: 18px;"
              >calendar_today</span
            >
            <span class="text-sm font-medium text-gray-900 dark:text-white">Date Range:</span>
            <button
              type="button"
              class="flex items-center gap-1 rounded px-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 {!selectingEnd
                ? 'ring-2 ring-blue-500 dark:ring-blue-400'
                : ''}"
              onclick={() => {
                selectingEnd = false;
              }}
            >
              <span class="text-sm text-gray-600 dark:text-gray-400">From</span>
              <span
                class="text-sm font-medium {value.start
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-400 dark:text-gray-500'}"
              >
                {value.start ? formatDate(value.start) : '—'}
              </span>
            </button>
            <button
              type="button"
              class="flex items-center gap-1 rounded px-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 {selectingEnd
                ? 'ring-2 ring-blue-500 dark:ring-blue-400'
                : ''}"
              onclick={() => {
                selectingEnd = true;
              }}
            >
              <span class="text-sm text-gray-600 dark:text-gray-400">to</span>
              <span
                class="text-sm font-medium {value.end
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-400 dark:text-gray-500'}"
              >
                {value.end ? formatDate(value.end) : '—'}
              </span>
            </button>
          </div>
          <button
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            onclick={() => (isOpen = false)}
          >
            <span class="material-symbols-outlined" style="font-size: 18px;">close</span>
          </button>
        </div>

        <div class="flex gap-6">
          <div class="w-64">
            <div class="mb-3 flex items-center justify-between">
              <button
                type="button"
                class="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                onclick={prevMonths}
              >
                <span class="material-symbols-outlined" style="font-size: 18px;">chevron_left</span>
              </button>

              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="rounded-lg px-1.5 py-0.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                  onclick={() => {
                    leftPickerView = leftPickerView === 'months' ? 'calendar' : 'months';
                    rightPickerView = 'calendar';
                  }}
                >
                  {MONTHS[leftMonth.getMonth()].toUpperCase()}
                </button>
                <button
                  type="button"
                  class="rounded-lg px-1.5 py-0.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                  onclick={() => {
                    leftPickerView = leftPickerView === 'years' ? 'calendar' : 'years';
                    rightPickerView = 'calendar';
                  }}
                >
                  {leftMonth.getFullYear()}
                </button>
              </div>

              <button
                type="button"
                class="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                onclick={nextMonths}
              >
                <span class="material-symbols-outlined" style="font-size: 18px;">chevron_right</span
                >
              </button>
            </div>

            {#if leftPickerView === 'months'}
              <div class="grid grid-cols-3 gap-1">
                {#each MONTHS as month, i (i)}
                  <button
                    type="button"
                    class="rounded-lg px-2 py-2 text-sm transition-colors {leftMonth.getMonth() ===
                    i
                      ? 'bg-blue-600 font-semibold text-white'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}"
                    onclick={(e) => {
                      e.stopPropagation();
                      leftMonth = new Date(leftMonth.getFullYear(), i, 1);
                      if (rightMonth.getTime() <= leftMonth.getTime()) {
                        rightMonth = new Date(leftMonth.getFullYear(), leftMonth.getMonth() + 1, 1);
                      }
                      leftPickerView = 'calendar';
                    }}
                  >
                    {MONTHS_SHORT[i]}
                  </button>
                {/each}
              </div>
            {:else if leftPickerView === 'years'}
              <div class="grid max-h-48 grid-cols-4 gap-1 overflow-y-auto">
                {#each years as year (year)}
                  <button
                    type="button"
                    class="rounded-lg px-2 py-2 text-sm transition-colors {leftMonth.getFullYear() ===
                    year
                      ? 'bg-blue-600 font-semibold text-white'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}"
                    onclick={(e) => {
                      e.stopPropagation();
                      leftMonth = new Date(year, leftMonth.getMonth(), 1);
                      if (rightMonth.getTime() <= leftMonth.getTime()) {
                        rightMonth = new Date(leftMonth.getFullYear(), leftMonth.getMonth() + 1, 1);
                      }
                      leftPickerView = 'calendar';
                    }}
                  >
                    {year}
                  </button>
                {/each}
              </div>
            {:else}
              <div class="mb-1 grid grid-cols-7 gap-0.5">
                {#each DAYS as day, i (i)}
                  <div
                    class="flex h-7 items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    {day}
                  </div>
                {/each}
              </div>

              <div class="grid grid-cols-7 gap-0.5">
                {#each getCalendarDays(leftMonth) as day, i (i)}
                  {#if day === null}
                    <div class="h-7"></div>
                  {:else}
                    <button
                      type="button"
                      class="flex h-7 w-full items-center justify-center text-sm transition-colors {isRangeStart(
                        leftMonth,
                        day
                      ) || isRangeEnd(leftMonth, day)
                        ? 'rounded-lg bg-blue-600 font-semibold text-white'
                        : isInRange(leftMonth, day)
                          ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                          : isToday(leftMonth, day)
                            ? 'rounded-lg font-medium text-blue-600 ring-1 ring-blue-500 ring-inset dark:text-blue-400 dark:ring-blue-400'
                            : isDateDisabled(leftMonth, day)
                              ? 'cursor-not-allowed text-gray-300 dark:text-gray-600'
                              : 'rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}"
                      onclick={() => selectDate(leftMonth, day)}
                      onmouseenter={() => handleMouseEnter(leftMonth, day)}
                      onmouseleave={handleMouseLeave}
                      disabled={isDateDisabled(leftMonth, day)}
                    >
                      {day}
                    </button>
                  {/if}
                {/each}
              </div>
            {/if}
          </div>

          <div class="w-64">
            <div class="mb-3 flex items-center justify-between">
              <button
                type="button"
                class="flex h-7 w-7 items-center justify-center rounded-lg transition-colors {rightMonth.getTime() <=
                new Date(leftMonth.getFullYear(), leftMonth.getMonth() + 1, 1).getTime()
                  ? 'cursor-not-allowed text-gray-300 dark:text-gray-600'
                  : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}"
                onclick={() => {
                  const newRight = new Date(rightMonth.getFullYear(), rightMonth.getMonth() - 1, 1);
                  if (newRight.getTime() > leftMonth.getTime()) {
                    rightMonth = newRight;
                  }
                }}
                disabled={rightMonth.getTime() <=
                  new Date(leftMonth.getFullYear(), leftMonth.getMonth() + 1, 1).getTime()}
              >
                <span class="material-symbols-outlined" style="font-size: 18px;">chevron_left</span>
              </button>

              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="rounded-lg px-1.5 py-0.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                  onclick={() => {
                    rightPickerView = rightPickerView === 'months' ? 'calendar' : 'months';
                    leftPickerView = 'calendar';
                  }}
                >
                  {MONTHS[rightMonth.getMonth()].toUpperCase()}
                </button>
                <button
                  type="button"
                  class="rounded-lg px-1.5 py-0.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                  onclick={() => {
                    rightPickerView = rightPickerView === 'years' ? 'calendar' : 'years';
                    leftPickerView = 'calendar';
                  }}
                >
                  {rightMonth.getFullYear()}
                </button>
              </div>

              <button
                type="button"
                class="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                onclick={() => {
                  rightMonth = new Date(rightMonth.getFullYear(), rightMonth.getMonth() + 1, 1);
                }}
              >
                <span class="material-symbols-outlined" style="font-size: 18px;">chevron_right</span
                >
              </button>
            </div>

            {#if rightPickerView === 'months'}
              <div class="grid grid-cols-3 gap-1">
                {#each MONTHS as month, i (`right-month-${i}`)}
                  <button
                    type="button"
                    class="rounded-lg px-2 py-2 text-sm transition-colors {new Date(
                      rightMonth.getFullYear(),
                      i,
                      1
                    ).getTime() <= leftMonth.getTime()
                      ? 'cursor-not-allowed text-gray-300 dark:text-gray-600'
                      : rightMonth.getMonth() === i
                        ? 'bg-blue-600 font-semibold text-white'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}"
                    onclick={(e) => {
                      e.stopPropagation();
                      const newRight = new Date(rightMonth.getFullYear(), i, 1);
                      if (newRight.getTime() > leftMonth.getTime()) {
                        rightMonth = newRight;
                      }
                      rightPickerView = 'calendar';
                    }}
                    disabled={new Date(rightMonth.getFullYear(), i, 1).getTime() <=
                      leftMonth.getTime()}
                  >
                    {MONTHS_SHORT[i]}
                  </button>
                {/each}
              </div>
            {:else if rightPickerView === 'years'}
              <div class="grid max-h-48 grid-cols-4 gap-1 overflow-y-auto">
                {#each years as year (`right-year-${year}`)}
                  <button
                    type="button"
                    class="rounded-lg px-2 py-2 text-sm transition-colors {rightMonth.getFullYear() ===
                    year
                      ? 'bg-blue-600 font-semibold text-white'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}"
                    onclick={(e) => {
                      e.stopPropagation();
                      const newRight = new Date(year, rightMonth.getMonth(), 1);
                      if (newRight.getTime() > leftMonth.getTime()) {
                        rightMonth = newRight;
                      } else {
                        rightMonth = new Date(year, leftMonth.getMonth() + 1, 1);
                      }
                      rightPickerView = 'calendar';
                    }}
                  >
                    {year}
                  </button>
                {/each}
              </div>
            {:else}
              <div class="mb-1 grid grid-cols-7 gap-0.5">
                {#each DAYS as day, i (`right-${i}`)}
                  <div
                    class="flex h-7 items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    {day}
                  </div>
                {/each}
              </div>

              <div class="grid grid-cols-7 gap-0.5">
                {#each getCalendarDays(rightMonth) as day, i (`right-day-${i}`)}
                  {#if day === null}
                    <div class="h-7"></div>
                  {:else}
                    <button
                      type="button"
                      class="flex h-7 w-full items-center justify-center text-sm transition-colors {isRangeStart(
                        rightMonth,
                        day
                      ) || isRangeEnd(rightMonth, day)
                        ? 'rounded-lg bg-blue-600 font-semibold text-white'
                        : isInRange(rightMonth, day)
                          ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                          : isToday(rightMonth, day)
                            ? 'rounded-lg font-medium text-blue-600 ring-1 ring-blue-500 ring-inset dark:text-blue-400 dark:ring-blue-400'
                            : isDateDisabled(rightMonth, day, true)
                              ? 'cursor-not-allowed text-gray-300 dark:text-gray-600'
                              : 'rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}"
                      onclick={() => selectDate(rightMonth, day, true)}
                      onmouseenter={() => handleMouseEnter(rightMonth, day)}
                      onmouseleave={handleMouseLeave}
                      disabled={isDateDisabled(rightMonth, day, true)}
                    >
                      {day}
                    </button>
                  {/if}
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <div class="mt-4 flex justify-end border-t border-gray-100 pt-3 dark:border-gray-700">
          <button
            type="button"
            class="rounded-lg px-4 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            onclick={clearDates}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
