import { createElement as h, useEffect, useState } from "react";
import { Plus, Repeat } from "lucide-react";
import api from "../../lib/api";
import { Field, inputCls, StatusPill, EmptyState, Modal, fmtDate } from "../../components/ui";

function borrowingStatus(row) {
    if (row.return_date) return { label: "Returned", tone: "stone" };
    if (new Date(row.due_date) < new Date()) return { label: "Overdue", tone: "rose" };
    return { label: "Borrowed", tone: "green" };
}

export default function BorrowingsAdmin() {
    const [rows, setRows] = useState([]);
    const [requests, setRequests] = useState([]);
    const [statusFilter, setStatusFilter] = useState("all");
    const [issuing, setIssuing] = useState(false);
    const [err, setErr] = useState("");

    const load = async() => {
        const params = {};
        if (statusFilter !== "all") params.status = statusFilter;
        const { data } = await api.get("/borrowings", { params });
        setRows(data.borrowings);
        const pending = await api.get("/borrowings/requests", { params: { status: "pending" } });
        setRequests(pending.data.requests);
    };
    useEffect(() => { load(); }, [statusFilter]);
    const decide = async(id, decision) => {
        setErr("");
        try {
            await api.patch(`/borrowings/requests/${id}`, { decision });
            await load();
        } catch (error) { setErr(error.message); }
    };
    const doReturn = async(id) => {
        setErr("");
        try {
            await api.post(`/borrowings/${id}/return`);
            await load();
        } catch (error) { setErr(error.message); }
    };

    const requestRows = requests.map((request) => h("tr", { key: request.id },
        h("td", { className: "px-4 py-2.5 text-stone-800" }, request.title),
        h("td", { className: "px-4 py-2.5 text-stone-600" }, request.user_name, h("span", { className: "block text-xs text-stone-400" }, request.email)),
        h("td", { className: "px-4 py-2.5 text-stone-600" }, request.admission_no || "—"),
        h("td", { className: "px-4 py-2.5 text-stone-600" }, request.department || "—"),
        h("td", { className: "px-4 py-2.5 text-stone-600" }, request.account_no || "—"),
        h("td", { className: "px-4 py-2.5 text-right whitespace-nowrap" },
            h("button", { onClick: () => decide(request.id, "approved"), className: "text-xs px-2.5 py-1 rounded bg-emerald-700 text-white hover:bg-emerald-800 mr-1" }, "Approve"),
            h("button", { onClick: () => decide(request.id, "rejected"), className: "text-xs px-2.5 py-1 rounded border border-rose-300 text-rose-700 hover:bg-rose-50" }, "Reject")
        )
    ));
    const borrowingRows = rows.map((row) => {
        const status = borrowingStatus(row);
        return h("tr", { key: row.id, className: "hover:bg-stone-50/60" },
            h("td", { className: "px-4 py-2.5 text-stone-800" }, row.title),
            h("td", { className: "px-4 py-2.5 text-stone-600" }, row.user_name),
            h("td", { className: "px-4 py-2.5 text-xs text-stone-500" }, [row.admission_no, row.department, row.account_no].filter(Boolean).join(" / ") || "—"),
            h("td", { className: "px-4 py-2.5 text-stone-500" }, fmtDate(row.borrow_date)),
            h("td", { className: "px-4 py-2.5 text-stone-500" }, fmtDate(row.due_date)),
            h("td", { className: "px-4 py-2.5" }, h(StatusPill, { tone: status.tone }, status.label)),
            h("td", { className: "px-4 py-2.5 text-right" }, !row.return_date && h("button", { onClick: () => doReturn(row.id), className: "text-xs px-2.5 py-1 rounded border border-emerald-600 text-emerald-700 hover:bg-emerald-50" }, "Mark returned"))
        );
    });
    const filters = ["all", "borrowed", "overdue", "returned"].map((filter) => h("button", {
        key: filter,
        onClick: () => setStatusFilter(filter),
        className: `text-xs px-3 py-1.5 rounded-full border capitalize ${statusFilter === filter ? "bg-stone-900 text-white border-stone-900" : "border-stone-300 text-stone-600 hover:bg-stone-100"}`,
    }, filter));

    return h("div", null,
        h("div", { className: "flex items-center justify-between mb-5 flex-wrap gap-3" },
            h("h1", { className: "font-serif text-2xl text-stone-900" }, "Borrowings"),
            h("button", { onClick: () => setIssuing(true), className: "flex items-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white text-sm px-3.5 py-2 rounded" }, h(Plus, { size: 15 }), " Issue book")
        ),
        err && h("div", { className: "mb-4 text-sm bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded" }, err),
        h("section", { className: "mb-6" },
            h("h2", { className: "text-sm font-semibold text-stone-700 mb-2" }, "Pending requests ", h("span", { className: "text-stone-400 font-normal" }, `(${requests.length})`)),
            requests.length === 0 ? h("p", { className: "text-sm text-stone-400 border-y border-stone-200 py-3" }, "No requests awaiting approval.") : h("div", { className: "bg-white border border-stone-200 rounded-sm overflow-x-auto" },
                h("table", { className: "w-full text-sm min-w-[850px]" },
                    h("thead", { className: "bg-stone-50 text-stone-500 text-xs uppercase tracking-wide" }, h("tr", null,
                        ...["Book", "Student", "Admission No.", "Department", "Account No.", "Decision"].map((name) => h("th", { key: name, className: `text-${name === "Decision" ? "right" : "left"} px-4 py-2.5 font-medium` }, name))
                    )),
                    h("tbody", { className: "divide-y divide-stone-100" }, ...requestRows)
                )
            )
        ),
        h("div", { className: "flex gap-2 mb-4" }, ...filters),
        rows.length === 0 ? h(EmptyState, { icon: Repeat, title: "No borrowings match this filter" }) : h("div", { className: "bg-white border border-stone-200 rounded-sm overflow-x-auto" },
            h("table", { className: "w-full text-sm min-w-[900px]" },
                h("thead", { className: "bg-stone-50 text-stone-500 text-xs uppercase tracking-wide" }, h("tr", null,
                    ...["Book", "Student", "Admission / Dept / Account", "Borrowed", "Due", "Status", "Actions"].map((name) => h("th", { key: name, className: `text-${name === "Actions" ? "right" : "left"} px-4 py-2.5 font-medium` }, name))
                )),
                h("tbody", { className: "divide-y divide-stone-100" }, ...borrowingRows)
            )
        ),
        issuing && h(IssueBookModal, { onClose: () => setIssuing(false), onDone: load })
    );
}

function IssueBookModal({ onClose, onDone }) {
    const [students, setStudents] = useState([]);
    const [books, setBooks] = useState([]);
    const [userId, setUserId] = useState("");
    const [bookId, setBookId] = useState("");
    const [err, setErr] = useState("");
    useEffect(() => {
        api.get("/users", { params: { role: "student" } }).then(({ data }) => setStudents(data.users.filter((user) => user.status === "active")));
        api.get("/books", { params: { available: true } }).then(({ data }) => setBooks(data.books));
    }, []);
    const submit = async() => {
        setErr("");
        if (!userId || !bookId) { setErr("Select a student and a book."); return; }
        try {
            await api.post("/borrowings", { bookId, userId });
            onDone();
            onClose();
        } catch (error) { setErr(error.message); }
    };
    return h(Modal, { title: "Issue a book manually", onClose },
        err && h("div", { className: "mb-4 text-sm bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded" }, err),
        h(Field, { label: "Student" }, h("select", { className: inputCls, value: userId, onChange: (event) => setUserId(event.target.value) }, h("option", { value: "" }, "Select student…"), ...students.map((student) => h("option", { key: student.id, value: student.id }, `${student.name} (${student.email})`)))),
        h(Field, { label: "Book" }, h("select", { className: inputCls, value: bookId, onChange: (event) => setBookId(event.target.value) }, h("option", { value: "" }, "Select book…"), ...books.map((book) => h("option", { key: book.id, value: book.id }, `${book.title} — ${book.available_copies} available`)))),
        h("div", { className: "flex justify-end gap-2 mt-2" }, h("button", { onClick: onClose, className: "px-4 py-2 text-sm rounded border border-stone-300 text-stone-700 hover:bg-stone-100" }, "Cancel"), h("button", { onClick: submit, className: "px-4 py-2 text-sm rounded bg-amber-700 hover:bg-amber-800 text-white" }, "Issue book"))
    );
}