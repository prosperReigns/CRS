import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { createReport } from "../../api/reports";
import { getMembers } from "../../api/members";
import { AuthContext } from "../../context/AuthContext";
import { inferReportTypeFromDate, REPORT_TYPE_OPTIONS } from "./reportType";

function SubmitReport() {
  const isMemberAttendeeId = (id) => typeof id === "number";
  const isCustomAttendeeId = (id) => typeof id === "string";

  const { user } = useContext(AuthContext);
  const [form, setForm] = useState({
    cell: "",
    meeting_date: "",
    meeting_time: "",
    meeting_duration_minutes: "",
    report_type: "",
    offering_amount: "",
    summary: "",
  });
  const [members, setMembers] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [firstTimerAttendees, setFirstTimerAttendees] = useState([]);
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [customAttendeeInput, setCustomAttendeeInput] = useState("");
  const [customAttendees, setCustomAttendees] = useState([]);
  const [customFirstTimers, setCustomFirstTimers] = useState([]);
  const [images, setImages] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const customAttendeeCounter = useRef(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    getMembers()
      .then((data) => {
        setMembers(data);
        const defaultCellId = data.find((member) => member.cell)?.cell;
        if (defaultCellId) {
          setForm((prev) => (prev.cell ? prev : { ...prev, cell: String(defaultCellId) }));
        }
      })
      .catch((err) => setError(err.message || "Failed to load members."));
  }, []);

  const selectedMembers = useMemo(
    () => members.filter((member) => attendees.includes(member.id)),
    [members, attendees]
  );
  const selectedCustomAttendees = useMemo(
    () => customAttendees.filter((entry) => attendees.includes(entry.id)),
    [customAttendees, attendees]
  );

  const cellOptions = useMemo(() => {
    const uniqueCells = new Map();
    members.forEach((member) => {
      if (member.cell && member.cell_name && !uniqueCells.has(member.cell)) {
        uniqueCells.set(member.cell, { id: member.cell, name: member.cell_name });
      }
    });
    return Array.from(uniqueCells.values());
  }, [members]);

  const selectedCellId = form.cell ? Number(form.cell) : null;
  const membersForSelectedCell = useMemo(() => {
    if (!selectedCellId) return [];
    return members.filter((member) => member.cell === selectedCellId);
  }, [members, selectedCellId]);

  const visibleMembers = useMemo(() => {
    const query = attendeeSearch.trim().toLowerCase();
    if (!query) return membersForSelectedCell;
    return membersForSelectedCell.filter((member) => {
      const fullNameLower = `${member.user?.first_name || ""} ${member.user?.last_name || ""}`
        .trim()
        .toLowerCase();
      return (
        member.user?.username?.toLowerCase().includes(query) ||
        fullNameLower.includes(query) ||
        member.cell_name?.toLowerCase().includes(query)
      );
    });
  }, [membersForSelectedCell, attendeeSearch]);

  useEffect(() => {
    if (!selectedCellId) return;
    const validMemberIds = new Set(membersForSelectedCell.map((member) => member.id));
    setAttendees((prev) =>
      prev.filter((id) => (isMemberAttendeeId(id) ? validMemberIds.has(id) : isCustomAttendeeId(id)))
    );
    setFirstTimerAttendees((prev) => prev.filter((id) => validMemberIds.has(id)));
  }, [membersForSelectedCell, selectedCellId]);

  const toggleAttendee = (id) => {
    setAttendees((prev) => {
      if (prev.includes(id)) {
        setFirstTimerAttendees((timerPrev) => timerPrev.filter((memberId) => memberId !== id));
        setCustomFirstTimers((timerPrev) => timerPrev.filter((memberId) => memberId !== id));
        return prev.filter((memberId) => memberId !== id);
      }
      return [...prev, id];
    });
  };

  useEffect(() => {
    const urls = images.map((img) => URL.createObjectURL(img));
    setImagePreviewUrls(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  const toggleFirstTimerAttendee = (id) => {
    if (!attendees.includes(id)) return;
    setFirstTimerAttendees((prev) => (prev.includes(id) ? prev.filter((memberId) => memberId !== id) : [...prev, id]));
  };

  const addCustomAttendee = () => {
    const normalized = customAttendeeInput.trim();
    if (!normalized) return;
    customAttendeeCounter.current += 1;
    const id = `custom-${customAttendeeCounter.current}`;
    setCustomAttendees((prev) => [...prev, { id, name: normalized }]);
    setAttendees((prev) => [...prev, id]);
    setCustomAttendeeInput("");
  };

  const toggleCustomFirstTimer = (id) => {
    if (!attendees.includes(id)) return;
    setCustomFirstTimers((prev) => (prev.includes(id) ? prev.filter((memberId) => memberId !== id) : [...prev, id]));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const selectedMemberIds = attendees.filter(isMemberAttendeeId);
    const selectedCustomNames = customAttendees.filter((entry) => attendees.includes(entry.id)).map((entry) => entry.name);

    if (selectedMemberIds.length < 1) {
      setError("Select at least one member from the selected cell.");
      return;
    }
    if (images.length < 1) {
      setError("At least one image is required.");
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append("cell", form.cell);
    formData.append("meeting_date", form.meeting_date);
    formData.append("meeting_time", form.meeting_time);
    if (form.meeting_duration_minutes) {
      formData.append("meeting_duration_minutes", form.meeting_duration_minutes);
    }
    const computedNewMembers = firstTimerAttendees.length + customFirstTimers.length;
    formData.append("report_type", form.report_type);
    formData.append("new_members", String(computedNewMembers));
    formData.append("offering_amount", form.offering_amount);
    formData.append("summary", form.summary);
    formData.append("attendee_names", selectedCustomNames.join(", "));
    selectedMemberIds.forEach((attendeeId) => {
      formData.append("attendees", String(attendeeId));
    });
    firstTimerAttendees.forEach((attendeeId) => {
      formData.append("first_timer_attendees", String(attendeeId));
    });
    images.forEach((img) => {
      formData.append("images[]", img);
    });

    try {
      await createReport(formData);
      setSuccess("Report submitted successfully.");
        setForm({
          cell: form.cell,
          meeting_date: "",
          meeting_time: "",
          meeting_duration_minutes: "",
          report_type: "",
          offering_amount: "",
          summary: "",
      });
      setAttendees([]);
      setFirstTimerAttendees([]);
      setCustomAttendees([]);
      setCustomFirstTimers([]);
      setImages([]);
    } catch (err) {
      setError(err.message || "Error submitting report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-900">Submit Weekly Report</h2>
      {user?.is_frozen && (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          Your account is temporarily restricted. Please submit your pending report.
        </p>
      )}
      <div aria-live="polite">
        {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {success && <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}
      </div>

      <div className="space-y-2">
        {imagePreviewUrls[0] ? (
          <img
            src={imagePreviewUrls[0]}
            alt="Meeting preview"
            className="h-64 w-full rounded-2xl border border-slate-200 object-cover"
          />
        ) : (
          <div className="flex h-52 w-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
            Add a meeting image
          </div>
        )}
        <label className="text-sm font-medium text-slate-700" htmlFor="meeting-images-upload">
          Upload meeting images
        </label>
        <input
          id="meeting-images-upload"
          type="file"
          multiple
          className="w-full rounded-lg border border-slate-300 bg-slate-50 p-2 text-sm"
          onChange={(e) => setImages([...e.target.files])}
          accept="image/*"
        />
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700">Cell</span>
        <select
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 outline-none ring-brand-500 focus:ring-2"
          value={form.cell}
          onChange={(e) => setForm({ ...form, cell: e.target.value })}
          required
          disabled={cellOptions.length <= 1}
        >
          <option value="">Select a cell</option>
          {cellOptions.map((cell) => (
            <option key={cell.id} value={cell.id}>
              {cell.name}
            </option>
          ))}
        </select>
      </label>

      <input
        type="date"
        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none ring-brand-500 focus:ring-2"
        value={form.meeting_date}
        onChange={(e) =>
          setForm({
            ...form,
            meeting_date: e.target.value,
            report_type: inferReportTypeFromDate(e.target.value),
          })
        }
        required
      />
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Meeting Time</span>
          <input
            type="time"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none ring-brand-500 focus:ring-2"
            value={form.meeting_time}
            onChange={(e) => setForm({ ...form, meeting_time: e.target.value })}
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Meeting Duration (minutes)</span>
          <input
            type="number"
            min="1"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none ring-brand-500 focus:ring-2"
            value={form.meeting_duration_minutes}
            onChange={(e) => setForm({ ...form, meeting_duration_minutes: e.target.value })}
            required
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700">Report Type</span>
        <select
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 outline-none ring-brand-500 focus:ring-2"
          value={form.report_type}
          onChange={(e) => setForm({ ...form, report_type: e.target.value })}
          required
        >
          <option value="">Select report type</option>
          {REPORT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <input
        placeholder="Search members..."
        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none ring-brand-500 focus:ring-2"
        value={attendeeSearch}
        onChange={(e) => setAttendeeSearch(e.target.value)}
      />
      <div className="flex gap-2">
        <input
          placeholder="Add attendee by name"
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none ring-brand-500 focus:ring-2"
          value={customAttendeeInput}
          onChange={(e) => setCustomAttendeeInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustomAttendee();
            }
          }}
        />
        <button
          type="button"
          onClick={addCustomAttendee}
          className="rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Add
        </button>
      </div>

      <p className="text-sm text-slate-600">
        Selected attendees: <strong>{attendees.length}</strong>
      </p>
      <div className="max-h-56 space-y-1 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
        {visibleMembers.map((member) => (
          <div key={member.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-1 hover:bg-white">
            <label className="flex min-w-0 items-center gap-2">
              <input
                type="checkbox"
                checked={attendees.includes(member.id)}
                onChange={() => toggleAttendee(member.id)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="truncate">
                {member.user?.username} {member.cell_name ? `(${member.cell_name})` : ""}
              </span>
            </label>
            <label className="flex items-center gap-1 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={firstTimerAttendees.includes(member.id)}
                disabled={!attendees.includes(member.id)}
                onChange={() => toggleFirstTimerAttendee(member.id)}
                className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              First timer
            </label>
          </div>
        ))}
        {customAttendees.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-1 hover:bg-white">
            <label className="flex min-w-0 items-center gap-2">
              <input
                type="checkbox"
                checked={attendees.includes(entry.id)}
                onChange={() => toggleAttendee(entry.id)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="truncate">{entry.name}</span>
            </label>
            <label className="flex items-center gap-1 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={customFirstTimers.includes(entry.id)}
                disabled={!attendees.includes(entry.id)}
                onChange={() => toggleCustomFirstTimer(entry.id)}
                className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              First timer
            </label>
          </div>
        ))}
      </div>

      {(selectedMembers.length > 0 || selectedCustomAttendees.length > 0) && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-sm font-medium text-slate-700">Selected members preview:</p>
          <ul className="grid gap-1 text-sm text-slate-600">
            {selectedMembers.map((member) => (
              <li key={member.id}>{member.user?.username}</li>
            ))}
            {selectedCustomAttendees.map((entry) => (
              <li key={entry.id}>{entry.name}</li>
            ))}
          </ul>
        </div>
      )}

      <input
        value={`First timers: ${firstTimerAttendees.length + customFirstTimers.length}`}
        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-slate-700"
        disabled
      />

      <input
        placeholder="Offering"
        type="number"
        min="0"
        step="0.01"
        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none ring-brand-500 focus:ring-2"
        value={form.offering_amount}
        onChange={(e) => setForm({ ...form, offering_amount: e.target.value })}
        required
      />

      <textarea
        placeholder="Summary"
        className="min-h-28 w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none ring-brand-500 focus:ring-2"
        value={form.summary}
        onChange={(e) => setForm({ ...form, summary: e.target.value })}
        required
      />

      <button
        type="submit"
        className="w-full rounded-lg bg-slate-600 px-4 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
        disabled={submitting}
        aria-busy={submitting}
      >
        {submitting ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}

export default SubmitReport;
