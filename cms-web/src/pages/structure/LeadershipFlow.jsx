import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { getMembers } from "../../api/members";
import { createCell, createFellowship, getCells, getFellowships } from "../../api/structure";
import {
  assignCellLeader,
  assignFellowshipLeader,
  createLeader,
  createStaffResponsibility,
  createUser,
  getStaffResponsibilities,
  getUsers,
} from "../../api/users";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import { canAccessCellMinistry } from "../../utils/access";

const meetingDays = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];
const MIN_PASSWORD_LENGTH = 8;

const toResponsibilityCode = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const getMemberDisplayName = (member) => member.user?.username || `No username (ID: ${member.id})`;

function CredentialsModal({ credentials, onClose }) {
  if (!credentials) return null;

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">Leader Credentials</h3>
        <p className="mt-3 text-sm text-slate-700">
          Username: <strong>{credentials.username}</strong>
        </p>
        <p className="mt-1 text-sm text-slate-700">
          Password: <strong>{credentials.temporary_password || "No new password issued"}</strong>
        </p>
        <p className="mt-1 text-sm text-slate-700">
          Role: <strong>{credentials.role}</strong>
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function LeadershipFlow() {
  const { user } = useContext(AuthContext);
  const canManageStaff = ["admin", "pastor"].includes(user?.role);
  const canCreateFellowship = ["admin", "pastor"].includes(user?.role) || canAccessCellMinistry(user);
  const canCreateCell =
    ["admin", "pastor"].includes(user?.role) || user?.role === "fellowship_leader" || canAccessCellMinistry(user);
  const canAssignFellowshipLeaders = ["admin", "pastor"].includes(user?.role) || canAccessCellMinistry(user);
  const canAssignCellLeaders =
    ["admin", "pastor"].includes(user?.role) || user?.role === "fellowship_leader" || canAccessCellMinistry(user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");

  const [users, setUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [fellowships, setFellowships] = useState([]);
  const [cells, setCells] = useState([]);
  const [responsibilities, setResponsibilities] = useState([]);

  const [fellowshipForm, setFellowshipForm] = useState({ name: "", leader: "" });
  const [cellForm, setCellForm] = useState({
    name: "",
    fellowship: "",
    leader: "",
    meeting_day: "saturday",
    meeting_time: "",
    venue: "",
  });
  const [staffForm, setStaffForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    responsibility: "",
    new_responsibility_name: "",
    new_responsibility_code: "",
    new_responsibility_description: "",
  });
  const [fellowshipAssignForm, setFellowshipAssignForm] = useState({ member_id: "", fellowship_id: "" });
  const [cellAssignForm, setCellAssignForm] = useState({ member_id: "", cell_id: "" });
  const [fellowshipCreateLeaderForm, setFellowshipCreateLeaderForm] = useState({
    role: "fellowship_leader",
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    fellowship_id: "",
    cell_id: "",
  });
  const [cellCreateLeaderForm, setCellCreateLeaderForm] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    cell_id: "",
  });
  const [credentials, setCredentials] = useState(null);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  const fellowshipLeaders = useMemo(
    () => users.filter((candidate) => candidate.role === "fellowship_leader"),
    [users]
  );
  const cellLeaders = useMemo(() => users.filter((candidate) => candidate.role === "cell_leader"), [users]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const tasks = [getFellowships(), getCells(), getUsers(), getMembers()];
      if (canManageStaff) {
        tasks.push(getStaffResponsibilities());
      }
      const [loadedFellowships, loadedCells, loadedUsers, loadedMembers, loadedResponsibilities] = await Promise.all(tasks);
      setFellowships(loadedFellowships);
      setCells(loadedCells);
      setUsers(loadedUsers);
      setMembers(loadedMembers);
      setResponsibilities(loadedResponsibilities || []);
    } catch (err) {
      setError(err.message || "Failed to load leadership flow data.");
    } finally {
      setLoading(false);
    }
  }, [canManageStaff]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const beginSubmit = () => {
    setActionError("");
    setSuccess("");
    setIsFormSubmitting(true);
  };

  const endSubmit = () => setIsFormSubmitting(false);

  const handleFellowshipCreate = async (event) => {
    event.preventDefault();
    beginSubmit();
    try {
      await createFellowship({
        name: fellowshipForm.name.trim(),
        leader: fellowshipForm.leader ? Number(fellowshipForm.leader) : null,
      });
      setSuccess("Fellowship created successfully.");
      setFellowshipForm({ name: "", leader: "" });
      await fetchData();
    } catch (err) {
      setActionError(err.message || "Failed to create fellowship.");
    } finally {
      endSubmit();
    }
  };

  const handleCellCreate = async (event) => {
    event.preventDefault();
    beginSubmit();
    try {
      await createCell({
        name: cellForm.name.trim(),
        fellowship: Number(cellForm.fellowship),
        leader: cellForm.leader ? Number(cellForm.leader) : null,
        meeting_day: cellForm.meeting_day,
        meeting_time: cellForm.meeting_time,
        venue: cellForm.venue.trim(),
      });
      setSuccess("Cell created successfully.");
      setCellForm({
        name: "",
        fellowship: "",
        leader: "",
        meeting_day: "saturday",
        meeting_time: "",
        venue: "",
      });
      await fetchData();
    } catch (err) {
      setActionError(err.message || "Failed to create cell.");
    } finally {
      endSubmit();
    }
  };

  const handleCreateStaff = async (event) => {
    event.preventDefault();
    beginSubmit();
    try {
      let assignedResponsibilityCode = staffForm.responsibility;
      const responsibilityName = staffForm.new_responsibility_name.trim();
      if (responsibilityName) {
        const customCode = staffForm.new_responsibility_code.trim();
        const generatedCode = toResponsibilityCode(responsibilityName);
        const responsibilityCode = customCode || generatedCode;
        if (!responsibilityCode) {
          throw new Error("Enter a valid responsibility code or name.");
        }
        const created = await createStaffResponsibility({
          name: responsibilityName,
          code: responsibilityCode,
          description: staffForm.new_responsibility_description.trim(),
        });
        assignedResponsibilityCode = created.code;
      }

      await createUser({
        username: staffForm.username.trim(),
        first_name: staffForm.first_name.trim(),
        last_name: staffForm.last_name.trim(),
        email: staffForm.email.trim(),
        phone: staffForm.phone.trim(),
        password: staffForm.password,
        role: "staff",
        responsibilities: assignedResponsibilityCode ? [assignedResponsibilityCode] : [],
      });
      setSuccess("Staff account created successfully.");
      setStaffForm({
        username: "",
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        password: "",
        responsibility: "",
        new_responsibility_name: "",
        new_responsibility_code: "",
        new_responsibility_description: "",
      });
      await fetchData();
    } catch (err) {
      setActionError(err.message || "Failed to create staff account.");
    } finally {
      endSubmit();
    }
  };

  const handleAssignFellowshipLeader = async (event) => {
    event.preventDefault();
    beginSubmit();
    try {
      const data = await assignFellowshipLeader({
        member_id: Number(fellowshipAssignForm.member_id),
        fellowship_id: Number(fellowshipAssignForm.fellowship_id),
      });
      setCredentials(data);
      setSuccess("Fellowship leader assigned successfully.");
      setFellowshipAssignForm({ member_id: "", fellowship_id: "" });
      await fetchData();
    } catch (err) {
      setActionError(err.message || "Failed to assign fellowship leader.");
    } finally {
      endSubmit();
    }
  };

  const handleCreateFellowshipLeader = async (event) => {
    event.preventDefault();
    beginSubmit();
    try {
      const payload = {
        role: fellowshipCreateLeaderForm.role,
        first_name: fellowshipCreateLeaderForm.first_name.trim(),
        last_name: fellowshipCreateLeaderForm.last_name.trim(),
        username: fellowshipCreateLeaderForm.username.trim(),
        email: fellowshipCreateLeaderForm.email.trim(),
        fellowship_id:
          fellowshipCreateLeaderForm.role === "fellowship_leader" ? Number(fellowshipCreateLeaderForm.fellowship_id) : undefined,
        cell_id: fellowshipCreateLeaderForm.role === "cell_leader" ? Number(fellowshipCreateLeaderForm.cell_id) : undefined,
      };
      const data = await createLeader(payload);
      setCredentials(data);
      setSuccess("Leader account created successfully.");
      setFellowshipCreateLeaderForm({
        role: "fellowship_leader",
        first_name: "",
        last_name: "",
        username: "",
        email: "",
        fellowship_id: "",
        cell_id: "",
      });
      await fetchData();
    } catch (err) {
      setActionError(err.message || "Failed to create leader account.");
    } finally {
      endSubmit();
    }
  };

  const handleAssignCellLeader = async (event) => {
    event.preventDefault();
    beginSubmit();
    try {
      const data = await assignCellLeader({
        member_id: Number(cellAssignForm.member_id),
        cell_id: Number(cellAssignForm.cell_id),
      });
      setCredentials(data);
      setSuccess("Cell leader assigned successfully.");
      setCellAssignForm({ member_id: "", cell_id: "" });
      await fetchData();
    } catch (err) {
      setActionError(err.message || "Failed to assign cell leader.");
    } finally {
      endSubmit();
    }
  };

  const handleCreateCellLeader = async (event) => {
    event.preventDefault();
    beginSubmit();
    try {
      const data = await createLeader({
        role: "cell_leader",
        first_name: cellCreateLeaderForm.first_name.trim(),
        last_name: cellCreateLeaderForm.last_name.trim(),
        username: cellCreateLeaderForm.username.trim(),
        email: cellCreateLeaderForm.email.trim(),
        cell_id: Number(cellCreateLeaderForm.cell_id),
      });
      setCredentials(data);
      setSuccess("Cell leader account created successfully.");
      setCellCreateLeaderForm({ first_name: "", last_name: "", username: "", email: "", cell_id: "" });
      await fetchData();
    } catch (err) {
      setActionError(err.message || "Failed to create cell leader account.");
    } finally {
      endSubmit();
    }
  };

  if (loading) return <LoadingState label="Loading leadership flow..." />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Structure & Leadership Flow</h2>
      <p className="text-sm text-slate-600">
        Use this flow in order: 1) Staff setup, 2) Fellowship/Cell creation, 3) Fellowship leaders, 4) Cell leaders.
      </p>
      {actionError && <ErrorState error={actionError} />}
      {success && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}

      {canManageStaff && (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">1. Create Staff & Responsibility</h3>
          <form onSubmit={handleCreateStaff} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={staffForm.first_name}
                onChange={(event) => setStaffForm((prev) => ({ ...prev, first_name: event.target.value }))}
                placeholder="First name"
                required
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                value={staffForm.last_name}
                onChange={(event) => setStaffForm((prev) => ({ ...prev, last_name: event.target.value }))}
                placeholder="Last name"
                required
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <input
              value={staffForm.username}
              onChange={(event) => setStaffForm((prev) => ({ ...prev, username: event.target.value }))}
              placeholder="Username"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="email"
              value={staffForm.email}
              onChange={(event) => setStaffForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="Email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={staffForm.phone}
              onChange={(event) => setStaffForm((prev) => ({ ...prev, phone: event.target.value }))}
              placeholder="Phone"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="password"
              value={staffForm.password}
              onChange={(event) => setStaffForm((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="Temporary password"
              minLength={MIN_PASSWORD_LENGTH}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={staffForm.responsibility}
              onChange={(event) => setStaffForm((prev) => ({ ...prev, responsibility: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">No existing responsibility selected</option>
              {responsibilities.map((responsibility) => (
                <option key={responsibility.id} value={responsibility.code}>
                  {responsibility.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">To create a new responsibility for this staff, fill the fields below.</p>
            <input
              value={staffForm.new_responsibility_name}
              onChange={(event) => setStaffForm((prev) => ({ ...prev, new_responsibility_name: event.target.value }))}
              placeholder="New responsibility name (optional)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={staffForm.new_responsibility_code}
              onChange={(event) => setStaffForm((prev) => ({ ...prev, new_responsibility_code: event.target.value }))}
              placeholder="New responsibility code (optional)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <textarea
              value={staffForm.new_responsibility_description}
              onChange={(event) => setStaffForm((prev) => ({ ...prev, new_responsibility_description: event.target.value }))}
              placeholder="Responsibility description (optional)"
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={isFormSubmitting}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-70"
            >
              {isFormSubmitting ? "Saving..." : "Create Staff"}
            </button>
          </form>
        </section>
      )}

      {(canCreateFellowship || canCreateCell) && (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">2. Create Fellowship and Cells</h3>
          <div className="grid gap-4 xl:grid-cols-2">
            {canCreateFellowship && (
              <form onSubmit={handleFellowshipCreate} className="space-y-3 rounded-lg border border-slate-200 p-4">
                <h4 className="font-semibold text-slate-900">Create Fellowship</h4>
                <input
                  value={fellowshipForm.name}
                  onChange={(event) => setFellowshipForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Fellowship name"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <select
                  value={fellowshipForm.leader}
                  onChange={(event) => setFellowshipForm((prev) => ({ ...prev, leader: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">No leader</option>
                  {fellowshipLeaders.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.username}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={isFormSubmitting}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-70"
                >
                  Create Fellowship
                </button>
              </form>
            )}

            {canCreateCell && (
              <form onSubmit={handleCellCreate} className="space-y-3 rounded-lg border border-slate-200 p-4">
                <h4 className="font-semibold text-slate-900">Create Cell</h4>
                <input
                  value={cellForm.name}
                  onChange={(event) => setCellForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Cell name"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <select
                  value={cellForm.fellowship}
                  onChange={(event) => setCellForm((prev) => ({ ...prev, fellowship: event.target.value }))}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Select fellowship</option>
                  {fellowships.map((fellowship) => (
                    <option key={fellowship.id} value={fellowship.id}>
                      {fellowship.name}
                    </option>
                  ))}
                </select>
                <select
                  value={cellForm.leader}
                  onChange={(event) => setCellForm((prev) => ({ ...prev, leader: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">No leader</option>
                  {cellLeaders.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.username}
                    </option>
                  ))}
                </select>
                <select
                  value={cellForm.meeting_day}
                  onChange={(event) => setCellForm((prev) => ({ ...prev, meeting_day: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                >
                  {meetingDays.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={cellForm.meeting_time}
                  onChange={(event) => setCellForm((prev) => ({ ...prev, meeting_time: event.target.value }))}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <textarea
                  value={cellForm.venue}
                  onChange={(event) => setCellForm((prev) => ({ ...prev, venue: event.target.value }))}
                  placeholder="Venue"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={isFormSubmitting}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-70"
                >
                  Create Cell
                </button>
              </form>
            )}
          </div>
        </section>
      )}

      {canAssignFellowshipLeaders && (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">3. Fellowship Leader Setup</h3>
          <div className="grid gap-4 xl:grid-cols-2">
            <form onSubmit={handleAssignFellowshipLeader} className="space-y-3 rounded-lg border border-slate-200 p-4">
              <h4 className="font-semibold text-slate-900">Assign Existing Member</h4>
              <select
                value={fellowshipAssignForm.member_id}
                onChange={(event) => setFellowshipAssignForm((prev) => ({ ...prev, member_id: event.target.value }))}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {getMemberDisplayName(member)}
                  </option>
                ))}
              </select>
              <select
                value={fellowshipAssignForm.fellowship_id}
                onChange={(event) => setFellowshipAssignForm((prev) => ({ ...prev, fellowship_id: event.target.value }))}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select fellowship</option>
                {fellowships.map((fellowship) => (
                  <option key={fellowship.id} value={fellowship.id}>
                    {fellowship.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={isFormSubmitting}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-70"
              >
                Assign Fellowship Leader
              </button>
            </form>

            <form onSubmit={handleCreateFellowshipLeader} className="space-y-3 rounded-lg border border-slate-200 p-4">
              <h4 className="font-semibold text-slate-900">Create Leader Account</h4>
              <select
                value={fellowshipCreateLeaderForm.role}
                onChange={(event) => setFellowshipCreateLeaderForm((prev) => ({ ...prev, role: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="fellowship_leader">Fellowship Leader</option>
                <option value="cell_leader">Cell Leader</option>
              </select>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={fellowshipCreateLeaderForm.first_name}
                  onChange={(event) => setFellowshipCreateLeaderForm((prev) => ({ ...prev, first_name: event.target.value }))}
                  placeholder="First name"
                  required
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  value={fellowshipCreateLeaderForm.last_name}
                  onChange={(event) => setFellowshipCreateLeaderForm((prev) => ({ ...prev, last_name: event.target.value }))}
                  placeholder="Last name"
                  required
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <input
                value={fellowshipCreateLeaderForm.username}
                onChange={(event) => setFellowshipCreateLeaderForm((prev) => ({ ...prev, username: event.target.value }))}
                placeholder="Username (optional)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                type="email"
                value={fellowshipCreateLeaderForm.email}
                onChange={(event) => setFellowshipCreateLeaderForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="Email (optional)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              {fellowshipCreateLeaderForm.role === "fellowship_leader" ? (
                <select
                  value={fellowshipCreateLeaderForm.fellowship_id}
                  onChange={(event) =>
                    setFellowshipCreateLeaderForm((prev) => ({ ...prev, fellowship_id: event.target.value }))
                  }
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Select fellowship</option>
                  {fellowships.map((fellowship) => (
                    <option key={fellowship.id} value={fellowship.id}>
                      {fellowship.name}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={fellowshipCreateLeaderForm.cell_id}
                  onChange={(event) => setFellowshipCreateLeaderForm((prev) => ({ ...prev, cell_id: event.target.value }))}
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
              )}
              <p className="text-xs text-slate-500">A temporary password is generated automatically.</p>
              <button
                type="submit"
                disabled={isFormSubmitting}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-70"
              >
                Create Leader
              </button>
            </form>
          </div>
        </section>
      )}

      {canAssignCellLeaders && (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">4. Cell Leader Setup</h3>
          <div className="grid gap-4 xl:grid-cols-2">
            <form onSubmit={handleAssignCellLeader} className="space-y-3 rounded-lg border border-slate-200 p-4">
              <h4 className="font-semibold text-slate-900">Assign Existing Member</h4>
              <select
                value={cellAssignForm.member_id}
                onChange={(event) => setCellAssignForm((prev) => ({ ...prev, member_id: event.target.value }))}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {getMemberDisplayName(member)}
                  </option>
                ))}
              </select>
              <select
                value={cellAssignForm.cell_id}
                onChange={(event) => setCellAssignForm((prev) => ({ ...prev, cell_id: event.target.value }))}
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
              <button
                type="submit"
                disabled={isFormSubmitting}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-70"
              >
                Assign Cell Leader
              </button>
            </form>

            <form onSubmit={handleCreateCellLeader} className="space-y-3 rounded-lg border border-slate-200 p-4">
              <h4 className="font-semibold text-slate-900">Create New Cell Leader</h4>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={cellCreateLeaderForm.first_name}
                  onChange={(event) => setCellCreateLeaderForm((prev) => ({ ...prev, first_name: event.target.value }))}
                  placeholder="First name"
                  required
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  value={cellCreateLeaderForm.last_name}
                  onChange={(event) => setCellCreateLeaderForm((prev) => ({ ...prev, last_name: event.target.value }))}
                  placeholder="Last name"
                  required
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <input
                value={cellCreateLeaderForm.username}
                onChange={(event) => setCellCreateLeaderForm((prev) => ({ ...prev, username: event.target.value }))}
                placeholder="Username (optional)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                type="email"
                value={cellCreateLeaderForm.email}
                onChange={(event) => setCellCreateLeaderForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="Email (optional)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <select
                value={cellCreateLeaderForm.cell_id}
                onChange={(event) => setCellCreateLeaderForm((prev) => ({ ...prev, cell_id: event.target.value }))}
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
              <button
                type="submit"
                disabled={isFormSubmitting}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-70"
              >
                Create Cell Leader
              </button>
            </form>
          </div>
        </section>
      )}

      <CredentialsModal credentials={credentials} onClose={() => setCredentials(null)} />
    </div>
  );
}

export default LeadershipFlow;
