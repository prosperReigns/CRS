import { useEffect, useState } from "react";
import { getPeople, getServices, markAttendance } from "../../api/members";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import EmptyState from "../../components/ui/EmptyState";

const badgeStyle = {
  member: "bg-emerald-100 text-emerald-700",
  first_timer: "bg-amber-100 text-amber-700",
  visitor: "bg-slate-100 text-slate-700",
};

const badgeLabel = {
  member: "Member",
  first_timer: "First Timer",
  visitor: "Visitor",
};

function Attendance() {
  const [people, setPeople] = useState([]);
  const [selected, setSelected] = useState([]);
  const [date, setDate] = useState("");
  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [peopleData, serviceData] = await Promise.all([getPeople(), getServices()]);
      setPeople(peopleData);
      setServices(serviceData);
      if (serviceData.length > 0) {
        setServiceId(String(serviceData[0].id));
      }
    } catch (err) {
      setError(err.message || "Failed to load attendance data.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (id) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((m) => m !== id)
        : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    if (!date) {
      setError("Select a date.");
      return;
    }
    if (!serviceId) {
      setError("Select a service.");
      return;
    }

    try {
      await markAttendance({
        date,
        service_id: Number(serviceId),
        people: selected,
        present: true,
      });
      setSuccess("Attendance recorded successfully.");
      setSelected([]);
    } catch (err) {
      setError(err.message || "Error recording attendance");
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-900">Mark Attendance</h2>
      {loading && <LoadingState label="Loading members..." />}
      <ErrorState error={error} />
      {success && <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}

      <div className="grid gap-3 md:grid-cols-2">
        <input
          type="date"
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none ring-brand-500 focus:ring-2"
          onChange={(e) => setDate(e.target.value)}
        />
        <select
          value={serviceId}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 outline-none ring-brand-500 focus:ring-2"
          onChange={(e) => setServiceId(e.target.value)}
        >
        {services.length === 0 ? (
          <option value="">No active services available</option>
        ) : null}
        {services.map((service) => (
          <option key={service.id} value={service.id}>
            {service.name} ({service.day_of_week})
          </option>
        ))}
        </select>
      </div>

      {!loading && people.length === 0 && <EmptyState label="No people available for attendance." />}
      <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-2 xl:grid-cols-3">
      {people.map((person) => (
        <div key={person.id} className="rounded-md bg-white p-2">
          <label className="flex items-center justify-between gap-2 text-sm text-slate-700">
            <span className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.includes(person.id)}
              onChange={() => toggleMember(person.id)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            {`${person.first_name} ${person.last_name}`.trim()}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                badgeStyle[person.status || person.membership_status] || "bg-slate-100 text-slate-700"
              }`}
            >
              {badgeLabel[person.status || person.membership_status] || "Visitor"}
            </span>
          </label>
        </div>
      ))}
      </div>

      <button
        type="button"
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
        onClick={handleSubmit}
        disabled={loading || people.length === 0 || selected.length === 0 || !serviceId}
      >
        Submit Attendance
      </button>
    </div>
  );
}

export default Attendance;
