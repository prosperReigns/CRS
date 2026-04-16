import { useEffect, useState } from "react";
import { getMembers } from "../../api/members";

function Members() {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await getMembers();
      setMembers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h2>Members</h2>

      {members.map((m) => (
        <div
          key={m.id}
          style={{
            border: "1px solid #ccc",
            margin: "10px",
            padding: "10px",
          }}
        >
          <p><strong>{m.user}</strong></p>
          <p>Baptised: {m.is_baptised ? "Yes" : "No"}</p>
          <p>Foundation: {m.foundation_completed ? "Yes" : "No"}</p>
          <p>Souls Won: {m.souls_won}</p>
        </div>
      ))}
    </div>
  );
}

export default Members;