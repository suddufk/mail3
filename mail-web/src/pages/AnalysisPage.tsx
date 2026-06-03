import { Button, Spinner } from '@heroui/react';
import dayjs from 'dayjs';
import * as echarts from 'echarts';
import { AtSign, Inbox, RefreshCw, Send, Users } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { analysisEcharts } from '@/api/analysis';
import WorkspaceLayout from '@/components/WorkspaceLayout';
import { useAppStore } from '@/store/app-store';

type ChartProps = {
  className?: string;
  option: echarts.EChartsOption;
  title: string;
};

function toNumber(value: unknown) {
  return Number(value || 0);
}

function dayLabel(value?: string) {
  return value ? dayjs(value).format('M.D') : '';
}

function Chart({ className = 'h-80', option, title }: ChartProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chart.setOption(option, true);

    const resize = () => chart.resize();
    const observer = new ResizeObserver(resize);
    observer.observe(ref.current);
    window.addEventListener('resize', resize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
      chart.dispose();
    };
  }, [option]);

  return (
    <section className="surface-card w-full rounded-2xl p-4">
      <h2 className="px-1 text-lg font-semibold">{title}</h2>
      <div className={`mt-2 w-full ${className}`} ref={ref} />
    </section>
  );
}

function StatCard({
  deleted,
  icon: Icon,
  label,
  normal,
  value,
}: {
  deleted: number;
  icon: typeof Inbox;
  label: string;
  normal: number;
  value: number;
}) {
  const { t } = useTranslation();

  return (
    <section className="surface-card rounded-2xl p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground/80">{label}</div>
          <div className="mt-2 text-3xl font-semibold tabular-nums">{value.toLocaleString()}</div>
        </div>
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-500 dark:bg-sky-500/15">
          <Icon className="size-6" />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <span>
          <span className="text-muted">{t('active')}</span>
          <span className="ml-1 font-semibold text-emerald-500">{normal.toLocaleString()}</span>
        </span>
        <span>
          <span className="text-muted">{t('deleted')}</span>
          <span className="ml-1 font-semibold text-rose-500">{deleted.toLocaleString()}</span>
        </span>
      </div>
    </section>
  );
}

function themePalette(dark: boolean) {
  return {
    axis: dark ? '#a1a1aa' : '#909399',
    background: dark ? '#18181b' : '#ffffff',
    border: dark ? '#3f3f46' : '#d4d7de',
    gaugeAxis: dark ? '#d4d4d8' : '#606266',
    grid: dark ? '#3f3f46' : '#d4d7de',
    split: dark ? '#52525b' : '#cdd0d6',
    text: dark ? '#f4f4f5' : '#303133',
    track: dark ? '#3f3f46' : '#e6ebf8',
  };
}

export default function AnalysisPage() {
  const { t } = useTranslation();
  const dark = useAppStore((state) => state.dark);
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  async function refresh() {
    setLoading(true);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setData(await analysisEcharts(tz));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const palette = useMemo(() => themePalette(dark), [dark]);
  const numberCount = data?.numberCount || {};
  const sourceData = useMemo(
    () =>
      (data?.receiveRatio?.nameRatio || []).map((item: any) => ({
        name: item.name || ' ',
        value: toNumber(item.total),
      })),
    [data],
  );
  const userDayCount = data?.userDayCount || [];
  const receiveDayCount = data?.emailDayCount?.receiveDayCount || [];
  const sendDayCount = data?.emailDayCount?.sendDayCount || [];
  const daySendTotal = toNumber(data?.daySendTotal);

  const statCards = [
    {
      deleted: toNumber(numberCount.delReceiveTotal),
      icon: Inbox,
      label: t('totalReceived'),
      normal: toNumber(numberCount.normalReceiveTotal),
      value: toNumber(numberCount.receiveTotal),
    },
    {
      deleted: toNumber(numberCount.delSendTotal),
      icon: Send,
      label: t('totalSent'),
      normal: toNumber(numberCount.normalSendTotal),
      value: toNumber(numberCount.sendTotal),
    },
    {
      deleted: toNumber(numberCount.delAccountTotal),
      icon: AtSign,
      label: t('totalMailboxes'),
      normal: toNumber(numberCount.normalAccountTotal),
      value: toNumber(numberCount.accountTotal),
    },
    {
      deleted: toNumber(numberCount.delUserTotal),
      icon: Users,
      label: t('totalUsers'),
      normal: toNumber(numberCount.normalUserTotal),
      value: toNumber(numberCount.userTotal),
    },
  ];

  const sourceOption = useMemo<echarts.EChartsOption>(
    () => ({
      color: ['#3cb2ff', '#13deb9', '#fbbf24', '#ff7f50', '#bae6fd', '#c084fc'],
      legend: {
        formatter: (name: string) => (name.length > 24 ? `${name.slice(0, 24)}...` : name),
        left: 8,
        orient: 'vertical',
        textStyle: { color: palette.text },
        top: 20,
        type: 'scroll',
      },
      series: [
        {
          avoidLabelOverlap: false,
          center: [window.innerWidth < 640 ? '62%' : '72%', '48%'],
          data: sourceData,
          itemStyle: {
            borderColor: palette.background,
            borderRadius: 4,
            borderWidth: 2,
          },
          label: { show: false },
          radius: ['42%', '66%'],
          type: 'pie',
        },
      ],
      tooltip: {
        backgroundColor: palette.background,
        borderColor: palette.border,
        formatter: (params: any) => `${params.marker} ${params.name}: ${params.value} (${params.percent}%)`,
        textStyle: { color: palette.text },
        trigger: 'item',
      },
    }),
    [palette, sourceData],
  );

  const userGrowthOption = useMemo<echarts.EChartsOption>(
    () => ({
      grid: { bottom: 35, left: 42, right: 20, top: 26 },
      series: [
        {
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { color: 'rgba(29, 132, 255, 0.30)', offset: 0 },
              { color: 'rgba(29, 132, 255, 0.03)', offset: 1 },
            ]),
          },
          data: userDayCount.map((item: any) => toNumber(item.total)),
          lineStyle: { color: '#1d84ff', width: 2.5 },
          smooth: 0.1,
          symbol: 'none',
          type: 'line',
        },
      ],
      tooltip: {
        axisPointer: { lineStyle: { color: palette.axis }, type: 'cross' },
        backgroundColor: palette.background,
        borderColor: palette.border,
        textStyle: { color: palette.text },
        trigger: 'axis',
        formatter: (params: any) => `${params[0]?.marker || ''} ${t('growthTotalUsers')} ${params[0]?.value || 0}`,
      },
      xAxis: {
        axisLine: { lineStyle: { color: palette.axis } },
        axisTick: { show: false },
        boundaryGap: false,
        data: userDayCount.map((item: any) => dayLabel(item.date)),
        type: 'category',
      },
      yAxis: {
        axisLine: { lineStyle: { color: palette.axis }, show: true },
        splitLine: { lineStyle: { color: palette.split, type: 'dashed' }, show: true },
        type: 'value',
      },
    }),
    [palette, t, userDayCount],
  );

  const emailGrowthOption = useMemo<echarts.EChartsOption>(
    () => ({
      grid: { bottom: 18, containLabel: true, left: 18, right: 18, top: 50 },
      legend: {
        data: [t('emailReceived'), t('emailSent')],
        textStyle: { color: palette.text },
        top: 0,
      },
      series: [
        {
          barMaxWidth: 30,
          barWidth: '60%',
          data: receiveDayCount.map((item: any) => toNumber(item.total)),
          itemStyle: { color: '#3cb2ff' },
          name: t('emailReceived'),
          stack: 'total',
          type: 'bar',
        },
        {
          data: sendDayCount.map((item: any) => toNumber(item.total)),
          itemStyle: { color: '#13deb9' },
          name: t('emailSent'),
          stack: 'total',
          type: 'bar',
        },
      ],
      tooltip: {
        backgroundColor: palette.background,
        borderColor: palette.border,
        formatter: (params: any) => `${params.marker} ${params.seriesName}: ${params.value}`,
        textStyle: { color: palette.text },
      },
      xAxis: {
        axisLine: { lineStyle: { color: palette.axis } },
        axisTick: { show: false },
        data: receiveDayCount.map((item: any) => dayLabel(item.date)),
        type: 'category',
      },
      yAxis: {
        axisLine: { lineStyle: { color: palette.axis, width: 0 }, show: true },
        splitLine: { lineStyle: { color: palette.grid, type: 'solid' }, show: true },
        type: 'value',
      },
    }),
    [palette, receiveDayCount, sendDayCount, t],
  );

  const gaugeOption = useMemo<echarts.EChartsOption>(
    () => ({
      series: [
        {
          axisLabel: { color: palette.gaugeAxis },
          axisLine: {
            roundCap: true,
            lineStyle: { color: [[1, palette.track]] },
          },
          axisTick: { lineStyle: { color: palette.axis } },
          data: [{ name: t('total'), value: daySendTotal }],
          detail: {
            color: palette.text,
            fontSize: 30,
            formatter: '{value}',
            valueAnimation: true,
          },
          max: Math.max(100, Math.ceil(daySendTotal / 10) * 10),
          name: t('sentToday'),
          pointer: { itemStyle: { color: '#3cb2ff' } },
          progress: {
            itemStyle: { color: '#3cb2ff' },
            roundCap: true,
            show: true,
          },
          splitLine: { lineStyle: { color: palette.gaugeAxis } },
          title: { color: palette.text },
          type: 'gauge',
        },
      ],
      tooltip: {
        backgroundColor: palette.background,
        borderColor: palette.border,
        textStyle: { color: palette.text },
      },
    }),
    [daySendTotal, palette, t],
  );

  return (
    <WorkspaceLayout
      actions={
        <Button variant="secondary" onPress={refresh}>
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </Button>
      }
      title={t('analytics')}
    >
      {loading && !data ? (
        <div className="flex h-80 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="grid w-full gap-5 pb-6" data-sidebar-collapsed={sidebarCollapsed}>
          <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-4">
            {statCards.map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>

          <div className="grid w-full gap-5 2xl:grid-cols-[minmax(320px,500px)_minmax(0,1fr)]">
            <Chart className="h-[350px]" option={sourceOption} title={t('emailSource')} />
            <Chart className="h-[350px]" option={userGrowthOption} title={t('userGrowth')} />
          </div>

          <div className="grid w-full gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(320px,500px)]">
            <Chart className="h-[350px]" option={emailGrowthOption} title={t('emailGrowth')} />
            <Chart className="h-[350px]" option={gaugeOption} title={t('sentToday')} />
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
}
