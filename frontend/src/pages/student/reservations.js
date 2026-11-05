import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import api from "../../lib/api";
import { StatusPill, EmptyState, fmtDate } from "../../components/ui";

export default function MyReservations() {
  const [rows, setRows] = useState([]);
  const load = () => api.get("/reservations").then(({ data }) => setRows(data.reservations));
  useEffect(() => { load(); }, []);

  const tone = (s) => ({ waiting: "amber", available: "green", cancelled: "stone", fulfilled: "stone" }[s]);
  const cancel = async (id) => { await api.post(`/reservations/${id}/cancel`); load(); };

  return (
    <div>
      <h1 className="font-serif text-2xl text-stone-900 mb-5">My reservations</h1>
      {rows.length === 0 ? <EmptyState icon={Bookmark} title="No reservations" subtitle="Reserve a book from the catalog when it's checked out." /> : (
        <div className="bg-white border border-stone-200 rounded-sm divide-y divide-stone-100">
          {rows.map((r) => (
            <div key={r.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="font-serif text-stone-900">{r.title}</p>
                <p className="text-xs text-stone-500 mt-0.5">Reserved {fmtDate(r.reserve_date)}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill tone={tone(r.status)}>{r.status}</StatusPill>
                {r.status === "waiting" && <button onClick={() => cancel(r.id)} className="text-xs text-rose-600 hover:underline">Cancel</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
