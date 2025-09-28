// components/Dashboard.tsx
"use client";
import React, { useMemo, useState } from "react";
import TopTable from "./TopTable";
import BarChart from "./BarChart";

/**
 * Strongly-typed model for incoming data
 */
type DomainStats = {
  timeMs: number;
  visits?: number;
  opens?: number;
};

type SummaryTopItem = {
  domain: string;
  timeMs: number;
  visits?: number;
  opens?: number;
};

type StatsPayload = {
  perDomain?: Record<string, DomainStats>;
  top?: SummaryTopItem[];
  totals?: Record<string, number>;
  // allow other fields but typed as unknown so we don't rely on them
  [k: string]: unknown;
};

export type UploadEntry = {
  receivedAt: string;
  payload: unknown; // incoming payload from disk / API — narrow with type guards below
};

type PerDomain = {
  domain: string;
  timeMs: number;
  visits?: number;
  opens?: number;
};

/* --------------------- Type-guards & helpers --------------------- */

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isNumberLike(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function toNumberSafe(v: unknown, fallback = 0): number {
  if (isNumberLike(v)) return v as number;
  // allow numeric strings
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

/**
 * Narrow unknown payload into StatsPayload-like structure if possible.
 * We do not mutate input.
 */
function extractStats(obj: unknown): StatsPayload | null {
  if (!isObject(obj)) return null;

  // If obj already looks like a stats shape (has perDomain or top), try to coerce
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

  // No recognizable stats fields
  return null;
}

/**
 * Produce a normalized per-domain map from a StatsPayload (supports `perDomain` or `top` shapes).
 */
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

/* --------------------- Component --------------------- */

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

      // payload might be { stats: {...} } or payload itself might be stats
      const statsCandidate: unknown = (entry.payload && isObject(entry.payload) && "stats" in entry.payload) ? (entry.payload as Record<string, unknown>).stats : entry.payload;

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
      ...aggregated.map(r => [r.domain, String(r.timeMs), msToHMS(r.timeMs), String(r.visits ?? 0), String(r.opens ?? 0)])
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `chromore-aggregated-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <main style={{ padding:20, fontFamily:"system-ui, Arial", maxWidth:1100, margin:"0 auto" }}>
      <h1>Chromore — Usage Dashboard</h1>

      <section style={{ display:"flex", gap:12, alignItems:"center", marginTop:12 }}>
        <div><label>From: </label><input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} /></div>
        <div><label>To: </label><input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} /></div>
        <div><label>Top N: </label><input type="number" min={1} max={50} value={topN} onChange={e=>setTopN(Number(e.target.value||10))} style={{ width:70 }} /></div>
        <div style={{ marginLeft:"auto" }}><button onClick={exportCSV}>Export CSV</button></div>
      </section>

      <section style={{ display:"grid", gridTemplateColumns:"1fr 420px", gap:20, marginTop:18 }}>
        <div>
          <h2>Top domains (by tracked time)</h2>
          <div style={{ border:"1px solid #eee", borderRadius:8, padding:10 }}>
            <TopTable rows={topDomains} />
          </div>
          <div style={{ marginTop:12 }}>
            <strong>Total tracked time:</strong> {msToHMS(totalTimeMs)}
          </div>
        </div>

        <div style={{ minHeight:300 }}>
          <h2 style={{ marginTop:0 }}>Chart</h2>
          <div style={{ height:260, border:"1px solid #eee", padding:8, borderRadius:8 }}>
            <BarChart labels={topDomains.map(d=>d.domain)} data={topDomains.map(d=>Math.round(d.timeMs/1000))} />
          </div>

          <div style={{ marginTop:12 }}>
            <h3 style={{ marginBottom:8 }}>Raw uploads (latest)</h3>
            <div style={{ maxHeight:220, overflow:"auto", border:"1px solid #eee", borderRadius:6, padding:8 }}>
              <pre style={{ fontSize:12, whiteSpace:"pre-wrap" }}>
                {uploads.slice().reverse().slice(0,10).map(u => {
                  const maybeStats = isObject(u.payload) && "stats" in u.payload ? (u.payload as Record<string, unknown>).stats : u.payload;
                  const stats = extractStats(maybeStats);
                  const summary = stats ? { totals: stats.totals, perDomainKeys: stats.perDomain ? Object.keys(stats.perDomain).length : (stats.top ? stats.top.length : 0) } : u.payload;
                  return `${u.receivedAt} — ${JSON.stringify(summary)}`;
                }).join("\n\n")}
              </pre>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

/* --------------------- small util --------------------- */
function msToHMS(ms:number) {
  if(!ms||ms<=0) return "0s";
  const s = Math.floor(ms/1000), h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
  return `${h}h ${m}m ${sec}s`;
}
