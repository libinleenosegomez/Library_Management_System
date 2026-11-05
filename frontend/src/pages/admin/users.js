import { createElement as h, useEffect, useState } from "react";
import { Search, Pencil, CheckCircle2, XCircle, Plus } from "lucide-react";
import api from "../../lib/api";
import { Field, inputCls, StatusPill, Modal, rupee } from "../../components/ui";

export default function UsersAdmin() {
    const [users, setUsers] = useState([]);
    const [q, setQ] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [profile, setProfile] = useState(null);
    const [editing, setEditing] = useState(null);
    const [creating, setCreating] = useState(false);
    const load = async() => {
        const params = {};
        if (q) params.q = q;
        if (roleFilter !== "all") params.role = roleFilter;
        const { data } = await api.get("/users", { params });
        setUsers(data.users);
    };
    useEffect(() => { load(); }, [q, roleFilter]);
    const toggleActive = async(user) => {
        await api.patch(`/users/${user.id}/status`, { status: user.status === "active" ? "inactive" : "active" });
        load();
    };
    const openProfile = async(user) => {
        const { data } = await api.get(`/users/${user.id}`);
        setProfile(data);
    };
    const saveUser = async(form) => {
        await api.put(`/users/${form.id}`, { name: form.name, email: form.email, maxBooks: Number(form.maxBooks), admissionNo: form.admission_no, department: form.department, accountNo: form.account_no });
        setEditing(null);
        load();
    };
    const createUser = async(form) => {
        await api.post("/users", form);
        setCreating(false);
        load();
    };

    const userRows = users.map((user) => h("tr", { key: user.id, className: "hover:bg-stone-50/60" },
        h("td", { className: "px-4 py-2.5" }, h("button", { onClick: () => openProfile(user), className: "text-stone-800 font-medium hover:text-amber-700 hover:underline" }, user.name)),
        h("td", { className: "px-4 py-2.5 text-stone-500" }, user.email),
        h("td", { className: "px-4 py-2.5 text-stone-600 capitalize" }, user.role),
        h("td", { className: "px-4 py-2.5" }, h(StatusPill, { tone: user.status === "active" ? "green" : "stone" }, user.status)),
        h("td", { className: "px-4 py-2.5" }, h("div", { className: "flex justify-end gap-1" },
            h("button", { "aria-label": "Edit user", onClick: () => setEditing(user), className: "p-1.5 text-stone-400 hover:text-amber-700" }, h(Pencil, { size: 15 })),
            user.role === "student" && h("button", { "aria-label": "Toggle student access", onClick: () => toggleActive(user), className: "p-1.5 text-stone-400 hover:text-rose-700" }, user.status === "active" ? h(XCircle, { size: 15 }) : h(CheckCircle2, { size: 15 }))
        ))
    ));

    let profileModal = null;
    if (profile) {
        const active = profile.borrowings.filter((borrowing) => !borrowing.return_date).length;
        const overdue = profile.borrowings.filter((borrowing) => !borrowing.return_date && new Date(borrowing.due_date) < new Date()).length;
        const unpaid = profile.fines.filter((fine) => fine.status === "unpaid").reduce((sum, fine) => sum + Number(fine.amount), 0);
        profileModal = h(Modal, { title: profile.user.name, onClose: () => setProfile(null), wide: true },
            h("div", { className: "grid sm:grid-cols-3 gap-3 mb-5" },
                h("div", { className: "bg-stone-50 border border-stone-200 rounded p-3" }, h("p", { className: "text-xs text-stone-400" }, "Currently borrowed"), h("p", { className: "font-serif text-xl" }, active)),
                h("div", { className: "bg-stone-50 border border-stone-200 rounded p-3" }, h("p", { className: "text-xs text-stone-400" }, "Overdue"), h("p", { className: "font-serif text-xl text-rose-700" }, overdue)),
                h("div", { className: "bg-stone-50 border border-stone-200 rounded p-3" }, h("p", { className: "text-xs text-stone-400" }, "Outstanding fines"), h("p", { className: "font-serif text-xl text-rose-700" }, rupee(unpaid)))
            ),
            h("p", { className: "text-sm font-medium text-stone-700 mb-2" }, "Borrowing history"),
            h("div", { className: "border border-stone-200 rounded divide-y divide-stone-100 max-h-56 overflow-y-auto mb-4" },
                ...(profile.borrowings.length ? profile.borrowings.map((borrowing) => h("div", { key: borrowing.id, className: "px-3 py-2 flex items-center justify-between text-sm" },
                    h("span", null, borrowing.title), h(StatusPill, { tone: borrowing.return_date ? "stone" : new Date(borrowing.due_date) < new Date() ? "rose" : "green" }, borrowing.return_date ? "Returned" : new Date(borrowing.due_date) < new Date() ? "Overdue" : "Borrowed")
                )) : [h("p", { key: "empty", className: "text-xs text-stone-400 p-3" }, "No borrowing history.")])
            ),
            h("p", { className: "text-sm font-medium text-stone-700 mb-2" }, "Fines"),
            h("div", { className: "border border-stone-200 rounded divide-y divide-stone-100 max-h-40 overflow-y-auto" },
                ...(profile.fines.length ? profile.fines.map((fine) => h("div", { key: fine.id, className: "px-3 py-2 flex items-center justify-between text-sm" },
                    h("span", null, fine.reason), h("span", { className: "flex items-center gap-2" }, h("span", null, rupee(fine.amount)), h(StatusPill, { tone: fine.status === "unpaid" ? "rose" : fine.status === "paid" ? "green" : "stone" }, fine.status))
                )) : [h("p", { key: "empty", className: "text-xs text-stone-400 p-3" }, "No fines.")])
            )
        );
    }
    return h("div", null,
        h("div", { className: "flex items-center justify-between gap-3 mb-5" }, h("h1", { className: "font-serif text-2xl text-stone-900" }, "Users"), h("button", { onClick: () => setCreating(true), className: "flex items-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white text-sm px-3.5 py-2 rounded" }, h(Plus, { size: 15 }), " Add login")),
        h("div", { className: "flex flex-wrap gap-2 mb-4" },
            h("div", { className: "relative flex-1 min-w-[220px]" }, h(Search, { size: 15, className: "absolute left-2.5 top-2.5 text-stone-400" }), h("input", { className: inputCls + " pl-8", placeholder: "Search name or email…", value: q, onChange: (event) => setQ(event.target.value) })),
            h("select", { className: inputCls + " w-auto", value: roleFilter, onChange: (event) => setRoleFilter(event.target.value) }, h("option", { value: "all" }, "All roles"), h("option", { value: "admin" }, "Admin"), h("option", { value: "student" }, "Student"))
        ),
        h("div", { className: "bg-white border border-stone-200 rounded-sm overflow-x-auto" },
            h("table", { className: "w-full text-sm min-w-[720px]" },
                h("thead", { className: "bg-stone-50 text-stone-500 text-xs uppercase tracking-wide" }, h("tr", null, ...["Name", "Email", "Role", "Status", "Actions"].map((name) => h("th", { key: name, className: `text-${name === "Actions" ? "right" : "left"} px-4 py-2.5 font-medium` }, name)))),
                h("tbody", { className: "divide-y divide-stone-100" }, ...userRows)
            )
        ),
        profileModal,
        editing && h(Modal, { title: "Edit user", onClose: () => setEditing(null) }, h(UserEditForm, { user: editing, onSave: saveUser, onCancel: () => setEditing(null) })),
        creating && h(Modal, { title: "Create login", onClose: () => setCreating(false) }, h(UserCreateForm, { onSave: createUser, onCancel: () => setCreating(false) }))
    );
}

function UserCreateForm({ onSave, onCancel }) {
    const [form, setForm] = useState({ name: "", email: "", password: "", role: "student", admissionNo: "", department: "", accountNo: "", maxBooks: 3 });
    const [error, setError] = useState("");
    const update = (key, value) => setForm((current) => ({...current, [key]: value }));
    const input = (label, key, type = "text") => h(Field, { key, label }, h("input", { type, className: inputCls, value: form[key], onChange: (event) => update(key, event.target.value) }));
    const submit = async() => {
        setError("");
        try { await onSave({...form, maxBooks: Number(form.maxBooks) }); } catch (err) { setError(err.message); }
    };
    return h("div", null,
        error && h("div", { className: "mb-3 text-sm bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded" }, error),
        input("Full name", "name"), input("Email / login", "email", "email"), input("Initial password", "password", "password"),
        h(Field, { label: "Role" }, h("select", { className: inputCls, value: form.role, onChange: (event) => update("role", event.target.value) }, h("option", { value: "student" }, "Student"), h("option", { value: "admin" }, "Admin"))),
        form.role === "student" && [input("Admission number", "admissionNo"), input("Department", "department"), input("Account number", "accountNo"), input("Maximum books", "maxBooks", "number")],
        h("div", { className: "flex justify-end gap-2 mt-4" }, h("button", { onClick: onCancel, className: "px-4 py-2 text-sm rounded border border-stone-300 text-stone-700 hover:bg-stone-100" }, "Cancel"), h("button", { onClick: submit, className: "px-4 py-2 text-sm rounded bg-amber-700 hover:bg-amber-800 text-white" }, "Create login"))
    );
}

function UserEditForm({ user, onSave, onCancel }) {
    const [form, setForm] = useState({...user, maxBooks: user.max_books });
    return h("div", null,
        ...[
            ["Name", "name"],
            ["Email", "email"],
            ["Max books allowed", "maxBooks"],
            ["Admission number", "admission_no"],
            ["Department", "department"],
            ["Account number", "account_no"]
        ].map(([label, key]) => h(Field, { key, label }, h("input", { type: key === "maxBooks" ? "number" : "text", className: inputCls, value: form[key], onChange: (event) => setForm({...form, [key]: event.target.value }) }))),
        h("div", { className: "flex justify-end gap-2 mt-2" }, h("button", { onClick: onCancel, className: "px-4 py-2 text-sm rounded border border-stone-300 text-stone-700 hover:bg-stone-100" }, "Cancel"), h("button", { onClick: () => onSave(form), className: "px-4 py-2 text-sm rounded bg-amber-700 hover:bg-amber-800 text-white" }, "Save"))
    );
}