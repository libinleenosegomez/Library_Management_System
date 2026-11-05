import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";
import { Field, inputCls } from "../components/ui";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      await register(form.name, form.email, form.password);
      router.replace("/student/browse");
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-sm shadow-sm p-8">
        <form onSubmit={submit}>
          <h2 className="font-serif text-2xl text-stone-900 mb-1">Create a student account</h2>
          <p className="text-sm text-stone-500 mb-6">Register to borrow and reserve books.</p>
          {err && <div className="mb-4 text-sm bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded">{err}</div>}
          <Field label="Full name"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <Field label="Email"><input className={inputCls} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
          <Field label="Password"><input className={inputCls} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} /></Field>
          <button disabled={busy} className="w-full bg-stone-900 hover:bg-stone-800 disabled:opacity-60 text-white rounded py-2.5 text-sm font-medium mt-2">{busy ? "Creating…" : "Create account"}</button>
          <p className="text-sm text-stone-600 mt-6">Already registered? <Link href="/login" className="text-amber-700 font-medium hover:underline">Sign in</Link></p>
        </form>
      </div>
    </div>
  );
}
