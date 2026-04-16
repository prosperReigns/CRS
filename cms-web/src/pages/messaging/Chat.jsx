import { useContext, useEffect, useState } from "react";
import { getConversationThread, sendMessage } from "../../api/messages";
import { AuthContext } from "../../context/AuthContext";
import ErrorState from "../../components/ui/ErrorState";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";

function Chat({ user }) {
  const { user: currentUser } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let interval;
    if (currentUser) {
      fetchMessages();
      interval = setInterval(fetchMessages, 3000); // polling
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user, currentUser]);

  const fetchMessages = async () => {
    try {
      const data = await getConversationThread(user.id);
      setMessages(data);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load chat messages.");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!text) return;
    try {
      await sendMessage({
        recipient: user.id,
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
      <ErrorState error={error} />

      <div style={{ height: "400px", overflowY: "scroll" }}>
        {loading && <LoadingState label="Loading chat..." />}
        {!loading && messages.length === 0 && <EmptyState label="No messages in this conversation yet." />}
        {!loading &&
          messages.map((m) => (
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
