import { useEffect, useState } from "react";
import { Receipt } from "lucide-react";
import api from "../../lib/api";
import { StatusPill, EmptyState, rupee } from "../../components/ui";

export default function FinesAdmin() {
  const [tab, setTab] = useState("unpaid");
  const [rows, setRows] = useState([]);

  const load = () => api.get("/fines", { params: { status: tab } }).then(({ data }) => setRows(data.fines));
  useEffect(() => { load(); }, [tab]);

  const pay = async (id) => { await api.post(`/fines/${id}/pay`); load(); };
  const waive = async (id) => { await api.post(`/fines/${id}/waive`); load(); };

  return (
    <div>
      <h1 className="font-serif text-2xl text-stone-900 mb-5">Fines</h1>
      <div className="flex gap-2 mb-4">
        {["unpaid", "paid", "waived", "all"].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`text-xs px-3 py-1.5 rounded-full border capitalize ${tab === t ? "bg-stone-900 text-white border-stone-900" : "border-stone-300 text-stone-600 hover:bg-stone-100"}`}>{t}</button>
        ))}
      </div>
      {rows.length === 0 ? <EmptyState icon={Receipt} title="No fines here" /> : (
        <div className="bg-white border border-stone-200 rounded-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
              <tr><th className="text-left px-4 py-2.5 font-medium">Student</th><th className="text-left px-4 py-2.5 font-medium">Book</th><th className="text-left px-4 py-2.5 font-medium">Reason</th><th className="text-left px-4 py-2.5 font-medium">Amount</th><th className="text-left px-4 py-2.5 font-medium">Status</th><th className="text-right px-4 py-2.5 font-medium">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((f) => (
                <tr key={f.id} className="hover:bg-stone-50/60">
                  <td className="px-4 py-2.5 text-stone-800">{f.user_name}</td>
                  <td className="px-4 py-2.5 text-stone-600">{f.book_title}</td>
                  <td className="px-4 py-2.5 text-stone-500">{f.reason}</td>
                  <td className="px-4 py-2.5 text-stone-800">{rupee(f.amount)}</td>
                  <td className="px-4 py-2.5"><StatusPill tone={f.status === "unpaid" ? "rose" : f.status === "paid" ? "green" : "stone"}>{f.status}</StatusPill></td>
                  <td className="px-4 py-2.5 text-right">
                    {f.status === "unpaid" && (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => pay(f.id)} className="text-xs px-2.5 py-1 rounded border border-emerald-600 text-emerald-700 hover:bg-emerald-50">Mark paid</button>
                        <button onClick={() => waive(f.id)} className="text-xs px-2.5 py-1 rounded border border-stone-300 text-stone-600 hover:bg-stone-50">Waive</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
