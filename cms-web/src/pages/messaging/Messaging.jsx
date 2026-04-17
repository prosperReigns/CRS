import { useEffect, useState } from "react";
import { getConversations, getMessageRecipients, sendMessage } from "../../api/messages";
import Chat from "./Chat";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";

function Messaging() {
  const [users, setUsers] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [recipientId, setRecipientId] = useState("");
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  const fetchRecipients = async () => {
    try {
      const data = await getMessageRecipients();
      setRecipients(data);
    } catch (err) {
      setError(err.message || "Failed to load available recipients.");
    }
  };

  const handleStartConversation = async () => {
    if (!recipientId || !messageText.trim()) return;
    setSending(true);
    setError("");
    setSuccess("");
    try {
      const selectedRecipient = recipients.find((recipient) => String(recipient.id) === recipientId);
      await sendMessage({ recipient: Number(recipientId), content: messageText.trim() });
      setMessageText("");
      await fetchConversations();
      if (selectedRecipient) {
        setActiveUser(selectedRecipient);
      }
      setSuccess("Message sent successfully.");
    } catch (err) {
      setError(err.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    fetchRecipients();
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-10">
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-3">
        <h3 className="text-xl font-bold text-slate-900">Conversations</h3>
        {loading && <LoadingState label="Loading conversations..." />}
        <ErrorState error={error} />
        {success && <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}

        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-700">Start New Conversation</p>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
          >
            <option value="">Select recipient</option>
            {recipients.map((recipient) => (
              <option key={recipient.id} value={recipient.id}>
                {recipient.username} ({recipient.role})
              </option>
            ))}
          </select>
          <textarea
            className="min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type your first message..."
          />
          <button
            className="w-full rounded-lg bg-slate-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
            onClick={handleStartConversation}
            disabled={!recipientId || !messageText.trim() || sending}
          >
            {sending ? "Sending..." : "Start Conversation"}
          </button>
        </div>

        {!loading && !error && users.length === 0 && <EmptyState label="No conversations yet." />}

        {users.filter((u) => u?.partner?.id).map((u) => (
          <div
            key={u.partner.id}
            onClick={() => setActiveUser(u.partner)}
            className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 transition hover:border-brand-300 hover:bg-brand-50"
          >
            {u.partner?.username} ({u.partner?.role})
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-7">
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
