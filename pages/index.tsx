import Head from "next/head";
import Script from "next/script";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { Geist, Geist_Mono } from "next/font/google";
import styles from "@/styles/Home.module.css";

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

type ChartConstructor = new (
  ctx: HTMLCanvasElement,
  config: ChartConfig
) => ChartInstance;

declare global {
  interface Window {
    Chart?: ChartConstructor;
  }
}

type Metric = {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
};

type DailyUsage = {
  day: string;
  date: string;
  minutes: number;
  tabs: number;
  focus: number;
  topUrl: string;
  context: string;
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

type CategorySlice = {
  label: string;
  minutes: number;
  color: string;
};

type TimeframeKey = "week" | "month";

type TimeframeData = {
  label: string;
  rangeLabel: string;
  description: string;
  metrics: Metric[];
  dailyUsage: DailyUsage[];
  urlVisits: UrlVisit[];
  categoryBreakdown: CategorySlice[];
  highlights: Highlight[];
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const TIMEFRAME_DATA: Record<TimeframeKey, TimeframeData> = {
  week: {
    label: "This week",
    rangeLabel: "Nov 18 – Nov 24",
    description:
      "Track how your active time and focus shifted throughout the current week.",
    metrics: [
      { label: "Active time", value: "1,068 mins", change: "+12%", trend: "up" },
      { label: "Average focus", value: "74", change: "–4 vs last week", trend: "down" },
      { label: "Tabs opened", value: "261", change: "+7%", trend: "up" },
      { label: "Unique sites", value: "86", change: "Stable", trend: "neutral" },
    ],
    dailyUsage: [
      {
        day: "Mon",
        date: "Nov 18",
        minutes: 142,
        tabs: 34,
        focus: 76,
        topUrl: "github.com",
        context: "Sprint planning and repo housekeeping dominated the morning.",
      },
      {
        day: "Tue",
        date: "Nov 19",
        minutes: 168,
        tabs: 41,
        focus: 71,
        topUrl: "calendar.google.com",
        context: "Back-to-back meetings spiked tab churn in the afternoon.",
      },
      {
        day: "Wed",
        date: "Nov 20",
        minutes: 154,
        tabs: 38,
        focus: 74,
        topUrl: "notion.so",
        context: "Documentation pass kept focus steady with fewer distractions.",
      },
      {
        day: "Thu",
        date: "Nov 21",
        minutes: 179,
        tabs: 45,
        focus: 69,
        topUrl: "news.ycombinator.com",
        context: "Research spikes pushed down the focus score after lunch.",
      },
      {
        day: "Fri",
        date: "Nov 22",
        minutes: 201,
        tabs: 52,
        focus: 64,
        topUrl: "mail.google.com",
        context: "Context switching during triage created the busiest day of the week.",
      },
      {
        day: "Sat",
        date: "Nov 23",
        minutes: 128,
        tabs: 29,
        focus: 82,
        topUrl: "figma.com",
        context: "Side-project design jam delivered the week’s highest focus.",
      },
      {
        day: "Sun",
        date: "Nov 24",
        minutes: 96,
        tabs: 22,
        focus: 88,
        topUrl: "open.spotify.com",
        context: "Light browsing with playlists before the upcoming sprint.",
      },
    ],
    urlVisits: [
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
      {
        domain: "open.spotify.com",
        title: "Spotify",
        visits: 10,
        minutes: 49,
        category: "Entertainment",
        lastOpened: "Sun · 11:18 AM",
      },
    ],
    categoryBreakdown: [
      { label: "Productivity", minutes: 428, color: "#38bdf8" },
      { label: "Development", minutes: 312, color: "#6366f1" },
      { label: "Research", minutes: 204, color: "#f472b6" },
      { label: "Entertainment", minutes: 126, color: "#facc15" },
      { label: "Other", minutes: 92, color: "#94a3b8" },
    ],
    highlights: [
      {
        title: "Focus recovered over the weekend",
        detail: "Saturday and Sunday brought the strongest focus streak, lifting the weekly average by 6 points.",
        status: "positive",
      },
      {
        title: "Friday created tab overload",
        detail: "52 tabs opened pushed tab churn up 24% over the weekly baseline—consider batching triage earlier in the day.",
        status: "warning",
      },
      {
        title: "Notion usage climbed",
        detail: "Documentation sessions added 28 extra minutes vs last week, balancing the meeting-heavy start.",
        status: "neutral",
      },
    ],
  },
  month: {
    label: "Last 30 days",
    rangeLabel: "Oct 26 – Nov 24",
    description:
      "Zoom out to spot emerging trends across the past month and compare against your weekly baselines.",
    metrics: [
      { label: "Active time", value: "4,312 mins", change: "+8%", trend: "up" },
      { label: "Average focus", value: "72", change: "–2 vs last month", trend: "down" },
      { label: "Tabs opened", value: "1,021", change: "+5%", trend: "up" },
      { label: "Unique sites", value: "247", change: "+3%", trend: "up" },
    ],
    dailyUsage: [
      {
        day: "Week 1",
        date: "Oct 26 – Nov 1",
        minutes: 1084,
        tabs: 238,
        focus: 71,
        topUrl: "mail.google.com",
        context: "Quarterly planning and status reporting dominated the opening week.",
      },
      {
        day: "Week 2",
        date: "Nov 2 – Nov 8",
        minutes: 992,
        tabs: 247,
        focus: 73,
        topUrl: "github.com",
        context: "Heads-down feature delivery lifted focus despite high tab churn.",
      },
      {
        day: "Week 3",
        date: "Nov 9 – Nov 15",
        minutes: 1116,
        tabs: 266,
        focus: 70,
        topUrl: "notion.so",
        context: "Documentation and design reviews reduced active browsing minutes slightly.",
      },
      {
        day: "Week 4",
        date: "Nov 16 – Nov 24",
        minutes: 1120,
        tabs: 270,
        focus: 74,
        topUrl: "calendar.google.com",
        context: "Meeting blocks increased but focus steadied with tighter scheduling.",
      },
    ],
    urlVisits: [
      {
        domain: "mail.google.com",
        title: "Gmail",
        visits: 82,
        minutes: 468,
        category: "Communication",
        lastOpened: "Today · 9:12 AM",
      },
      {
        domain: "calendar.google.com",
        title: "Google Calendar",
        visits: 63,
        minutes: 388,
        category: "Productivity",
        lastOpened: "Today · 8:45 AM",
      },
      {
        domain: "github.com",
        title: "GitHub",
        visits: 71,
        minutes: 612,
        category: "Development",
        lastOpened: "Yesterday · 6:32 PM",
      },
      {
        domain: "docs.google.com",
        title: "Google Docs",
        visits: 58,
        minutes: 324,
        category: "Documentation",
        lastOpened: "Yesterday · 7:58 PM",
      },
      {
        domain: "notion.so",
        title: "Notion workspace",
        visits: 66,
        minutes: 493,
        category: "Knowledge base",
        lastOpened: "Thu · 3:04 PM",
      },
      {
        domain: "figma.com",
        title: "Figma",
        visits: 39,
        minutes: 242,
        category: "Design",
        lastOpened: "Wed · 4:27 PM",
      },
      {
        domain: "open.spotify.com",
        title: "Spotify",
        visits: 48,
        minutes: 198,
        category: "Entertainment",
        lastOpened: "Sun · 11:18 AM",
      },
    ],
    categoryBreakdown: [
      { label: "Productivity", minutes: 1688, color: "#38bdf8" },
      { label: "Development", minutes: 1248, color: "#6366f1" },
      { label: "Research", minutes: 612, color: "#f472b6" },
      { label: "Entertainment", minutes: 384, color: "#facc15" },
      { label: "Other", minutes: 380, color: "#94a3b8" },
    ],
    highlights: [
      {
        title: "Monthly focus remained steady",
        detail: "Despite heavier collaboration, focus stayed above 70 for three of four weeks.",
        status: "positive",
      },
      {
        title: "Development time is climbing",
        detail: "GitHub minutes increased 12% over the prior month, showing more hands-on build time.",
        status: "positive",
      },
      {
        title: "Docs work slowed output",
        detail: "Documentation sessions were necessary but trimmed active minutes during week three.",
        status: "neutral",
      },
    ],
  },
};

type State = {
  timeframe: TimeframeKey;
  selectedDayIndex: number;
  searchTerm: string;
  categoryFilter: string;
};

type Action =
  | { type: "setTimeframe"; payload: TimeframeKey }
  | { type: "selectDay"; payload: number }
  | { type: "setSearch"; payload: string }
  | { type: "setCategory"; payload: string };

const initialState: State = {
  timeframe: "week",
  selectedDayIndex: 0,
  searchTerm: "",
  categoryFilter: "all",
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "setTimeframe":
      return {
        timeframe: action.payload,
        selectedDayIndex: 0,
        searchTerm: "",
        categoryFilter: "all",
      };
    case "selectDay":
      return { ...state, selectedDayIndex: action.payload };
    case "setSearch":
      return { ...state, searchTerm: action.payload };
    case "setCategory":
      return { ...state, categoryFilter: action.payload };
    default:
      return state;
  }
}

function useInteractiveChart(
  chartClass: ChartConstructor | undefined,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  config: ChartConfig | null
) {
  useEffect(() => {
    if (!chartClass || !canvasRef.current || !config) {
      return;
    }

    const chartInstance = new chartClass(canvasRef.current, config);

    return () => {
      chartInstance.destroy();
    };
  }, [chartClass, canvasRef, config]);
}

const formatMinutes = (minutes: number) => `${minutes} mins`;
const formatTabs = (tabs: number) => `${tabs} tabs`;

export default function Home() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [chartReady, setChartReady] = useState(false);
  const [chartClass, setChartClass] = useState<ChartConstructor>();

  const engagementCanvasRef = useRef<HTMLCanvasElement>(null);
  const tabsCanvasRef = useRef<HTMLCanvasElement>(null);
  const categoryCanvasRef = useRef<HTMLCanvasElement>(null);

  const timeframeData = TIMEFRAME_DATA[state.timeframe];
  const selectedDay = timeframeData.dailyUsage[state.selectedDayIndex];

  const categoryOptions = useMemo(
    () => [
      "all",
      ...new Set(timeframeData.categoryBreakdown.map((slice) => slice.label)),
    ],
    [timeframeData.categoryBreakdown]
  );

  const filteredVisits = useMemo(() => {
    return timeframeData.urlVisits.filter((visit) => {
      const matchesSearch = `${visit.title} ${visit.domain}`
        .toLowerCase()
        .includes(state.searchTerm.toLowerCase());
      const matchesCategory =
        state.categoryFilter === "all" ||
        visit.category === state.categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [state.searchTerm, state.categoryFilter, timeframeData.urlVisits]);

  const highlightColor = "#38bdf8";
  const neutralBorder = "rgba(148, 163, 184, 0.24)";

  const engagementChartConfig = useMemo<ChartConfig | null>(() => {
    if (!timeframeData) {
      return null;
    }

    const labels = timeframeData.dailyUsage.map((usage) => usage.day);
    const minutesDataset: ChartDataset = {
      label: "Active minutes",
      data: timeframeData.dailyUsage.map((usage) => usage.minutes),
      borderColor: highlightColor,
      backgroundColor: "rgba(56, 189, 248, 0.16)",
      pointBackgroundColor: labels.map((_, index) =>
        index === state.selectedDayIndex ? highlightColor : "#1f2937"
      ),
      pointBorderColor: labels.map((_, index) =>
        index === state.selectedDayIndex ? highlightColor : neutralBorder
      ),
      pointRadius: labels.map((_, index) => (index === state.selectedDayIndex ? 6 : 4)),
      pointHoverRadius: labels.map((_, index) =>
        index === state.selectedDayIndex ? 8 : 6
      ),
      tension: 0.35,
      fill: true,
    };

    const focusDataset: ChartDataset = {
      label: "Focus score",
      data: timeframeData.dailyUsage.map((usage) => usage.focus),
      borderColor: "#facc15",
      backgroundColor: "rgba(250, 204, 21, 0.18)",
      pointBackgroundColor: labels.map((_, index) =>
        index === state.selectedDayIndex ? "#facc15" : "#0f172a"
      ),
      pointBorderColor: labels.map((_, index) =>
        index === state.selectedDayIndex ? "#facc15" : neutralBorder
      ),
      pointRadius: labels.map((_, index) => (index === state.selectedDayIndex ? 6 : 4)),
      pointHoverRadius: labels.map((_, index) =>
        index === state.selectedDayIndex ? 8 : 6
      ),
      tension: 0.35,
      borderDash: [4, 4],
      yAxisID: "y1",
    };

    return {
      type: "line",
      data: {
        labels,
        datasets: [minutesDataset, focusDataset],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        scales: {
          x: {
            ticks: {
              color: "#cbd5f5",
              font: { size: 12 },
            },
            grid: {
              color: "rgba(148, 163, 184, 0.1)",
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: "#cbd5f5",
              stepSize: 50,
            },
            grid: {
              color: "rgba(148, 163, 184, 0.08)",
            },
          },
          y1: {
            beginAtZero: true,
            position: "right",
            ticks: {
              color: "#cbd5f5",
              stepSize: 5,
            },
            grid: {
              drawOnChartArea: false,
            },
          },
        },
        plugins: {
          legend: {
            labels: {
              color: "#e2e8f0",
              usePointStyle: true,
            },
          },
          tooltip: {
            callbacks: {
              label: (context: Record<string, unknown>) => {
                if (context.datasetIndex === 0) {
                  return `Active minutes: ${context.parsed?.y ?? 0}`;
                }

                return `Focus score: ${context.parsed?.y ?? 0}`;
              },
            },
            backgroundColor: "rgba(15, 23, 42, 0.96)",
            borderColor: "rgba(148, 163, 184, 0.35)",
            borderWidth: 1,
            titleColor: "#f8fafc",
            bodyColor: "#e2e8f0",
          },
        },
        onClick: (_: unknown, elements: Array<{ index: number }>) => {
          if (!elements || elements.length === 0) {
            return;
          }

          const index = elements[0]?.index ?? 0;
          dispatch({ type: "selectDay", payload: index });
        },
      },
    };
  }, [
    timeframeData,
    state.selectedDayIndex,
    dispatch,
    highlightColor,
    neutralBorder,
  ]);

  const tabsChartConfig = useMemo<ChartConfig | null>(() => {
    if (!timeframeData) {
      return null;
    }

    const labels = timeframeData.dailyUsage.map((usage) => usage.day);
    const data = timeframeData.dailyUsage.map((usage) => usage.tabs);

    const background = labels.map((_, index) =>
      index === state.selectedDayIndex
        ? "rgba(99, 102, 241, 0.95)"
        : "rgba(99, 102, 241, 0.45)"
    );

    return {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Tabs opened",
            data,
            backgroundColor: background,
            borderRadius: 12,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
              color: "#cbd5f5",
            },
            grid: {
              display: false,
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: "#cbd5f5",
              stepSize: 10,
            },
            grid: {
              color: "rgba(148, 163, 184, 0.08)",
            },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context: Record<string, unknown>) =>
                `Tabs opened: ${context.parsed?.y ?? 0}`,
            },
            backgroundColor: "rgba(15, 23, 42, 0.96)",
            borderColor: "rgba(148, 163, 184, 0.35)",
            borderWidth: 1,
            titleColor: "#f8fafc",
            bodyColor: "#e2e8f0",
          },
        },
        onClick: (_: unknown, elements: Array<{ index: number }>) => {
          if (!elements || elements.length === 0) {
            return;
          }

          const index = elements[0]?.index ?? 0;
          dispatch({ type: "selectDay", payload: index });
        },
      },
    };
  }, [timeframeData, state.selectedDayIndex, dispatch]);

  const categoryChartConfig = useMemo<ChartConfig | null>(() => {
    if (!timeframeData) {
      return null;
    }

    const labels = timeframeData.categoryBreakdown.map((slice) => slice.label);
    const data = timeframeData.categoryBreakdown.map((slice) => slice.minutes);
    const colors = timeframeData.categoryBreakdown.map((slice) => slice.color);

    return {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            label: "Minutes",
            data,
            backgroundColor: colors,
            hoverOffset: 12,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#e2e8f0",
              padding: 18,
            },
          },
        },
        onClick: (_: unknown, elements: Array<{ index: number }>) => {
          if (!elements || elements.length === 0) {
            return;
          }

          const index = elements[0]?.index ?? 0;
          const selectedCategory = labels[index];

          dispatch({
            type: "setCategory",
            payload:
              state.categoryFilter === selectedCategory ? "all" : selectedCategory,
          });
        },
      },
    };
  }, [timeframeData, state.categoryFilter, dispatch]);

  const handleTimeframeChange = useCallback(
    (key: TimeframeKey) => {
      dispatch({ type: "setTimeframe", payload: key });
    },
    [dispatch]
  );

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      dispatch({ type: "setSearch", payload: event.target.value });
    },
    []
  );

  const handleCategoryChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      dispatch({ type: "setCategory", payload: event.target.value });
    },
    []
  );

  const selectDay = useCallback(
    (index: number) => () => {
      dispatch({ type: "selectDay", payload: index });
    },
    []
  );

  useEffect(() => {
    if (!chartReady) {
      return;
    }

    if (typeof window !== "undefined" && window.Chart) {
      setChartClass(window.Chart);
    }
  }, [chartReady]);

  useInteractiveChart(chartClass, engagementCanvasRef, engagementChartConfig);
  useInteractiveChart(chartClass, tabsCanvasRef, tabsChartConfig);
  useInteractiveChart(chartClass, categoryCanvasRef, categoryChartConfig);

  const chartsUnavailable = !chartClass;

  return (
    <>
      <Head>
        <title>Chrome usage center</title>
        <meta
          name="description"
          content="Interactive Chrome usage monitor built with Next.js and Chart.js"
        />
      </Head>
      <Script
        src="https://cdn.jsdelivr.net/npm/chart.js"
        strategy="afterInteractive"
        onLoad={() => setChartReady(true)}
      />
      <main className={`${styles.page} ${geistSans.variable} ${geistMono.variable}`}>
        <div className={styles.viewport}>
          <header className={styles.header}>
            <div className={styles.headerContent}>
              <p className={styles.eyebrow}>Usage center</p>
              <h1 className={styles.title}>Chrome activity intelligence</h1>
              <p className={styles.subtitle}>{timeframeData.description}</p>
            </div>
            <div className={styles.timeframeBar}>
              {(Object.keys(TIMEFRAME_DATA) as TimeframeKey[]).map((key) => {
                const data = TIMEFRAME_DATA[key];
                const isActive = state.timeframe === key;

                return (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.timeframeButton} ${
                      isActive ? styles.timeframeButtonActive : ""
                    }`}
                    onClick={() => handleTimeframeChange(key)}
                  >
                    <span className={styles.timeframeLabel}>{data.label}</span>
                    <span className={styles.timeframeRange}>{data.rangeLabel}</span>
                  </button>
                );
              })}
            </div>
          </header>

          <section className={styles.metricsGrid}>
            {timeframeData.metrics.map((metric) => (
              <article key={metric.label} className={styles.metricCard}>
                <span className={styles.metricLabel}>{metric.label}</span>
                <strong className={styles.metricValue}>{metric.value}</strong>
                <span
                  className={`${styles.metricChange} ${
                    metric.trend === "up"
                      ? styles.metricPositive
                      : metric.trend === "down"
                      ? styles.metricNegative
                      : styles.metricNeutral
                  }`}
                >
                  {metric.change}
                </span>
              </article>
            ))}
          </section>

          <section className={styles.analyticsGrid}>
            <article className={styles.chartCard}>
              <header className={styles.chartHeader}>
                <div>
                  <h2>Focus &amp; active time</h2>
                  <p>Compare minutes in Chrome with your focus score for the selected range.</p>
                </div>
                <span className={styles.selectedBadge}>
                  {selectedDay.day} · {selectedDay.date}
                </span>
              </header>
              <div className={styles.chartBody}>
                {chartsUnavailable ? (
                  <div className={styles.chartFallback}>
                    Loading Chart.js…
                  </div>
                ) : (
                  <canvas ref={engagementCanvasRef} aria-label="Focus and active minutes chart" />
                )}
              </div>
            </article>

            <article className={styles.chartCard}>
              <header className={styles.chartHeader}>
                <div>
                  <h2>Tab discipline</h2>
                  <p>See how tab churn fluctuated to spot overload days instantly.</p>
                </div>
                <span className={styles.selectedBadge}>
                  {formatTabs(selectedDay.tabs)}
                </span>
              </header>
              <div className={styles.chartBody}>
                {chartsUnavailable ? (
                  <div className={styles.chartFallback}>Loading Chart.js…</div>
                ) : (
                  <canvas ref={tabsCanvasRef} aria-label="Tabs opened chart" />
                )}
              </div>
            </article>

            <article className={styles.chartCard}>
              <header className={styles.chartHeader}>
                <div>
                  <h2>Attention mix</h2>
                  <p>Highlight where your Chrome time concentrates by category.</p>
                </div>
                <span className={styles.selectedBadge}>
                  {state.categoryFilter === "all"
                    ? "All categories"
                    : state.categoryFilter}
                </span>
              </header>
              <div className={styles.chartBody}>
                {chartsUnavailable ? (
                  <div className={styles.chartFallback}>Loading Chart.js…</div>
                ) : (
                  <canvas ref={categoryCanvasRef} aria-label="Category distribution chart" />
                )}
              </div>
            </article>

            <aside className={styles.detailCard}>
              <header className={styles.detailHeader}>
                <h2>{selectedDay.day}</h2>
                <div className={styles.detailMeta}>
                  <span>{selectedDay.date}</span>
                  <span>{selectedDay.topUrl}</span>
                </div>
              </header>
              <p className={styles.detailContext}>{selectedDay.context}</p>
              <dl className={styles.detailStats}>
                <div>
                  <dt>Active minutes</dt>
                  <dd>{formatMinutes(selectedDay.minutes)}</dd>
                </div>
                <div>
                  <dt>Focus score</dt>
                  <dd>{selectedDay.focus}</dd>
                </div>
                <div>
                  <dt>Tabs opened</dt>
                  <dd>{selectedDay.tabs}</dd>
                </div>
              </dl>
              <ul className={styles.dayPicker}>
                {timeframeData.dailyUsage.map((usage, index) => (
                  <li key={`${usage.day}-${usage.date}`}>
                    <button
                      type="button"
                      onClick={selectDay(index)}
                      className={`${styles.dayButton} ${
                        index === state.selectedDayIndex ? styles.dayButtonActive : ""
                      }`}
                    >
                      <span className={styles.dayLabel}>{usage.day}</span>
                      <span className={styles.dayValue}>{usage.minutes}m</span>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>
          </section>

          <section className={styles.lowerGrid}>
            <article className={styles.tableCard}>
              <header className={styles.tableHeader}>
                <div>
                  <h2>Visited URLs</h2>
                  <p>Filter down to the pages driving your Chrome usage.</p>
                </div>
                <div className={styles.tableFilters}>
                  <input
                    type="search"
                    placeholder="Search by URL or title"
                    value={state.searchTerm}
                    onChange={handleSearchChange}
                    className={styles.searchInput}
                    aria-label="Search visited URLs"
                  />
                  <select
                    value={state.categoryFilter}
                    onChange={handleCategoryChange}
                    className={styles.categorySelect}
                    aria-label="Filter by category"
                  >
                    {categoryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option === "all" ? "All categories" : option}
                      </option>
                    ))}
                  </select>
                </div>
              </header>
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">URL</th>
                      <th scope="col">Category</th>
                      <th scope="col">Minutes</th>
                      <th scope="col">Visits</th>
                      <th scope="col">Last opened</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVisits.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={styles.emptyState}>
                          No visits match your filters—try adjusting the search or category.
                        </td>
                      </tr>
                    ) : (
                      filteredVisits.map((visit) => (
                        <tr key={`${visit.domain}-${visit.title}`}>
                          <th scope="row">
                            <div className={styles.urlCell}>
                              <span className={styles.urlDomain}>{visit.domain}</span>
                              <span className={styles.urlTitle}>{visit.title}</span>
                            </div>
                          </th>
                          <td>{visit.category}</td>
                          <td>{formatMinutes(visit.minutes)}</td>
                          <td>{visit.visits}</td>
                          <td>{visit.lastOpened}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <aside className={styles.highlightCard}>
              <header>
                <h2>Insights</h2>
                <p>Combine quantitative trends with qualitative takeaways.</p>
              </header>
              <ul className={styles.highlightList}>
                {timeframeData.highlights.map((highlight) => (
                  <li
                    key={highlight.title}
                    className={`${styles.highlightItem} ${
                      highlight.status === "positive"
                        ? styles.highlightPositive
                        : highlight.status === "warning"
                        ? styles.highlightWarning
                        : styles.highlightNeutral
                    }`}
                  >
                    <h3>{highlight.title}</h3>
                    <p>{highlight.detail}</p>
                  </li>
                ))}
              </ul>
            </aside>
          </section>
        </div>
      </main>
    </>
  );
}
