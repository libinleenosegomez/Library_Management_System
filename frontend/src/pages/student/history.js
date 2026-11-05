import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import api from "../../lib/api";
import { StatusPill, EmptyState, fmtDate } from "../../components/ui";

function borrowingStatus(b) {
  if (b.return_date) return { label: "Returned", tone: "stone" };
  if (new Date(b.due_date) < new Date()) return { label: "Overdue", tone: "rose" };
  return { label: "Borrowed", tone: "green" };
}

export default function MyHistory() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/borrowings").then(({ data }) => setRows(data.borrowings)); }, []);

  return (
    <div>
      <h1 className="font-serif text-2xl text-stone-900 mb-5">Borrowing history</h1>
      {rows.length === 0 ? <EmptyState icon={Clock} title="No history yet" /> : (
        <div className="bg-white border border-stone-200 rounded-sm divide-y divide-stone-100">
          {rows.map((b) => (
            <div key={b.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-stone-800 text-sm">{b.title}</p>
                <p className="text-xs text-stone-500 mt-0.5">Borrowed {fmtDate(b.borrow_date)}{b.return_date ? ` · Returned ${fmtDate(b.return_date)}` : ""}</p>
              </div>
              <StatusPill tone={borrowingStatus(b).tone}>{borrowingStatus(b).label}</StatusPill>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
