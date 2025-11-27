// Core components
export { default as DashboardComponent } from './components/dashboard/Dashboard.svelte';
export { default as DashboardCanvas } from './components/dashboard/DashboardCanvas.svelte';
export { default as DashboardManager } from './components/dashboard/DashboardManager.svelte';
export { default as DashboardEditor } from './components/dashboard/DashboardEditor.svelte';
export { default as BlockEditor } from './components/dashboard/BlockEditor.svelte';
export { default as FilterManager } from './components/dashboard/FilterManager.svelte';
export { default as FilterSidebar } from './components/dashboard/FilterSidebar.svelte';
export { default as GlobalQueryManager } from './components/query/GlobalQueryManager.svelte';
export { default as TableBlock } from './components/blocks/TableBlock.svelte';
export { default as GraphBlock } from './components/blocks/GraphBlock.svelte';
export { default as TextBlock } from './components/blocks/TextBlock.svelte';
export { default as ConfirmationModal } from './components/ui/ConfirmationModal.svelte';
export { default as SchemaSidebar } from './components/ui/SchemaSidebar.svelte';
export { default as Sidebar } from './components/ui/Sidebar.svelte';
export { default as DashboardSkeleton } from './components/ui/DashboardSkeleton.svelte';

// Services
export { MockDashboardService } from './services/MockDashboardService.js';

// Types
export type {
  Dashboard,
  DashboardListItem,
  Block,
  BlockType,
  ChartType,
  Position,
  Size,
  DashboardLayout,
  BlockConfig,
  TableBlockConfig,
  GraphBlockConfig,
  TextBlockConfig,
  TextVariable,
  ColumnDefinition,
  PaginationConfig,
  SortingConfig,
  FilterConfig,
  SeriesConfig,
  AxisConfig,
  LegendConfig,
  AnimationConfig,
  TextStyling,
  DataSourceConfig,
  CreateDashboardRequest,
  UpdateDashboardRequest,
  BlockData,
  IDashboardService,
  DashboardEvent,
  BlockMoveEvent,
  BlockResizeEvent,
  Query,
  QueryResult,
  QueryColumn,
  QueryParameter,
  DatabaseSchema,
  TableSchema,
  ViewSchema,
  ColumnSchema,
  ForeignKeySchema,
  IndexSchema,
  FunctionSchema,
  FunctionParameter,
  Filter,
  FilterOption,
  FilterValue
} from './types/index.js';

// Utilities
export {
  processTemplate,
  getSystemVariables,
  extractVariables,
  validateTemplate,
  sanitizeHtml,
  type TemplateContext
} from './utils/template.js';

export {
  validateDashboard,
  validateBlock,
  validateLayout,
  validatePosition,
  validateSize,
  findOverlappingBlocks,
  blocksOverlap,
  blockFitsInLayout,
  generateBlockId,
  generateDashboardId,
  type ValidationResult
} from './utils/validation.js';
