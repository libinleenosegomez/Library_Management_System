import { useEffect, useRef, useState } from "react";
import { Search, Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import api from "../../lib/api";
import { Field, inputCls, StatusPill, EmptyState, Modal, ConfirmDialog } from "../../components/ui";

const SPINE_COLORS = {
  "Computer Science": "bg-indigo-700", "Mathematics": "bg-sky-700", "Science": "bg-emerald-700",
  "Literature": "bg-rose-700", "History": "bg-amber-700", "Commerce": "bg-stone-700",
};

function bookStatus(b) {
  if (b.available_copies <= 0) return { label: "Unavailable", tone: "rose" };
  if (b.available_copies <= Math.max(1, Math.ceil(b.total_copies * 0.2))) return { label: "Low stock", tone: "amber" };
  return { label: "Available", tone: "green" };
}

export default function BooksAdmin() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [availFilter, setAvailFilter] = useState("all");
  const [sortBy, setSortBy] = useState("title");
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [err, setErr] = useState("");

  const load = async () => {
    const params = {};
    if (q) params.q = q;
    if (catFilter !== "all") params.category = catFilter;
    if (availFilter !== "all") params.available = availFilter === "available";
    if (sortBy) params.sort = sortBy;
    const { data } = await api.get("/books", { params });
    setBooks(data.books);
  };
  useEffect(() => { api.get("/categories").then(({ data }) => setCategories(data.categories)); }, []);
  useEffect(() => { load(); }, [q, catFilter, availFilter, sortBy]);

  const saveBook = async (form, file) => {
    setErr("");
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, v); });
      if (file) fd.append("cover", file);
      if (form.id) await api.put(`/books/${form.id}`, fd);
      else await api.post("/books", fd);
      setEditing(null);
      load();
    } catch (ex) { setErr(ex.message); }
  };

  const deleteBook = async (book) => {
    await api.delete(`/books/${book.id}`);
    setToDelete(null);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="font-serif text-2xl text-stone-900">Books</h1>
        <button onClick={() => setEditing({})} className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white text-sm px-3.5 py-2 rounded"><Plus size={15} /> Add book</button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-2.5 top-2.5 text-stone-400" />
          <input className={inputCls + " pl-8"} placeholder="Search title, author, ISBN, publisher…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className={inputCls + " w-auto"} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className={inputCls + " w-auto"} value={availFilter} onChange={(e) => setAvailFilter(e.target.value)}>
          <option value="all">All availability</option>
          <option value="available">Available only</option>
          <option value="false">Unavailable only</option>
        </select>
        <select className={inputCls + " w-auto"} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="title">Sort: Title</option>
          <option value="year">Sort: Newest</option>
          <option value="available">Sort: Copies available</option>
        </select>
      </div>

      {books.length === 0 ? <EmptyState icon={BookOpen} title="No books match your filters" /> : (
        <div className="bg-white border border-stone-200 rounded-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Book</th>
                <th className="text-left px-4 py-2.5 font-medium">Category</th>
                <th className="text-left px-4 py-2.5 font-medium">ISBN</th>
                <th className="text-left px-4 py-2.5 font-medium">Copies</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-right px-4 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {books.map((b) => {
                const st = bookStatus(b);
                return (
                  <tr key={b.id} className="hover:bg-stone-50/60">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-9 rounded-sm ${SPINE_COLORS[b.category] || "bg-stone-500"}`} />
                        <div>
                          <div className="text-stone-800 font-medium">{b.title}</div>
                          <div className="text-stone-400 text-xs">{b.author} · {b.publisher} · {b.publication_year}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-stone-600">{b.category}</td>
                    <td className="px-4 py-2.5 text-stone-500 font-mono text-xs">{b.isbn}</td>
                    <td className="px-4 py-2.5 text-stone-600">{b.available_copies} / {b.total_copies}</td>
                    <td className="px-4 py-2.5"><StatusPill tone={st.tone}>{st.label}</StatusPill></td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setEditing(b)} className="p-1.5 text-stone-400 hover:text-amber-700"><Pencil size={15} /></button>
                        <button onClick={() => setToDelete(b)} className="p-1.5 text-stone-400 hover:text-rose-700"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && <BookForm book={editing} categories={categories} onSave={saveBook} onClose={() => setEditing(null)} err={err} />}
      {toDelete && <ConfirmDialog title="Remove book" message={`Remove "${toDelete.title}" from the catalog? Existing borrowing history will be preserved.`} danger onCancel={() => setToDelete(null)} onConfirm={() => deleteBook(toDelete)} />}
    </div>
  );
}

function BookForm({ book, categories, onSave, onClose, err }) {
  const isEdit = !!book.id;
  const [form, setForm] = useState({
    id: book.id, isbn: book.isbn || "", title: book.title || "", author: book.author || "",
    publisher: book.publisher || "", categoryId: book.category_id || categories[0]?.id || "",
    publicationYear: book.publication_year || new Date().getFullYear(), totalCopies: book.total_copies || 1,
  });
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);

  return (
    <Modal title={isEdit ? "Edit book" : "Add book"} onClose={onClose} wide>
      {err && <div className="mb-4 text-sm bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded">{err}</div>}
      <div className="grid md:grid-cols-3 gap-5">
        <div className="md:col-span-1">
          <div className="w-full aspect-[3/4] bg-stone-100 border border-stone-200 rounded-sm flex items-center justify-center overflow-hidden mb-2">
            {file ? <img src={URL.createObjectURL(file)} alt="cover" className="w-full h-full object-cover" /> :
              book.cover_image_url ? <img src={`${(process.env.NEXT_PUBLIC_API_URL || "").replace("/api", "")}${book.cover_image_url}`} alt="cover" className="w-full h-full object-cover" /> :
              <BookOpen className="text-stone-300" size={32} />}
          </div>
          <button onClick={() => fileRef.current?.click()} className="w-full text-xs border border-stone-300 rounded py-1.5 hover:bg-stone-50">Upload cover</button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
        <div className="md:col-span-2 grid sm:grid-cols-2 gap-x-4">
          <Field label="Title"><input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Author"><input className={inputCls} value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></Field>
          <Field label="Publisher"><input className={inputCls} value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} /></Field>
          <Field label="ISBN"><input className={inputCls} value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} /></Field>
          <Field label="Category">
            <select className={inputCls} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Publication year"><input type="number" className={inputCls} value={form.publicationYear} onChange={(e) => setForm({ ...form, publicationYear: Number(e.target.value) })} /></Field>
          <Field label="Total copies"><input type="number" min={1} className={inputCls} value={form.totalCopies} onChange={(e) => setForm({ ...form, totalCopies: Number(e.target.value) })} /></Field>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onClose} className="px-4 py-2 text-sm rounded border border-stone-300 text-stone-700 hover:bg-stone-100">Cancel</button>
        <button onClick={() => onSave(form, file)} className="px-4 py-2 text-sm rounded bg-amber-700 hover:bg-amber-800 text-white">Save book</button>
      </div>
    </Modal>
  );
}
