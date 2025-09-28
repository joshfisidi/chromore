// components/BarChart.tsx
import React, { useEffect, useRef } from "react";
import type { Chart as ChartJS, ChartConfiguration } from "chart.js";

type BarChartProps = {
  labels: string[];
  data: number[];
};

export default function BarChart({ labels, data }: BarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // dynamic import avoids SSR/dom errors
        const ChartModule = await import("chart.js/auto");

        // Narrow the imported module to an object with a Chart constructor.
        // We avoid `any` by asserting a constructor signature that returns ChartJS instances.
        type ChartConstructor = new (
          ctx: CanvasRenderingContext2D,
          cfg: ChartConfiguration<"bar", number[], string>
        ) => ChartJS;

        const ChartClass = (ChartModule as unknown as { Chart: ChartConstructor }).Chart;
        if (!mounted) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!ctx || !ChartClass) return;

        // destroy previous instance if any
        if (chartRef.current) {
          try {
            chartRef.current.destroy();
          } catch (e) {
            // ignore destroy errors
            // eslint-disable-next-line no-console
            console.warn("Failed to destroy previous chart instance", e);
          }
          chartRef.current = null;
        }

        const cfg: ChartConfiguration<"bar", number[], string> = {
          type: "bar",
          data: {
            labels,
            datasets: [
              {
                label: "Seconds spent",
                data,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
          },
        };

        chartRef.current = new ChartClass(ctx, cfg);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to initialize Chart.js", err);
      }
    })();

    return () => {
      mounted = false;
      if (chartRef.current) {
        try {
          chartRef.current.destroy();
        } catch {
          // swallow
        }
        chartRef.current = null;
      }
    };
  }, [labels.join("|"), data.join(",")]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
}
