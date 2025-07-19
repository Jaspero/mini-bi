import type {
  IDashboardService,
  Dashboard,
  CreateDashboardRequest,
  UpdateDashboardRequest,
  BlockData,
  BlockType,
  BlockConfig,
  QueryResult,
  QueryColumn,
  Query,
  DatabaseSchema
} from '../types/index.ts';

export class MockDashboardService implements IDashboardService {
  private dashboards: Dashboard[] = [
    {
      id: '1',
      name: 'Sales Dashboard',
      description: 'Overview of sales performance and metrics',
      created: new Date('2024-01-15'),
      lastModified: new Date('2024-06-01'),
      layout: {
        gridSize: 80,
        columns: 20,
        rows: 15,
        gap: 10,
        canvasWidth: { type: 'fixed', value: 1600 },
        canvasHeight: { type: 'fixed', value: 1000 }
      },
      blocks: [
        {
          id: 'block-1',
          type: 'graph',
          title: 'Monthly Sales',
          position: { x: 0, y: 0 },
          size: { width: 8, height: 6 },
          dataSource: {
            type: 'query',
            queryId: 'sales-query'
          },
          config: {
            chartType: 'line',
            series: [
              { name: 'Sales', dataKey: 'sales', color: '#3b82f6' },
              { name: 'Target', dataKey: 'target', color: '#ef4444' }
            ],
            xAxis: { type: 'category', name: 'Month' },
            yAxis: { type: 'value', name: 'Amount ($)' },
            legend: { show: true, position: 'top', align: 'right' },
            colors: ['#3b82f6', '#ef4444', '#10b981'],
            animations: { enabled: true, duration: 1000, easing: 'cubicInOut' }
          } as any
        },
        {
          id: 'block-2',
          type: 'table',
          title: 'Top Products',
          position: { x: 8, y: 0 },
          size: { width: 8, height: 6 },
          dataSource: {
            type: 'mock'
          },
          config: {
            columns: [
              { key: 'product', header: 'Product', type: 'string', sortable: true },
              { key: 'sales', header: 'Sales', type: 'number', sortable: true },
              { key: 'growth', header: 'Growth %', type: 'number', sortable: true }
            ],
            pagination: { enabled: true, pageSize: 10 },
            sorting: { enabled: true, defaultSort: { column: 'sales', direction: 'desc' } },
            filtering: { enabled: true, type: 'text' }
          } as any
        },
        {
          id: 'block-3',
          type: 'text',
          title: 'Key Metrics',
          position: { x: 0, y: 6 },
          size: { width: 6, height: 4 },
          config: {
            content: `
              <h3>Performance Summary</h3>
              <p>Total Revenue: <strong>{{totalRevenue}}</strong></p>
              <p>Growth Rate: <strong>{{growthRate}}%</strong></p>
              <p>Last Updated: {{lastUpdated}}</p>
            `,
            variables: {
              totalRevenue: '$1,234,567',
              growthRate: '12.5',
              lastUpdated: new Date().toLocaleDateString()
            },
            styling: {
              fontSize: 14,
              fontFamily: 'Arial, sans-serif',
              color: '#1f2937',
              padding: 16,
              textAlign: 'left',
              fontWeight: 'normal',
              fontStyle: 'normal'
            }
          } as any
        },
        {
          id: 'block-4',
          type: 'graph',
          title: 'Sales by Category',
          position: { x: 6, y: 6 },
          size: { width: 6, height: 6 },
          dataSource: {
            type: 'mock'
          },
          config: {
            chartType: 'pie',
            series: [{ name: 'Categories', dataKey: 'value' }],
            xAxis: { type: 'category' },
            yAxis: { type: 'value' },
            legend: { show: true, position: 'right', align: 'center' },
            colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'],
            animations: { enabled: true, duration: 800, easing: 'quadraticOut' }
          } as any
        }
      ],
      variables: {
        companyName: 'Acme Corp',
        currentQuarter: 'Q2 2024'
      },
      filters: [
        {
          id: 'date-range-filter',
          key: 'date_range',
          name: 'Date Range',
          type: 'date_range',
          active: true,
          initialValue: [new Date('2024-01-01'), new Date('2024-12-31')],
          description: 'Filter data by date range'
        },
        {
          id: 'region-filter',
          key: 'region',
          name: 'Region',
          type: 'list',
          active: true,
          initialValue: ['North America'],
          options: [
            { label: 'North America', value: 'North America' },
            { label: 'Europe', value: 'Europe' },
            { label: 'Asia Pacific', value: 'Asia Pacific' },
            { label: 'Latin America', value: 'Latin America' }
          ],
          description: 'Filter by sales region'
        }
      ]
    },
    {
      id: '2',
      name: 'Marketing Dashboard',
      description: 'Marketing campaign performance and analytics',
      created: new Date('2024-02-20'),
      lastModified: new Date('2024-05-15'),
      layout: {
        gridSize: 80,
        columns: 20,
        rows: 12,
        gap: 10,
        canvasWidth: { type: 'screen' },
        canvasHeight: { type: 'fixed', value: 800 }
      },
      blocks: [
        {
          id: 'block-5',
          type: 'graph',
          title: 'Campaign Performance',
          position: { x: 0, y: 0 },
          size: { width: 12, height: 6 },
          dataSource: {
            type: 'query',
            queryId: 'campaign-query'
          },
          config: {
            chartType: 'bar',
            series: [
              { name: 'Impressions', dataKey: 'impressions' },
              { name: 'Clicks', dataKey: 'clicks' }
            ],
            xAxis: { type: 'category', name: 'Campaign' },
            yAxis: { type: 'value', name: 'Count' },
            legend: { show: true, position: 'top', align: 'left' },
            colors: ['#8b5cf6', '#06b6d4'],
            animations: { enabled: true, duration: 1200, easing: 'cubicInOut' }
          } as any
        },
        {
          id: 'block-6',
          type: 'text',
          title: 'Campaign Summary',
          position: { x: 12, y: 0 },
          size: { width: 6, height: 6 },
          config: {
            content: `
              <h2>{{campaignName}}</h2>
              <div style="margin: 10px 0;">
                <p><strong>Total Spend:</strong> {{totalSpend}}</p>
                <p><strong>ROAS:</strong> {{roas}}</p>
                <p><strong>Conversions:</strong> {{conversions}}</p>
              </div>
              <p><em>Updated: {{lastUpdate}}</em></p>
            `,
            variables: {
              campaignName: 'Summer 2024 Campaign',
              totalSpend: '$45,678',
              roas: '3.2x',
              conversions: '1,234',
              lastUpdate: new Date().toLocaleString()
            },
            styling: {
              fontSize: 14,
              fontFamily: 'Arial, sans-serif',
              color: '#374151',
              backgroundColor: '#f9fafb',
              padding: 20,
              textAlign: 'left',
              fontWeight: 'normal',
              fontStyle: 'normal'
            }
          } as any
        }
      ],
      variables: {
        campaignBudget: '$50,000',
        targetAudience: '18-34 years'
      },
      filters: [
        {
          id: 'campaign-status-filter',
          key: 'status',
          name: 'Campaign Status',
          type: 'list',
          active: true,
          initialValue: ['active'],
          options: [
            { label: 'Active', value: 'active' },
            { label: 'Paused', value: 'paused' },
            { label: 'Completed', value: 'completed' }
          ],
          description: 'Filter campaigns by status'
        },
        {
          id: 'budget-filter',
          key: 'min_budget',
          name: 'Minimum Budget',
          type: 'integer',
          active: false,
          initialValue: 1000,
          description: 'Filter campaigns with minimum budget'
        }
      ]
    }
  ];

  private globalQueries: Query[] = [
    {
      id: 'sales-query',
      name: 'Monthly Sales Data',
      description: 'Retrieves monthly sales and target data',
      sql: 'SELECT month, sales, target FROM monthly_sales ORDER BY month',
      parameters: [],
      created: new Date('2024-01-15'),
      lastModified: new Date('2024-06-01'),
      lastExecuted: new Date('2024-06-01'),
      isActive: true
    },
    {
      id: 'campaign-query',
      name: 'Campaign Performance Data',
      description: 'Retrieves campaign performance metrics',
      sql: 'SELECT campaign_name, impressions, clicks FROM campaign_stats ORDER BY campaign_name',
      parameters: [],
      created: new Date('2024-02-20'),
      lastModified: new Date('2024-05-15'),
      lastExecuted: new Date('2024-05-15'),
      isActive: true
    },
    {
      id: 'user-growth-query',
      name: 'User Growth Analytics',
      description: 'Monthly user registration and churn data',
      sql: 'SELECT month, new_users, churned_users FROM user_analytics ORDER BY month',
      parameters: [],
      created: new Date('2024-02-01'),
      lastModified: new Date('2024-05-15'),
      lastExecuted: new Date('2024-05-15'),
      isActive: true
    },
    {
      id: 'revenue-query',
      name: 'Revenue Breakdown',
      description: 'Revenue by product category',
      sql: 'SELECT category, revenue, profit_margin FROM revenue_breakdown ORDER BY revenue DESC',
      parameters: [],
      created: new Date('2024-03-10'),
      lastModified: new Date('2024-05-20'),
      lastExecuted: new Date('2024-05-20'),
      isActive: true
    }
  ];

  private queryResults = new Map<string, any[]>([
    [
      'sales-query',
      [
        { month: 'Jan', sales: 4000, target: 4500 },
        { month: 'Feb', sales: 3000, target: 3500 },
        { month: 'Mar', sales: 5000, target: 4800 },
        { month: 'Apr', sales: 4500, target: 4200 },
        { month: 'May', sales: 6000, target: 5500 },
        { month: 'Jun', sales: 5500, target: 5800 }
      ]
    ],
    [
      'campaign-query',
      [
        { campaign_name: 'Summer Sale', impressions: 125000, clicks: 3200 },
        { campaign_name: 'Back to School', impressions: 98000, clicks: 2800 },
        { campaign_name: 'Holiday Promo', impressions: 156000, clicks: 4100 },
        { campaign_name: 'New Year Deal', impressions: 87000, clicks: 2300 }
      ]
    ]
  ]);

  async loadDashboards(): Promise<Dashboard[]> {
    await this.delay(500);
    return [...this.dashboards];
  }

  async createDashboard(request: CreateDashboardRequest): Promise<Dashboard> {
    await this.delay(300);

    const newDashboard: Dashboard = {
      id: this.generateId(),
      name: request.name,
      description: request.description,
      created: new Date(),
      lastModified: new Date(),
      layout: request.layout,
      blocks: request.blocks || [],
      variables: request.variables || {},
      filters: request.filters || []
    };

    this.dashboards.push(newDashboard);
    return newDashboard;
  }

  async updateDashboard(id: string, request: UpdateDashboardRequest): Promise<Dashboard> {
    await this.delay(300);

    const dashboardIndex = this.dashboards.findIndex((d) => d.id === id);
    if (dashboardIndex === -1) {
      throw new Error(`Dashboard with id ${id} not found`);
    }

    const dashboard = this.dashboards[dashboardIndex];
    const updatedDashboard: Dashboard = {
      ...dashboard,
      ...request,
      id: dashboard.id, // Ensure ID doesn't change
      created: dashboard.created, // Preserve creation date
      lastModified: new Date()
    };

    this.dashboards[dashboardIndex] = updatedDashboard;
    return updatedDashboard;
  }

  async deleteDashboard(id: string): Promise<void> {
    await this.delay(300);

    const dashboardIndex = this.dashboards.findIndex((d) => d.id === id);
    if (dashboardIndex === -1) {
      throw new Error(`Dashboard with id ${id} not found`);
    }

    this.dashboards.splice(dashboardIndex, 1);
  }

  async loadBlockData(
    blockId: string,
    blockType: BlockType,
    config: BlockConfig
  ): Promise<BlockData> {
    await this.delay(200);

    // Check if the block has a dataSource configuration
    const dataSource = (config as any)?.dataSource;

    // If dataSource is query type, use query execution
    if (dataSource?.type === 'query' && dataSource?.queryId) {
      try {
        const queryResult = await this.executeQuery(dataSource.queryId);
        return this.convertQueryResultToBlockData(queryResult);
      } catch (error) {
        console.warn(
          `Failed to execute query ${dataSource.queryId}, falling back to mock data:`,
          error
        );
        // Fall back to mock data if query fails
      }
    }

    // Default behavior: generate mock data based on block type
    switch (blockType) {
      case 'table':
        return this.generateTableData();
      case 'graph':
        return this.generateGraphData(config as any);
      case 'text':
        return { data: [], metadata: { lastUpdated: new Date() } };
      default:
        throw new Error(`Unsupported block type: ${blockType}`);
    }
  }

  async executeQuery(queryId: string, parameters?: Record<string, any>): Promise<QueryResult> {
    await this.delay(300);

    // Find the query in global queries
    const query = this.globalQueries.find((q) => q.id === queryId);

    if (!query) {
      throw new Error(`Query with id ${queryId} not found`);
    }

    if (!query.isActive) {
      throw new Error(`Query ${queryId} is not active`);
    }

    // Get mock data for this query
    const mockData = this.queryResults.get(queryId);
    if (!mockData) {
      throw new Error(`No mock data available for query ${queryId}`);
    }

    // Convert to QueryResult format
    const columns: QueryColumn[] =
      mockData.length > 0
        ? Object.keys(mockData[0]).map((key) => ({
            name: key,
            type: typeof mockData[0][key] === 'number' ? 'number' : 'string',
            nullable: false
          }))
        : [];

    const rows = mockData.map((row) => columns.map((col) => row[col.name]));

    return {
      columns,
      rows,
      rowCount: rows.length,
      executionTime: Math.random() * 500 + 100 // Random execution time between 100-600ms
    };
  }

  async validateQuery(sql: string): Promise<{ isValid: boolean; error?: string }> {
    await this.delay(100);

    // Simple validation - check for basic SQL structure
    const sqlLower = sql.toLowerCase().trim();

    if (!sqlLower.startsWith('select')) {
      return { isValid: false, error: 'Query must start with SELECT' };
    }

    if (!sqlLower.includes('from')) {
      return { isValid: false, error: 'Query must include FROM clause' };
    }

    // Check for dangerous operations
    const dangerousKeywords = ['drop', 'delete', 'truncate', 'alter', 'create', 'insert', 'update'];
    for (const keyword of dangerousKeywords) {
      if (sqlLower.includes(keyword)) {
        return { isValid: false, error: `Operation ${keyword.toUpperCase()} is not allowed` };
      }
    }

    return { isValid: true };
  }

  async getQueryPreview(sql: string, limit = 10): Promise<QueryResult> {
    await this.delay(200);

    const validation = await this.validateQuery(sql);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const sampleData = [
      { id: 1, name: 'Sample Item 1', value: 100, date: '2024-01-01' },
      { id: 2, name: 'Sample Item 2', value: 200, date: '2024-01-02' },
      { id: 3, name: 'Sample Item 3', value: 150, date: '2024-01-03' }
    ].slice(0, limit);

    const columns: QueryColumn[] = [
      { name: 'id', type: 'number', nullable: false },
      { name: 'name', type: 'string', nullable: false },
      { name: 'value', type: 'number', nullable: false },
      { name: 'date', type: 'string', nullable: false }
    ];

    const rows = sampleData.map((row) => [row.id, row.name, row.value, row.date]);

    return {
      columns,
      rows,
      rowCount: rows.length,
      executionTime: Math.random() * 200 + 50
    };
  }

  private convertQueryResultToBlockData(queryResult: QueryResult): BlockData {
    const data = queryResult.rows.map((row) => {
      const obj: any = {};
      queryResult.columns.forEach((column, index) => {
        obj[column.name] = row[index];
      });
      return obj;
    });

    return {
      data,
      metadata: {
        totalCount: queryResult.rowCount,
        lastUpdated: new Date(),
        source: 'SQL Query'
      }
    };
  }

  private generateTableData(): BlockData {
    const products = [
      'MacBook Pro',
      'iPhone 15',
      'iPad Air',
      'Apple Watch',
      'AirPods Pro',
      'iMac',
      'Mac Mini',
      'iPad Pro',
      'Apple TV',
      'HomePod'
    ];

    const data = products.map((product, index) => ({
      id: index + 1,
      product,
      sales: Math.floor(Math.random() * 50000) + 10000,
      growth: Math.floor(Math.random() * 40) - 10,
      category: index % 2 === 0 ? 'Hardware' : 'Accessories',
      lastUpdated: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
    }));

    return {
      data,
      metadata: {
        totalCount: data.length,
        lastUpdated: new Date(),
        source: 'Mock Sales API'
      }
    };
  }

  private generateGraphData(config: any): BlockData {
    const chartType = config?.chartType || 'line';

    switch (chartType) {
      case 'line':
      case 'bar':
      case 'area':
        return {
          data: [
            { month: 'Jan', sales: 4000, target: 4500 },
            { month: 'Feb', sales: 3000, target: 3500 },
            { month: 'Mar', sales: 5000, target: 4800 },
            { month: 'Apr', sales: 4500, target: 4200 },
            { month: 'May', sales: 6000, target: 5500 },
            { month: 'Jun', sales: 5500, target: 5800 }
          ],
          metadata: { lastUpdated: new Date(), source: 'Sales Database' }
        };

      case 'pie':
      case 'donut':
        return {
          data: [
            { name: 'Electronics', value: 35 },
            { name: 'Clothing', value: 28 },
            { name: 'Home & Garden', value: 20 },
            { name: 'Sports', value: 12 },
            { name: 'Books', value: 5 }
          ],
          metadata: { lastUpdated: new Date(), source: 'Category Analytics' }
        };

      case 'scatter':
        return {
          data: Array.from({ length: 50 }, (_, i) => ({
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 20 + 5
          })),
          metadata: { lastUpdated: new Date(), source: 'Scatter Analysis' }
        };

      default:
        return {
          data: [],
          metadata: { lastUpdated: new Date(), source: 'Mock Data' }
        };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  async loadGlobalQueries(): Promise<Query[]> {
    return [...this.globalQueries];
  }

  async saveGlobalQuery(query: Omit<Query, 'id' | 'created'>): Promise<Query> {
    const newQuery: Query = {
      ...query,
      id: `query-${Date.now()}`,
      created: new Date(),
      lastModified: new Date()
    };

    this.globalQueries.push(newQuery);
    return newQuery;
  }

  async updateGlobalQuery(queryId: string, updates: Partial<Query>): Promise<Query> {
    const queryIndex = this.globalQueries.findIndex((q) => q.id === queryId);
    if (queryIndex === -1) {
      throw new Error(`Query with id ${queryId} not found`);
    }

    this.globalQueries[queryIndex] = {
      ...this.globalQueries[queryIndex],
      ...updates,
      lastModified: new Date()
    };

    return this.globalQueries[queryIndex];
  }

  async deleteGlobalQuery(queryId: string): Promise<void> {
    const queryIndex = this.globalQueries.findIndex((q) => q.id === queryId);
    if (queryIndex === -1) {
      throw new Error(`Query with id ${queryId} not found`);
    }

    this.globalQueries.splice(queryIndex, 1);
  }

  async getGlobalQuery(queryId: string): Promise<Query | null> {
    return this.globalQueries.find((q) => q.id === queryId) || null;
  }

  async generateSQLFromText(description: string): Promise<string> {
    await this.delay(800); // Simulate AI processing time

    // Mock AI responses based on common patterns
    const lowerDescription = description.toLowerCase();

    if (lowerDescription.includes('user') && lowerDescription.includes('order')) {
      return `SELECT u.username, COUNT(o.id) as total_orders, SUM(o.total_amount) as total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.username
ORDER BY total_spent DESC;`;
    }

    if (lowerDescription.includes('product') && lowerDescription.includes('sales')) {
      return `SELECT p.name, SUM(oi.quantity) as total_sold, SUM(oi.total_price) as revenue
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.name
ORDER BY revenue DESC;`;
    }

    if (lowerDescription.includes('monthly') && lowerDescription.includes('sales')) {
      return `SELECT month, sales, target
FROM monthly_sales
WHERE year = YEAR(CURRENT_DATE)
ORDER BY id;`;
    }

    if (lowerDescription.includes('campaign') && lowerDescription.includes('performance')) {
      return `SELECT campaign_name, impressions, clicks, conversions, spend,
       ROUND((clicks / impressions) * 100, 2) as click_rate,
       ROUND((conversions / clicks) * 100, 2) as conversion_rate
FROM campaign_stats
ORDER BY spend DESC;`;
    }

    if (lowerDescription.includes('top') && lowerDescription.includes('customer')) {
      return `SELECT u.username, u.email, COUNT(o.id) as order_count, SUM(o.total_amount) as total_spent
FROM users u
JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.username, u.email
ORDER BY total_spent DESC
LIMIT 10;`;
    }

    if (lowerDescription.includes('recent') && lowerDescription.includes('order')) {
      return `SELECT o.id, u.username, o.total_amount, o.status, o.order_date
FROM orders o
JOIN users u ON o.user_id = u.id
ORDER BY o.order_date DESC
LIMIT 20;`;
    }

    if (lowerDescription.includes('category') && lowerDescription.includes('revenue')) {
      return `SELECT c.name as category, SUM(oi.total_price) as revenue
FROM categories c
JOIN products p ON c.id = p.category_id
JOIN order_items oi ON p.id = oi.product_id
GROUP BY c.id, c.name
ORDER BY revenue DESC;`;
    }

    // Default response for unrecognized patterns
    return `SELECT COUNT(*) as total_records
FROM users
WHERE created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY);`;
  }

  async getDatabaseSchema(): Promise<DatabaseSchema> {
    await this.delay(200);

    return {
      tables: [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'INTEGER', nullable: false, primary: true },
            { name: 'username', type: 'VARCHAR(255)', nullable: false },
            { name: 'email', type: 'VARCHAR(255)', nullable: false },
            { name: 'created_at', type: 'TIMESTAMP', nullable: false },
            { name: 'updated_at', type: 'TIMESTAMP', nullable: true },
            { name: 'is_active', type: 'BOOLEAN', nullable: false, defaultValue: true }
          ],
          primaryKeys: ['id'],
          indexes: [
            { name: 'idx_users_email', columns: ['email'], unique: true },
            { name: 'idx_users_username', columns: ['username'], unique: true }
          ],
          showInActions: true
        },
        {
          name: 'products',
          columns: [
            { name: 'id', type: 'INTEGER', nullable: false, primary: true },
            { name: 'name', type: 'VARCHAR(255)', nullable: false },
            { name: 'price', type: 'DECIMAL(10,2)', nullable: false },
            { name: 'category_id', type: 'INTEGER', nullable: true },
            { name: 'description', type: 'TEXT', nullable: true },
            { name: 'stock_quantity', type: 'INTEGER', nullable: false, defaultValue: 0 },
            { name: 'created_at', type: 'TIMESTAMP', nullable: false },
            { name: 'updated_at', type: 'TIMESTAMP', nullable: true }
          ],
          primaryKeys: ['id'],
          foreignKeys: [
            { columnName: 'category_id', referencedTable: 'categories', referencedColumn: 'id' }
          ],
          indexes: [
            { name: 'idx_products_category', columns: ['category_id'], unique: false },
            { name: 'idx_products_name', columns: ['name'], unique: false }
          ],
          showInActions: true
        },
        {
          name: 'orders',
          columns: [
            { name: 'id', type: 'INTEGER', nullable: false, primary: true },
            { name: 'user_id', type: 'INTEGER', nullable: false },
            { name: 'total_amount', type: 'DECIMAL(10,2)', nullable: false },
            { name: 'status', type: 'VARCHAR(50)', nullable: false },
            { name: 'order_date', type: 'TIMESTAMP', nullable: false },
            { name: 'shipped_date', type: 'TIMESTAMP', nullable: true },
            { name: 'delivery_address', type: 'TEXT', nullable: true }
          ],
          primaryKeys: ['id'],
          foreignKeys: [
            { columnName: 'user_id', referencedTable: 'users', referencedColumn: 'id' }
          ],
          indexes: [
            { name: 'idx_orders_user', columns: ['user_id'], unique: false },
            { name: 'idx_orders_status', columns: ['status'], unique: false },
            { name: 'idx_orders_date', columns: ['order_date'], unique: false }
          ],
          showInActions: true
        },
        {
          name: 'categories',
          columns: [
            { name: 'id', type: 'INTEGER', nullable: false, primary: true },
            { name: 'name', type: 'VARCHAR(255)', nullable: false },
            { name: 'description', type: 'TEXT', nullable: true },
            { name: 'parent_id', type: 'INTEGER', nullable: true },
            { name: 'created_at', type: 'TIMESTAMP', nullable: false }
          ],
          primaryKeys: ['id'],
          foreignKeys: [
            { columnName: 'parent_id', referencedTable: 'categories', referencedColumn: 'id' }
          ],
          indexes: [
            { name: 'idx_categories_name', columns: ['name'], unique: true },
            { name: 'idx_categories_parent', columns: ['parent_id'], unique: false }
          ],
          showInActions: false
        },
        {
          name: 'order_items',
          columns: [
            { name: 'id', type: 'INTEGER', nullable: false, primary: true },
            { name: 'order_id', type: 'INTEGER', nullable: false },
            { name: 'product_id', type: 'INTEGER', nullable: false },
            { name: 'quantity', type: 'INTEGER', nullable: false },
            { name: 'unit_price', type: 'DECIMAL(10,2)', nullable: false },
            { name: 'total_price', type: 'DECIMAL(10,2)', nullable: false }
          ],
          primaryKeys: ['id'],
          foreignKeys: [
            { columnName: 'order_id', referencedTable: 'orders', referencedColumn: 'id' },
            { columnName: 'product_id', referencedTable: 'products', referencedColumn: 'id' }
          ],
          indexes: [
            { name: 'idx_order_items_order', columns: ['order_id'], unique: false },
            { name: 'idx_order_items_product', columns: ['product_id'], unique: false }
          ],
          showInActions: false
        },
        {
          name: 'monthly_sales',
          columns: [
            { name: 'id', type: 'INTEGER', nullable: false, primary: true },
            { name: 'month', type: 'VARCHAR(50)', nullable: false },
            { name: 'sales', type: 'DECIMAL(10,2)', nullable: false },
            { name: 'target', type: 'DECIMAL(10,2)', nullable: false },
            { name: 'year', type: 'INTEGER', nullable: false }
          ],
          primaryKeys: ['id'],
          indexes: [
            { name: 'idx_monthly_sales_month_year', columns: ['month', 'year'], unique: true }
          ],
          showInActions: true
        },
        {
          name: 'campaign_stats',
          columns: [
            { name: 'id', type: 'INTEGER', nullable: false, primary: true },
            { name: 'campaign_name', type: 'VARCHAR(255)', nullable: false },
            { name: 'impressions', type: 'INTEGER', nullable: false },
            { name: 'clicks', type: 'INTEGER', nullable: false },
            { name: 'conversions', type: 'INTEGER', nullable: false },
            { name: 'spend', type: 'DECIMAL(10,2)', nullable: false },
            { name: 'created_at', type: 'TIMESTAMP', nullable: false }
          ],
          primaryKeys: ['id'],
          indexes: [{ name: 'idx_campaign_stats_name', columns: ['campaign_name'], unique: false }],
          showInActions: false
        }
      ],
      views: [
        {
          name: 'user_order_summary',
          columns: [
            { name: 'user_id', type: 'INTEGER', nullable: false },
            { name: 'username', type: 'VARCHAR(255)', nullable: false },
            { name: 'total_orders', type: 'INTEGER', nullable: false },
            { name: 'total_spent', type: 'DECIMAL(10,2)', nullable: false },
            { name: 'avg_order_value', type: 'DECIMAL(10,2)', nullable: false }
          ],
          definition: `
            SELECT 
              u.id as user_id,
              u.username,
              COUNT(o.id) as total_orders,
              SUM(o.total_amount) as total_spent,
              AVG(o.total_amount) as avg_order_value
            FROM users u
            LEFT JOIN orders o ON u.id = o.user_id
            GROUP BY u.id, u.username
          `
        },
        {
          name: 'product_sales_summary',
          columns: [
            { name: 'product_id', type: 'INTEGER', nullable: false },
            { name: 'product_name', type: 'VARCHAR(255)', nullable: false },
            { name: 'category_name', type: 'VARCHAR(255)', nullable: true },
            { name: 'total_sold', type: 'INTEGER', nullable: false },
            { name: 'revenue', type: 'DECIMAL(10,2)', nullable: false }
          ],
          definition: `
            SELECT 
              p.id as product_id,
              p.name as product_name,
              c.name as category_name,
              SUM(oi.quantity) as total_sold,
              SUM(oi.total_price) as revenue
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN order_items oi ON p.id = oi.product_id
            GROUP BY p.id, p.name, c.name
          `
        }
      ],
      functions: [
        {
          name: 'calculate_order_total',
          parameters: [{ name: 'order_id', type: 'INTEGER', optional: false }],
          returnType: 'DECIMAL(10,2)',
          description: 'Calculates the total amount for a given order'
        },
        {
          name: 'get_user_stats',
          parameters: [
            { name: 'user_id', type: 'INTEGER', optional: false },
            { name: 'start_date', type: 'DATE', optional: true },
            { name: 'end_date', type: 'DATE', optional: true }
          ],
          returnType: 'TABLE',
          description: 'Returns comprehensive statistics for a user within a date range'
        }
      ]
    };
  }
}
