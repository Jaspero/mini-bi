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
  variables?: Record<string, any>;
}

export interface DashboardLayout {
  gridSize: number;
  columns: number;
  rows: number;
  gap: number;
  canvasWidth: CanvasDimension;
  canvasHeight: CanvasDimension;
}

export interface CanvasDimension {
  type: 'fixed' | 'screen';
  value?: number; // Only used when type is 'fixed'
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
  type: 'string' | 'number' | 'date' | 'boolean' | 'list';
  defaultValue?: any;
  required?: boolean;
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

// Database schema types
export interface DatabaseSchema {
  tables: TableSchema[];
  views?: ViewSchema[];
  functions?: FunctionSchema[];
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  primaryKeys?: string[];
  foreignKeys?: ForeignKeySchema[];
  indexes?: IndexSchema[];
  showInActions?: boolean; // Flag to show in quick actions
}

export interface ViewSchema {
  name: string;
  columns: ColumnSchema[];
  definition: string;
}

export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  primary?: boolean;
  defaultValue?: any;
  comment?: string;
}

export interface ForeignKeySchema {
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface IndexSchema {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface FunctionSchema {
  name: string;
  parameters: FunctionParameter[];
  returnType: string;
  description?: string;
}

export interface FunctionParameter {
  name: string;
  type: string;
  optional: boolean;
}

// Request/Response types
export interface CreateDashboardRequest {
  name: string;
  description?: string;
  layout: DashboardLayout;
  blocks?: Block[];
  variables?: Record<string, any>;
}

export interface UpdateDashboardRequest {
  name?: string;
  description?: string;
  layout?: DashboardLayout;
  blocks?: Block[];
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
  loadBlockData(
    blockId: string,
    blockType: BlockType,
    config: BlockConfig,
    dataSource?: DataSourceConfig
  ): Promise<BlockData>;

  // Query operations
  executeQuery(queryId: string, parameters?: Record<string, any>): Promise<QueryResult>;
  validateQuery(sql: string): Promise<{ isValid: boolean; error?: string }>;
  getQueryPreview(sql: string, limit?: number): Promise<QueryResult>;

  // Schema operations
  getDatabaseSchema(): Promise<DatabaseSchema>;

  // Global Query Management
  loadGlobalQueries(): Promise<Query[]>;
  saveGlobalQuery(query: Omit<Query, 'id' | 'created'>): Promise<Query>;
  updateGlobalQuery(queryId: string, updates: Partial<Query>): Promise<Query>;
  deleteGlobalQuery(queryId: string): Promise<void>;
  getGlobalQuery(queryId: string): Promise<Query | null>;

  // AI Operations
  generateSQLFromText(description: string): Promise<string>;
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
