import Head from "next/head";
import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import styles from "@/styles/Home.module.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

type ChartDataset = Record<string, unknown> & { data: number[] };

type ChartConfig = {
  type: string;
  data: {
    labels: string[];
    datasets: ChartDataset[];
  };
  options: Record<string, unknown>;
};

type ChartInstance = {
  destroy: () => void;
};

type ChartConstructor = new (ctx: HTMLCanvasElement, config: ChartConfig) => ChartInstance;

declare global {
  interface Window {
    Chart?: ChartConstructor;
  }
}

type Metric = {
  label: string;
  value: string;
  change: string;
};

type DailyUsage = {
  day: string;
  date: string;
  minutes: number;
  tabs: number;
  focus: number;
};

type UrlVisit = {
  domain: string;
  title: string;
  visits: number;
  minutes: number;
  category: string;
  lastOpened: string;
};

type Highlight = {
  title: string;
  detail: string;
  status: "positive" | "neutral" | "warning";
};

type DoughnutTooltipContext = {
  label?: string;
  parsed: number;
  dataset: {
    data: number[];
  };
};

interface ChartCardProps {
  title: string;
  subtitle: string;
  config: ChartConfig;
  ready: boolean;
}

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  if (!hours) {
    return `${remaining} min`;
  }

  return `${hours}h ${remaining.toString().padStart(2, "0")}m`;
};

const MetricCard = ({ label, value, change }: Metric) => (
  <div className={styles.metricCard}>
    <p className={styles.metricLabel}>{label}</p>
    <p className={styles.metricValue}>{value}</p>
    <p className={styles.metricChange}>{change}</p>
  </div>
);

const ChartCard = ({ title, subtitle, config, ready }: ChartCardProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!ready || typeof window === "undefined" || !window.Chart) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const chartInstance = new window.Chart(canvas, config);

    return () => {
      chartInstance?.destroy();
    };
  }, [config, ready]);

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      <div className={styles.chartCanvas}>
        <canvas ref={canvasRef} aria-label={title} role="img" />
        {!ready && <div className={styles.loading}>Loading Chart.js…</div>}
      </div>
    </div>
  );
};

const Highlights = ({ items }: { items: Highlight[] }) => (
  <div className={styles.highlights}>
    <h3>Daily highlights</h3>
    <ul>
      {items.map((item) => (
        <li key={item.title} data-status={item.status}>
          <span className={styles.highlightTitle}>{item.title}</span>
          <span className={styles.highlightDetail}>{item.detail}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default function Home() {
  const [isChartReady, setIsChartReady] = useState(false);

  const dailyUsage = useMemo<DailyUsage[]>(
    () => [
      { day: "Mon", date: "Nov 18", minutes: 142, tabs: 34, focus: 76 },
      { day: "Tue", date: "Nov 19", minutes: 168, tabs: 41, focus: 71 },
      { day: "Wed", date: "Nov 20", minutes: 154, tabs: 38, focus: 74 },
      { day: "Thu", date: "Nov 21", minutes: 179, tabs: 45, focus: 69 },
      { day: "Fri", date: "Nov 22", minutes: 201, tabs: 52, focus: 64 },
      { day: "Sat", date: "Nov 23", minutes: 128, tabs: 29, focus: 82 },
      { day: "Sun", date: "Nov 24", minutes: 96, tabs: 22, focus: 88 },
    ],
    []
  );

  const urlVisits = useMemo<UrlVisit[]>(
    () => [
      {
        domain: "mail.google.com",
        title: "Gmail",
        visits: 19,
        minutes: 114,
        category: "Communication",
        lastOpened: "Today · 9:12 AM",
      },
      {
        domain: "calendar.google.com",
        title: "Google Calendar",
        visits: 12,
        minutes: 86,
        category: "Productivity",
        lastOpened: "Today · 8:45 AM",
      },
      {
        domain: "github.com",
        title: "GitHub",
        visits: 17,
        minutes: 142,
        category: "Development",
        lastOpened: "Yesterday · 6:32 PM",
      },
      {
        domain: "news.ycombinator.com",
        title: "Hacker News",
        visits: 9,
        minutes: 58,
        category: "Research",
        lastOpened: "Yesterday · 9:18 PM",
      },
      {
        domain: "notion.so",
        title: "Notion workspace",
        visits: 14,
        minutes: 121,
        category: "Knowledge base",
        lastOpened: "Thu · 3:04 PM",
      },
      {
        domain: "figma.com",
        title: "Figma",
        visits: 7,
        minutes: 64,
        category: "Design",
        lastOpened: "Wed · 4:27 PM",
      },
    ],
    []
  );

  const categoryBreakdown = useMemo(
    () => [
      { label: "Productivity", minutes: 428, color: "#38bdf8" },
      { label: "Development", minutes: 312, color: "#6366f1" },
      { label: "Research", minutes: 204, color: "#f472b6" },
      { label: "Entertainment", minutes: 126, color: "#facc15" },
      { label: "Other", minutes: 92, color: "#94a3b8" },
    ],
    []
  );

  const totalMinutes = useMemo(
    () => dailyUsage.reduce((sum, day) => sum + day.minutes, 0),
    [dailyUsage]
  );

  const totalTabs = useMemo(
    () => dailyUsage.reduce((sum, day) => sum + day.tabs, 0),
    [dailyUsage]
  );

  const averageFocus = useMemo(
    () =>
      Math.round(
        dailyUsage.reduce((sum, day) => sum + day.focus, 0) / dailyUsage.length
      ),
    [dailyUsage]
  );

  const busiestDay = useMemo(() => {
    return dailyUsage.reduce((max, day) => (day.tabs > max.tabs ? day : max), dailyUsage[0]);
  }, [dailyUsage]);

  const summaryMetrics = useMemo<Metric[]>(
    () => [
      {
        label: "Active browsing time",
        value: formatDuration(totalMinutes),
        change: "+12% vs last week",
      },
      {
        label: "Tabs opened",
        value: totalTabs.toString(),
        change: `Peak ${busiestDay.tabs} tabs on ${busiestDay.day}`,
      },
      {
        label: "Average focus score",
        value: `${averageFocus}%`,
        change: "Goal ≥ 75%",
      },
      {
        label: "Most visited domain",
        value: urlVisits[0].domain,
        change: `${urlVisits[0].visits} visits this week`,
      },
    ],
    [averageFocus, busiestDay, totalMinutes, totalTabs, urlVisits]
  );

  const usageTrendConfig = useMemo<ChartConfig>(
    () => ({
      type: "line",
      data: {
        labels: dailyUsage.map((day) => `${day.day} · ${day.date}`),
        datasets: [
          {
            label: "Active minutes",
            data: dailyUsage.map((day) => day.minutes),
            borderColor: "#38bdf8",
            backgroundColor: "rgba(56, 189, 248, 0.18)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
          },
          {
            label: "Focus score",
            data: dailyUsage.map((day) => day.focus),
            borderColor: "#f472b6",
            backgroundColor: "rgba(244, 114, 182, 0.16)",
            borderDash: [8, 6],
            borderWidth: 2,
            tension: 0.3,
            yAxisID: "y1",
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            labels: {
              color: "#cbd5f5",
              font: {
                family: "var(--font-geist-sans)",
              },
            },
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.92)",
            titleColor: "#f8fafc",
            bodyColor: "#e2e8f0",
            borderColor: "rgba(148, 163, 184, 0.35)",
            borderWidth: 1,
            padding: 12,
            displayColors: true,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Minutes",
              color: "#cbd5f5",
            },
            ticks: {
              color: "#94a3b8",
            },
            grid: {
              color: "rgba(148, 163, 184, 0.15)",
            },
          },
          y1: {
            beginAtZero: true,
            max: 100,
            position: "right",
            title: {
              display: true,
              text: "Focus %",
              color: "#cbd5f5",
            },
            ticks: {
              color: "#94a3b8",
              callback: (value: number) => `${value}%`,
            },
            grid: {
              drawOnChartArea: false,
            },
          },
          x: {
            ticks: {
              color: "#94a3b8",
              maxRotation: 0,
            },
            grid: {
              display: false,
            },
          },
        },
      },
    }),
    [dailyUsage]
  );

  const tabsConfig = useMemo<ChartConfig>(
    () => ({
      type: "bar",
      data: {
        labels: dailyUsage.map((day) => `${day.day} · ${day.date}`),
        datasets: [
          {
            label: "Tabs opened",
            data: dailyUsage.map((day) => day.tabs),
            backgroundColor: "rgba(99, 102, 241, 0.75)",
            borderRadius: 10,
            hoverBackgroundColor: "rgba(99, 102, 241, 1)",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.92)",
            titleColor: "#f8fafc",
            bodyColor: "#e2e8f0",
            borderColor: "rgba(99, 102, 241, 0.6)",
            borderWidth: 1,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: "#94a3b8",
            },
            grid: {
              color: "rgba(148, 163, 184, 0.15)",
            },
          },
          x: {
            ticks: {
              color: "#94a3b8",
              maxRotation: 0,
            },
            grid: {
              display: false,
            },
          },
        },
      },
    }),
    [dailyUsage]
  );

  const categoryConfig = useMemo<ChartConfig>(
    () => ({
      type: "doughnut",
      data: {
        labels: categoryBreakdown.map((item) => item.label),
        datasets: [
          {
            data: categoryBreakdown.map((item) => item.minutes),
            backgroundColor: categoryBreakdown.map((item) => item.color),
            borderColor: "rgba(15, 23, 42, 1)",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "60%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#cbd5f5",
              boxWidth: 12,
            },
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.92)",
            titleColor: "#f8fafc",
            bodyColor: "#e2e8f0",
            borderColor: "rgba(56, 189, 248, 0.35)",
            borderWidth: 1,
            callbacks: {
              label: (context: DoughnutTooltipContext) => {
                const label = context.label ?? "";
                const value = context.parsed;
                const total = context.dataset.data.reduce(
                  (sum: number, current: number) => sum + current,
                  0
                );
                const percent = Math.round((value / total) * 100);
                return `${label}: ${formatDuration(value)} (${percent}%)`;
              },
            },
          },
        },
      },
    }),
    [categoryBreakdown]
  );

  const highlights = useMemo<Highlight[]>(
    () => [
      {
        title: "Deep work streak",
        detail: "2h 55m focused session on Thu",
        status: "positive",
      },
      {
        title: "Tab discipline",
        detail: "Average of 37 tabs per day",
        status: "neutral",
      },
      {
        title: "Weekend cooldown",
        detail: "Usage down 52% on Sunday",
        status: "warning",
      },
    ],
    []
  );

  return (
    <>
      <Head>
        <title>Chrome usage monitor</title>
        <meta name="description" content="Track Chrome activity, tabs opened, and visited URLs." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Script
        src="https://cdn.jsdelivr.net/npm/chart.js"
        strategy="afterInteractive"
        onLoad={() => setIsChartReady(true)}
      />
      <div className={`${styles.page} ${geistSans.variable} ${geistMono.variable}`}>
        <main className={styles.main}>
          <header className={styles.header}>
            <div>
              <span className={styles.tag}>Weekly Chrome insights</span>
              <h1>Usage snapshot</h1>
            </div>
            <p>
              Understand how Chrome is used across the week. Monitor active time, track how many
              tabs were opened, and review the domains that claimed the most attention.
            </p>
            <div className={styles.timeframe}>Week of Nov 18 · Local timezone</div>
          </header>

          <section className={styles.summaryGrid}>
            {summaryMetrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </section>

          <section className={styles.visualGrid}>
            <ChartCard
              title="Active time vs. focus"
              subtitle="Daily breakdown of minutes spent in Chrome"
              config={usageTrendConfig}
              ready={isChartReady}
            />
            <ChartCard
              title="Tabs opened each day"
              subtitle="Counts include new and restored tabs"
              config={tabsConfig}
              ready={isChartReady}
            />
            <ChartCard
              title="Attention by category"
              subtitle="Share of total active minutes"
              config={categoryConfig}
              ready={isChartReady}
            />
          </section>

          <section className={styles.detailsGrid}>
            <div className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <h3>Most visited URLs</h3>
                <p>Sorted by time on page</p>
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">URL</th>
                    <th scope="col">Category</th>
                    <th scope="col">Visits</th>
                    <th scope="col">Time spent</th>
                    <th scope="col">Last opened</th>
                  </tr>
                </thead>
                <tbody>
                  {urlVisits.map((visit) => (
                    <tr key={visit.domain}>
                      <td>
                        <span className={styles.urlTitle}>{visit.title}</span>
                        <span className={styles.urlDomain}>{visit.domain}</span>
                      </td>
                      <td>{visit.category}</td>
                      <td>{visit.visits}</td>
                      <td>{formatDuration(visit.minutes)}</td>
                      <td>{visit.lastOpened}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Highlights items={highlights} />
          </section>
        </main>
      </div>
    </>
  );
}
