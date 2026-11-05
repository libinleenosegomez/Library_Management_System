import { useEffect, useState } from "react";
import { Download, Printer, FileBarChart2 } from "lucide-react";
import api from "../../lib/api";
import { EmptyState, csvDownload } from "../../components/ui";

const REPORTS = [
  { id: "inventory", label: "Book Inventory" },
  { id: "borrowing", label: "Borrowing Report" },
  { id: "returns", label: "Return Report" },
  { id: "overdue", label: "Overdue Report" },
  { id: "fines", label: "Fine Report" },
  { id: "activity", label: "User Activity Report" },
  { id: "popular", label: "Most Borrowed Books" },
];

export default function ReportsAdmin() {
  const [rep, setRep] = useState("inventory");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get(`/reports/${rep}`).then(({ data }) => setRows(data.rows));
  }, [rep]);

  const headers = rows[0] ? Object.keys(rows[0]) : [];

  return (
    <div>
      <h1 className="font-serif text-2xl text-stone-900 mb-5">Reports</h1>
      <div className="flex flex-wrap gap-2 mb-4">
        {REPORTS.map((r) => (
          <button key={r.id} onClick={() => setRep(r.id)} className={`text-xs px-3 py-1.5 rounded-full border ${rep === r.id ? "bg-stone-900 text-white border-stone-900" : "border-stone-300 text-stone-600 hover:bg-stone-100"}`}>{r.label}</button>
        ))}
      </div>
      <div className="flex justify-end gap-2 mb-3">
        <button onClick={() => csvDownload(`${rep}-report.csv`, [headers, ...rows.map((r) => headers.map((h) => r[h]))])} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-stone-300 text-stone-600 hover:bg-stone-50"><Download size={13} /> Export CSV</button>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-stone-300 text-stone-600 hover:bg-stone-50"><Printer size={13} /> Print / Save as PDF</button>
      </div>
      <div className="bg-white border border-stone-200 rounded-sm overflow-x-auto">
        {rows.length === 0 ? <EmptyState icon={FileBarChart2} title="No data for this report yet" /> : (
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
              <tr>{headers.map((h) => <th key={h} className="text-left px-4 py-2.5 font-medium">{h.replace(/_/g, " ")}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-stone-50/60">
                  {headers.map((h) => <td key={h} className="px-4 py-2.5 text-stone-700">{String(row[h])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
