import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Library, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Field, inputCls } from "../components/ui";

export default function LoginPage() {
    const { login } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState("admin@library.edu");
    const [password, setPassword] = useState("admin123");
    const [showPw, setShowPw] = useState(false);
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async(e) => {
        e.preventDefault();
        setErr("");
        setBusy(true);
        try {
            const user = await login(email, password);
            router.replace(user.role === "admin" ? "/admin/dashboard" : "/student/browse");
        } catch (ex) {
            setErr(ex.message);
        } finally {
            setBusy(false);
        }
    };

    return ( <
        div className = "min-h-screen bg-stone-100 flex items-center justify-center p-6" >
        <
        div className = "w-full max-w-4xl bg-white border border-stone-200 rounded-sm shadow-sm grid md:grid-cols-2 overflow-hidden" >
        <
        div className = "hidden md:flex flex-col justify-between bg-stone-900 text-stone-100 p-8" >
        <
        div className = "flex items-center gap-2 font-serif text-xl" > < Library size = { 22 }
        className = "text-amber-500" / > Don Bosco College Library < /div> <
        div >
        <
        p className = "font-serif text-3xl leading-snug mb-3" > Every book has < br / > a next reader. < /p> <
        p className = "text-stone-400 text-sm leading-relaxed" > Browse the catalog, borrow and reserve titles, and track due dates and fines— all in one place. < /p> <
        /div> <
        p className = "text-xs text-stone-500" > Full - stack edition· Node / Express + PostgreSQL < /p> <
        /div> <
        div className = "p-8" >
        <
        form onSubmit = { submit } >
        <
        h2 className = "font-serif text-2xl text-stone-900 mb-1" > Sign in < /h2> <
        p className = "text-sm text-stone-500 mb-6" > Access your library account. < /p> {
            err && < div className = "mb-4 text-sm bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded" > { err } < /div>} <
                Field label = "Email" > < input className = { inputCls }
            value = { email }
            onChange = {
                (e) => setEmail(e.target.value) }
            type = "email"
            required / > < /Field> <
                Field label = "Password" >
                <
                div className = "relative" >
                <
                input className = { inputCls }
            value = { password }
            onChange = {
                (e) => setPassword(e.target.value) }
            type = { showPw ? "text" : "password" }
            required / >
                <
                button type = "button"
            onClick = {
                () => setShowPw((s) => !s) }
            className = "absolute right-2 top-2 text-stone-400 hover:text-stone-600" > { showPw ? < EyeOff size = { 16 } /> : <Eye size={16} / > } < /button> <
                /div> <
                /Field> <
                div className = "flex justify-end mb-4" >
                <
                Link href = "/forgot-password"
            className = "text-xs text-amber-700 hover:underline" > Forgot password ? < /Link> <
                /div> <
                button disabled = { busy }
            className = "w-full bg-stone-900 hover:bg-stone-800 disabled:opacity-60 text-white rounded py-2.5 text-sm font-medium" > { busy ? "Signing in…" : "Sign in" } < /button> <
                p className = "text-xs text-stone-500 mt-4" > Demo logins— Admin: admin @library.edu / admin123· Student: aditi.sharma @student.edu / student123 < /p> <
                p className = "text-sm text-stone-600 mt-6" > New student ? < Link href = "/register"
            className = "text-amber-700 font-medium hover:underline" > Create an account < /Link></p >
                <
                /form> <
                /div> <
                /div> <
                /div>
        );
    }