import { useEffect, useState } from "react";
import { BookMarked } from "lucide-react";
import api from "../../lib/api";
import { StatusPill, EmptyState, fmtDate, rupee } from "../../components/ui";

function borrowingStatus(b) {
  if (b.return_date) return { label: "Returned", tone: "stone" };
  if (new Date(b.due_date) < new Date()) return { label: "Overdue", tone: "rose" };
  return { label: "Borrowed", tone: "green" };
}
function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }

export default function MyBooks() {
  const [rows, setRows] = useState([]);
  const [finePerDay, setFinePerDay] = useState(5);

  useEffect(() => {
    api.get("/borrowings", { params: { status: "borrowed" } }).then(({ data }) => setRows(data.borrowings));
    api.get("/borrowings", { params: { status: "overdue" } }).then(({ data }) => setRows((prev) => [...prev, ...data.borrowings]));
    api.get("/settings").then(({ data }) => setFinePerDay(Number(data.settings.fine_per_day)));
  }, []);

  return (
    <div>
      <h1 className="font-serif text-2xl text-stone-900 mb-5">My books</h1>
      {rows.length === 0 ? <EmptyState icon={BookMarked} title="You have no books out right now" subtitle="Browse the catalog to borrow something." /> : (
        <div className="bg-white border border-stone-200 rounded-sm divide-y divide-stone-100">
          {rows.map((b) => {
            const st = borrowingStatus(b);
            const overdueDays = st.label === "Overdue" ? daysBetween(b.due_date, new Date()) : 0;
            return (
              <div key={b.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-serif text-stone-900">{b.title}</p>
                  <p className="text-xs text-stone-500 mt-0.5">Borrowed {fmtDate(b.borrow_date)} · Due {fmtDate(b.due_date)}</p>
                  {overdueDays > 0 && <p className="text-xs text-rose-600 mt-0.5">{overdueDays} day(s) overdue — projected fine {rupee(overdueDays * finePerDay)}</p>}
                </div>
                <StatusPill tone={st.tone}>{st.label}</StatusPill>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-xs text-stone-400 mt-3">Returns are processed by the librarian at the circulation desk — bring the book in to have it marked returned.</p>
    </div>
  );
}
