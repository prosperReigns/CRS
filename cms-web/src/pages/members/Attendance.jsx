import { useEffect, useState } from "react";
import { getMembers, markAttendance } from "../../api/members";

function Attendance() {
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [date, setDate] = useState("");
  const [serviceType, setServiceType] = useState("sunday");
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

  const toggleMember = (id) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((m) => m !== id)
        : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!date) {
      alert("Select a date");
      return;
    }

    try {
      await markAttendance({
        date,
        service_type: serviceType,
        members: selected,
        present: true,
      });

      alert("Attendance recorded");
      setSelected([]);
    } catch (err) {
      alert(err.message || "Error recording attendance");
    }
  };

  return (
    <div>
      <h2>Mark Attendance</h2>
      {loading && <p>Loading members...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <input type="date" onChange={(e) => setDate(e.target.value)} />
      <select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
        <option value="sunday">Sunday Service</option>
        <option value="midweek">Midweek Service</option>
        <option value="special">Special Service</option>
      </select>

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

      <button onClick={handleSubmit}>Submit Attendance</button>
    </div>
  );
}

export default Attendance;
