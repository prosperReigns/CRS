import { useEffect, useState } from "react";
import { getMembers } from "../../api/members";
import { getCells } from "../../api/structure";
import { assignCellLeader, createLeader } from "../../api/users";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";

function CredentialsModal({ credentials, onClose }) {
  if (!credentials) return null;

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">Leader Credentials</h3>
        <p className="mt-3 text-sm text-slate-700">Username: <strong>{credentials.username}</strong></p>
        <p className="mt-1 text-sm text-slate-700">
          Password: <strong>{credentials.temporary_password || "No new password issued"}</strong>
        </p>
        <p className="mt-1 text-sm text-slate-700">Role: <strong>{credentials.role}</strong></p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function AssignCellLeader() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [members, setMembers] = useState([]);
  const [cells, setCells] = useState([]);
  const [assignForm, setAssignForm] = useState({ member_id: "", cell_id: "" });
  const [createForm, setCreateForm] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    cell_id: "",
  });
  const [credentials, setCredentials] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [loadedMembers, loadedCells] = await Promise.all([getMembers(), getCells()]);
      setMembers(loadedMembers);
      setCells(loadedCells);
    } catch (err) {
      setError(err.message || "Failed to load cell leader assignment data.");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      const data = await assignCellLeader({
        member_id: Number(assignForm.member_id),
        cell_id: Number(assignForm.cell_id),
      });
      setSuccess("Cell leader assigned successfully.");
      setCredentials(data);
      setAssignForm({ member_id: "", cell_id: "" });
      await fetchData();
    } catch (err) {
      setError(err.message || "Failed to assign cell leader.");
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      const data = await createLeader({
        role: "cell_leader",
        first_name: createForm.first_name.trim(),
        last_name: createForm.last_name.trim(),
        username: createForm.username.trim(),
        email: createForm.email.trim(),
        cell_id: Number(createForm.cell_id),
      });
      setSuccess("Cell leader account created successfully.");
      setCredentials(data);
      setCreateForm({ first_name: "", last_name: "", username: "", email: "", cell_id: "" });
      await fetchData();
    } catch (err) {
      setError(err.message || "Failed to create cell leader account.");
    }
  };

  if (loading) return <LoadingState label="Loading assignment data..." />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Assign Cell Leader</h2>
      {error && <ErrorState error={error} />}
      {success && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}

      <form onSubmit={handleAssign} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Assign Existing Member</h3>
        <select
          value={assignForm.member_id}
          onChange={(event) => setAssignForm((prev) => ({ ...prev, member_id: event.target.value }))}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Select member</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.user?.username || `Member ${member.id}`}
            </option>
          ))}
        </select>
        <select
          value={assignForm.cell_id}
          onChange={(event) => setAssignForm((prev) => ({ ...prev, cell_id: event.target.value }))}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Select cell</option>
          {cells.map((cell) => (
            <option key={cell.id} value={cell.id}>
              {cell.name}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Assign Cell Leader
        </button>
      </form>

      <form onSubmit={handleCreate} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Create New Cell Leader Account</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={createForm.first_name}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, first_name: event.target.value }))}
            placeholder="First name"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={createForm.last_name}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, last_name: event.target.value }))}
            placeholder="Last name"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <input
          value={createForm.username}
          onChange={(event) => setCreateForm((prev) => ({ ...prev, username: event.target.value }))}
          placeholder="Username (optional)"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="email"
          value={createForm.email}
          onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
          placeholder="Email (optional)"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={createForm.cell_id}
          onChange={(event) => setCreateForm((prev) => ({ ...prev, cell_id: event.target.value }))}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Select cell</option>
          {cells.map((cell) => (
            <option key={cell.id} value={cell.id}>
              {cell.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500">A temporary password is generated automatically.</p>
        <button type="submit" className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Create Leader
        </button>
      </form>

      <CredentialsModal credentials={credentials} onClose={() => setCredentials(null)} />
    </div>
  );
}

export default AssignCellLeader;
