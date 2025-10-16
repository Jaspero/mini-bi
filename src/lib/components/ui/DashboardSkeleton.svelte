<div class="flex h-screen flex-col bg-gray-50">
  <div class="flex items-center justify-between border-b border-gray-200 bg-white p-4 shadow-sm">
    <div class="h-8 w-48 animate-pulse rounded bg-gray-200"></div>
    <div class="flex gap-2">
      <div class="h-10 w-10 animate-pulse rounded bg-gray-200"></div>
      <div class="h-10 w-10 animate-pulse rounded bg-gray-200"></div>
      <div class="h-10 w-10 animate-pulse rounded bg-gray-200"></div>
    </div>
  </div>

  <div class="flex-1 overflow-auto p-6">
    <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {#each Array(6) as _, i}
        <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div class="mb-4 flex items-center justify-between">
            <div class="h-6 w-32 animate-pulse rounded bg-gray-200"></div>
            <div class="h-6 w-6 animate-pulse rounded bg-gray-200"></div>
          </div>
          <div class="space-y-3">
            <div class="h-4 w-full animate-pulse rounded bg-gray-100"></div>
            <div class="h-4 w-5/6 animate-pulse rounded bg-gray-100"></div>
            <div class="h-4 w-4/6 animate-pulse rounded bg-gray-100"></div>
            <div class="h-32 w-full animate-pulse rounded bg-gray-100"></div>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>
