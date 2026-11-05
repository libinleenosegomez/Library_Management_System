import { createElement as h, useEffect, useState } from "react";
import { Search, Users, X } from "lucide-react";
import api from "../../lib/api";
import { inputCls, StatusPill, EmptyState, Toast, fmtDate } from "../../components/ui";

const SPINE_COLORS = {
    "Computer Science": "bg-indigo-700",
    Mathematics: "bg-sky-700",
    Science: "bg-emerald-700",
    Literature: "bg-rose-700",
    History: "bg-amber-700",
    Commerce: "bg-stone-700",
};

function bookStatus(book) {
    if (book.available_copies <= 0) return { label: "Unavailable", tone: "rose" };
    if (book.available_copies <= Math.max(1, Math.ceil(book.total_copies * 0.2))) return { label: "Low stock", tone: "amber" };
    return { label: "Available", tone: "green" };
}

export default function BrowseBooks() {
    const [books, setBooks] = useState([]);
    const [categories, setCategories] = useState([]);
    const [reservations, setReservations] = useState([]);
    const [requests, setRequests] = useState([]);
    const [selectedBook, setSelectedBook] = useState(null);
    const [q, setQ] = useState("");
    const [catFilter, setCatFilter] = useState("all");
    const [availOnly, setAvailOnly] = useState(false);
    const [toast, setToast] = useState(null);
    const notify = (message, type = "info") => { setToast({ message, type });
        setTimeout(() => setToast(null), 3000); };
    const loadBooks = async() => {
        const params = {};
        if (q) params.q = q;
        if (catFilter !== "all") params.category = catFilter;
        if (availOnly) params.available = true;
        const { data } = await api.get("/books", { params });
        setBooks(data.books);
    };
    const loadReservations = () => api.get("/reservations").then(({ data }) => setReservations(data.reservations));
    const loadRequests = () => api.get("/borrowings/requests", { params: { status: "all" } }).then(({ data }) => setRequests(data.requests));
    useEffect(() => {
        api.get("/categories").then(({ data }) => setCategories(data.categories));
        loadReservations();
        loadRequests();
    }, []);
    useEffect(() => { loadBooks(); }, [q, catFilter, availOnly]);
    const requestBorrow = async(bookId) => {
        try { await api.post("/borrowings/requests", { bookId });
            notify("Request sent to the librarian for approval.", "success");
            loadRequests(); } catch (error) { notify(error.message, "error"); }
    };
    const reserve = async(bookId) => {
        try { await api.post("/reservations", { bookId });
            notify("Reserved. You will be notified when it is available.", "success");
            loadReservations(); } catch (error) { notify(error.message, "error"); }
    };
    const activeReservation = (bookId) => reservations.find((row) => row.book_id === bookId && ["waiting", "available"].includes(row.status));
    const activeRequest = (bookId) => requests.find((row) => row.book_id === bookId && row.status === "pending");
    const showBook = async(book) => {
        try { const { data } = await api.get(`/books/${book.id}`);
            setSelectedBook(data); } catch (error) { notify(error.message, "error"); }
    };
    const bookCards = books.map((book) => {
        const status = bookStatus(book);
        const reservation = activeReservation(book.id);
        const request = activeRequest(book.id);
        const action = request ?
            h("button", { disabled: true, className: "w-full text-xs bg-amber-50 text-amber-800 py-1.5 rounded cursor-default" }, "Request pending admin approval") :
            book.available_copies > 0 ?
            h("button", { onClick: () => requestBorrow(book.id), className: "w-full text-xs bg-amber-700 hover:bg-amber-800 text-white py-1.5 rounded" }, "Request to borrow") :
            reservation ?
            h("button", { disabled: true, className: "w-full text-xs bg-stone-100 text-stone-400 py-1.5 rounded cursor-default" }, reservation.status === "available" ? "Ready to pick up" : "Reserved — waiting") :
            h("button", { onClick: () => reserve(book.id), className: "w-full text-xs border border-stone-300 text-stone-700 hover:bg-stone-50 py-1.5 rounded" }, "Reserve");
        return h("div", { key: book.id, className: "bg-white border border-stone-200 rounded-sm flex overflow-hidden" },
            h("div", { className: `w-2 ${SPINE_COLORS[book.category] || "bg-stone-500"}` }),
            h("div", { className: "p-4 flex-1 min-w-0" },
                h("div", { className: "flex items-start justify-between gap-2" }, h("button", { onClick: () => showBook(book), className: "font-serif text-left text-stone-900 leading-snug hover:text-amber-800 hover:underline" }, book.title), h(StatusPill, { tone: status.tone }, status.label)),
                h("p", { className: "text-xs text-stone-500 mt-1" }, `${book.author} · ${book.publication_year}`),
                h("p", { className: "text-xs text-stone-400 mt-0.5" }, `${book.category} · ${book.publisher}`),
                h("p", { className: "text-xs text-stone-400 mt-2" }, `${book.available_copies} of ${book.total_copies} copies available`),
                h("div", { className: "mt-3" }, action)
            )
        );
    });
    return h("div", null,
        h("h1", { className: "font-serif text-2xl text-stone-900 mb-5" }, "Browse books"),
        h("div", { className: "flex flex-wrap gap-2 mb-5" },
            h("div", { className: "relative flex-1 min-w-[220px]" }, h(Search, { size: 15, className: "absolute left-2.5 top-2.5 text-stone-400" }), h("input", { className: inputCls + " pl-8", placeholder: "Search title, author, ISBN, category…", value: q, onChange: (event) => setQ(event.target.value) })),
            h("select", { className: inputCls + " w-auto", value: catFilter, onChange: (event) => setCatFilter(event.target.value) }, h("option", { value: "all" }, "All categories"), ...categories.map((category) => h("option", { key: category.id, value: category.id }, category.name))),
            h("label", { className: "flex items-center gap-2 text-sm text-stone-600 border border-stone-300 rounded px-3 bg-white" }, h("input", { type: "checkbox", checked: availOnly, onChange: (event) => setAvailOnly(event.target.checked) }), " Available now")
        ),
        books.length === 0 ? h(EmptyState, { icon: Search, title: "No books match your search" }) : h("div", { className: "grid sm:grid-cols-2 lg:grid-cols-3 gap-3" }, ...bookCards),
        selectedBook && h(BookBorrowers, { data: selectedBook, onClose: () => setSelectedBook(null) }),
        h(Toast, { toast, onClose: () => setToast(null) })
    );
}

function BookBorrowers({ data, onClose }) {
    const { book, borrowers } = data;
    const rows = borrowers.map((borrower, index) => h("div", { key: `${borrower.user_name}-${borrower.borrow_date}-${index}`, className: "py-3 flex items-center justify-between gap-3" },
        h("div", null, h("p", { className: "text-sm text-stone-800" }, borrower.user_name), h("p", { className: "text-xs text-stone-500" }, `Borrowed ${fmtDate(borrower.borrow_date)} · Due ${fmtDate(borrower.due_date)}`)),
        h(StatusPill, { tone: borrower.return_date ? "stone" : new Date(borrower.due_date) < new Date() ? "rose" : "green" }, borrower.return_date ? `Returned ${fmtDate(borrower.return_date)}` : new Date(borrower.due_date) < new Date() ? "Overdue" : "Borrowed")
    ));
    return h("div", { className: "fixed inset-0 z-[90] bg-stone-900/50 flex items-center justify-center p-4", onMouseDown: (event) => event.target === event.currentTarget && onClose() },
        h("section", { className: "bg-white w-full max-w-xl max-h-[85vh] overflow-y-auto border border-stone-200 shadow-xl" },
            h("div", { className: "sticky top-0 bg-white border-b border-stone-200 px-5 py-4 flex justify-between items-start gap-4" },
                h("div", null, h("h2", { className: "font-serif text-xl text-stone-900" }, book.title), h("p", { className: "text-sm text-stone-500" }, `${book.author} · ${book.category}`)),
                h("button", { onClick: onClose, "aria-label": "Close book history", className: "p-1 text-stone-500 hover:text-stone-900" }, h(X, { size: 18 }))
            ),
            h("div", { className: "p-5" },
                h("h3", { className: "text-sm font-medium text-stone-700 mb-3 flex items-center gap-2" }, h(Users, { size: 15 }), " Borrower history"),
                borrowers.length === 0 ? h("p", { className: "text-sm text-stone-400" }, "No one has borrowed this book yet.") : h("div", { className: "divide-y divide-stone-100 border-y border-stone-100" }, ...rows)
            )
        )
    );
}