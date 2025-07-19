# 🚀 Mini-BI Implementation Examples

This document provides practical examples for implementing Mini-BI in different scenarios.

## 📊 Example 1: Basic Sales Dashboard

### Setup

```bash
npm install @jaspero/mini-bi --save-exact
npm install svelte@^5.0.0 tailwindcss @tailwindcss/forms --save-exact
```

### Implementation

```svelte
<!-- SalesDashboard.svelte -->
<script lang="ts">
  import { 
    DashboardComponent, 
    MockDashboardService,
    type Dashboard,
    type IDashboardService 
  } from '@jaspero/mini-bi';

  // Use mock service for demo
  const dashboardService: IDashboardService = new MockDashboardService();
  let selectedDashboardId = '1'; // Sales Dashboard from mock data
  let editable = true;

  // Handle dashboard updates
  function handleDashboardUpdate(dashboard: Dashboard) {
    console.log('Dashboard updated:', dashboard);
    // Save to your backend here
  }
</script>

<div class="h-screen bg-gray-50">
  <header class="bg-white shadow-sm border-b px-6 py-4">
    <h1 class="text-2xl font-bold text-gray-900">Sales Analytics</h1>
  </header>
  
  <main class="h-[calc(100vh-73px)]">
    <DashboardComponent 
      {dashboardService}
      {selectedDashboardId}
      {editable}
      onDashboardUpdated={handleDashboardUpdate}
    />
  </main>
</div>
```

## 🗄️ Example 2: Custom Database Service

### PostgreSQL Integration

```typescript
// services/PostgreSQLDashboardService.ts
import type { 
  IDashboardService, 
  Dashboard, 
  Query, 
  QueryResult,
  DatabaseSchema 
} from '@jaspero/mini-bi';

export class PostgreSQLDashboardService implements IDashboardService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async loadDashboards(): Promise<Dashboard[]> {
    const response = await fetch(`${this.baseUrl}/api/dashboards`);
    if (!response.ok) throw new Error('Failed to load dashboards');
    return response.json();
  }

  async executeQuery(queryId: string, parameters?: Record<string, any>): Promise<QueryResult> {
    const response = await fetch(`${this.baseUrl}/api/queries/${queryId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parameters })
    });
    
    if (!response.ok) throw new Error('Query execution failed');
    return response.json();
  }

  async getDatabaseSchema(): Promise<DatabaseSchema> {
    const response = await fetch(`${this.baseUrl}/api/schema`);
    if (!response.ok) throw new Error('Failed to load schema');
    return response.json();
  }

  async loadGlobalQueries(): Promise<Query[]> {
    const response = await fetch(`${this.baseUrl}/api/queries`);
    if (!response.ok) throw new Error('Failed to load queries');
    return response.json();
  }

  async saveGlobalQuery(query: Omit<Query, 'id' | 'created'>): Promise<Query> {
    const response = await fetch(`${this.baseUrl}/api/queries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query)
    });
    
    if (!response.ok) throw new Error('Failed to save query');
    return response.json();
  }

  // Implement remaining methods...
}
```

### Backend API Example (Node.js/Express)

```javascript
// server/routes/dashboards.js
const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Execute query with filters
router.post('/queries/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const { parameters } = req.body;

    // Get query from database
    const queryResult = await pool.query(
      'SELECT sql FROM queries WHERE id = $1 AND active = true',
      [id]
    );

    if (queryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Query not found' });
    }

    let sql = queryResult.rows[0].sql;
    const values = [];

    // Apply filters to SQL
    if (parameters) {
      const whereConditions = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(parameters)) {
        if (Array.isArray(value) && value.length === 2) {
          // Handle ranges
          if (value[0] instanceof Date || typeof value[0] === 'string') {
            whereConditions.push(`${key} BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
            values.push(value[0], value[1]);
            paramIndex += 2;
          }
        } else if (Array.isArray(value)) {
          // Handle lists
          const placeholders = value.map(() => `$${paramIndex++}`).join(',');
          whereConditions.push(`${key} IN (${placeholders})`);
          values.push(...value);
        } else {
          // Handle single values
          whereConditions.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      if (whereConditions.length > 0) {
        const whereClause = whereConditions.join(' AND ');
        if (sql.toLowerCase().includes('where')) {
          sql = sql.replace(/where/i, `WHERE (${whereClause}) AND`);
        } else {
          sql += ` WHERE ${whereClause}`;
        }
      }
    }

    // Execute the query
    const result = await pool.query(sql, values);
    
    // Format response
    const columns = result.fields.map(field => ({
      name: field.name,
      type: getPostgreSQLType(field.dataTypeID),
      nullable: true
    }));

    res.json({
      columns,
      rows: result.rows.map(row => columns.map(col => row[col.name])),
      rowCount: result.rowCount,
      executionTime: Date.now() - startTime
    });

  } catch (error) {
    console.error('Query execution error:', error);
    res.status(500).json({ error: 'Query execution failed' });
  }
});

function getPostgreSQLType(dataTypeID) {
  const typeMap = {
    23: 'number',    // int4
    20: 'number',    // int8
    1700: 'number',  // numeric
    25: 'string',    // text
    1043: 'string',  // varchar
    1114: 'string',  // timestamp
    16: 'boolean'    // bool
  };
  return typeMap[dataTypeID] || 'string';
}

module.exports = router;
```

## 📱 Example 3: Responsive Dashboard Layout

```svelte
<!-- ResponsiveDashboard.svelte -->
<script lang="ts">
  import { 
    DashboardComponent, 
    DashboardManager,
    GlobalQueryManager,
    type IDashboardService 
  } from '@jaspero/mini-bi';

  let { dashboardService }: { dashboardService: IDashboardService } = $props();
  
  let currentView = $state<'dashboards' | 'dashboard' | 'queries'>('dashboards');
  let selectedDashboardId = $state<string | null>(null);
  let showMobileMenu = $state(false);

  function selectDashboard(id: string) {
    selectedDashboardId = id;
    currentView = 'dashboard';
    showMobileMenu = false;
  }

  function showDashboards() {
    currentView = 'dashboards';
    selectedDashboardId = null;
  }

  function showQueries() {
    currentView = 'queries';
  }
</script>

<!-- Mobile Navigation -->
<nav class="bg-white shadow-sm border-b lg:hidden">
  <div class="flex items-center justify-between px-4 py-3">
    <h1 class="text-lg font-semibold">Mini-BI</h1>
    <button 
      onclick={() => showMobileMenu = !showMobileMenu}
      class="p-2 rounded-md hover:bg-gray-100"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
      </svg>
    </button>
  </div>
  
  {#if showMobileMenu}
    <div class="border-t bg-gray-50 px-4 py-2">
      <button 
        onclick={() => { currentView = 'dashboards'; showMobileMenu = false; }}
        class="block w-full text-left px-3 py-2 rounded hover:bg-white"
      >
        📊 Dashboards
      </button>
      <button 
        onclick={() => { currentView = 'queries'; showMobileMenu = false; }}
        class="block w-full text-left px-3 py-2 rounded hover:bg-white"
      >
        📝 Queries
      </button>
    </div>
  {/if}
</nav>

<div class="flex h-screen lg:h-screen">
  <!-- Desktop Sidebar -->
  <aside class="hidden lg:flex lg:flex-col lg:w-64 bg-white border-r">
    <div class="p-4 border-b">
      <h1 class="text-xl font-bold">Mini-BI</h1>
    </div>
    
    <nav class="flex-1 p-4">
      <button 
        onclick={showDashboards}
        class="w-full text-left px-3 py-2 rounded hover:bg-gray-100 {currentView === 'dashboards' ? 'bg-blue-50 text-blue-700' : ''}"
      >
        📊 Dashboards
      </button>
      <button 
        onclick={showQueries}
        class="w-full text-left px-3 py-2 rounded hover:bg-gray-100 {currentView === 'queries' ? 'bg-blue-50 text-blue-700' : ''}"
      >
        📝 Queries
      </button>
    </nav>
  </aside>

  <!-- Main Content -->
  <main class="flex-1 flex flex-col min-w-0">
    {#if currentView === 'dashboards'}
      <div class="flex-1 p-4 lg:p-6">
        <DashboardManager 
          {dashboardService}
          onDashboardSelect={selectDashboard}
        />
      </div>
    {:else if currentView === 'dashboard' && selectedDashboardId}
      <DashboardComponent 
        {dashboardService}
        selectedDashboardId={selectedDashboardId}
        editable={true}
      />
    {:else if currentView === 'queries'}
      <div class="flex-1 p-4 lg:p-6">
        <GlobalQueryManager {dashboardService} />
      </div>
    {/if}
  </main>
</div>
```

## 🎯 Example 4: Custom Block Type

```svelte
<!-- KPIBlock.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import type { Block, BlockData, IDashboardService } from '@jaspero/mini-bi';

  interface KPIConfig {
    metric: string;
    target?: number;
    unit?: string;
    format?: 'number' | 'currency' | 'percentage';
    thresholds?: {
      good: number;
      warning: number;
    };
  }

  interface Props {
    block: Block;
    dashboardService: IDashboardService;
    filterParams?: Record<string, any>;
    showControls?: boolean;
  }

  let { 
    block, 
    dashboardService, 
    filterParams = {}, 
    showControls = false 
  }: Props = $props();

  let data: BlockData | null = $state(null);
  let loading = $state(false);
  let error = $state('');

  const config = $derived(block.config as KPIConfig);
  const currentValue = $derived(data?.data?.[0]?.[config.metric] || 0);
  const targetValue = $derived(config.target || 0);
  const progress = $derived(targetValue ? (currentValue / targetValue) * 100 : 100);
  
  const status = $derived(() => {
    if (!config.thresholds) return 'neutral';
    if (currentValue >= config.thresholds.good) return 'good';
    if (currentValue >= config.thresholds.warning) return 'warning';
    return 'poor';
  });

  async function loadData() {
    if (!dashboardService) return;
    
    loading = true;
    error = '';
    
    try {
      data = await dashboardService.loadBlockData(
        block.id,
        block.type,
        block.config,
        block.dataSource,
        filterParams
      );
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load data';
    } finally {
      loading = false;
    }
  }

  function formatValue(value: number): string {
    switch (config.format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      default:
        return value.toLocaleString();
    }
  }

  onMount(loadData);

  $effect(() => {
    if (filterParams) {
      loadData();
    }
  });
</script>

<div class="h-full w-full bg-white border border-gray-200 rounded-lg p-6 flex flex-col">
  <!-- Header -->
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-semibold text-gray-900">{block.title}</h3>
    {#if showControls}
      <div class="flex gap-2">
        <!-- Block controls here -->
      </div>
    {/if}
  </div>

  {#if loading}
    <div class="flex-1 flex items-center justify-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  {:else if error}
    <div class="flex-1 flex items-center justify-center text-red-500">
      <p>{error}</p>
    </div>
  {:else}
    <!-- KPI Content -->
    <div class="flex-1 flex flex-col justify-center">
      <!-- Main Value -->
      <div class="text-center mb-4">
        <div class="text-4xl font-bold {status === 'good' ? 'text-green-600' : status === 'warning' ? 'text-yellow-600' : status === 'poor' ? 'text-red-600' : 'text-gray-900'}">
          {formatValue(currentValue)}
        </div>
        {#if config.unit}
          <div class="text-lg text-gray-500 mt-1">{config.unit}</div>
        {/if}
      </div>

      <!-- Progress Bar (if target is set) -->
      {#if config.target}
        <div class="mb-4">
          <div class="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress to Target</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div 
              class="h-2 rounded-full transition-all duration-500 {status === 'good' ? 'bg-green-500' : status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}"
              style="width: {Math.min(progress, 100)}%"
            ></div>
          </div>
          <div class="text-sm text-gray-500 mt-1">
            Target: {formatValue(targetValue)}
          </div>
        </div>
      {/if}

      <!-- Status Indicator -->
      <div class="text-center">
        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm {status === 'good' ? 'bg-green-100 text-green-800' : status === 'warning' ? 'bg-yellow-100 text-yellow-800' : status === 'poor' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}">
          {status === 'good' ? '✅ On Track' : status === 'warning' ? '⚠️ Needs Attention' : status === 'poor' ? '❌ Below Target' : '📊 Tracking'}
        </span>
      </div>
    </div>
  {/if}
</div>
```

## 🔗 Example 5: Real-time Dashboard

```svelte
<!-- RealtimeDashboard.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { DashboardComponent, type IDashboardService } from '@jaspero/mini-bi';

  let { dashboardService }: { dashboardService: IDashboardService } = $props();
  
  let selectedDashboardId = '1';
  let refreshInterval = 30000; // 30 seconds
  let isRealtime = $state(true);
  let lastUpdate = $state(new Date());
  let intervalId: number | null = null;

  function startRealtime() {
    if (intervalId) clearInterval(intervalId);
    
    intervalId = setInterval(() => {
      if (isRealtime) {
        // Trigger dashboard refresh by updating a reactive value
        lastUpdate = new Date();
        
        // Force refresh of all blocks
        const event = new CustomEvent('dashboard-refresh');
        document.dispatchEvent(event);
      }
    }, refreshInterval);
  }

  function stopRealtime() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function toggleRealtime() {
    isRealtime = !isRealtime;
    if (isRealtime) {
      startRealtime();
    } else {
      stopRealtime();
    }
  }

  onMount(() => {
    if (isRealtime) {
      startRealtime();
    }
  });

  onDestroy(() => {
    stopRealtime();
  });
</script>

<div class="h-screen flex flex-col">
  <!-- Realtime Controls -->
  <header class="bg-white border-b px-6 py-4 flex items-center justify-between">
    <h1 class="text-2xl font-bold">Realtime Dashboard</h1>
    
    <div class="flex items-center gap-4">
      <!-- Refresh Interval -->
      <select 
        bind:value={refreshInterval}
        onchange={startRealtime}
        class="rounded border-gray-300 text-sm"
      >
        <option value={5000}>5 seconds</option>
        <option value={10000}>10 seconds</option>
        <option value={30000}>30 seconds</option>
        <option value={60000}>1 minute</option>
        <option value={300000}>5 minutes</option>
      </select>

      <!-- Realtime Toggle -->
      <button
        onclick={toggleRealtime}
        class="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium {isRealtime ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}"
      >
        <div class="w-2 h-2 rounded-full {isRealtime ? 'bg-green-300 animate-pulse' : 'bg-gray-400'}"></div>
        {isRealtime ? 'Live' : 'Paused'}
      </button>

      <!-- Last Update -->
      <span class="text-sm text-gray-500">
        Last update: {lastUpdate.toLocaleTimeString()}
      </span>
    </div>
  </header>

  <!-- Dashboard -->
  <main class="flex-1">
    <DashboardComponent 
      {dashboardService}
      {selectedDashboardId}
      editable={false}
      key={lastUpdate.getTime()} <!-- Force re-render on update -->
    />
  </main>
</div>
```

## 🎨 Example 6: Custom Styling

```css
/* custom-dashboard.css */

/* Custom color scheme */
:root {
  --mini-bi-primary: #6366f1;
  --mini-bi-primary-light: #a5b4fc;
  --mini-bi-secondary: #64748b;
  --mini-bi-success: #059669;
  --mini-bi-warning: #d97706;
  --mini-bi-danger: #dc2626;
  --mini-bi-background: #f8fafc;
  --mini-bi-surface: #ffffff;
  --mini-bi-border: #e2e8f0;
}

/* Custom dashboard styling */
.mini-bi-dashboard {
  @apply bg-gradient-to-br from-blue-50 to-indigo-100;
}

/* Custom block styling */
.mini-bi-block {
  @apply shadow-lg border-0 rounded-xl backdrop-blur-sm;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.mini-bi-block:hover {
  @apply shadow-xl;
  transform: translateY(-2px);
  transition: all 0.2s ease-in-out;
}

/* Custom chart colors */
.mini-bi-chart {
  --chart-color-1: #6366f1;
  --chart-color-2: #8b5cf6;
  --chart-color-3: #06b6d4;
  --chart-color-4: #10b981;
  --chart-color-5: #f59e0b;
}

/* Custom filter sidebar */
.mini-bi-filter-sidebar {
  @apply bg-white/95 backdrop-blur-md;
  border-left: 1px solid rgba(255, 255, 255, 0.2);
}

/* Custom table styling */
.mini-bi-table {
  @apply border-separate border-spacing-0;
}

.mini-bi-table th {
  @apply bg-gradient-to-r from-gray-50 to-gray-100 font-semibold;
}

.mini-bi-table tr:nth-child(even) {
  @apply bg-gray-50/50;
}

.mini-bi-table tr:hover {
  @apply bg-blue-50/50;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  :root {
    --mini-bi-background: #0f172a;
    --mini-bi-surface: #1e293b;
    --mini-bi-border: #334155;
  }

  .mini-bi-dashboard {
    @apply bg-gradient-to-br from-slate-900 to-slate-800;
  }

  .mini-bi-block {
    background: rgba(30, 41, 59, 0.9);
    border: 1px solid rgba(51, 65, 85, 0.3);
  }
}
```

These examples provide comprehensive patterns for implementing Mini-BI in various scenarios, from basic setups to advanced custom implementations with real-time capabilities and custom styling.
