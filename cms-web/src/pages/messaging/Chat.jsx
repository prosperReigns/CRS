import { useContext, useEffect, useState } from "react";
import { getMessages, sendMessage } from "../../api/messages";
import { AuthContext } from "../../context/AuthContext";

function Chat({ user }) {
  const { user: currentUser } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    fetchMessages();

    const interval = setInterval(fetchMessages, 3000); // polling

    return () => clearInterval(interval);
  }, [user]);

  const fetchMessages = async () => {
    const res = await getMessages();

    const filtered = res.data.filter(
      (m) =>
        (m.sender === currentUser?.id && m.recipient === user.id) ||
        (m.sender === user.id && m.recipient === currentUser?.id)
    );

    setMessages(filtered);
  };

  const handleSend = async () => {
    if (!text) return;

    await sendMessage({
      recipient: user.id,
      content: text,
    });

    setText("");
    fetchMessages();
  };

  return (
    <div>
      <h3>Chat with {user.username}</h3>

      <div style={{ height: "400px", overflowY: "scroll" }}>
        {messages.map((m) => (
          <div key={m.id}>
            <strong>{m.sender_username}</strong>: {m.content}
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
