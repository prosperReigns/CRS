import { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { createCell, createFellowship, getCells, getFellowships } from "../../api/structure";
import { getUsers } from "../../api/users";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import EmptyState from "../../components/ui/EmptyState";
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

function Structure() {
  const { user } = useContext(AuthContext);
  const canCreateFellowship = ["admin", "pastor"].includes(user?.role) || canAccessCellMinistry(user);
  const canCreateCell =
    ["admin", "pastor"].includes(user?.role) || user?.role === "fellowship_leader" || canAccessCellMinistry(user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");
  const [fellowships, setFellowships] = useState([]);
  const [cells, setCells] = useState([]);
  const [users, setUsers] = useState([]);
  const [fellowshipForm, setFellowshipForm] = useState({ name: "", leader: "" });
  const [cellForm, setCellForm] = useState({
    name: "",
    fellowship: "",
    leader: "",
    meeting_day: "saturday",
    meeting_time: "",
    venue: "",
  });

  const fellowshipLeaders = useMemo(
    () => users.filter((candidate) => candidate.role === "fellowship_leader"),
    [users]
  );
  const cellLeaders = useMemo(() => users.filter((candidate) => candidate.role === "cell_leader"), [users]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [loadedFellowships, loadedCells, loadedUsers] = await Promise.all([
        getFellowships(),
        getCells(),
        getUsers(),
      ]);
      setFellowships(loadedFellowships);
      setCells(loadedCells);
      setUsers(loadedUsers);
    } catch (err) {
      setError(err.message || "Failed to load structure data.");
    } finally {
      setLoading(false);
    }
  };

  const handleFellowshipCreate = async (event) => {
    event.preventDefault();
    setActionError("");
    setSuccess("");
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
    }
  };

  const handleCellCreate = async (event) => {
    event.preventDefault();
    setActionError("");
    setSuccess("");
    try {
      await createCell({
        name: cellForm.name.trim(),
        fellowship: Number(cellForm.fellowship),
        leader: cellForm.leader ? Number(cellForm.leader) : null,
        meeting_day: cellForm.meeting_day,
        meeting_time: cellForm.meeting_time || null,
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
    }
  };

  if (loading) return <LoadingState label="Loading structure..." />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Structure</h2>
      {actionError && <ErrorState error={actionError} />}
      {success && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}

      {(canCreateFellowship || canCreateCell) && (
        <div className="grid gap-4 xl:grid-cols-2">
          {canCreateFellowship && (
            <form onSubmit={handleFellowshipCreate} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Create Fellowship</h3>
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
              <button type="submit" className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                Create Fellowship
              </button>
            </form>
          )}

          {canCreateCell && (
            <form onSubmit={handleCellCreate} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Create Cell</h3>
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <textarea
                value={cellForm.venue}
                onChange={(event) => setCellForm((prev) => ({ ...prev, venue: event.target.value }))}
                placeholder="Venue / Address (optional)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button type="submit" className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                Create Cell
              </button>
            </form>
          )}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-lg font-semibold text-slate-900">Fellowships</h3>
        {fellowships.length === 0 ? (
          <EmptyState label="No fellowships found." />
        ) : (
          <div className="space-y-2">
            {fellowships.map((fellowship) => (
              <p key={fellowship.id} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                {fellowship.name}
              </p>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-lg font-semibold text-slate-900">Cells</h3>
        {cells.length === 0 ? (
          <EmptyState label="No cells found." />
        ) : (
          <div className="space-y-2">
            {cells.map((cell) => (
              <p key={cell.id} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                {cell.name} - {cell.fellowship_name || "Unknown Fellowship"}
              </p>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Structure;
