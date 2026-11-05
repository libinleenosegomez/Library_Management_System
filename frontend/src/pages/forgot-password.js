import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft } from "lucide-react";
import api from "../lib/api";
import { Field, inputCls } from "../components/ui";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  const requestCode = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setDevCode(data.devOnlyResetCode);
      setStep(2);
    } catch (ex) { setErr(ex.message); }
  };

  const resetPw = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await api.post("/auth/reset-password", { email, code, newPassword: pw });
      router.replace("/login");
    } catch (ex) { setErr(ex.message); }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-sm shadow-sm p-8">
        <Link href="/login" className="text-xs text-stone-500 hover:text-stone-700 flex items-center gap-1 mb-4"><ArrowLeft size={14} /> Back to sign in</Link>
        <h2 className="font-serif text-2xl text-stone-900 mb-1">Reset password</h2>
        {step === 1 ? (
          <form onSubmit={requestCode}>
            <p className="text-sm text-stone-500 mb-6">Enter your account email. In this demo, the reset code is returned directly since there is no email server configured — wire up a real mail provider (e.g. Postmark, SES) before production use.</p>
            {err && <div className="mb-4 text-sm bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded">{err}</div>}
            <Field label="Email"><input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
            <button className="w-full bg-stone-900 hover:bg-stone-800 text-white rounded py-2.5 text-sm font-medium">Send reset code</button>
          </form>
        ) : (
          <form onSubmit={resetPw}>
            <div className="mb-4 text-sm bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded">Demo reset code: <b>{devCode}</b></div>
            {err && <div className="mb-4 text-sm bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded">{err}</div>}
            <Field label="Reset code"><input className={inputCls} value={code} onChange={(e) => setCode(e.target.value)} required /></Field>
            <Field label="New password"><input className={inputCls} type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} /></Field>
            <button className="w-full bg-stone-900 hover:bg-stone-800 text-white rounded py-2.5 text-sm font-medium">Reset password</button>
          </form>
        )}
      </div>
    </div>
  );
}
