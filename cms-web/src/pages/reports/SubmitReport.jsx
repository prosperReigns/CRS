import { useContext, useEffect, useMemo, useState } from "react";
import { createReport } from "../../api/reports";
import { getMembers } from "../../api/members";
import { AuthContext } from "../../context/AuthContext";

const ATTENDEE_LIST_MAX_HEIGHT = "220px";

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
    <form onSubmit={handleSubmit}>
      <h2>Submit Weekly Report</h2>
      {user?.is_frozen && (
        <p style={{ color: "#b45309" }}>
          Your account is temporarily restricted. Please submit your pending report.
        </p>
      )}
      <div aria-live="polite">
        {error && <p style={{ color: "red" }}>{error}</p>}
        {success && <p style={{ color: "green" }}>{success}</p>}
      </div>

      {images.length > 0 && (
        <ul aria-label="Uploaded images">
          {images.map((img, i) => (
            <li key={i}>{img.name}</li>
          ))}
        </ul>
      )}

      <input
        placeholder="Cell ID"
        value={form.cell}
        onChange={(e) => setForm({ ...form, cell: e.target.value })}
        required
      />

      <input
        type="date"
        value={form.meeting_date}
        onChange={(e) => setForm({ ...form, meeting_date: e.target.value })}
        required
      />

      <input
        placeholder="Search members..."
        value={attendeeSearch}
        onChange={(e) => setAttendeeSearch(e.target.value)}
      />

      <p>
        Selected attendees: <strong>{attendees.length}</strong>
      </p>
      <div style={{ maxHeight: ATTENDEE_LIST_MAX_HEIGHT, overflow: "auto", border: "1px solid #ddd", padding: "8px" }}>
        {visibleMembers.map((member) => (
          <label key={member.id} style={{ display: "block", marginBottom: "6px" }}>
            <input
              type="checkbox"
              checked={attendees.includes(member.id)}
              onChange={() => toggleAttendee(member.id)}
            />{" "}
            {member.user?.username} {member.cell_name ? `(${member.cell_name})` : ""}
          </label>
        ))}
      </div>

      {selectedMembers.length > 0 && (
        <div>
          <p>Selected members preview:</p>
          <ul>
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
        value={form.new_members}
        onChange={(e) => setForm({ ...form, new_members: e.target.value })}
      />

      <input
        placeholder="Offering"
        type="number"
        min="0"
        step="0.01"
        value={form.offering_amount}
        onChange={(e) => setForm({ ...form, offering_amount: e.target.value })}
        required
      />

      <textarea
        placeholder="Summary"
        value={form.summary}
        onChange={(e) => setForm({ ...form, summary: e.target.value })}
        required
      />

      <input type="file" multiple onChange={(e) => setImages([...e.target.files])} />

      <button type="submit" disabled={submitting} aria-busy={submitting}>
        {submitting ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}

export default SubmitReport;
