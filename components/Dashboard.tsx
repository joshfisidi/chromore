// components/Dashboard.tsx
"use client";
import React, { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import BarChart from "./BarChart";

/* --------------------- types & guards --------------------- */

type DomainStats = { timeMs: number; visits?: number; opens?: number };
type SummaryTopItem = { domain: string; timeMs: number; visits?: number; opens?: number };

type StatsPayload = {
  perDomain?: Record<string, DomainStats>;
  top?: SummaryTopItem[];
  totals?: Record<string, number>;
  [k: string]: unknown;
};

export type UploadEntry = {
  receivedAt: string;
  payload: unknown;
};

type PerDomain = {
  domain: string;
  timeMs: number;
  visits?: number;
  opens?: number;
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isNumberLike(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function toNumberSafe(v: unknown, fallback = 0): number {
  if (isNumberLike(v)) return v as number;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function extractStats(obj: unknown): StatsPayload | null {
  if (!isObject(obj)) return null;
  if ("perDomain" in obj || "top" in obj || "totals" in obj) {
    const out: StatsPayload = {};

    if ("perDomain" in obj && isObject(obj.perDomain)) {
      const pd: Record<string, DomainStats> = {};
      for (const [k, v] of Object.entries(obj.perDomain as Record<string, unknown>)) {
        if (isObject(v)) {
          pd[k] = {
            timeMs: toNumberSafe((v as Record<string, unknown>).timeMs, 0),
            visits: toNumberSafe((v as Record<string, unknown>).visits, 0),
            opens: toNumberSafe((v as Record<string, unknown>).opens, 0),
          };
        }
      }
      out.perDomain = pd;
    }

    if ("top" in obj && Array.isArray(obj.top)) {
      const topArr: SummaryTopItem[] = [];
      for (const item of obj.top as unknown[]) {
        if (isObject(item) && typeof item.domain === "string") {
          topArr.push({
            domain: item.domain,
            timeMs: toNumberSafe((item as Record<string, unknown>).timeMs, 0),
            visits: toNumberSafe((item as Record<string, unknown>).visits, 0),
            opens: toNumberSafe((item as Record<string, unknown>).opens, 0),
          });
        }
      }
      out.top = topArr;
    }

    if ("totals" in obj && isObject(obj.totals)) {
      const totals: Record<string, number> = {};
      for (const [k, v] of Object.entries(obj.totals as Record<string, unknown>)) {
        totals[k] = toNumberSafe(v, 0);
      }
      out.totals = totals;
    }

    return out;
  }
  return null;
}

function normalizedPerDomain(stats: StatsPayload | null): Record<string, DomainStats> {
  const out: Record<string, DomainStats> = {};
  if (!stats) return out;
  if (stats.perDomain) {
    for (const [domain, ds] of Object.entries(stats.perDomain)) {
      out[domain] = {
        timeMs: toNumberSafe(ds.timeMs, 0),
        visits: toNumberSafe(ds.visits, 0),
        opens: toNumberSafe(ds.opens, 0),
      };
    }
    return out;
  }
  if (Array.isArray(stats.top)) {
    for (const item of stats.top) {
      out[item.domain] = {
        timeMs: toNumberSafe(item.timeMs, 0),
        visits: toNumberSafe(item.visits, 0),
        opens: toNumberSafe(item.opens, 0),
      };
    }
  }
  return out;
}

/* --------------------- Dashboard component --------------------- */

export default function Dashboard({ uploads }: { uploads: UploadEntry[] }) {
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [topN, setTopN] = useState<number>(10);

  const aggregated = useMemo<PerDomain[]>(() => {
    const map = new Map<string, PerDomain>();
    const fromTs = fromDate ? new Date(fromDate).getTime() : -Infinity;
    const toTs = toDate ? new Date(toDate).getTime() + 24 * 3600 * 1000 - 1 : Infinity;

    for (const entry of uploads) {
      const ts = Date.parse(entry.receivedAt);
      if (!Number.isFinite(ts)) continue;
      if (ts < fromTs || ts > toTs) continue;

      const statsCandidate: unknown =
        entry.payload && isObject(entry.payload) && "stats" in entry.payload
          ? (entry.payload as Record<string, unknown>).stats
          : entry.payload;

      const stats = extractStats(statsCandidate);
      const perDomain = normalizedPerDomain(stats);

      for (const [domain, d] of Object.entries(perDomain)) {
        const cur = map.get(domain) ?? { domain, timeMs: 0, visits: 0, opens: 0 };
        cur.timeMs += toNumberSafe(d.timeMs, 0);
        cur.visits = (cur.visits ?? 0) + toNumberSafe(d.visits, 0);
        cur.opens = (cur.opens ?? 0) + toNumberSafe(d.opens, 0);
        map.set(domain, cur);
      }
    }

    const arr = Array.from(map.values());
    arr.sort((a, b) => b.timeMs - a.timeMs);
    return arr;
  }, [uploads, fromDate, toDate]);

  const totalTimeMs = aggregated.reduce((s, r) => s + r.timeMs, 0);
  const topDomains = aggregated.slice(0, topN);

  function exportCSV() {
    const rows: string[][] = [
      ["domain", "timeMs", "time", "visits", "opens"],
      ...aggregated.map((r) => [
        r.domain,
        String(r.timeMs),
        msToHMS(r.timeMs),
        String(r.visits ?? 0),
        String(r.opens ?? 0),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chromore-aggregated-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Chromore</h1>
          <p className="text-sm text-muted-foreground mt-1">Your Chrome usage, beautifully visualized.</p>
        </div>

        <div className="flex gap-2">
          <Button variant={"ghost"} onClick={() => { /* you can wire a refresh callback if needed */ }}>
            Refresh
          </Button>
          <Button onClick={exportCSV}>Export CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <Card className="col-span-2">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Top domains</CardTitle>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Label>From</Label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-[140px]" />
              </div>

              <div className="flex items-center gap-1">
                <Label>To</Label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-[140px]" />
              </div>

              <div>
                <Select value={String(topN)} onValueChange={(v) => setTopN(Number(v))}>
                  <SelectTrigger className="w-[90px]">
                    <SelectValue placeholder="Top N" />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 50].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {`Top ${n}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell style={{ padding: 8, textAlign: "left" }} className="w-[60%]">Domain</TableCell>
                    <TableCell style={{ padding: 8, textAlign: "left" }}>Time</TableCell>
                    <TableCell style={{ padding: 8, textAlign: "left" }}>Visits</TableCell>
                    <TableCell style={{ padding: 8, textAlign: "left" }}>Opens</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topDomains.map((r, i) => (
                    <TableRow key={r.domain}>
                      <TableCell className="flex items-center gap-3 py-3">
                        <div className="font-medium">{i + 1}. {r.domain}</div>
                      </TableCell>
                      <TableCell>{msToHMS(r.timeMs)}</TableCell>
                      <TableCell><Badge variant="secondary">{r.visits ?? 0}</Badge></TableCell>
                      <TableCell><Badge variant="ghost">{r.opens ?? 0}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {topDomains.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">No data in range.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Total tracked time</div>
                <div className="text-lg font-semibold">{msToHMS(totalTimeMs)}</div>
              </div>
              <div className="text-sm text-muted-foreground">Domain-aggregates only — no full URLs uploaded</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage chart</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <div className="h-full">
              <BarChart labels={topDomains.map((d) => d.domain)} data={topDomains.map((d) => Math.round(d.timeMs / 1000))} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Raw uploads (latest)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>
              {uploads.slice().reverse().slice(0, 10).map(u => {
                const maybeStats = isObject(u.payload) && "stats" in u.payload ? (u.payload as Record<string, unknown>).stats : u.payload;
                const stats = extractStats(maybeStats);
                const summary = stats ? { totals: stats.totals, perDomainKeys: stats.perDomain ? Object.keys(stats.perDomain).length : (stats.top ? stats.top.length : 0) } : u.payload;
                return `${u.receivedAt} — ${JSON.stringify(summary)}`;
              }).join("\n\n")}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* --------------------- small util --------------------- */

function msToHMS(ms: number) {
  if (!ms || ms <= 0) return "0s";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
}
