// Core components
export { default as DashboardComponent } from './components/dashboard/Dashboard.svelte';
export { default as DashboardCanvas } from './components/dashboard/DashboardCanvas.svelte';
export { default as DashboardManager } from './components/dashboard/DashboardManager.svelte';
export { default as BlockEditor } from './components/dashboard/BlockEditor.svelte';
export { default as TableBlock } from './components/blocks/TableBlock.svelte';
export { default as GraphBlock } from './components/blocks/GraphBlock.svelte';
export { default as TextBlock } from './components/blocks/TextBlock.svelte';

// Services
export { MockDashboardService } from './services/MockDashboardService.js';

// Types
export type {
  Dashboard,
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
  BlockResizeEvent
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
