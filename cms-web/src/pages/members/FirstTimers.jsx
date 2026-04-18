import { useEffect, useState } from "react";
import { getFirstTimers, updateFirstTimerFollowUp } from "../../api/members";
import { getUsers } from "../../api/users";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import EmptyState from "../../components/ui/EmptyState";

const followUpOptions = ["pending", "contacted", "visited", "integrated"];

function FirstTimers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [fellowshipLeaders, setFellowshipLeaders] = useState([]);
  const [cellLeaders, setCellLeaders] = useState([]);

  const fetchMembers = async () => {
    try {
      const [membersData, users] = await Promise.all([getFirstTimers(), getUsers()]);
      setFellowshipLeaders(users.filter((candidate) => candidate.role === "fellowship_leader"));
      setCellLeaders(users.filter((candidate) => candidate.role === "cell_leader"));
      const data = membersData.map((member) => ({
        ...member,
        visitation_fellowship_leader: member.visitation_fellowship_leader ?? null,
        visitation_cell_leader: member.visitation_cell_leader ?? null,
      }));
      setMembers(data);
    } catch (err) {
      setError(err.message || "Failed to load first timers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const updateField = (id, field, value) => {
    setMembers((prev) => prev.map((member) => (member.id === id ? { ...member, [field]: value } : member)));
  };

  const saveMember = async (member) => {
    setSavingId(member.id);
    setError("");
    try {
      await updateFirstTimerFollowUp(member.id, {
        first_visit_date: member.first_visit_date || null,
        follow_up_status: member.follow_up_status || "",
        visitation_notes: member.visitation_notes || "",
        visitation_fellowship_leader: member.visitation_fellowship_leader || null,
        visitation_cell_leader: member.visitation_cell_leader || null,
      });
    } catch (err) {
      setError(err.message || "Failed to update follow-up.");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <LoadingState label="Loading first timers..." />;
  if (error) return <ErrorState error={error} />;
  if (members.length === 0) return <EmptyState label="No first timer records found." />;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">First Timers</h2>

      <div className="grid gap-4 xl:grid-cols-2">
        {members.map((member) => (
          <div key={member.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-lg font-semibold text-slate-900">{member.user?.username}</p>
            <p className="text-sm text-slate-600">
              Name: {[member.user?.first_name, member.user?.last_name].filter(Boolean).join(" ") || "-"}
            </p>
            <div className="mt-3 grid gap-3">
              <label className="text-sm text-slate-700">
                First Visit Date
                <input
                  type="date"
                  value={member.first_visit_date || ""}
                  onChange={(event) => updateField(member.id, "first_visit_date", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-slate-700">
                Follow-up Status
                <select
                  value={member.follow_up_status || ""}
                  onChange={(event) => updateField(member.id, "follow_up_status", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Select status</option>
                  {followUpOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-700">
                Visitation Notes
                <textarea
                  value={member.visitation_notes || ""}
                  onChange={(event) => updateField(member.id, "visitation_notes", event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-slate-700">
                Assigned Fellowship Leader for Visitation
                <select
                  value={member.visitation_fellowship_leader ?? ""}
                  onChange={(event) =>
                    updateField(
                      member.id,
                      "visitation_fellowship_leader",
                      event.target.value ? Number(event.target.value) : null
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Unassigned</option>
                  {fellowshipLeaders.map((leader) => (
                    <option key={leader.id} value={leader.id}>
                      {[leader.first_name, leader.last_name].filter(Boolean).join(" ") || leader.username}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-700">
                Assigned Cell Leader for Visitation
                <select
                  value={member.visitation_cell_leader ?? ""}
                  onChange={(event) =>
                    updateField(member.id, "visitation_cell_leader", event.target.value ? Number(event.target.value) : null)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Unassigned</option>
                  {cellLeaders.map((leader) => (
                    <option key={leader.id} value={leader.id}>
                      {[leader.first_name, leader.last_name].filter(Boolean).join(" ") || leader.username}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => saveMember(member)}
                disabled={savingId === member.id}
                className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-70"
              >
                {savingId === member.id ? "Saving..." : "Save Detailed Visitation Report"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FirstTimers;
