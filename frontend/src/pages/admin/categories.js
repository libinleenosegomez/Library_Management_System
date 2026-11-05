import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import api from "../../lib/api";
import { Field, inputCls, Modal, ConfirmDialog } from "../../components/ui";

export default function CategoriesAdmin() {
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null); // {} = new, {id,name} = edit
  const [name, setName] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const [err, setErr] = useState("");

  const load = () => api.get("/categories").then(({ data }) => setCategories(data.categories));
  useEffect(() => { load(); }, []);

  const save = async () => {
    setErr("");
    try {
      if (editing.id) await api.put(`/categories/${editing.id}`, { name });
      else await api.post("/categories", { name });
      setEditing(null); setName("");
      load();
    } catch (ex) { setErr(ex.message); }
  };

  const remove = async (cat) => {
    setErr("");
    try {
      await api.delete(`/categories/${cat.id}`);
      setToDelete(null);
      load();
    } catch (ex) { setErr(ex.message); setToDelete(null); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-serif text-2xl text-stone-900">Categories</h1>
        <button onClick={() => { setEditing({}); setName(""); }} className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white text-sm px-3.5 py-2 rounded"><Plus size={15} /> Add category</button>
      </div>
      {err && <div className="mb-4 text-sm bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded">{err}</div>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories.map((c) => (
          <div key={c.id} className="bg-white border border-stone-200 rounded-sm p-4 flex items-center justify-between">
            <div>
              <p className="font-serif text-stone-800">{c.name}</p>
              <p className="text-xs text-stone-400 mt-0.5">{c.book_count} book{Number(c.book_count) === 1 ? "" : "s"}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => { setEditing(c); setName(c.name); }} className="p-1.5 text-stone-400 hover:text-amber-700"><Pencil size={15} /></button>
              <button onClick={() => setToDelete(c)} className="p-1.5 text-stone-400 hover:text-rose-700"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <Modal title={editing.id ? "Edit category" : "Add category"} onClose={() => setEditing(null)}>
          <Field label="Category name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm rounded border border-stone-300 text-stone-700 hover:bg-stone-100">Cancel</button>
            <button onClick={save} className="px-4 py-2 text-sm rounded bg-amber-700 hover:bg-amber-800 text-white">Save</button>
          </div>
        </Modal>
      )}
      {toDelete && <ConfirmDialog title="Delete category" message={`Delete "${toDelete.name}"? This only works if no books use it.`} danger onCancel={() => setToDelete(null)} onConfirm={() => remove(toDelete)} />}
    </div>
  );
}
