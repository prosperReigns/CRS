import { useContext, useEffect, useState } from "react";
import { getMessages, sendMessage } from "../../api/messages";
import { AuthContext } from "../../context/AuthContext";

function Chat({ user }) {
  const { user: currentUser } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMessages();

    const interval = setInterval(fetchMessages, 3000); // polling

    return () => clearInterval(interval);
  }, [user]);

  const fetchMessages = async () => {
    try {
      const data = await getMessages();
      const filtered = data.filter(
        (m) =>
          (m.sender?.id === currentUser?.id && m.receiver?.id === user.id) ||
          (m.sender?.id === user.id && m.receiver?.id === currentUser?.id)
      );

      setMessages(filtered);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load chat messages.");
    }
  };

  const handleSend = async () => {
    if (!text) return;
    try {
      await sendMessage({
        receiver: user.id,
        content: text,
      });

      setText("");
      fetchMessages();
    } catch (err) {
      setError(err.message || "Failed to send message.");
    }
  };

  return (
    <div>
      <h3>Chat with {user.username}</h3>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={{ height: "400px", overflowY: "scroll" }}>
        {messages.map((m) => (
          <div key={m.id}>
            <strong>{m.sender?.username}</strong>: {m.content}
          </div>
        ))}
      </div>

      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type message..."
      />

      <button onClick={handleSend}>Send</button>
    </div>
  );
}

export default Chat;
