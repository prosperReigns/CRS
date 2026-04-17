import { useContext, useEffect, useState } from "react";
import { getMembers } from "../../api/members";
import { assignLeadershipRole } from "../../api/users";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import EmptyState from "../../components/ui/EmptyState";
import { AuthContext } from "../../context/AuthContext";

function Members() {
  const { user } = useContext(AuthContext);
  const canAssignLeadership = ["pastor", "staff", "fellowship_leader"].includes(user?.role);
  const canAssignFellowshipLeaderRole = ["pastor", "staff"].includes(user?.role);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [assigningMemberId, setAssigningMemberId] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState({});

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const data = await getMembers();
      setMembers(data);
      setSelectedRoles(
        data.reduce((acc, member) => {
          const existingRole = member.user?.role;
          acc[member.id] =
            existingRole === "fellowship_leader" || existingRole === "cell_leader"
              ? existingRole
              : "";
          return acc;
        }, {})
      );
    } catch (err) {
      setError(err.message || "Failed to load members.");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async (member) => {
    if (!member.user?.id) return;
    setActionError("");
    setAssigningMemberId(member.id);
    try {
      const role = selectedRoles[member.id];
      if (!role) {
        setActionError("Please select a leadership role first.");
        return;
      }
      await assignLeadershipRole(member.user.id, role);
      await fetchMembers();
    } catch (err) {
      setActionError(err.message || "Failed to assign leadership role.");
    } finally {
      setAssigningMemberId(null);
    }
  };

  if (loading) return <LoadingState label="Loading members..." />;
  if (error) return <ErrorState error={error} />;
  if (members.length === 0) return <EmptyState label="No members found." />;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Members</h2>
      {actionError && <ErrorState error={actionError} />}

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
          {canAssignLeadership && m.user?.id && (
            <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assign Leadership Role</p>
              <select
                value={selectedRoles[m.id] || ""}
                onChange={(event) =>
                  setSelectedRoles((prev) => ({
                    ...prev,
                    [m.id]: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
              >
                <option value="">Select role</option>
                {canAssignFellowshipLeaderRole && <option value="fellowship_leader">Fellowship Leader</option>}
                <option value="cell_leader">Cell Leader</option>
              </select>
              <button
                type="button"
                onClick={() => handleAssignRole(m)}
                disabled={assigningMemberId === m.id}
                className="w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {assigningMemberId === m.id ? "Assigning..." : "Assign Role"}
              </button>
            </div>
          )}
        </div>
      ))}
      </div>
    </div>
  );
}

export default Members;
