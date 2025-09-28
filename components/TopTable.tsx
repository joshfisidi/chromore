// components/TopTable.tsx
import React from "react";

type Row = { domain: string; timeMs: number; visits?: number; opens?: number; };

export default function TopTable({ rows }: { rows: Row[] }) {
  return (
    <table style={{ width:"100%", borderCollapse:"collapse" }}>
      <thead>
        <tr style={{ textAlign:"left" }}>
          <th style={{ padding:8 }}>Domain</th>
          <th style={{ padding:8 }}>Time</th>
          <th style={{ padding:8 }}>Visits</th>
          <th style={{ padding:8 }}>Opens</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r,i)=>(
          <tr key={r.domain} style={{ borderTop:"1px solid #f2f2f2" }}>
            <td style={{ padding:8 }}>{i+1}. {r.domain}</td>
            <td style={{ padding:8 }}>{msToHMS(r.timeMs)}</td>
            <td style={{ padding:8 }}>{r.visits||0}</td>
            <td style={{ padding:8 }}>{r.opens||0}</td>
          </tr>
        ))}
        {rows.length===0 && <tr><td colSpan={4} style={{ padding:12 }}>No data in range.</td></tr>}
      </tbody>
    </table>
  );
}

function msToHMS(ms:number){ if(!ms||ms<=0) return "0s"; const s = Math.floor(ms/1000), h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60; return `${h}h ${m}m ${sec}s`; }
