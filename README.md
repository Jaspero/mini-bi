# 📊 Mini-BI - Svelte Business Intelligence Library

A comprehensive, lightweight business intelligence library built with Svelte 5. Create interactive dashboards with drag-and-drop functionality, real-time data visualization, dynamic filtering, and SQL query management.

## ✨ Features

- 🎯 **Interactive Dashboards**: Drag-and-drop block positioning with real-time editing
- 📊 **Multiple Chart Types**: Line, bar, pie, scatter, area, donut, gauge, and heatmap charts
- 📋 **Data Tables**: Sortable, filterable tables with pagination support
- 🔍 **Advanced Filtering**: String, date range, numeric range, and list filters
- 📝 **Rich Text Blocks**: Template-based text with variable interpolation
- 🗄️ **SQL Query Management**: Built-in SQL editor with syntax highlighting and AI assistance
- 🎨 **Responsive Design**: Mobile-first design with touch support
- 🔄 **Real-time Updates**: Automatic data refresh and filter application
- 🛠️ **TypeScript Support**: Full type safety and IntelliSense support
- 🎪 **Extensible**: Easy to extend with custom block types and data sources
- 🌗 **Dark Mode**: Built-in light/dark theme with system preference detection and toggle

## 🚀 Quick Start

### Installation

```bash
npm install @jaspero/mini-bi --save-exact
```

### Dependencies

Install required peer dependencies:

```bash
npm install svelte@^5.0.0 --save-exact
```

For styling support, install Tailwind CSS:

```bash
npm install tailwindcss @tailwindcss/forms @tailwindcss/typography --save-exact
```

### Basic Setup

1. **Configure Tailwind CSS** (if using):

```javascript
// tailwind.config.js
export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './node_modules/@jaspero/mini-bi/**/*.{html,js,svelte,ts}'
  ],
  theme: {
    extend: {}
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')]
};
```

2. **Import styles in your app**:

```css
/* app.css */
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';
```

3. **Create your first dashboard**:

```svelte
<!-- App.svelte -->
<script>
  import { DashboardComponent, MockDashboardService } from '@jaspero/mini-bi';

  const dashboardService = new MockDashboardService();
  let selectedDashboardId = '1'; // Use existing sample dashboard
</script>

<main class="h-screen">
  <DashboardComponent {dashboardService} {selectedDashboardId} editable={true} />
</main>
```

## 📖 Implementation Guide

### 1. Creating a Custom Dashboard Service

Implement the `IDashboardService` interface for your data source:

```typescript
import type { IDashboardService, Dashboard, Query, QueryResult } from '@jaspero/mini-bi';

export class CustomDashboardService implements IDashboardService {
  async loadDashboards(): Promise<Dashboard[]> {
    const response = await fetch('/api/dashboards');
    return response.json();
  }

  async executeQuery(queryId: string, parameters?: Record<string, any>): Promise<QueryResult> {
    const response = await fetch(`/api/queries/${queryId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parameters })
    });
    return response.json();
  }

  async getDatabaseSchema(): Promise<DatabaseSchema> {
    const response = await fetch('/api/schema');
    return response.json();
  }

  // Implement other required methods...
}
```

### 2. Creating Dashboard Layouts

```typescript
import type { Dashboard, DashboardLayout } from '@jaspero/mini-bi';

const dashboard: Dashboard = {
  id: 'my-dashboard',
  name: 'Sales Analytics',
  description: 'Monthly sales performance dashboard',
  created: new Date(),
  lastModified: new Date(),
  layout: {
    gridSize: 80,
    columns: 20,
    rows: 15,
    gap: 10,
    canvasWidth: { type: 'screen' }, // or { type: 'fixed', value: 1600 }
    canvasHeight: { type: 'fixed', value: 1000 }
  },
  blocks: [
    {
      id: 'sales-chart',
      type: 'graph',
      title: 'Monthly Sales',
      position: { x: 0, y: 0 },
      size: { width: 10, height: 6 },
      dataSource: {
        type: 'query',
        queryId: 'sales-data'
      },
      config: {
        chartType: 'line',
        series: [
          { name: 'Sales', dataKey: 'sales', color: '#3b82f6' },
          { name: 'Target', dataKey: 'target', color: '#ef4444' }
        ],
        xAxis: { type: 'category', name: 'Month' },
        yAxis: { type: 'value', name: 'Amount ($)' },
        legend: { show: true, position: 'top', align: 'right' }
      }
    },
    {
      id: 'sales-table',
      type: 'table',
      title: 'Sales Data',
      position: { x: 10, y: 0 },
      size: { width: 10, height: 6 },
      dataSource: {
        type: 'query',
        queryId: 'sales-data'
      },
      config: {
        columns: [
          { key: 'month', header: 'Month', type: 'string', sortable: true },
          { key: 'sales', header: 'Sales', type: 'number', sortable: true },
          { key: 'target', header: 'Target', type: 'number', sortable: true }
        ],
        pagination: { enabled: true, pageSize: 10 },
        sorting: { enabled: true }
      }
    }
  ],
  filters: [
    {
      id: 'date-filter',
      key: 'date_range',
      name: 'Date Range',
      type: 'date_range',
      active: true,
      initialValue: [new Date('2024-01-01'), new Date('2024-12-31')]
    }
  ]
};
```

### 3. Adding Custom Block Types

```svelte
<!-- CustomBlock.svelte -->
<script lang="ts">
  import type { Block, BlockData, IDashboardService } from '@jaspero/mini-bi';

  interface Props {
    block: Block;
    dashboardService: IDashboardService;
    filterParams?: Record<string, any>;
    showControls?: boolean;
  }

  let { block, dashboardService, filterParams = {}, showControls = false }: Props = $props();

  let data: BlockData | null = $state(null);
  let loading = $state(false);

  async function loadData() {
    loading = true;
    try {
      data = await dashboardService.loadBlockData(
        block.id,
        block.type,
        block.config,
        block.dataSource,
        filterParams
      );
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    loadData();
  });

  $effect(() => {
    if (filterParams) {
      loadData();
    }
  });
</script>

<div class="h-full w-full rounded-lg border border-gray-200 bg-white p-4">
  {#if loading}
    <div class="flex h-full items-center justify-center">
      <div class="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
    </div>
  {:else if data}
    <!-- Your custom visualization here -->
    <pre>{JSON.stringify(data, null, 2)}</pre>
  {/if}
</div>
```

### 4. Setting Up Filters

```typescript
import type { Filter } from '@jaspero/mini-bi';

const filters: Filter[] = [
  {
    id: 'region-filter',
    key: 'region',
    name: 'Sales Region',
    type: 'list',
    active: true,
    initialValue: ['North America'],
    options: [
      { label: 'North America', value: 'North America' },
      { label: 'Europe', value: 'Europe' },
      { label: 'Asia Pacific', value: 'Asia Pacific' }
    ]
  },
  {
    id: 'date-range',
    key: 'date_range',
    name: 'Date Range',
    type: 'date_range',
    active: true,
    initialValue: [new Date('2024-01-01'), new Date('2024-12-31')]
  },
  {
    id: 'min-sales',
    key: 'min_sales',
    name: 'Minimum Sales',
    type: 'integer',
    active: false,
    initialValue: 1000,
    min: 0,
    max: 100000
  }
];
```

### 5. Using Individual Components

```svelte
<!-- Dashboard Manager -->
<script>
  import { DashboardManager, MockDashboardService } from '@jaspero/mini-bi';

  const service = new MockDashboardService();
</script>

<DashboardManager {service} />

<!-- Query Manager -->
<script>
  import { GlobalQueryManager } from '@jaspero/mini-bi';
</script>

<GlobalQueryManager dashboardService={service} />

<!-- Individual Blocks -->
<script>
  import { TableBlock, GraphBlock, TextBlock } from '@jaspero/mini-bi';
</script>

<TableBlock {block} {dashboardService} />
<GraphBlock {block} {dashboardService} />
<TextBlock {block} dashboardVariables={variables} />
```

## 🔧 Configuration Options

### Chart Configuration

```typescript
import type { GraphBlockConfig } from '@jaspero/mini-bi';

const chartConfig: GraphBlockConfig = {
  chartType: 'line', // 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'donut' | 'gauge'
  series: [
    {
      name: 'Revenue',
      dataKey: 'revenue',
      color: '#3b82f6'
    }
  ],
  xAxis: {
    type: 'category', // 'category' | 'value' | 'time'
    name: 'Time Period'
  },
  yAxis: {
    type: 'value',
    name: 'Amount ($)',
    min: 0
  },
  legend: {
    show: true,
    position: 'top', // 'top' | 'bottom' | 'left' | 'right'
    align: 'center' // 'left' | 'center' | 'right'
  },
  colors: ['#3b82f6', '#ef4444', '#10b981'],
  animations: {
    enabled: true,
    duration: 1000,
    easing: 'cubicInOut'
  }
};
```

### Table Configuration

```typescript
import type { TableBlockConfig } from '@jaspero/mini-bi';

const tableConfig: TableBlockConfig = {
  columns: [
    {
      key: 'name',
      header: 'Product Name',
      type: 'string',
      sortable: true,
      width: 200
    },
    {
      key: 'price',
      header: 'Price',
      type: 'number',
      sortable: true,
      formatter: (value) => `$${value.toLocaleString()}`
    }
  ],
  pagination: {
    enabled: true,
    pageSize: 25,
    showSizeChanger: true,
    pageSizeOptions: [10, 25, 50, 100]
  },
  sorting: {
    enabled: true,
    defaultSort: {
      column: 'name',
      direction: 'asc'
    }
  },
  filtering: {
    enabled: true,
    type: 'text'
  }
};
```

## 🎨 Styling and Theming

The library uses Tailwind CSS classes. You can customize the appearance by:

1. **Override CSS classes**:

```css
.mini-bi-dashboard {
  @apply border-gray-300 bg-gray-50;
}

.mini-bi-block {
  @apply rounded-xl shadow-lg;
}
```

2. **Custom CSS variables**:

```css
:root {
  --mini-bi-primary: #3b82f6;
  --mini-bi-secondary: #64748b;
  --mini-bi-success: #10b981;
  --mini-bi-danger: #ef4444;
  --mini-bi-warning: #f59e0b;
}
```

## 📱 Mobile Support

The library is fully responsive with touch support:

- Touch-based drag and drop
- Mobile-optimized controls
- Responsive grid system
- Touch-friendly resize handles

## 🧪 Testing

Use the included MockDashboardService for testing and development:

```typescript
import { MockDashboardService } from '@jaspero/mini-bi';

const mockService = new MockDashboardService();

// Test dashboard loading
const dashboards = await mockService.loadDashboards();
console.log('Available dashboards:', dashboards);

// Test query execution
const result = await mockService.executeQuery('sales-query', {
  region: ['North America'],
  date_range: [new Date('2024-01-01'), new Date('2024-12-31')]
});
console.log('Query result:', result);
```

## 🔌 API Reference

### Core Components

- **DashboardComponent**: Main dashboard viewer/editor
- **DashboardManager**: Dashboard list and management
- **GlobalQueryManager**: SQL query management
- **FilterSidebar**: Dynamic filter controls
- **TableBlock**: Data table visualization
- **GraphBlock**: Chart visualization
- **TextBlock**: Rich text with templating

### Services

- **IDashboardService**: Interface for data operations
- **MockDashboardService**: Built-in mock implementation

### Types

All TypeScript types are exported for full type safety in your application.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- 📖 [Documentation](https://github.com/Jaspero/mini-bi)
- 🐛 [Issues](https://github.com/Jaspero/mini-bi/issues)
- 💬 [Discussions](https://github.com/Jaspero/mini-bi/discussions)

---

Built with ❤️ using Svelte 5 and TypeScript
