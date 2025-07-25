<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as echarts from 'echarts';
  import BlockActions from '../ui/BlockActions.svelte';
  import type { Block, GraphBlockConfig, BlockData, IDashboardService } from '../../types/index.ts';

  interface Props {
    block: Block;
    dashboardService: IDashboardService;
    filterParams?: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onBlockUpdate?: (block: Block) => void;
    onBlockEdit?: (block: Block) => void;
    onBlockDeleteRequest?: (block: Block) => void;
    showControls?: boolean;
  }

  let {
    block,
    dashboardService,
    filterParams = {},
    onBlockUpdate = () => {},
    onBlockEdit = () => {},
    onBlockDeleteRequest = () => {},
    showControls = false
  }: Props = $props();

  let graphConfig: GraphBlockConfig = $state({
    chartType: 'line',
    series: [],
    xAxis: { type: 'category' },
    yAxis: { type: 'value' },
    legend: { show: true, position: 'top', align: 'center' },
    colors: [],
    animations: { enabled: true, duration: 750, easing: 'cubicInOut' }
  });
  let chartContainer: HTMLDivElement | undefined = $state();
  let chart: echarts.ECharts | null = $state(null);
  let loading = $state(true);
  let error = $state('');
  let data: BlockData | null = $state(null);

  onMount(async () => {
    await loadData();
    initChart();
  });

  onDestroy(() => {
    if (chart) {
      chart.dispose();
    }
  });

  $effect(() => {
    graphConfig = block.config as GraphBlockConfig;
    if (chart && data) {
      updateChart();
    }
  });

  // Reload data when filter parameters change
  $effect(() => {
    if (filterParams) {
      loadData().then(() => {
        if (chart && data) {
          updateChart();
        }
      });
    }
  });

  async function loadData() {
    try {
      loading = true;
      error = '';

      const blockConfig = {
        ...block.config,
        dataSource: block.dataSource
      };

      data = await dashboardService.loadBlockData(block.id, block.type, blockConfig, block.dataSource, filterParams);
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
      legend: legend?.show
        ? {
            show: true,
            type: 'plain',
            orient: 'horizontal',
            left: legend.align,
            top:
              legend.position === 'top' ? 'top' : legend.position === 'bottom' ? 'bottom' : 'top',
            right: legend.position === 'right' ? 'right' : undefined,
            bottom: legend.position === 'bottom' ? 'bottom' : undefined
          }
        : { show: false }
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
            data: data.data.map((item) => item[getDataKey()])
          },
          yAxis: {
            type: yAxis?.type || 'value',
            name: yAxis?.name,
            min: yAxis?.min,
            max: yAxis?.max
          },
          series: series.map((s) => ({
            name: s.name,
            type: chartType === 'area' ? 'line' : chartType,
            data: data?.data.map((item) => item[s.dataKey]) || [],
            areaStyle: chartType === 'area' ? {} : undefined,
            smooth: chartType === 'line' || chartType === 'area'
          }))
        };

      case 'pie':
      case 'donut':
        return {
          ...baseOption,
          series: [
            {
              name: series[0]?.name || 'Data',
              type: 'pie',
              radius: chartType === 'donut' ? ['40%', '70%'] : '70%',
              data: data.data.map((item) => ({
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
            }
          ]
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
          series: [
            {
              name: series[0]?.name || 'Data',
              type: 'scatter',
              data: data.data.map((item) => [item.x, item.y, item.size])
            }
          ]
        };

      case 'gauge':
        return {
          ...baseOption,
          series: [
            {
              name: series[0]?.name || 'Gauge',
              type: 'gauge',
              data: [{ value: data.data[0]?.value || 0, name: 'Value' }],
              detail: { fontSize: 20 }
            }
          ]
        };

      case 'heatmap':
        return {
          ...baseOption,
          xAxis: {
            type: 'category',
            data: [...new Set(data.data.map((item) => item.x))]
          },
          yAxis: {
            type: 'category',
            data: [...new Set(data.data.map((item) => item.y))]
          },
          visualMap: {
            min: Math.min(...data.data.map((item) => item.value)),
            max: Math.max(...data.data.map((item) => item.value)),
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: '5%'
          },
          series: [
            {
              name: series[0]?.name || 'Heatmap',
              type: 'heatmap',
              data: data.data.map((item) => [item.x, item.y, item.value]),
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
              }
            }
          ]
        };

      default:
        return baseOption;
    }
  }

  function getDataKey(): string {
    // For x-axis data, use the first available key
    const firstDataItem = data?.data[0];
    if (!firstDataItem) return 'x';

    return (
      Object.keys(firstDataItem).find(
        (key) => key !== 'value' && typeof firstDataItem[key] === 'string'
      ) || 'x'
    );
  }

  async function onRefresh() {
    await loadData();
    if (chart && data) {
      updateChart();
    }
  }

  function onEdit() {
    onBlockEdit(block);
  }

  function onDelete() {
    onBlockDeleteRequest(block);
  }

  function onExportImage() {
    if (!chart) {
      console.error('Chart not initialized');
      return;
    }

    try {
      // Get the chart as a data URL (PNG format by default)
      const dataURL = chart.getDataURL({
        type: 'png',
        pixelRatio: 2, // Higher resolution
        backgroundColor: '#ffffff'
      });

      // Create download link
      const link = document.createElement('a');
      const filename = `${block.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_chart_${new Date().toISOString().split('T')[0]}.png`;
      link.download = filename;
      link.href = dataURL;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export chart as image:', err);
      alert('Failed to export chart as image');
    }
  }
</script>

<div class="flex h-full w-full flex-col overflow-hidden rounded-lg bg-white shadow-sm">
  <div
    class="flex h-[50px] items-center justify-between border-b border-gray-200 bg-gray-50 px-2 py-2 sm:px-4 sm:py-3"
  >
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <h3 class="m-0 truncate text-sm font-semibold text-gray-900 sm:text-base">{block.title}</h3>
    </div>
    <div class="flex flex-shrink-0 items-center gap-1">
      <BlockActions
        {block}
        {data}
        {loading}
        {showControls}
        {onEdit}
        {onRefresh}
        {onDelete}
        {onExportImage}
      />
    </div>
  </div>

  {#if loading}
    <div class="flex flex-1 flex-col items-center justify-center text-gray-500">
      <div
        class="mb-3 h-8 w-8 animate-spin rounded-full border-3 border-gray-200 border-t-blue-600"
      ></div>
      <p class="m-0">Loading chart data...</p>
    </div>
  {:else if error}
    <div class="flex flex-1 flex-col items-center justify-center p-5 text-red-600">
      <p class="m-0">Error: {error}</p>
      <button
        class="mt-3 cursor-pointer rounded border-0 bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
        onclick={onRefresh}
      >
        Retry
      </button>
    </div>
  {:else}
    <div class="min-h-0 w-full flex-1" bind:this={chartContainer}></div>
  {/if}
</div>
