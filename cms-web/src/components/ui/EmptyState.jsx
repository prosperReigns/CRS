function EmptyState({ label = "No data found." }) {
  return <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">{label}</p>;
}

export default EmptyState;
