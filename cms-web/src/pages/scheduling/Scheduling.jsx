import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createScheduleEvent,
  createTodoItem,
  deleteScheduleEvent,
  deleteTodoItem,
  getScheduleEvents,
  getTodoItems,
  updateScheduleEvent,
  updateTodoItem,
} from "../../api/scheduling";
import { getUsers } from "../../api/users";
import ErrorState from "../../components/ui/ErrorState";
import LoadingState from "../../components/ui/LoadingState";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const eventTypeOptions = [
  { value: "meeting", label: "Meeting" },
  { value: "service", label: "Service" },
  { value: "counseling", label: "Counseling" },
  { value: "outreach", label: "Outreach" },
  { value: "training", label: "Training" },
  { value: "administrative", label: "Administrative" },
  { value: "other", label: "Other" },
];

const initialForm = {
  title: "",
  description: "",
  location: "",
  startDate: "",
  startTime: "09:00",
  endDate: "",
  endTime: "10:00",
  allDay: false,
  eventType: "meeting",
  participants: [],
};

const todoPriorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const initialTodoForm = {
  title: "",
  description: "",
  dueDate: "",
  priority: "medium",
};

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMonthGrid = (monthDate) => {
  const firstDayOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const calendarStart = new Date(firstDayOfMonth);
  calendarStart.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);
    return date;
  });
};

const toLocalDateTimeParts = (isoString) => {
  const date = new Date(isoString);
  const datePart = formatDateKey(date);
  const timePart = `${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}`;
  return { datePart, timePart };
};

const isEventOnDate = (event, date) => {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  const eventStart = new Date(event.start_datetime);
  const eventEnd = new Date(event.end_datetime);
  return eventStart <= dayEnd && eventEnd >= dayStart;
};

const formatDisplayDate = (value) => {
  if (!value) return "No due date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

function Scheduling() {
  const [events, setEvents] = useState([]);
  const [todoItems, setTodoItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [todoError, setTodoError] = useState("");
  const [success, setSuccess] = useState("");
  const [todoSuccess, setTodoSuccess] = useState("");
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [form, setForm] = useState(initialForm);
  const [todoForm, setTodoForm] = useState(initialTodoForm);
  const [editingEventId, setEditingEventId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTodoSubmitting, setIsTodoSubmitting] = useState(false);

  const fetchEvents = useCallback(async (monthDate) => {
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);
    const data = await getScheduleEvents(monthStart.toISOString(), monthEnd.toISOString());
    setEvents(data);
  }, []);

  const fetchTodoList = useCallback(async () => {
    const todos = await getTodoItems();
    setTodoItems(todos);
  }, []);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [eventData, usersData, todoData] = await Promise.all([
        getScheduleEvents(
          new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1, 0, 0, 0, 0).toISOString(),
          new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()
        ),
        getUsers(),
        getTodoItems(),
      ]);
      setEvents(eventData);
      setUsers(usersData.filter((user) => ["admin", "pastor", "staff", "fellowship_leader", "cell_leader"].includes(user.role)));
      setTodoItems(todoData);
    } catch (err) {
      setError(err.message || "Failed to load scheduling data.");
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const monthGrid = useMemo(() => getMonthGrid(currentMonth), [currentMonth]);
  const selectedDayEvents = useMemo(
    () =>
      events
        .filter((event) => isEventOnDate(event, selectedDate))
        .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()),
    [events, selectedDate]
  );

  const dailyEventCount = useMemo(() => {
    const counts = {};
    monthGrid.forEach((date) => {
      counts[formatDateKey(date)] = events.filter((event) => isEventOnDate(event, date)).length;
    });
    return counts;
  }, [events, monthGrid]);

  const sortedTodoItems = useMemo(
    () =>
      [...todoItems].sort((a, b) => {
        if (a.is_completed !== b.is_completed) {
          return a.is_completed ? 1 : -1;
        }
        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }),
    [todoItems]
  );
  const completedTodoCount = useMemo(() => todoItems.filter((item) => item.is_completed).length, [todoItems]);

  const resetForm = () => {
    setEditingEventId(null);
    setForm({
      ...initialForm,
      startDate: formatDateKey(selectedDate),
      endDate: formatDateKey(selectedDate),
    });
  };

  useEffect(() => {
    resetForm();
  }, [selectedDate]);

  const handleMonthChange = async (offset) => {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
    setCurrentMonth(nextMonth);
    setSelectedDate(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1));
    try {
      await fetchEvents(nextMonth);
    } catch (err) {
      setError(err.message || "Failed to load month events.");
    }
  };

  const handleParticipantChange = (participantId) => {
    setForm((prev) => {
      const exists = prev.participants.includes(participantId);
      return {
        ...prev,
        participants: exists ? prev.participants.filter((id) => id !== participantId) : [...prev.participants, participantId],
      };
    });
  };

  const toPayload = () => {
    if (!form.title.trim()) {
      throw new Error("Event title is required.");
    }
    if (!form.startDate || !form.endDate) {
      throw new Error("Start and end dates are required.");
    }
    if (!form.allDay && (!form.startTime || !form.endTime)) {
      throw new Error("Start and end times are required.");
    }

    const startDateTime = form.allDay ? `${form.startDate}T00:00` : `${form.startDate}T${form.startTime}`;
    const endDateTime = form.allDay ? `${form.endDate}T23:59` : `${form.endDate}T${form.endTime}`;
    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new Error("Enter valid start and end date/time values.");
    }
    if (endDate <= startDate) {
      throw new Error("End date/time must be after start date/time.");
    }

    return {
      title: form.title.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      start_datetime: startDate.toISOString(),
      end_datetime: endDate.toISOString(),
      all_day: form.allDay,
      event_type: form.eventType,
      participants: form.participants,
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setActionError("");
    setSuccess("");
    setIsSubmitting(true);
    try {
      const payload = toPayload();
      if (editingEventId) {
        await updateScheduleEvent(editingEventId, payload);
        setSuccess("Event updated successfully.");
      } else {
        await createScheduleEvent(payload);
        setSuccess("Event created successfully.");
      }
      await fetchEvents(currentMonth);
      resetForm();
    } catch (err) {
      setActionError(err.message || "Failed to save event.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditEvent = (eventItem) => {
    const start = toLocalDateTimeParts(eventItem.start_datetime);
    const end = toLocalDateTimeParts(eventItem.end_datetime);
    setEditingEventId(eventItem.id);
    setForm({
      title: eventItem.title,
      description: eventItem.description || "",
      location: eventItem.location || "",
      startDate: start.datePart,
      startTime: start.timePart,
      endDate: end.datePart,
      endTime: end.timePart,
      allDay: Boolean(eventItem.all_day),
      eventType: eventItem.event_type || "meeting",
      participants: eventItem.participants || [],
    });
  };

  const handleDeleteEvent = async (eventItem) => {
    const confirmed = window.confirm(`Delete "${eventItem.title}"?`);
    if (!confirmed) return;
    setActionError("");
    setSuccess("");
    try {
      await deleteScheduleEvent(eventItem.id);
      setSuccess("Event deleted successfully.");
      if (editingEventId === eventItem.id) {
        resetForm();
      }
      await fetchEvents(currentMonth);
    } catch (err) {
      setActionError(err.message || "Failed to delete event.");
    }
  };

  const handleCreateTodo = async (event) => {
    event.preventDefault();
    setTodoError("");
    setTodoSuccess("");
    if (!todoForm.title.trim()) {
      setTodoError("Task title is required.");
      return;
    }

    setIsTodoSubmitting(true);
    try {
      await createTodoItem({
        title: todoForm.title.trim(),
        description: todoForm.description.trim(),
        due_date: todoForm.dueDate || null,
        priority: todoForm.priority,
      });
      setTodoSuccess("Task added to todo list.");
      setTodoForm(initialTodoForm);
      await fetchTodoList();
    } catch (err) {
      setTodoError(err.message || "Failed to create todo item.");
    } finally {
      setIsTodoSubmitting(false);
    }
  };

  const handleToggleTodo = async (todoItem) => {
    setTodoError("");
    setTodoSuccess("");
    try {
      await updateTodoItem(todoItem.id, { is_completed: !todoItem.is_completed });
      setTodoSuccess(todoItem.is_completed ? "Task marked as active." : "Task marked as completed.");
      await fetchTodoList();
    } catch (err) {
      setTodoError(err.message || "Failed to update todo item.");
    }
  };

  const handleDeleteTodo = async (todoItem) => {
    const confirmed = window.confirm(`Delete task "${todoItem.title}"?`);
    if (!confirmed) return;
    setTodoError("");
    setTodoSuccess("");
    try {
      await deleteTodoItem(todoItem.id);
      setTodoSuccess("Task deleted.");
      await fetchTodoList();
    } catch (err) {
      setTodoError(err.message || "Failed to delete todo item.");
    }
  };

  if (loading) {
    return <LoadingState label="Loading scheduling workspace..." />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Scheduling Calendar</h2>
        <p className="mt-1 text-sm text-slate-600">Plan pastor and staff activities, meetings, and services in one calendar.</p>
        <ErrorState error={error} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => handleMonthChange(-1)}
            >
              Previous
            </button>
            <h3 className="text-lg font-semibold text-slate-900">
              {currentMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </h3>
            <button
              type="button"
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => handleMonthChange(1)}
            >
              Next
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase text-slate-500">
            {weekdayLabels.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-2">
            {monthGrid.map((date) => {
              const dateKey = formatDateKey(date);
              const isSelected = dateKey === formatDateKey(selectedDate);
              const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  className={`min-h-20 rounded-lg border p-2 text-left transition ${
                    isSelected
                      ? "border-brand-500 bg-brand-50"
                      : "border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50"
                  } ${isCurrentMonth ? "text-slate-800" : "text-slate-400"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{date.getDate()}</span>
                    {dailyEventCount[dateKey] > 0 && (
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                        {dailyEventCount[dateKey]}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{selectedDate.toLocaleDateString()}</h3>
            <p className="text-sm text-slate-600">Events for selected day</p>
          </div>
          <div className="space-y-2">
            {selectedDayEvents.length === 0 && (
              <p className="rounded-md border border-dashed border-slate-200 p-3 text-sm text-slate-500">No events for this date.</p>
            )}
            {selectedDayEvents.map((eventItem) => (
              <div key={eventItem.id} className="rounded-lg border border-slate-200 p-3">
                <p className="font-semibold text-slate-900">{eventItem.title}</p>
                <p className="text-xs text-slate-500">
                  {eventItem.all_day
                    ? "All day"
                    : `${new Date(eventItem.start_datetime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })} - ${new Date(eventItem.end_datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                </p>
                {eventItem.location && <p className="mt-1 text-xs text-slate-600">📍 {eventItem.location}</p>}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                    onClick={() => handleEditEvent(eventItem)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-200"
                    onClick={() => handleDeleteEvent(eventItem)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Pastor & Staff Todo List</h3>
            <p className="text-sm text-slate-600">Track action items alongside your ministry schedule.</p>
          </div>
          <p className="rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {completedTodoCount}/{todoItems.length} completed
          </p>
        </div>
        <ErrorState error={todoError} />
        {todoSuccess && <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{todoSuccess}</p>}
        <div className="grid gap-4 lg:grid-cols-3">
          <form className="space-y-3 rounded-xl border border-slate-200 p-4 lg:col-span-1" onSubmit={handleCreateTodo}>
            <input
              type="text"
              value={todoForm.title}
              onChange={(event) => setTodoForm((prev) => ({ ...prev, title: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none ring-brand-500 focus:ring-2"
              placeholder="Task title"
              required
            />
            <textarea
              value={todoForm.description}
              onChange={(event) => setTodoForm((prev) => ({ ...prev, description: event.target.value }))}
              className="min-h-20 w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none ring-brand-500 focus:ring-2"
              placeholder="Description (optional)"
            />
            <input
              type="date"
              value={todoForm.dueDate}
              onChange={(event) => setTodoForm((prev) => ({ ...prev, dueDate: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none ring-brand-500 focus:ring-2"
            />
            <select
              value={todoForm.priority}
              onChange={(event) => setTodoForm((prev) => ({ ...prev, priority: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 outline-none ring-brand-500 focus:ring-2"
            >
              {todoPriorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isTodoSubmitting}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
            >
              {isTodoSubmitting ? "Adding..." : "Add Task"}
            </button>
          </form>

          <div className="space-y-2 lg:col-span-2">
            {sortedTodoItems.length === 0 && (
              <p className="rounded-md border border-dashed border-slate-200 p-3 text-sm text-slate-500">No todo items yet.</p>
            )}
            {sortedTodoItems.map((todoItem) => (
              <div key={todoItem.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 p-4">
                <div>
                  <p className={`font-semibold ${todoItem.is_completed ? "text-slate-500 line-through" : "text-slate-900"}`}>
                    {todoItem.title}
                  </p>
                  {todoItem.description && (
                    <p className={`mt-1 text-sm ${todoItem.is_completed ? "text-slate-400" : "text-slate-600"}`}>{todoItem.description}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    Due: {formatDisplayDate(todoItem.due_date)} • Priority: {todoItem.priority}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                    onClick={() => handleToggleTodo(todoItem)}
                  >
                    {todoItem.is_completed ? "Mark Active" : "Complete"}
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-200"
                    onClick={() => handleDeleteTodo(todoItem)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">{editingEventId ? "Edit Event" : "Create Event"}</h3>
        <p className="mb-4 text-sm text-slate-600">Add activities and assign participants to keep church planning aligned.</p>
        <ErrorState error={actionError} />
        {success && <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}

        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
          <input
            type="text"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            className="rounded-lg border border-slate-300 px-4 py-2.5 outline-none ring-brand-500 focus:ring-2 md:col-span-2"
            placeholder="Event title"
            required
          />
          <textarea
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            className="min-h-20 rounded-lg border border-slate-300 px-4 py-2.5 outline-none ring-brand-500 focus:ring-2 md:col-span-2"
            placeholder="Description (optional)"
          />
          <input
            type="text"
            value={form.location}
            onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
            className="rounded-lg border border-slate-300 px-4 py-2.5 outline-none ring-brand-500 focus:ring-2 md:col-span-2"
            placeholder="Location"
          />
          <select
            value={form.eventType}
            onChange={(event) => setForm((prev) => ({ ...prev, eventType: event.target.value }))}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 outline-none ring-brand-500 focus:ring-2"
          >
            {eventTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.allDay}
              onChange={(event) => setForm((prev) => ({ ...prev, allDay: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            All day event
          </label>
          <input
            type="date"
            value={form.startDate}
            onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
            className="rounded-lg border border-slate-300 px-4 py-2.5 outline-none ring-brand-500 focus:ring-2"
            required
          />
          {!form.allDay && (
            <input
              type="time"
              value={form.startTime}
              onChange={(event) => setForm((prev) => ({ ...prev, startTime: event.target.value }))}
              className="rounded-lg border border-slate-300 px-4 py-2.5 outline-none ring-brand-500 focus:ring-2"
              required
            />
          )}
          <input
            type="date"
            value={form.endDate}
            onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
            className="rounded-lg border border-slate-300 px-4 py-2.5 outline-none ring-brand-500 focus:ring-2"
            required
          />
          {!form.allDay && (
            <input
              type="time"
              value={form.endTime}
              onChange={(event) => setForm((prev) => ({ ...prev, endTime: event.target.value }))}
              className="rounded-lg border border-slate-300 px-4 py-2.5 outline-none ring-brand-500 focus:ring-2"
              required
            />
          )}
          <div className="rounded-lg border border-slate-300 p-3 md:col-span-2">
            <p className="mb-2 text-sm font-medium text-slate-700">Assign participants</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {users.map((user) => (
                <label key={user.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.participants.includes(user.id)}
                    onChange={() => handleParticipantChange(user.id)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>
                    {`${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username} ({user.role})
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
            >
              {isSubmitting ? "Saving..." : editingEventId ? "Update Event" : "Create Event"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default Scheduling;
