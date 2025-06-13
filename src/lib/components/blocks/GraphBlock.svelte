<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as echarts from 'echarts';
  import type { Block, GraphBlockConfig, BlockData, IDashboardService } from '../../types/index.js';

  export let block: Block;
  export let dashboardService: IDashboardService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export let onBlockUpdate: (block: Block) => void = () => {};
  export let onBlockEdit: (block: Block) => void = () => {};
  export let onBlockDelete: (blockId: string) => void = () => {};
  export let showControls = false;

  let graphConfig: GraphBlockConfig;
  let chartContainer: HTMLDivElement;
  let chart: echarts.ECharts | null = null;
  let loading = true;
  let error = '';
  let data: BlockData | null = null;

  $: {
    graphConfig = block.config as GraphBlockConfig;
    if (chart && data) {
      updateChart();
    }
  }

  onMount(async () => {
    await loadData();
    initChart();
  });

  onDestroy(() => {
    if (chart) {
      chart.dispose();
    }
  });

  async function loadData() {
    try {
      loading = true;
      error = '';
      // Pass the block configuration which includes dataSource
      const blockConfig = {
        ...block.config,
        dataSource: block.dataSource
      };
      data = await dashboardService.loadBlockData(block.id, block.type, blockConfig);
      console.log('GraphBlock loaded data:', data, 'for block:', block.id, 'dataSource:', block.dataSource);
      loading = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load data';
      loading = false;
    }
  }

  function initChart() {
    if (!chartContainer || !data) return;

    chart = echarts.init(chartContainer);
    updateChart();

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (chart) {
        chart.resize();
      }
    });
    resizeObserver.observe(chartContainer);
  }

  function updateChart() {
    if (!chart || !data || !graphConfig) return;

    const option = generateEChartsOption();
    chart.setOption(option, true);
  }

  function generateEChartsOption(): echarts.EChartsOption {
    if (!data) return {};
    
    const { chartType, series, xAxis, yAxis, legend, colors, animations } = graphConfig;

    const baseOption: echarts.EChartsOption = {
      color: colors,
      animation: animations?.enabled ?? true,
      animationDuration: animations?.duration ?? 1000,
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
        top: legend?.show ? '15%' : '10%',
        containLabel: true
      },
      legend: legend?.show ? {
        show: true,
        type: 'plain',
        orient: 'horizontal',
        left: legend.align,
        top: legend.position === 'top' ? 'top' : legend.position === 'bottom' ? 'bottom' : 'top',
        right: legend.position === 'right' ? 'right' : undefined,
        bottom: legend.position === 'bottom' ? 'bottom' : undefined
      } : { show: false }
    };

    switch (chartType) {
      case 'line':
      case 'bar':
      case 'area':
        return {
          ...baseOption,
          xAxis: {
            type: xAxis?.type || 'category',
            name: xAxis?.name,
            data: data.data.map(item => item[getDataKey()])
          },
          yAxis: {
            type: yAxis?.type || 'value',
            name: yAxis?.name,
            min: yAxis?.min,
            max: yAxis?.max
          },
          series: series.map(s => ({
            name: s.name,
            type: chartType === 'area' ? 'line' : chartType,
            data: data.data.map(item => item[s.dataKey]),
            areaStyle: chartType === 'area' ? {} : undefined,
            smooth: chartType === 'line' || chartType === 'area'
          }))
        };

      case 'pie':
      case 'donut':
        return {
          ...baseOption,
          series: [{
            name: series[0]?.name || 'Data',
            type: 'pie',
            radius: chartType === 'donut' ? ['40%', '70%'] : '70%',
            data: data.data.map(item => ({
              name: item.name,
              value: item.value
            })),
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }]
        };

      case 'scatter':
        return {
          ...baseOption,
          xAxis: {
            type: 'value',
            name: xAxis?.name
          },
          yAxis: {
            type: 'value',
            name: yAxis?.name
          },
          series: [{
            name: series[0]?.name || 'Data',
            type: 'scatter',
            data: data.data.map(item => [item.x, item.y, item.size])
          }]
        };

      case 'gauge':
        return {
          ...baseOption,
          series: [{
            name: series[0]?.name || 'Gauge',
            type: 'gauge',
            data: [{ value: data.data[0]?.value || 0, name: 'Value' }],
            detail: { fontSize: 20 }
          }]
        };

      case 'heatmap':
        return {
          ...baseOption,
          xAxis: {
            type: 'category',
            data: [...new Set(data.data.map(item => item.x))]
          },
          yAxis: {
            type: 'category',
            data: [...new Set(data.data.map(item => item.y))]
          },
          visualMap: {
            min: Math.min(...data.data.map(item => item.value)),
            max: Math.max(...data.data.map(item => item.value)),
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: '5%'
          },
          series: [{
            name: series[0]?.name || 'Heatmap',
            type: 'heatmap',
            data: data.data.map(item => [item.x, item.y, item.value]),
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }]
        };

      default:
        return baseOption;
    }
  }

  function getDataKey(): string {
    // For x-axis data, use the first available key
    const firstDataItem = data?.data[0];
    if (!firstDataItem) return 'x';
    
    return Object.keys(firstDataItem).find(key => 
      key !== 'value' && typeof firstDataItem[key] === 'string'
    ) || 'x';
  }

  async function refresh(event: MouseEvent) {
    event.stopPropagation();
    await loadData();
    if (chart && data) {
      updateChart();
    }
  }

  function handleEdit(event: MouseEvent) {
    event.stopPropagation();
    onBlockEdit(block);
  }

  function handleDelete(event: MouseEvent) {
    event.stopPropagation();
    if (confirm(`Are you sure you want to delete the "${block.title}" graph?`)) {
      onBlockDelete(block.id);
    }
  }
</script>

<div class="w-full h-full flex flex-col bg-white rounded-lg shadow-sm overflow-hidden">
  <div class="flex justify-between items-start p-4 border-b border-gray-200 bg-gray-50">
    <div class="flex flex-col gap-1">
      <h3 class="m-0 text-base font-semibold text-gray-800">{block.title}</h3>
      {#if block.dataSource?.type === 'query' && data?.metadata?.source}
        <span class="text-xs text-gray-500 italic">📊 {data.metadata.source}</span>
      {/if}
    </div>
    {#if showControls}
      <div class="flex items-center gap-1">
        <button 
          class="bg-transparent border-0 cursor-pointer p-1.5 rounded text-gray-500 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center" 
          on:click={handleEdit} 
          aria-label="Edit graph"
        >
          <span class="material-symbols-outlined text-base">edit</span>
        </button>
        <button 
          class="bg-transparent border-0 cursor-pointer p-1.5 rounded text-gray-500 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all" 
          on:click={refresh} 
          disabled={loading} 
          aria-label="Refresh chart data"
        >
          <span class="material-symbols-outlined text-base">refresh</span>
        </button>
        <button 
          class="bg-transparent border-0 cursor-pointer p-1.5 rounded text-gray-500 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center" 
          on:click={handleDelete} 
          aria-label="Delete graph"
        >
          <span class="material-symbols-outlined text-base">delete</span>
        </button>
      </div>
    {/if}
  </div>

  {#if loading}
    <div class="flex-1 flex flex-col justify-center items-center text-gray-500">
      <div class="w-8 h-8 border-3 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
      <p class="m-0">Loading chart data...</p>
    </div>
  {:else if error}
    <div class="flex-1 flex flex-col justify-center items-center text-red-600 p-5">
      <p class="m-0">Error: {error}</p>
      <button 
        class="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white border-0 rounded cursor-pointer transition-colors"
        on:click={refresh}
      >
        Retry
      </button>
    </div>
  {:else}
    <div class="flex-1 min-h-0 w-full" bind:this={chartContainer}></div>
  {/if}
</div>


