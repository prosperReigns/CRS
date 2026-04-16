import { useEffect, useState } from "react";
import { getMembers, markAttendance } from "../../api/members";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import EmptyState from "../../components/ui/EmptyState";

function Attendance() {
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [date, setDate] = useState("");
  const [serviceType, setServiceType] = useState("sunday");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

    try {
      await markAttendance({
        date,
        service_type: serviceType,
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
      <select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
        <option value="sunday">Sunday Service</option>
        <option value="midweek">Midweek Service</option>
        <option value="special">Special Service</option>
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

      <button onClick={handleSubmit} disabled={loading || members.length === 0 || selected.length === 0}>
        Submit Attendance
      </button>
    </div>
  );
}

export default Attendance;
