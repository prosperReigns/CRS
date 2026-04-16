import { useEffect, useState } from "react";
import { getMembers } from "../../api/members";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import EmptyState from "../../components/ui/EmptyState";

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

  if (loading) return <LoadingState label="Loading members..." />;
  if (error) return <ErrorState error={error} />;
  if (members.length === 0) return <EmptyState label="No members found." />;

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
