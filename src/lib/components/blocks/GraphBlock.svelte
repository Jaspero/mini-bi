<script lang="ts">
  import { onMount, onDestroy, untrack } from 'svelte';
  import {
    Chart,
    CategoryScale,
    LinearScale,
    BarController,
    BarElement,
    LineController,
    LineElement,
    PointElement,
    PieController,
    DoughnutController,
    ArcElement,
    ScatterController,
    RadarController,
    RadialLinearScale,
    Filler,
    Legend,
    Title,
    Tooltip
  } from 'chart.js';
  import BlockActions from '../ui/BlockActions.svelte';
  import type { Block, GraphBlockConfig, BlockData, IDashboardService } from '../../types/index';

  Chart.register(
    CategoryScale,
    LinearScale,
    BarController,
    BarElement,
    LineController,
    LineElement,
    PointElement,
    PieController,
    DoughnutController,
    ArcElement,
    ScatterController,
    RadarController,
    RadialLinearScale,
    Filler,
    Legend,
    Title,
    Tooltip
  );

  interface Props {
    block: Block;
    dashboardService: IDashboardService;
    filterParams?: Record<string, any>;
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
  let chartCanvas: HTMLCanvasElement | undefined = $state();
  let chart: Chart | null = null;
  let loading = $state(true);
  let error = $state('');
  let data: BlockData | null = $state(null);
  let isHovered = $state(false);
  let isRefreshing = $state(false);
  let chartInitialized = $state(false);

  let resizeObserver: ResizeObserver | null = null;

  onMount(async () => {
    await loadData();
    initialLoadDone = true;

    if (typeof window !== 'undefined') {
      window.addEventListener('themechange', handleThemeChange);
    }
  });

  onDestroy(() => {
    if (chart) {
      chart.destroy();
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
      rebuildChart();
    }
  }

  $effect(() => {
    if (chartCanvas && data && !loading && !chartInitialized) {
      const canvas = chartCanvas;
      untrack(() => {
        if (resizeObserver) {
          resizeObserver.disconnect();
        }

        if (chart) {
          chart.destroy();
          chart = null;
        }

        createChart();
        chartInitialized = true;

        resizeObserver = new ResizeObserver(() => {
          chart?.resize();
        });
        resizeObserver.observe(canvas.parentElement!);
      });
    }
  });

  $effect(() => {
    const newConfig = block.config as GraphBlockConfig;
    const newConfigStr = JSON.stringify(newConfig);
    const currentConfigStr = JSON.stringify(graphConfig);

    if (newConfigStr !== currentConfigStr) {
      graphConfig = newConfig;
      untrack(() => {
        if (chart && data && !loading) {
          rebuildChart();
        }
      });
    }
  });

  let previousDataSource = '';
  let previousFilterParams = '';
  let initialLoadDone = false;

  $effect(() => {
    const currentDataSource = JSON.stringify(block.dataSource);
    if (initialLoadDone && currentDataSource !== previousDataSource) {
      previousDataSource = currentDataSource;
      untrack(() => {
        if (chart) {
          chart.destroy();
          chart = null;
        }
        chartInitialized = false;
        if (resizeObserver) {
          resizeObserver.disconnect();
          resizeObserver = null;
        }
      });
      reloadData();
    } else if (!initialLoadDone) {
      previousDataSource = currentDataSource;
    }
  });

  $effect(() => {
    const currentFilterParams = JSON.stringify(filterParams);
    if (initialLoadDone && currentFilterParams !== previousFilterParams) {
      previousFilterParams = currentFilterParams;
      reloadData();
    } else if (!initialLoadDone) {
      previousFilterParams = currentFilterParams;
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
      chartInitialized = false;
      isRefreshing = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load data';
      isRefreshing = false;
    }
  }

  function createChart() {
    if (!chartCanvas || !data || !graphConfig) return;

    const config = generateChartConfig();
    chart = new Chart(chartCanvas, config);
  }

  function rebuildChart() {
    if (!data || !graphConfig) return;

    if (chart) {
      chart.destroy();
      chart = null;
    }
    createChart();
  }

  function generateChartConfig(): any {
    if (!data) return {};

    const { chartType, series, xAxis, yAxis, legend, colors, animations } = graphConfig;
    const defaultColors = colors || [
      '#3b82f6',
      '#10b981',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
      '#ec4899',
      '#06b6d4',
      '#84cc16'
    ];

    const textColor = getCssVar('--minibi-color-text', '#111827');
    const textMutedColor = getCssVar('--minibi-color-text-muted', '#4b5563');
    const gridColor = getCssVar('--minibi-color-grid-line', '#e5e7eb');

    const baseOptions: any = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: animations?.enabled !== false ? (animations?.duration ?? 1000) : 0,
        easing: animations?.easing || 'easeOutQuad'
      },
      plugins: {
        legend: {
          display: legend?.show ?? true,
          position: legend?.position || 'top',
          align: legend?.align || 'center',
          labels: {
            color: textMutedColor
          }
        },
        title: {
          display: false
        }
      }
    };

    switch (chartType) {
      case 'line':
      case 'area':
        return {
          type: 'line',
          data: {
            labels: data.data.map((item) => item[getDataKey()]),
            datasets: series.map((s, index) => ({
              label: s.name,
              data: data?.data.map((item) => item[s.dataKey]) || [],
              borderColor: s.color || defaultColors[index % defaultColors.length],
              backgroundColor:
                chartType === 'area'
                  ? `${s.color || defaultColors[index % defaultColors.length]}4D`
                  : 'transparent',
              fill: chartType === 'area' ? (graphConfig.stacked ? 'origin' : true) : false,
              tension: 0.4
            }))
          },
          options: {
            ...baseOptions,
            scales: {
              x: {
                stacked: chartType === 'area' && graphConfig.stacked,
                title: {
                  display: !!xAxis?.name,
                  text: xAxis?.name,
                  color: textColor
                },
                ticks: { color: textMutedColor },
                grid: { color: gridColor }
              },
              y: {
                stacked: chartType === 'area' && graphConfig.stacked,
                title: {
                  display: !!yAxis?.name,
                  text: yAxis?.name,
                  color: textColor
                },
                min: yAxis?.min,
                max: yAxis?.max,
                ticks: { color: textMutedColor },
                grid: { color: gridColor }
              }
            }
          }
        };

      case 'bar':
        return {
          type: 'bar',
          data: {
            labels: data.data.map((item) => item[getDataKey()]),
            datasets: series.map((s, index) => ({
              label: s.name,
              data: data?.data.map((item) => item[s.dataKey]) || [],
              backgroundColor: s.color || defaultColors[index % defaultColors.length],
              borderColor: s.color || defaultColors[index % defaultColors.length],
              borderWidth: 1
            }))
          },
          options: {
            ...baseOptions,
            scales: {
              x: {
                stacked: graphConfig.stacked,
                title: {
                  display: !!xAxis?.name,
                  text: xAxis?.name,
                  color: textColor
                },
                ticks: { color: textMutedColor },
                grid: { color: gridColor }
              },
              y: {
                stacked: graphConfig.stacked,
                title: {
                  display: !!yAxis?.name,
                  text: yAxis?.name,
                  color: textColor
                },
                min: yAxis?.min,
                max: yAxis?.max,
                ticks: { color: textMutedColor },
                grid: { color: gridColor }
              }
            }
          }
        };

      case 'pie':
      case 'donut':
        const nameKey = (graphConfig as any).nameKey || 'name';
        const valueKey = (graphConfig as any).valueKey || 'value';
        return {
          type: chartType === 'donut' ? 'doughnut' : 'pie',
          data: {
            labels: data.data.map((item) => item[nameKey]),
            datasets: [
              {
                data: data.data.map((item) => item[valueKey]),
                backgroundColor: data.data.map(
                  (_, index) => defaultColors[index % defaultColors.length]
                ),
                borderWidth: 2,
                borderColor: getCssVar('--minibi-color-surface', '#ffffff')
              }
            ]
          },
          options: {
            ...baseOptions,
            cutout: chartType === 'donut' ? '50%' : 0
          }
        };

      case 'scatter':
        return {
          type: 'scatter',
          data: {
            datasets: [
              {
                label: series[0]?.name || 'Data',
                data: data.data.map((item) => ({ x: item.x, y: item.y })),
                backgroundColor: defaultColors[0],
                pointRadius: data.data.map((item) => item.size || 5)
              }
            ]
          },
          options: {
            ...baseOptions,
            scales: {
              x: {
                type: 'linear',
                title: {
                  display: !!xAxis?.name,
                  text: xAxis?.name,
                  color: textColor
                },
                ticks: { color: textMutedColor },
                grid: { color: gridColor }
              },
              y: {
                type: 'linear',
                title: {
                  display: !!yAxis?.name,
                  text: yAxis?.name,
                  color: textColor
                },
                ticks: { color: textMutedColor },
                grid: { color: gridColor }
              }
            }
          }
        };

      case 'radar':
        return {
          type: 'radar',
          data: {
            labels: data.data.map((item) => item[getDataKey()]),
            datasets: series.map((s, index) => ({
              label: s.name,
              data: data?.data.map((item) => item[s.dataKey]) || [],
              borderColor: s.color || defaultColors[index % defaultColors.length],
              backgroundColor: `${s.color || defaultColors[index % defaultColors.length]}4D`,
              fill: true
            }))
          },
          options: {
            ...baseOptions,
            scales: {
              r: {
                ticks: { color: textMutedColor },
                grid: { color: gridColor },
                pointLabels: { color: textMutedColor }
              }
            }
          }
        };

      default:
        return {
          type: 'bar',
          data: {
            labels: data.data.map((item) => item[getDataKey()]),
            datasets: series.map((s, index) => ({
              label: s.name,
              data: data?.data.map((item) => item[s.dataKey]) || [],
              backgroundColor: s.color || defaultColors[index % defaultColors.length]
            }))
          },
          options: baseOptions
        };
    }
  }

  function getDataKey(): string {
    if (graphConfig.xAxisKey) {
      return graphConfig.xAxisKey;
    }

    const firstDataItem = data?.data[0];
    if (!firstDataItem) return 'x';

    return (
      Object.keys(firstDataItem).find(
        (key) => key !== 'value' && typeof firstDataItem[key] === 'string'
      ) || 'x'
    );
  }

  async function onRefresh() {
    if (chart) {
      chart.destroy();
      chart = null;
    }
    chartInitialized = false;
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
    if (!chartCanvas) {
      console.error('Chart canvas not initialized');
      return;
    }

    try {
      const dataURL = chartCanvas.toDataURL('image/png', 1.0);

      const link = document.createElement('a');
      const filename = `${block.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_chart_${new Date().toISOString().split('T')[0]}.png`;
      link.download = filename;
      link.href = dataURL;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export chart as image:', err);
      alert('Failed to export chart as image');
    }
  }

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
      <div class="chart-surface h-full w-full">
        <canvas bind:this={chartCanvas}></canvas>
      </div>
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

<style>
  .chart-surface {
    background: var(--minibi-color-block-surface);
  }
</style>
