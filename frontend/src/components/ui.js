export const inputCls = "w-full border border-stone-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-600/40 focus:border-amber-600";

export function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-medium text-stone-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

export function StatusPill({ children, tone = "stone" }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-800 border-emerald-200",
    rose: "bg-rose-50 text-rose-800 border-rose-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    stone: "bg-stone-100 text-stone-600 border-stone-200",
  };
  return <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 text-stone-400">
      {Icon && <Icon size={34} className="mb-3 text-stone-300" />}
      <p className="font-serif text-base text-stone-500">{title}</p>
      {subtitle && <p className="text-xs mt-1 max-w-xs">{subtitle}</p>}
    </div>
  );
}

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-[90] bg-stone-900/50 flex items-center justify-center p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`bg-stone-50 rounded-sm shadow-xl w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[90vh] overflow-y-auto border border-stone-200`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-white sticky top-0">
          <h3 className="font-serif text-lg text-stone-900">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, onConfirm, onCancel, danger }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-stone-600 mb-5">{message}</p>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm rounded border border-stone-300 text-stone-700 hover:bg-stone-100">Cancel</button>
        <button onClick={onConfirm} className={`px-4 py-2 text-sm rounded text-white ${danger ? "bg-rose-700 hover:bg-rose-800" : "bg-emerald-700 hover:bg-emerald-800"}`}>Confirm</button>
      </div>
    </Modal>
  );
}

export function Toast({ toast, onClose }) {
  if (!toast) return null;
  const tone = { success: "bg-emerald-700", error: "bg-rose-700", info: "bg-stone-800" }[toast.type || "info"];
  return (
    <div className={`fixed bottom-5 right-5 z-[100] ${tone} text-white px-4 py-3 rounded shadow-lg flex items-center gap-3 max-w-sm`}>
      <span className="text-sm">{toast.message}</span>
      <button onClick={onClose} className="opacity-80 hover:opacity-100">✕</button>
    </div>
  );
}

export function rupee(n) { return `₹${Number(n || 0).toLocaleString("en-IN")}`; }
export function fmtDate(s) { return s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"; }

export function csvDownload(filename, rows) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
