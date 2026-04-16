import { useEffect, useState } from "react";
import { getMembers, getServices, markAttendance } from "../../api/members";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import EmptyState from "../../components/ui/EmptyState";

function Attendance() {
  const [members, setMembers] = useState([]);
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
      const [memberData, serviceData] = await Promise.all([getMembers(), getServices()]);
      setMembers(memberData);
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
        members: selected,
        present: true,
      });
      setSuccess("Attendance recorded successfully.");
      setSelected([]);
    } catch (err) {
      setError(err.message || "Error recording attendance");
    }
  };

  return (
    <div>
      <h2>Mark Attendance</h2>
      {loading && <LoadingState label="Loading members..." />}
      <ErrorState error={error} />
      {success && <p style={{ color: "green" }}>{success}</p>}

      <input type="date" onChange={(e) => setDate(e.target.value)} />
      <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
        {services.map((service) => (
          <option key={service.id} value={service.id}>
            {service.name} ({service.day_of_week})
          </option>
        ))}
      </select>

      {!loading && members.length === 0 && <EmptyState label="No members available for attendance." />}
      {members.map((m) => (
        <div key={m.id}>
          <label>
            <input
              type="checkbox"
              checked={selected.includes(m.id)}
              onChange={() => toggleMember(m.id)}
            />
            {m.user?.username}
          </label>
        </div>
      ))}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || members.length === 0 || selected.length === 0 || !serviceId}
      >
        Submit Attendance
      </button>
    </div>
  );
}

export default Attendance;
