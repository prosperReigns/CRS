import { useState } from "react";
import { createReport } from "../../api/reports";

function SubmitReport() {
  const [form, setForm] = useState({
    cell: "",
    meeting_date: "",
    attendance_count: "",
    new_members: "",
    offering_amount: "",
    summary: "",
  });

  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (images.length < 1) {
      setError("At least one image is required.");
      return;
    }

    setSubmitting(true);
    const formData = new FormData();

    Object.keys(form).forEach((key) => {
      formData.append(key, form[key]);
    });

    images.forEach((img) => {
      formData.append("images[]", img);
    });

    try {
      await createReport(formData);
      setSuccess("Report submitted successfully.");
      setForm({
        cell: "",
        meeting_date: "",
        attendance_count: "",
        new_members: "",
        offering_amount: "",
        summary: "",
      });
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
      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>{success}</p>}

      {/* image files */}
      {images.map((img, i) => (
        <p key={i}>{img.name}</p>
      ))}

      <input
        placeholder="Cell ID"
        value={form.cell}
        onChange={(e) => setForm({ ...form, cell: e.target.value })}
      />

      <input
        type="date"
        value={form.meeting_date}
        onChange={(e) => setForm({ ...form, meeting_date: e.target.value })}
      />

      <input
        placeholder="Attendance"
        type="number"
        value={form.attendance_count}
        onChange={(e) => setForm({ ...form, attendance_count: e.target.value })}
      />

      <input
        placeholder="New Members"
        type="number"
        value={form.new_members}
        onChange={(e) => setForm({ ...form, new_members: e.target.value })}
      />

      <input
        placeholder="Offering"
        type="number"
        value={form.offering_amount}
        onChange={(e) => setForm({ ...form, offering_amount: e.target.value })}
      />

        <textarea
          placeholder="Summary"
          value={form.summary}
          onChange={(e) => setForm({ ...form, summary: e.target.value })}
        />

      <input
        type="file"
        multiple
        onChange={(e) => setImages([...e.target.files])}
      />

      <button type="submit" disabled={submitting}>
        {submitting ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}

export default SubmitReport;
