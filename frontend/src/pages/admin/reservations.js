import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import api from "../../lib/api";
import { StatusPill, EmptyState, fmtDate } from "../../components/ui";

export default function ReservationsAdmin() {
  const [rows, setRows] = useState([]);
  const load = () => api.get("/reservations").then(({ data }) => setRows(data.reservations));
  useEffect(() => { load(); }, []);

  const tone = (s) => ({ waiting: "amber", available: "green", cancelled: "stone", fulfilled: "stone" }[s]);
  const cancel = async (r) => { await api.post(`/reservations/${r.id}/cancel`); load(); };

  return (
    <div>
      <h1 className="font-serif text-2xl text-stone-900 mb-5">Reservations</h1>
      {rows.length === 0 ? <EmptyState icon={Bookmark} title="No reservations yet" /> : (
        <div className="bg-white border border-stone-200 rounded-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
              <tr><th className="text-left px-4 py-2.5 font-medium">Book</th><th className="text-left px-4 py-2.5 font-medium">Student</th><th className="text-left px-4 py-2.5 font-medium">Reserved</th><th className="text-left px-4 py-2.5 font-medium">Status</th><th className="px-4 py-2.5"></th></tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-stone-50/60">
                  <td className="px-4 py-2.5 text-stone-800">{r.title}</td>
                  <td className="px-4 py-2.5 text-stone-600">{r.user_name}</td>
                  <td className="px-4 py-2.5 text-stone-500">{fmtDate(r.reserve_date)}</td>
                  <td className="px-4 py-2.5"><StatusPill tone={tone(r.status)}>{r.status}</StatusPill></td>
                  <td className="px-4 py-2.5 text-right">{r.status === "waiting" && <button onClick={() => cancel(r)} className="text-xs text-rose-600 hover:underline">Cancel</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
