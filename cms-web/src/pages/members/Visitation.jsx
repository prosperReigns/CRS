import { useEffect, useState } from "react";
import {
  approveVisitationReport,
  createMemberProfile,
  getFirstTimers,
  getVisitationReports,
  updateFirstTimerFollowUp,
} from "../../api/members";
import { createUser, getUsers } from "../../api/users";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import EmptyState from "../../components/ui/EmptyState";

const followUpOptions = ["pending", "contacted", "visited", "integrated"];
const methodLabels = {
  calling: "Calling",
  one_on_one_visitation: "One on One Visitation",
};

function Visitation() {
  const [members, setMembers] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [fellowshipLeaders, setFellowshipLeaders] = useState([]);
  const [cellLeaders, setCellLeaders] = useState([]);
  const [creatingMember, setCreatingMember] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [newFirstTimerForm, setNewFirstTimerForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    first_visit_date: "",
    follow_up_status: "pending",
    visitation_notes: "",
  });

  const fetchData = async () => {
    try {
      const [membersData, users, reportData] = await Promise.all([getFirstTimers(), getUsers(), getVisitationReports()]);
      setFellowshipLeaders(users.filter((candidate) => candidate.role === "fellowship_leader"));
      setCellLeaders(users.filter((candidate) => candidate.role === "cell_leader"));
      setMembers(
        membersData.map((member) => ({
          ...member,
          visitation_fellowship_leader: member.visitation_fellowship_leader ?? null,
          visitation_cell_leader: member.visitation_cell_leader ?? null,
        }))
      );
      setReports(reportData);
    } catch (err) {
      setError(err.message || "Failed to load visitation records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
      setError(err.message || "Failed to update visitation assignment.");
    } finally {
      setSavingId(null);
    }
  };

  const approveReport = async (reportId) => {
    setApprovingId(reportId);
    setError("");
    try {
      await approveVisitationReport(reportId);
      setReports((prev) =>
        prev.map((report) =>
          report.id === reportId ? { ...report, status: "approved", approved_at: new Date().toISOString() } : report
        )
      );
    } catch (err) {
      setError(err.message || "Failed to approve visitation report.");
    } finally {
      setApprovingId(null);
    }
  };

  const createFirstTimerMember = async (event) => {
    event.preventDefault();
    setCreatingMember(true);
    setCreateError("");
    setCreateSuccess("");

    try {
      const createdUser = await createUser({
        username: newFirstTimerForm.username.trim(),
        first_name: newFirstTimerForm.first_name.trim(),
        last_name: newFirstTimerForm.last_name.trim(),
        email: newFirstTimerForm.email.trim(),
        phone: newFirstTimerForm.phone.trim(),
        password: newFirstTimerForm.password,
        role: "member",
      });

      const createdMember = await createMemberProfile({
        user_id: createdUser.id,
        membership_status: "first_timer",
        is_first_timer: true,
        first_visit_date: newFirstTimerForm.first_visit_date || null,
        follow_up_status: newFirstTimerForm.follow_up_status || "pending",
        visitation_notes: newFirstTimerForm.visitation_notes.trim(),
      });

      setMembers((prev) => [
        {
          ...createdMember,
          user: createdMember.user || createdUser,
          visitation_fellowship_leader: createdMember.visitation_fellowship_leader ?? null,
          visitation_cell_leader: createdMember.visitation_cell_leader ?? null,
        },
        ...prev,
      ]);
      setCreateSuccess("First timer member created successfully.");
      setNewFirstTimerForm({
        username: "",
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        password: "",
        first_visit_date: "",
        follow_up_status: "pending",
        visitation_notes: "",
      });
    } catch (err) {
      setCreateError(err.message || "Failed to create first timer member.");
    } finally {
      setCreatingMember(false);
    }
  };

  if (loading) return <LoadingState label="Loading visitation..." />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900">Create New First Timer Member</h3>
        {createError && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{createError}</p>}
        {createSuccess && (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{createSuccess}</p>
        )}
        <form onSubmit={createFirstTimerMember} className="grid gap-3 md:grid-cols-2">
          <input
            type="text"
            placeholder="Username"
            required
            value={newFirstTimerForm.username}
            onChange={(event) => setNewFirstTimerForm((prev) => ({ ...prev, username: event.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="Password"
            required
            minLength={8}
            value={newFirstTimerForm.password}
            onChange={(event) => setNewFirstTimerForm((prev) => ({ ...prev, password: event.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="First Name"
            value={newFirstTimerForm.first_name}
            onChange={(event) => setNewFirstTimerForm((prev) => ({ ...prev, first_name: event.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Last Name"
            value={newFirstTimerForm.last_name}
            onChange={(event) => setNewFirstTimerForm((prev) => ({ ...prev, last_name: event.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="email"
            placeholder="Email"
            value={newFirstTimerForm.email}
            onChange={(event) => setNewFirstTimerForm((prev) => ({ ...prev, email: event.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Phone"
            value={newFirstTimerForm.phone}
            onChange={(event) => setNewFirstTimerForm((prev) => ({ ...prev, phone: event.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <label className="text-sm text-slate-700">
            First Visit Date
            <input
              type="date"
              value={newFirstTimerForm.first_visit_date}
              onChange={(event) => setNewFirstTimerForm((prev) => ({ ...prev, first_visit_date: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-slate-700">
            Follow-up Status
            <select
              value={newFirstTimerForm.follow_up_status}
              onChange={(event) => setNewFirstTimerForm((prev) => ({ ...prev, follow_up_status: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {followUpOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-700 md:col-span-2">
            Notes
            <textarea
              rows={3}
              value={newFirstTimerForm.visitation_notes}
              onChange={(event) => setNewFirstTimerForm((prev) => ({ ...prev, visitation_notes: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={creatingMember}
            className="md:col-span-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-70"
          >
            {creatingMember ? "Creating..." : "Create First Timer Member"}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Visitation</h2>
        {members.length === 0 ? (
          <EmptyState label="No first timer records found." />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {members.map((member) => (
              <div key={member.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-lg font-semibold text-slate-900">{member.user?.username}</p>
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
                    Assigned Fellowship Leader
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
                    Assigned Cell Leader
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
                  <label className="text-sm text-slate-700">
                    Notes
                    <textarea
                      value={member.visitation_notes || ""}
                      onChange={(event) => updateField(member.id, "visitation_notes", event.target.value)}
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => saveMember(member)}
                    disabled={savingId === member.id}
                    className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-70"
                  >
                    {savingId === member.id ? "Saving..." : "Save Assignment"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900">Submitted Visitation Reports</h3>
        {reports.length === 0 ? (
          <EmptyState label="No visitation reports submitted yet." />
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-semibold text-slate-900">{report.member_name}</p>
                <p className="text-slate-600">Leader: {report.leader_name}</p>
                <p className="text-slate-600">
                  Date: {report.visitation_date} {report.visitation_time}
                </p>
                <p className="text-slate-600">Method: {methodLabels[report.method_used] || report.method_used}</p>
                <p className="text-slate-700">Comment: {report.comment}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`text-xs font-medium ${report.status === "approved" ? "text-emerald-700" : "text-amber-700"}`}>
                    {report.status === "approved" ? "Approved" : "Pending Review"}
                  </span>
                  {report.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => approveReport(report.id)}
                      disabled={approvingId === report.id}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-70"
                    >
                      {approvingId === report.id ? "Approving..." : "Approve"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Visitation;
