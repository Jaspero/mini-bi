<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as echarts from 'echarts';
  import BlockActions from '../ui/BlockActions.svelte';
  import type { Block, GraphBlockConfig, BlockData, IDashboardService } from '../../types/index';

  interface Props {
    block: Block;
    dashboardService: IDashboardService;
    filterParams?: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onBlockUpdate?: (block: Block) => void;
    onBlockEdit?: (block: Block) => void;
    onBlockDeleteRequest?: (block: Block) => void;
    showControls?: boolean;
    readOnly?: boolean;
  }

  let {
    block,
    dashboardService,
    filterParams = {},
    onBlockUpdate = () => {},
    onBlockEdit = () => {},
    onBlockDeleteRequest = () => {},
    showControls = false,
    readOnly = false
  }: Props = $props();

  let graphConfig: GraphBlockConfig = $state(block.config as GraphBlockConfig);
  let chartContainer: HTMLDivElement | undefined = $state();
  let chart: echarts.ECharts | null = $state(null);
  let loading = $state(true);
  let error = $state('');
  let data: BlockData | null = $state(null);
  let isHovered = $state(false);
  let isRefreshing = $state(false);

  let resizeObserver: ResizeObserver | null = null;

  onMount(async () => {
    await loadData();

    if (typeof window !== 'undefined') {
      window.addEventListener('themechange', handleThemeChange);
    }
  });

  onDestroy(() => {
    if (chart) {
      chart.dispose();
      chart = null;
    }
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('themechange', handleThemeChange);
    }
  });

  function handleThemeChange() {
    if (chart && data) {
      updateChart();
    }
  }

  $effect(() => {
    if (chartContainer && data && !loading) {
      if (!chart || chart.isDisposed()) {
        if (resizeObserver) {
          resizeObserver.disconnect();
        }

        chart = echarts.init(chartContainer);

        resizeObserver = new ResizeObserver(() => {
          chart?.resize();
        });
        resizeObserver.observe(chartContainer);
      }
      updateChart();
    }
  });

  $effect(() => {
    const newConfig = block.config as GraphBlockConfig;
    const newConfigStr = JSON.stringify(newConfig);
    const currentConfigStr = JSON.stringify(graphConfig);

    if (newConfigStr !== currentConfigStr) {
      graphConfig = newConfig;
      if (chart && !chart.isDisposed() && data && !loading) {
        chart.clear();
        updateChart();
      }
    }
  });

  let previousDataSource = $state<string>('');

  $effect(() => {
    const currentDataSource = JSON.stringify(block.dataSource);
    if (currentDataSource !== previousDataSource && previousDataSource !== '') {
      previousDataSource = currentDataSource;
      if (chart && !chart.isDisposed()) {
        chart.dispose();
        chart = null;
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      reloadData();
    } else if (previousDataSource === '') {
      previousDataSource = currentDataSource;
    }
  });

  $effect(() => {
    if (filterParams) {
      reloadData();
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

      data = await dashboardService.loadBlockData(
        block.id,
        block.type,
        blockConfig,
        block.dataSource,
        filterParams
      );
      loading = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load data';
      loading = false;
    }
  }

  async function refreshData() {
    const dataSource = block.dataSource || (block.config as any)?.dataSource;

    if (dataSource?.type === 'query' && dataSource?.queryId) {
      await dashboardService.refreshQuery(dataSource.queryId, filterParams);
    }

    await reloadData();
  }

  async function reloadData() {
    try {
      isRefreshing = true;
      error = '';

      const blockConfig = {
        ...block.config,
        dataSource: block.dataSource
      };

      data = await dashboardService.loadBlockData(
        block.id,
        block.type,
        blockConfig,
        block.dataSource,
        filterParams
      );
      isRefreshing = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load data';
      isRefreshing = false;
    }
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
      backgroundColor: getCssVar('--minibi-color-surface', '#ffffff'),
      textStyle: { color: getCssVar('--minibi-color-text', '#111827') },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
        top: legend?.show ? '15%' : '10%',
        containLabel: true
      },
      xAxis:
        xAxis?.type === 'category'
          ? {
              type: 'category',
              name: xAxis.name,
              axisLine: {
                lineStyle: { color: getCssVar('--minibi-color-border-strong', '#d1d5db') }
              },
              axisLabel: { color: getCssVar('--minibi-color-text-muted', '#4b5563') },
              splitLine: { show: false }
            }
          : undefined,
      yAxis:
        yAxis?.type === 'value'
          ? {
              type: 'value',
              name: yAxis.name,
              axisLine: {
                lineStyle: { color: getCssVar('--minibi-color-border-strong', '#d1d5db') }
              },
              axisLabel: { color: getCssVar('--minibi-color-text-muted', '#4b5563') },
              splitLine: {
                show: true,
                lineStyle: { color: getCssVar('--minibi-color-grid-line', '#e5e7eb') }
              }
            }
          : undefined,
      legend: legend?.show
        ? {
            show: true,
            type: 'plain',
            orient: 'horizontal',
            left: legend.align,
            top: legend.position === 'top' ? 0 : 'auto',
            bottom: legend.position === 'bottom' ? 0 : 'auto',
            textStyle: { color: getCssVar('--minibi-color-text-muted', '#4b5563') }
          }
        : undefined
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
            itemStyle: s.color ? { color: s.color } : undefined,
            lineStyle:
              s.color && (chartType === 'line' || chartType === 'area')
                ? { color: s.color }
                : undefined,
            areaStyle:
              chartType === 'area' ? (s.color ? { color: s.color, opacity: 0.3 } : {}) : undefined,
            smooth: chartType === 'line' || chartType === 'area'
          }))
        };

      case 'pie':
      case 'donut':
        const nameKey = (graphConfig as any).nameKey || 'name';
        const valueKey = (graphConfig as any).valueKey || 'value';
        return {
          ...baseOption,
          series: [
            {
              name: series[0]?.name || 'Data',
              type: 'pie',
              radius: chartType === 'donut' ? ['40%', '70%'] : '70%',
              data: data.data.map((item) => ({
                name: item[nameKey],
                value: item[valueKey]
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
    if (chart && !chart.isDisposed()) {
      chart.dispose();
      chart = null;
    }
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    await refreshData();
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
      const bg = getCssVar('--minibi-color-surface', '#ffffff');
      const dataURL = chart.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: bg
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

  // Derive background color from CSS variable at runtime
  const getCssVar = (name: string, fallback: string) => {
    if (typeof window === 'undefined') return fallback;
    const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return val || fallback;
  };
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="bi-block flex h-full w-full flex-col overflow-hidden"
  onmouseenter={() => (isHovered = true)}
  onmouseleave={() => (isHovered = false)}
>
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
        showControls={showControls || isHovered}
        {readOnly}
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
    <div class="relative min-h-0 w-full flex-1">
      <div class="chart-surface h-full w-full" bind:this={chartContainer}></div>
      {#if isRefreshing}
        <div class="absolute inset-0 flex items-center justify-center bg-white/70">
          <div
            class="h-8 w-8 animate-spin rounded-full border-3 border-gray-200 border-t-blue-600"
          ></div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- placeholder to ensure component picks up global vars if needed -->
<style>
  .chart-surface {
    background: var(--minibi-color-block-surface);
  }
</style>
