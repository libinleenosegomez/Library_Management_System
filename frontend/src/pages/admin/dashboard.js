import { useEffect, useState } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend, ResponsiveContainer,
} from "recharts";
import { BookOpen, CheckCircle2, Repeat, AlertTriangle, Users, IndianRupee } from "lucide-react";
import api from "../../lib/api";
import { StatusPill, fmtDate, rupee } from "../../components/ui";

function StatCard({ label, value, icon: Icon, borderColor }) {
  return (
    <div className="bg-white border-b-2 px-5 py-4 flex items-start justify-between" style={{ borderBottomColor: borderColor }}>
      <div>
        <p className="text-xs uppercase tracking-wide text-stone-400 mb-1">{label}</p>
        <p className="font-serif text-2xl text-stone-800">{value}</p>
      </div>
      <Icon size={20} className="text-stone-300 mt-1" />
    </div>
  );
}
function ChartCard({ title, children }) {
  return (
    <div className="bg-white border border-stone-200 rounded-sm p-4">
      <p className="font-serif text-stone-800 mb-2">{title}</p>
      {children}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => { api.get("/reports/dashboard").then(({ data }) => setStats(data)); }, []);

  if (!stats) return <p className="text-stone-400 font-serif">Loading dashboard…</p>;

  const overduePie = [
    { name: "On time", value: stats.borrowedNow - stats.overdueNow, color: "#047857" },
    { name: "Overdue", value: stats.overdueNow, color: "#be123c" },
  ];

  return (
    <div>
      <h1 className="font-serif text-2xl text-stone-900 mb-5">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label="Total Books" value={stats.totalBooks} icon={BookOpen} borderColor="#d6d3d1" />
        <StatCard label="Available" value={stats.availableBooks} icon={CheckCircle2} borderColor="#047857" />
        <StatCard label="Borrowed" value={stats.borrowedNow} icon={Repeat} borderColor="#b45309" />
        <StatCard label="Overdue" value={stats.overdueNow} icon={AlertTriangle} borderColor="#be123c" />
        <StatCard label="Students" value={stats.totalStudents} icon={Users} borderColor="#d6d3d1" />
        <StatCard label="Unpaid Fines" value={rupee(stats.unpaidFines)} icon={IndianRupee} borderColor="#be123c" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <ChartCard title="Borrowing activity — last 14 days">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.borrowsByDay.map((d) => ({ ...d, day: d.day.slice(5) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#a8a29e" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#a8a29e" />
              <RTooltip /><Bar dataKey="count" fill="#b45309" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Most borrowed books">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.mostBorrowed} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="#a8a29e" />
              <YAxis type="category" dataKey="title" width={130} tick={{ fontSize: 11 }} stroke="#a8a29e" />
              <RTooltip /><Bar dataKey="count" fill="#047857" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Most active users">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.activeUsers}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#a8a29e" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#a8a29e" />
              <RTooltip /><Bar dataKey="count" fill="#0369a1" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Currently borrowed: on time vs overdue">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={overduePie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {overduePie.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <RTooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white border border-stone-200 rounded-sm">
          <div className="px-4 py-3 border-b border-stone-100 font-serif text-stone-800">Recent borrowing activity</div>
          <div className="divide-y divide-stone-100">
            {stats.recentActivity.map((b) => (
              <div key={b.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <div><span className="text-stone-800">{b.title}</span><span className="text-stone-400"> · {b.user_name}</span></div>
                <StatusPill tone={b.status === "returned" ? "stone" : "green"}>{b.status}</StatusPill>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-stone-200 rounded-sm">
          <div className="px-4 py-3 border-b border-stone-100 font-serif text-stone-800">Recently added books</div>
          <div className="divide-y divide-stone-100">
            {stats.recentBooks.map((b, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <span className="text-stone-800">{b.title}</span>
                <span className="text-stone-400 text-xs">{fmtDate(b.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
