import { useEffect, useState } from "react";
import api from "../../lib/api";
import { Field, inputCls } from "../../components/ui";

export default function SettingsAdmin() {
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { api.get("/settings").then(({ data }) => setForm(data.settings)); }, []);

  const save = async () => {
    const { data } = await api.put("/settings", {
      loanDays: Number(form.loan_days), finePerDay: Number(form.fine_per_day), maxBooksDefault: Number(form.max_books_default),
    });
    setForm(data.settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!form) return null;

  return (
    <div className="max-w-md">
      <h1 className="font-serif text-2xl text-stone-900 mb-5">Settings</h1>
      <div className="bg-white border border-stone-200 rounded-sm p-5">
        <Field label="Loan period (days)"><input type="number" className={inputCls} value={form.loan_days} onChange={(e) => setForm({ ...form, loan_days: e.target.value })} /></Field>
        <Field label="Fine per overdue day (₹)"><input type="number" className={inputCls} value={form.fine_per_day} onChange={(e) => setForm({ ...form, fine_per_day: e.target.value })} /></Field>
        <Field label="Default max books per student"><input type="number" className={inputCls} value={form.max_books_default} onChange={(e) => setForm({ ...form, max_books_default: e.target.value })} /></Field>
        <button onClick={save} className="mt-2 px-4 py-2 text-sm rounded bg-amber-700 hover:bg-amber-800 text-white">Save settings</button>
        {saved && <span className="ml-3 text-xs text-emerald-700">Saved.</span>}
      </div>
      <p className="text-xs text-stone-400 mt-3">Note: these settings apply to new borrowings and returns going forward — they don't retroactively change already-issued due dates.</p>
    </div>
  );
}
