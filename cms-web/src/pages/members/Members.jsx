import { useEffect, useState } from "react";
import { getMembers } from "../../api/members";

function Members() {
  const [members, setMembers] = useState([]);
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

  if (loading) return <p>Loading members...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (members.length === 0) return <p>No members found.</p>;

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
          <p><strong>{m.user?.username}</strong></p>
          <p>Baptised: {m.is_baptised ? "Yes" : "No"}</p>
          <p>Foundation: {m.foundation_completed ? "Yes" : "No"}</p>
          <p>Souls Won: {m.souls_won}</p>
        </div>
      ))}
    </div>
  );
}

export default Members;
