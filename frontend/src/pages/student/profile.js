import { useState } from "react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Field, inputCls, fmtDate } from "../../components/ui";

export default function MyProfile() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({ name: user.name, email: user.email });
  const [pw, setPw] = useState({ current: "", next: "" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const saveInfo = async () => {
    setErr(""); setMsg("");
    try {
      await api.put(`/users/${user.id}`, { name: form.name, email: form.email });
      await refresh();
      setMsg("Profile updated.");
    } catch (ex) { setErr(ex.message); }
  };

  const changePw = async () => {
    setErr(""); setMsg("");
    try {
      await api.post("/users/me/change-password", { currentPassword: pw.current, newPassword: pw.next });
      setMsg("Password changed.");
      setPw({ current: "", next: "" });
    } catch (ex) { setErr(ex.message); }
  };

  return (
    <div className="max-w-md">
      <h1 className="font-serif text-2xl text-stone-900 mb-5">Profile</h1>
      {msg && <div className="mb-4 text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded">{msg}</div>}
      {err && <div className="mb-4 text-sm bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded">{err}</div>}
      <div className="bg-white border border-stone-200 rounded-sm p-5 mb-4">
        <p className="text-sm font-medium text-stone-700 mb-3">Account details</p>
        <Field label="Name"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Email"><input className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <button onClick={saveInfo} className="px-4 py-2 text-sm rounded bg-amber-700 hover:bg-amber-800 text-white">Save changes</button>
      </div>
      <div className="bg-white border border-stone-200 rounded-sm p-5">
        <p className="text-sm font-medium text-stone-700 mb-3">Change password</p>
        <Field label="Current password"><input type="password" className={inputCls} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
        <Field label="New password"><input type="password" className={inputCls} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
        <button onClick={changePw} className="px-4 py-2 text-sm rounded border border-stone-300 text-stone-700 hover:bg-stone-100">Update password</button>
      </div>
      <p className="text-xs text-stone-400 mt-3">Max books allowed: {user.maxBooks || user.max_books}</p>
    </div>
  );
}
