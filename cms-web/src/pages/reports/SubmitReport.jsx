import { useContext, useEffect, useMemo, useState } from "react";
import { createReport } from "../../api/reports";
import { createPerson, getMembers, getPeople } from "../../api/members";
import { AuthContext } from "../../context/AuthContext";
import { inferReportTypeFromDate, REPORT_TYPE_OPTIONS } from "./reportType";

const statusLabel = {
  visitor: "Visitor",
  first_timer: "First Timer",
  regular: "Regular",
  member: "Member",
};

function SubmitReport() {
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
  const [people, setPeople] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [firstTimerAttendees, setFirstTimerAttendees] = useState([]);
  const [membershipFilter, setMembershipFilter] = useState("all");
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [newPersonName, setNewPersonName] = useState("");
  const [images, setImages] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [addingPerson, setAddingPerson] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    Promise.all([getMembers(), getPeople()])
      .then(([memberData, peopleData]) => {
        setMembers(memberData);
        setPeople(peopleData);
        const defaultCellId = memberData.find((member) => member.cell)?.cell;
        if (defaultCellId) {
          setForm((prev) => (prev.cell ? prev : { ...prev, cell: String(defaultCellId) }));
        }
      })
      .catch((err) => setError(err.message || "Failed to load people."));
  }, []);

  useEffect(() => {
    const urls = images.map((img) => URL.createObjectURL(img));
    setImagePreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [images]);

  const cellOptions = useMemo(() => {
    const uniqueCells = new Map();
    members.forEach((member) => {
      if (member.cell && member.cell_name && !uniqueCells.has(member.cell)) {
        uniqueCells.set(member.cell, { id: member.cell, name: member.cell_name });
      }
    });
    return Array.from(uniqueCells.values());
  }, [members]);

  const filteredPeople = useMemo(() => {
    const selectedCellId = form.cell ? Number(form.cell) : null;
    const selectedCellMemberIds = new Set(
      members
        .filter((member) => selectedCellId && member.cell === selectedCellId && member.person?.id)
        .map((member) => member.person.id)
    );
    const allMemberPersonIds = new Set(members.filter((member) => member.person?.id).map((member) => member.person.id));
    const query = attendeeSearch.trim().toLowerCase();
    return people.filter((person) => {
      if (selectedCellId && allMemberPersonIds.has(person.id) && !selectedCellMemberIds.has(person.id)) return false;
      if (membershipFilter !== "all" && person.membership_status !== membershipFilter) return false;
      if (!query) return true;
      const fullName = `${person.first_name || ""} ${person.last_name || ""}`.trim().toLowerCase();
      return (
        fullName.includes(query) ||
        (person.phone || "").toLowerCase().includes(query) ||
        (person.email || "").toLowerCase().includes(query)
      );
    });
  }, [people, attendeeSearch, membershipFilter, form.cell, members]);

  const toggleAttendee = (id) => {
    setAttendees((prev) => {
      if (prev.includes(id)) {
        setFirstTimerAttendees((timerPrev) => timerPrev.filter((personId) => personId !== id));
        return prev.filter((personId) => personId !== id);
      }
      return [...prev, id];
    });
  };

  const toggleFirstTimerAttendee = (id) => {
    if (!attendees.includes(id)) return;
    setFirstTimerAttendees((prev) => (prev.includes(id) ? prev.filter((personId) => personId !== id) : [...prev, id]));
  };

  const addVisitor = async () => {
    const raw = newPersonName.trim();
    if (!raw) return;
    const [firstName, ...others] = raw.split(/\s+/);
    const lastName = others.join(" ");
    setAddingPerson(true);
    setError("");
    try {
      const created = await createPerson({ first_name: firstName, last_name: lastName, phone: "", email: "" });
      setPeople((prev) => [created, ...prev]);
      setAttendees((prev) => [...prev, created.id]);
      setNewPersonName("");
    } catch (err) {
      setError(err.message || "Failed to add visitor.");
    } finally {
      setAddingPerson(false);
    }
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
    formData.append("meeting_time", form.meeting_time);
    if (form.meeting_duration_minutes) formData.append("meeting_duration_minutes", form.meeting_duration_minutes);
    formData.append("report_type", form.report_type);
    formData.append("new_members", String(firstTimerAttendees.length));
    formData.append("offering_amount", form.offering_amount);
    formData.append("summary", form.summary);
    attendees.forEach((attendeeId) => formData.append("attendees", String(attendeeId)));
    firstTimerAttendees.forEach((attendeeId) => formData.append("first_timer_attendees", String(attendeeId)));
    images.forEach((img) => formData.append("images[]", img));

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
      setImages([]);
      const refreshedPeople = await getPeople();
      setPeople(refreshedPeople);
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
          <img src={imagePreviewUrls[0]} alt="Meeting preview" className="h-64 w-full rounded-2xl border border-slate-200 object-cover" />
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
        onChange={(e) => setForm({ ...form, meeting_date: e.target.value, report_type: inferReportTypeFromDate(e.target.value) })}
        required
      />
      <div className="grid gap-3 md:grid-cols-2">
        <input
          type="time"
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none ring-brand-500 focus:ring-2"
          value={form.meeting_time}
          onChange={(e) => setForm({ ...form, meeting_time: e.target.value })}
          required
        />
        <input
          type="number"
          min="1"
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none ring-brand-500 focus:ring-2"
          value={form.meeting_duration_minutes}
          onChange={(e) => setForm({ ...form, meeting_duration_minutes: e.target.value })}
          required
        />
      </div>

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

      <div className="grid gap-2 md:grid-cols-2">
        <input
          placeholder="Search people..."
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none ring-brand-500 focus:ring-2"
          value={attendeeSearch}
          onChange={(e) => setAttendeeSearch(e.target.value)}
        />
        <select
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 outline-none ring-brand-500 focus:ring-2"
          value={membershipFilter}
          onChange={(e) => setMembershipFilter(e.target.value)}
        >
          <option value="all">All People</option>
          <option value="member">Members</option>
          <option value="visitor">Visitors</option>
          <option value="first_timer">First Timers</option>
          <option value="regular">Regular Attenders</option>
        </select>
      </div>

      <div className="flex gap-2">
        <input
          placeholder="Add new visitor name"
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none ring-brand-500 focus:ring-2"
          value={newPersonName}
          onChange={(e) => setNewPersonName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addVisitor();
            }
          }}
        />
        <button
          type="button"
          onClick={addVisitor}
          disabled={addingPerson}
          className="rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-70"
        >
          {addingPerson ? "Adding..." : "Add Visitor"}
        </button>
      </div>

      <p className="text-sm text-slate-600">Selected attendees: <strong>{attendees.length}</strong></p>
      <div className="max-h-56 space-y-1 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
        {filteredPeople.map((person) => (
          <div key={person.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-1 hover:bg-white">
            <label className="flex min-w-0 items-center gap-2">
              <input
                type="checkbox"
                checked={attendees.includes(person.id)}
                onChange={() => toggleAttendee(person.id)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="truncate">
                {`${person.first_name} ${person.last_name}`.trim()} - {statusLabel[person.membership_status] || "Visitor"}
                {person.cell_name ? ` (${person.cell_name})` : ""}
              </span>
            </label>
            <label className="flex items-center gap-1 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={firstTimerAttendees.includes(person.id)}
                disabled={!attendees.includes(person.id)}
                onChange={() => toggleFirstTimerAttendee(person.id)}
                className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              First timer
            </label>
          </div>
        ))}
      </div>

      <input
        value={`First timers: ${firstTimerAttendees.length}`}
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
      >
        {submitting ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}

export default SubmitReport;
