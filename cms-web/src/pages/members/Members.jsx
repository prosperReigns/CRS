import { useEffect, useState } from "react";
import { getMembers } from "../../api/members";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import EmptyState from "../../components/ui/EmptyState";

function Members() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const data = await getMembers();
      setMembers(data);
    } catch (err) {
      setError(err.message || "Failed to load members.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState label="Loading members..." />;
  if (error) return <ErrorState error={error} />;
  if (members.length === 0) return <EmptyState label="No members found." />;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Members</h2>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {members.map((m) => (
        <div
          key={m.id}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="text-lg font-semibold text-slate-900">{m.user?.username}</p>
          <p className="text-sm text-slate-600">
            Name: {[m.user?.first_name, m.user?.last_name].filter(Boolean).join(" ") || "-"}
          </p>
          <p className="text-sm text-slate-600">Role: {m.user?.role || "-"}</p>
          <p className="text-sm text-slate-600">Cell: {m.cell_name || "-"}</p>
          <p className="text-sm text-slate-600">Baptised: {m.is_baptised ? "Yes" : "No"}</p>
          <p className="text-sm text-slate-600">Foundation: {m.foundation_completed ? "Yes" : "No"}</p>
          <p className="text-sm text-slate-600">Souls Won: {m.souls_won}</p>
        </div>
      ))}
      </div>
    </div>
  );
}

export default Members;
