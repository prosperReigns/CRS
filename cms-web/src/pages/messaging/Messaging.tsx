import { useEffect, useState } from "react";
import { getConversations } from "../../api/messages";
import Chat from "./Chat";

function Messaging() {
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    const res = await getConversations();
    setUsers(res.data);
  };

  return (
    <div style={{ display: "flex" }}>
      {/* LEFT: USERS */}
      <div style={{ width: "30%", borderRight: "1px solid #ccc" }}>
        <h3>Conversations</h3>

        {users.map((u) => (
          <div
            key={u.id}
            onClick={() => setActiveUser(u)}
            style={{ padding: "10px", cursor: "pointer" }}
          >
            {u.username} ({u.role})
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