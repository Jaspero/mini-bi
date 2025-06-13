// Core Types for Mini-BI Library

export type BlockType = 'table' | 'graph' | 'text';
export type ChartType = 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'donut' | 'gauge' | 'heatmap';

// Position and Size interfaces
export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

// Dashboard related interfaces
export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  created: Date;
  lastModified: Date;
  layout: DashboardLayout;
  blocks: Block[];
  queries: Query[];
  variables?: Record<string, any>;
}

export interface DashboardLayout {
  gridSize: number;
  columns: number;
  rows: number;
  gap: number;
}

export interface Block {
  id: string;
  type: BlockType;
  title: string;
  position: Position;
  size: Size;
  config: BlockConfig;
  dataSource?: DataSourceConfig;
}

// Base configuration interface
export interface BlockConfig {
  title?: string;
  refreshInterval?: number; // in seconds
}

// Table specific configurations
export interface TableBlockConfig extends BlockConfig {
  columns: ColumnDefinition[];
  pagination: PaginationConfig;
  sorting: SortingConfig;
  filtering: FilterConfig;
}

export interface ColumnDefinition {
  key: string;
  header: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  sortable?: boolean;
  filterable?: boolean;
  width?: number;
  formatter?: (value: any) => string;
}

export interface PaginationConfig {
  enabled: boolean;
  pageSize: number;
  showSizeChanger?: boolean;
  pageSizeOptions?: number[];
}

export interface SortingConfig {
  enabled: boolean;
  defaultSort?: {
    column: string;
    direction: 'asc' | 'desc';
  };
}

export interface FilterConfig {
  enabled: boolean;
  type: 'text' | 'select' | 'date' | 'number';
}

// Graph specific configurations
export interface GraphBlockConfig extends BlockConfig {
  chartType: ChartType;
  series: SeriesConfig[];
  xAxis: AxisConfig;
  yAxis: AxisConfig;
  legend: LegendConfig;
  colors: string[];
  animations: AnimationConfig;
}

export interface SeriesConfig {
  name: string;
  dataKey: string;
  type?: ChartType;
  color?: string;
}

export interface AxisConfig {
  type: 'category' | 'value' | 'time';
  name?: string;
  min?: number;
  max?: number;
  interval?: number;
}

export interface LegendConfig {
  show: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  align: 'left' | 'center' | 'right';
}

export interface AnimationConfig {
  enabled: boolean;
  duration: number;
  easing: 'linear' | 'quadraticIn' | 'quadraticOut' | 'cubicInOut';
}

// Text specific configurations
export interface TextBlockConfig extends BlockConfig {
  content: string; // Template with {{variable}} syntax
  variables: Record<string, string>;
  styling: TextStyling;
}

export interface TextStyling {
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor?: string;
  padding: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
}

// Data source configuration
export interface DataSourceConfig {
  type: 'api' | 'static' | 'mock' | 'query';
  endpoint?: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: any;
  staticData?: any[];
  queryId?: string; // Reference to a query
}

// Query management
export interface Query {
  id: string;
  name: string;
  description?: string;
  sql: string;
  parameters?: QueryParameter[];
  created: Date;
  lastModified: Date;
  lastExecuted?: Date;
  isActive: boolean;
}

export interface QueryParameter {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  defaultValue?: any;
  required: boolean;
  description?: string;
}

export interface QueryResult {
  columns: QueryColumn[];
  rows: any[][];
  rowCount: number;
  executionTime: number;
  error?: string;
}

export interface QueryColumn {
  name: string;
  type: string;
  nullable: boolean;
}

// Request/Response types
export interface CreateDashboardRequest {
  name: string;
  description?: string;
  layout: DashboardLayout;
  blocks?: Block[];
  queries?: Query[];
  variables?: Record<string, any>;
}

export interface UpdateDashboardRequest {
  name?: string;
  description?: string;
  layout?: DashboardLayout;
  blocks?: Block[];
  queries?: Query[];
  variables?: Record<string, any>;
}

export interface BlockData {
  data: any[];
  metadata?: {
    totalCount?: number;
    lastUpdated?: Date;
    source?: string;
  };
}

// Service interface
export interface IDashboardService {
  // Dashboard CRUD operations
  loadDashboards(): Promise<Dashboard[]>;
  createDashboard(dashboard: CreateDashboardRequest): Promise<Dashboard>;
  updateDashboard(id: string, dashboard: UpdateDashboardRequest): Promise<Dashboard>;
  deleteDashboard(id: string): Promise<void>;
  
  // Block data operations
  loadBlockData(blockId: string, blockType: BlockType, config: BlockConfig): Promise<BlockData>;
  
  // Query operations
  executeQuery(queryId: string, parameters?: Record<string, any>): Promise<QueryResult>;
  validateQuery(sql: string): Promise<{ isValid: boolean; error?: string }>;
  getQueryPreview(sql: string, limit?: number): Promise<QueryResult>;
}

// Events
export interface DashboardEvent {
  type: 'block-moved' | 'block-resized' | 'block-added' | 'block-removed' | 'block-updated';
  blockId: string;
  dashboardId: string;
  data?: any;
}

export interface BlockMoveEvent extends DashboardEvent {
  type: 'block-moved';
  oldPosition: Position;
  newPosition: Position;
}

export interface BlockResizeEvent extends DashboardEvent {
  type: 'block-resized';
  oldSize: Size;
  newSize: Size;
}
