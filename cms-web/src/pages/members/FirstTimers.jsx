import { useEffect, useState } from "react";
import { getServiceFirstTimerEvents, updateFirstTimerEvent } from "../../api/members";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import EmptyState from "../../components/ui/EmptyState";

const statusBadge = {
  member: "bg-emerald-100 text-emerald-700",
  first_timer: "bg-amber-100 text-amber-700",
  visitor: "bg-slate-100 text-slate-700",
};

function FirstTimers() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);

  const fetchEvents = async () => {
    try {
      const data = await getServiceFirstTimerEvents();
      setEvents(data);
    } catch (err) {
      setError(err.message || "Failed to load first timer events.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const markHandled = async (eventId) => {
    setSavingId(eventId);
    setError("");
    try {
      const updated = await updateFirstTimerEvent(eventId, { handled: true });
      setEvents((prev) => prev.map((event) => (event.id === eventId ? updated : event)));
    } catch (err) {
      setError(err.message || "Failed to update event.");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <LoadingState label="Loading first timer events..." />;
  if (error) return <ErrorState error={error} />;
  if (events.length === 0) return <EmptyState label="No service first timer events found." />;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">First Timer Dashboard (Service)</h2>
      <div className="grid gap-4 xl:grid-cols-2">
        {events.map((event) => (
          <div key={event.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-lg font-semibold text-slate-900">{event.person?.name || "-"}</p>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  statusBadge[event.person?.status] || "bg-slate-100 text-slate-700"
                }`}
              >
                {event.person?.status === "member"
                  ? "Member"
                  : event.person?.status === "first_timer"
                    ? "First Timer"
                    : "Visitor"}
              </span>
            </div>
            <p className="text-sm text-slate-600">Date: {event.event_date}</p>
            <p className="text-sm text-slate-600">Phone: {event.person?.phone || "-"}</p>
            <p className="text-sm text-slate-600">Email: {event.person?.email || "-"}</p>
            <div className="mt-3">
              {event.handled ? (
                <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">Handled</span>
              ) : (
                <button
                  type="button"
                  onClick={() => markHandled(event.id)}
                  disabled={savingId === event.id}
                  className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-70"
                >
                  {savingId === event.id ? "Saving..." : "Mark as Handled"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FirstTimers;
