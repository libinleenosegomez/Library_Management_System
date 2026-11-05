import { useEffect, useState } from "react";
import { Receipt } from "lucide-react";
import api from "../../lib/api";
import { StatusPill, EmptyState, fmtDate, rupee } from "../../components/ui";

export default function MyFines() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/fines", { params: { status: "all" } }).then(({ data }) => setRows(data.fines)); }, []);

  const outstanding = rows.filter((f) => f.status === "unpaid").reduce((s, f) => s + Number(f.amount), 0);

  return (
    <div>
      <h1 className="font-serif text-2xl text-stone-900 mb-5">My fines</h1>
      <div className="bg-white border-b-2 border-rose-700 px-5 py-4 mb-5 inline-block">
        <p className="text-xs uppercase tracking-wide text-stone-400 mb-1">Outstanding balance</p>
        <p className="font-serif text-2xl text-rose-700">{rupee(outstanding)}</p>
      </div>
      {rows.length === 0 ? <EmptyState icon={Receipt} title="No fines on your account" /> : (
        <div className="bg-white border border-stone-200 rounded-sm divide-y divide-stone-100">
          {rows.map((f) => (
            <div key={f.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-stone-800 text-sm">{f.book_title}</p>
                <p className="text-xs text-stone-500 mt-0.5">{f.reason} · {fmtDate(f.fine_date)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-stone-800 text-sm">{rupee(f.amount)}</span>
                <StatusPill tone={f.status === "unpaid" ? "rose" : f.status === "paid" ? "green" : "stone"}>{f.status}</StatusPill>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-stone-400 mt-3">Pay fines in person at the circulation desk — the librarian will mark them as paid.</p>
    </div>
  );
}
