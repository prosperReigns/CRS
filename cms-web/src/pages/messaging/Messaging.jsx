import { useEffect, useState } from "react";
import { getConversations } from "../../api/messages";
import Chat from "./Chat";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";

function Messaging() {
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchConversations = async () => {
    try {
      const data = await getConversations();
      setUsers(data);
    } catch (err) {
      setError(err.message || "Failed to load conversations.");
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
        {loading && <LoadingState label="Loading conversations..." />}
        <ErrorState error={error} />
        {!loading && !error && users.length === 0 && <EmptyState label="No conversations yet." />}

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
          <EmptyState label="Select a conversation" />
        )}
      </div>
    </div>
  );
}

export default Messaging;
