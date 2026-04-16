import { useEffect, useState } from "react";
import { getConversations } from "../../api/messages";
import Chat from "./Chat";

function Messaging() {
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchConversations = async () => {
    try {
      const res = await getConversations();
      setUsers(res.data);
    } catch {
      setError("Failed to load conversations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  return (
    <div style={{ display: "flex" }}>
      {/* LEFT: USERS */}
      <div style={{ width: "30%", borderRight: "1px solid #ccc" }}>
        <h3>Conversations</h3>
        {loading && <p>Loading conversations...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
        {!loading && !error && users.length === 0 && <p>No conversations yet.</p>}

        {users.filter((u) => u?.partner?.id).map((u) => (
          <div
            key={u.partner.id}
            onClick={() => setActiveUser(u.partner)}
            style={{ padding: "10px", cursor: "pointer" }}
          >
            {u.partner?.username} ({u.partner?.role})
          </div>
        ))}
      </div>

      {/* RIGHT: CHAT */}
      <div style={{ width: "70%" }}>
        {activeUser ? (
          <Chat user={activeUser} />
        ) : (
          <p>Select a conversation</p>
        )}
      </div>
    </div>
  );
}

export default Messaging;
