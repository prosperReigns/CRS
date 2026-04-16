import { useEffect, useState } from "react";
import { getMembers, markAttendance } from "../../api/members";

function Attendance() {
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [date, setDate] = useState("");

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    const res = await getMembers();
    setMembers(res.data);
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
        service_type: "sunday",
        members: selected,
      });

      alert("Attendance recorded");
      setSelected([]);
    } catch (err) {
      console.error(err);
      alert("Error recording attendance");
    }
  };

  return (
    <div>
      <h2>Mark Attendance</h2>

      <input type="date" onChange={(e) => setDate(e.target.value)} />

      {members.map((m) => (
        <div key={m.id}>
          <label>
            <input
              type="checkbox"
              checked={selected.includes(m.id)}
              onChange={() => toggleMember(m.id)}
            />
            {m.user}
          </label>
        </div>
      ))}

      <button onClick={handleSubmit}>Submit Attendance</button>
    </div>
  );
}

export default Attendance;