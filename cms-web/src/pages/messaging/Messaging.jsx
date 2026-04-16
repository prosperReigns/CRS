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
    <div className="grid gap-4 lg:grid-cols-10">
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-3">
        <h3 className="text-xl font-bold text-slate-900">Conversations</h3>
        {loading && <LoadingState label="Loading conversations..." />}
        <ErrorState error={error} />
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
