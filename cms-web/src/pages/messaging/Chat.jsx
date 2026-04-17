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
    <div className="space-y-3">
      <h3 className="text-xl font-bold text-slate-900">Chat with {user.username}</h3>
      <ErrorState error={error} />

      <div className="h-[400px] space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
        {loading && <LoadingState label="Loading chat..." />}
        {!loading && messages.length === 0 && <EmptyState label="No messages in this conversation yet." />}
        {!loading &&
          messages.map((m) => (
            <div key={m.id} className="rounded-md border border-slate-200 bg-white p-2 text-sm text-slate-700">
              <strong>{m.sender?.username}</strong>: {m.content}
            </div>
          ))}
      </div>

      <div className="flex gap-2">
        <input
          value={text}
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 outline-none ring-brand-500 focus:ring-2"
          onChange={(e) => setText(e.target.value)}
          placeholder="Type message..."
        />

        <button
          onClick={handleSend}
          className="rounded-lg bg-slate-600 px-4 py-2.5 font-medium text-white transition hover:bg-brand-700"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default Chat;
