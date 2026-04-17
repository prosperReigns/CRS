import { useContext, useEffect, useMemo, useState } from "react";
import { createReport } from "../../api/reports";
import { getMembers } from "../../api/members";
import { AuthContext } from "../../context/AuthContext";

function SubmitReport() {
  const { user } = useContext(AuthContext);
  const [form, setForm] = useState({
    cell: "",
    meeting_date: "",
    new_members: "",
    offering_amount: "",
    summary: "",
  });
  const [members, setMembers] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [images, setImages] = useState([]);
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

  const cellOptions = useMemo(() => {
    const uniqueCells = new Map();
    members.forEach((member) => {
      if (member.cell && member.cell_name && !uniqueCells.has(member.cell)) {
        uniqueCells.set(member.cell, { id: member.cell, name: member.cell_name });
      }
    });
    return Array.from(uniqueCells.values());
  }, [members]);

  const visibleMembers = useMemo(() => {
    const query = attendeeSearch.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) => {
      const fullNameLower = `${member.user?.first_name || ""} ${member.user?.last_name || ""}`
        .trim()
        .toLowerCase();
      return (
        member.user?.username?.toLowerCase().includes(query) ||
        fullNameLower.includes(query) ||
        member.cell_name?.toLowerCase().includes(query)
      );
    });
  }, [members, attendeeSearch]);

  const toggleAttendee = (id) => {
    setAttendees((prev) => (prev.includes(id) ? prev.filter((memberId) => memberId !== id) : [...prev, id]));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (attendees.length < 1) {
      setError("Select at least one attendee.");
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
    formData.append("new_members", form.new_members || "0");
    formData.append("offering_amount", form.offering_amount);
    formData.append("summary", form.summary);
    attendees.forEach((attendeeId) => {
      formData.append("attendees", String(attendeeId));
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
        new_members: "",
        offering_amount: "",
        summary: "",
      });
      setAttendees([]);
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

      {images.length > 0 && (
        <ul aria-label="Uploaded images" className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          {images.map((img, i) => (
            <li key={i} className="truncate">{img.name}</li>
          ))}
        </ul>
      )}

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
        onChange={(e) => setForm({ ...form, meeting_date: e.target.value })}
        required
      />

      <input
        placeholder="Search members..."
        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none ring-brand-500 focus:ring-2"
        value={attendeeSearch}
        onChange={(e) => setAttendeeSearch(e.target.value)}
      />

      <p className="text-sm text-slate-600">
        Selected attendees: <strong>{attendees.length}</strong>
      </p>
      <div className="max-h-56 space-y-1 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
        {visibleMembers.map((member) => (
          <label key={member.id} className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-white">
            <input
              type="checkbox"
              checked={attendees.includes(member.id)}
              onChange={() => toggleAttendee(member.id)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />{" "}
            {member.user?.username} {member.cell_name ? `(${member.cell_name})` : ""}
          </label>
        ))}
      </div>

      {selectedMembers.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-sm font-medium text-slate-700">Selected members preview:</p>
          <ul className="grid gap-1 text-sm text-slate-600">
            {selectedMembers.map((member) => (
              <li key={member.id}>{member.user?.username}</li>
            ))}
          </ul>
        </div>
      )}

      <input
        placeholder="New Members"
        type="number"
        min="0"
        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none ring-brand-500 focus:ring-2"
        value={form.new_members}
        onChange={(e) => setForm({ ...form, new_members: e.target.value })}
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

      <input
        type="file"
        multiple
        className="w-full rounded-lg border border-slate-300 bg-slate-50 p-2 text-sm"
        onChange={(e) => setImages([...e.target.files])}
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
