import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
    LayoutDashboard,
    BookOpen,
    Users,
    FolderKanban,
    Repeat,
    Bookmark,
    Receipt,
    FileBarChart2,
    Settings,
    Bell,
    LogOut,
    Library,
    BookMarked,
    Clock,
    User,
    ShieldCheck,
    GraduationCap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { fmtDate } from "./ui";

const ADMIN_NAV = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/books", label: "Books", icon: BookOpen },
    { href: "/admin/categories", label: "Categories", icon: FolderKanban },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/borrowings", label: "Borrowings", icon: Repeat },
    { href: "/admin/reservations", label: "Reservations", icon: Bookmark },
    { href: "/admin/fines", label: "Fines", icon: Receipt },
    { href: "/admin/reports", label: "Reports", icon: FileBarChart2 },
    { href: "/admin/settings", label: "Settings", icon: Settings },
];
const STUDENT_NAV = [
    { href: "/student/browse", label: "Browse Books", icon: BookOpen },
    { href: "/student/my-books", label: "My Books", icon: BookMarked },
    { href: "/student/reservations", label: "Reservations", icon: Bookmark },
    { href: "/student/fines", label: "My Fines", icon: Receipt },
    { href: "/student/history", label: "History", icon: Clock },
    { href: "/student/profile", label: "Profile", icon: User },
];

export default function Layout({ children }) {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [notifs, setNotifs] = useState([]);
    const [openBell, setOpenBell] = useState(false);

    const loadNotifs = async() => {
        try {
            const { data } = await api.get("/notifications");
            setNotifs(data.notifications);
        } catch { /* ignore */ }
    };
    useEffect(() => { if (user) loadNotifs(); }, [user]);

    if (!user) return children; // auth pages render without chrome

    const nav = user.role === "admin" ? ADMIN_NAV : STUDENT_NAV;
    const unread = notifs.filter((n) => !n.is_read).length;

    const markAllRead = async() => {
        await api.post("/notifications/mark-all-read");
        loadNotifs();
    };

    return ( <
            div className = "min-h-screen bg-stone-50 flex" >
            <
            aside className = "w-56 shrink-0 bg-stone-900 text-stone-300 flex flex-col" >
            <
            div className = "px-5 py-5 flex items-center gap-2 border-b border-stone-800" >
            <
            Library size = { 20 }
            className = "text-amber-500" / >
            <
            span className = "font-serif text-lg text-white leading-tight" > Don Bosco < br / > < span className = "text-xs font-sans text-stone-400 tracking-normal" > College Library < /span></span >
            <
            /div> <
            nav className = "flex-1 py-3" > {
                nav.map((item) => {
                    const Icon = item.icon;
                    const active = router.pathname === item.href;
                    return ( <
                        a key = { item.href }
                        href = { item.href }
                        className = { `flex items-center gap-3 px-5 py-2.5 text-sm border-l-2 transition-colors ${active ? "border-amber-500 bg-stone-800 text-white" : "border-transparent hover:bg-stone-800/60 hover:text-white"}` } >
                        <
                        Icon size = { 16 }
                        /> {item.label} <
                        /a>
                    );
                })
            } <
            /nav> <
            div className = "px-5 py-4 text-[11px] text-stone-500 border-t border-stone-800" > { user.role === "admin" ? < span className = "flex items-center gap-1" > < ShieldCheck size = { 12 } /> Librarian access</span > : < span className = "flex items-center gap-1" > < GraduationCap size = { 12 }
                /> Student access</span > } <
            /div> <
            /aside>

            <
            div className = "flex-1 flex flex-col min-w-0" >
            <
            header className = "h-16 border-b border-stone-200 bg-white flex items-center justify-between px-6" >
            <
            div className = "font-serif text-stone-800 text-base" > { user.role === "admin" ? "Librarian Console" : `Welcome, ${user.name.split(" ")[0]}` } <
            /div> <
            div className = "flex items-center gap-4 relative" >
            <
            div className = "relative" >
            <
            button onClick = {
                () => setOpenBell((s) => !s) }
            className = "relative text-stone-500 hover:text-stone-800 p-2" >
            <
            Bell size = { 19 }
            /> {
                unread > 0 && < span className = "absolute top-0.5 right-0.5 bg-rose-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center" > { unread } < /span>} <
                    /button> {
                        openBell && ( <
                            div className = "absolute right-0 mt-2 w-80 bg-white border border-stone-200 rounded shadow-lg z-50 max-h-96 overflow-y-auto" >
                            <
                            div className = "flex items-center justify-between px-4 py-2 border-b border-stone-100" >
                            <
                            span className = "text-sm font-medium text-stone-700" > Notifications < /span> <
                            button onClick = { markAllRead }
                            className = "text-xs text-amber-700 hover:underline" > Mark all read < /button> <
                            /div> {
                                notifs.length === 0 ? < div className = "p-6 text-center text-xs text-stone-400" > Nothing yet. < /div> : notifs.map((n) => ( <
                                    div key = { n.id }
                                className = { `px-4 py-3 text-sm border-b border-stone-50 ${n.is_read ? "text-stone-500" : "text-stone-800 bg-amber-50/40"}` } >
                                    <
                                    p > { n.message } < /p> <
                                    p className = "text-[11px] text-stone-400 mt-1" > { fmtDate(n.created_at) } < /p> <
                                    /div>
                            ))
                    } <
                    /div>
            )
        } <
        /div> <
        div className = "w-px h-6 bg-stone-200" / >
        <
        div className = "w-8 h-8 rounded-full bg-amber-700 text-white flex items-center justify-center text-xs font-medium" > { user.name.split(" ").map((p) => p[0]).slice(0, 2).join("") } <
        /div> <
        button onClick = { logout }
    className = "text-stone-400 hover:text-rose-700 p-2" > < LogOut size = { 17 }
    /></button >
    <
    /div> <
    /header> <
    main className = "flex-1 overflow-y-auto p-6" > { children } < /main> <
        /div> <
        /div>
);
}