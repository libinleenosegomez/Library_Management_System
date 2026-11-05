import { useEffect } from "react";
import { useRouter } from "next/router";
import { AuthProvider, useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import "../styles/globals.css";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password"];

function Guard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const isPublic = PUBLIC_PATHS.includes(router.pathname);

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublic) router.replace("/login");
    if (user && isPublic) router.replace(user.role === "admin" ? "/admin/dashboard" : "/student/browse");
    if (user && router.pathname === "/") router.replace(user.role === "admin" ? "/admin/dashboard" : "/student/browse");
    if (user && router.pathname.startsWith("/admin") && user.role !== "admin") router.replace("/student/browse");
    if (user && router.pathname.startsWith("/student") && user.role !== "student") router.replace("/admin/dashboard");
  }, [loading, user, router, isPublic]);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-serif text-stone-400">Opening the stacks…</div>;
  if (!user && !isPublic) return null;

  return <Layout>{children}</Layout>;
}

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Guard>
        <Component {...pageProps} />
      </Guard>
    </AuthProvider>
  );
}
