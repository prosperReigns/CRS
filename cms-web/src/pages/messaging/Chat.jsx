import { useEffect, useState } from "react";
import { getMessages, sendMessage } from "../../api/messages";

function Chat({ user }) {
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
        m.sender === user.username ||
        m.receiver === user.username
    );

    setMessages(filtered);
  };

  const handleSend = async () => {
    if (!text) return;

    await sendMessage({
      receiver: user.id,
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
            <strong>{m.sender}</strong>: {m.content}
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