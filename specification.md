# Mini-BI Library Specification

## Overview

Mini-BI is a lightweight, flexible dashboard library built with SvelteKit that enables the creation of interactive, customizable dashboards. The library provides a block-based architecture where users can create dashboards composed of draggable, resizable blocks containing different types of data visualizations and content.

## Core Features

### Dashboard Management
- Create new dashboards
- Load existing dashboards
- Update dashboard configurations
- Delete dashboards
- Dashboard persistence through injectable services

### Block System
- **Draggable blocks**: Users can drag blocks to reposition them within the dashboard
- **Resizable blocks**: Blocks can be resized to accommodate different content needs
- **Block types**: Support for multiple block types (Table, Graph, Text)
- **Dynamic block creation**: Add new blocks to existing dashboards
- **Block removal**: Remove blocks from dashboards

### Data Integration
- **Service injection**: Flexible data service architecture
- **Mock service**: Built-in mock service for development and testing
- **Real-time updates**: Support for dynamic data refresh

## Architecture

### Service Layer

#### IDashboardService Interface
```typescript
interface IDashboardService {
  // Dashboard CRUD operations
  loadDashboards(): Promise<Dashboard[]>;
  createDashboard(dashboard: CreateDashboardRequest): Promise<Dashboard>;
  updateDashboard(id: string, dashboard: UpdateDashboardRequest): Promise<Dashboard>;
  deleteDashboard(id: string): Promise<void>;
  
  // Block data operations
  loadBlockData(blockId: string, blockType: BlockType, config: BlockConfig): Promise<BlockData>;
}
```

#### MockDashboardService
- Provides hardcoded sample data for all dashboard and block operations
- Includes realistic sample datasets for tables, graphs, and text blocks
- Simulates async operations with appropriate delays
- Useful for development, testing, and demonstrations

### Block Types

#### 1. Table Block
- **Technology**: wx-svelte-grid
- **Features**:
  - Sortable columns
  - Filterable data
  - Pagination support
  - Column resizing
  - Row selection
  - Export functionality (CSV, JSON)
- **Configuration**:
  - Column definitions
  - Data source mapping
  - Pagination settings
  - Sorting preferences
  - Filter configurations

#### 2. Graph Block
- **Technology**: Apache ECharts
- **Supported chart types**:
  - Line charts
  - Bar charts (vertical/horizontal)
  - Pie charts
  - Scatter plots
  - Area charts
  - Donut charts
  - Gauge charts
  - Heatmaps
- **Features**:
  - Interactive tooltips
  - Zoom and pan capabilities
  - Legend configuration
  - Color theme customization
  - Animation effects
  - Data label options
- **Configuration**:
  - Chart type selection
  - Data series mapping
  - Axis configurations
  - Color schemes
  - Legend positioning
  - Animation settings

#### 3. Text Block
- **Technology**: Custom Svelte component with Handlebars-like templating
- **Features**:
  - Rich text formatting (bold, italic, underline)
  - Dynamic value injection using `{{variable}}` syntax
  - HTML content support
  - Custom styling options
  - Link support
- **Template Variables**:
  - Dashboard-level variables
  - Block-specific data values
  - System variables (date, time, user info)
- **Configuration**:
  - Text content with template syntax
  - Variable definitions and mappings
  - Styling options (font, color, size)
  - Alignment settings

## Data Models

### Dashboard Model
```typescript
interface Dashboard {
  id: string;
  name: string;
  description?: string;
  created: Date;
  lastModified: Date;
  layout: DashboardLayout;
  blocks: Block[];
  variables?: Record<string, any>;
}
```

### Block Model
```typescript
interface Block {
  id: string;
  type: BlockType;
  title: string;
  position: Position;
  size: Size;
  config: BlockConfig;
  dataSource?: DataSourceConfig;
}

type BlockType = 'table' | 'graph' | 'text';

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}
```

### Block Configurations

#### TableBlockConfig
```typescript
interface TableBlockConfig extends BlockConfig {
  columns: ColumnDefinition[];
  pagination: PaginationConfig;
  sorting: SortingConfig;
  filtering: FilterConfig;
}
```

#### GraphBlockConfig
```typescript
interface GraphBlockConfig extends BlockConfig {
  chartType: ChartType;
  series: SeriesConfig[];
  xAxis: AxisConfig;
  yAxis: AxisConfig;
  legend: LegendConfig;
  colors: string[];
  animations: AnimationConfig;
}
```

#### TextBlockConfig
```typescript
interface TextBlockConfig extends BlockConfig {
  content: string; // Template with {{variable}} syntax
  variables: Record<string, string>;
  styling: TextStyling;
}
```

## User Interface

### Dashboard Canvas
- **Grid-based layout**: Snap-to-grid positioning for consistent alignment
- **Drag and drop**: Intuitive block manipulation
- **Resize handles**: Visual indicators for resizing blocks
- **Context menus**: Right-click options for block operations
- **Toolbar**: Quick access to common actions

### Block Editor
- **Modal/sidebar interface** for configuring block properties
- **Real-time preview** of changes
- **Data source selection** and mapping
- **Validation and error handling**

### Dashboard Management
- **Dashboard list view** with search and filtering
- **Creation wizard** for new dashboards
- **Template gallery** with pre-built dashboard examples
- **Import/export functionality**

## Technical Requirements

### Dependencies
- **SvelteKit**: Core framework
- **Apache ECharts**: Chart library
- **wx-svelte-grid**: Table component
- **TypeScript**: Type safety and development experience

### Browser Support
- Modern browsers with ES2020+ support
- Chrome 88+, Firefox 85+, Safari 14+, Edge 88+

### Performance
- **Lazy loading**: Load block data on demand
- **Virtual scrolling**: For large datasets in tables
- **Chart optimization**: Efficient rendering for large datasets
- **Bundle splitting**: Optimize loading times

## API Specification

### Dashboard Service Methods

#### loadDashboards()
- **Returns**: `Promise<Dashboard[]>`
- **Description**: Retrieve all available dashboards
- **Error handling**: Network errors, permission errors

#### createDashboard(request)
- **Parameters**: `CreateDashboardRequest`
- **Returns**: `Promise<Dashboard>`
- **Description**: Create a new dashboard
- **Validation**: Name uniqueness, required fields

#### updateDashboard(id, request)
- **Parameters**: `string, UpdateDashboardRequest`
- **Returns**: `Promise<Dashboard>`
- **Description**: Update existing dashboard
- **Validation**: Dashboard existence, permission checks

#### loadBlockData(blockId, blockType, config)
- **Parameters**: `string, BlockType, BlockConfig`
- **Returns**: `Promise<BlockData>`
- **Description**: Load data for a specific block
- **Caching**: Implement appropriate caching strategies

## Security Considerations

### Data Access
- **Service-level authentication**: Delegate security to injected services
- **Input validation**: Sanitize all user inputs
- **XSS prevention**: Proper escaping in text blocks

### Template Security
- **Limited template syntax**: Restrict to safe operations only
- **No code execution**: Prevent arbitrary JavaScript execution
- **Content sanitization**: Clean HTML content in text blocks

## Development Guidelines

### Code Organization
```
src/
├── lib/
│   ├── components/
│   │   ├── blocks/
│   │   │   ├── TableBlock.svelte
│   │   │   ├── GraphBlock.svelte
│   │   │   └── TextBlock.svelte
│   │   ├── dashboard/
│   │   │   ├── Dashboard.svelte
│   │   │   ├── DashboardCanvas.svelte
│   │   │   └── BlockEditor.svelte
│   │   └── common/
│   ├── services/
│   │   ├── IDashboardService.ts
│   │   └── MockDashboardService.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       ├── template.ts
│       └── validation.ts
└── routes/
    └── demo/
```

### Testing Strategy
- **Unit tests**: Individual components and services
- **Integration tests**: Dashboard functionality
- **E2E tests**: Complete user workflows
- **Visual regression tests**: UI consistency

### Documentation
- **API documentation**: Comprehensive service documentation
- **Component documentation**: Props and usage examples
- **User guide**: Dashboard creation and management
- **Developer guide**: Custom service implementation

## Future Enhancements

### Phase 2 Features
- **Advanced chart types**: 3D charts, map visualizations
- **Collaborative editing**: Multi-user dashboard editing
- **Advanced templating**: More complex template expressions
- **Dashboard themes**: Customizable visual themes
- **Mobile responsiveness**: Touch-friendly interactions

### Extensibility
- **Plugin system**: Third-party block types
- **Custom data sources**: Additional service implementations
- **Theme framework**: Custom styling system
- **Widget marketplace**: Shareable block templates