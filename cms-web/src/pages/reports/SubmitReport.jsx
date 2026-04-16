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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (images.length < 1) {
      alert("At least one image is required");
      return;
    }

    const formData = new FormData();

    Object.keys(form).forEach((key) => {
      formData.append(key, form[key]);
    });

    images.forEach((img) => {
      formData.append("images", img);
    });

    
    try {
      await createReport(formData);
      alert("Report submitted successfully");
    } catch (err) {
      console.error(err);
      alert("Error submitting report");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Submit Weekly Report</h2>

        {/* image preview */}
        {images.map((img, i) => (
        <img key={i} src={URL.createObjectURL(img)} width="100" />
        ))}

      <input
        placeholder="Cell ID"
        onChange={(e) => setForm({ ...form, cell: e.target.value })}
      />

      <input
        type="date"
        onChange={(e) => setForm({ ...form, meeting_date: e.target.value })}
      />

      <input
        placeholder="Attendance"
        type="number"
        onChange={(e) => setForm({ ...form, attendance_count: e.target.value })}
      />

      <input
        placeholder="New Members"
        type="number"
        onChange={(e) => setForm({ ...form, new_members: e.target.value })}
      />

      <input
        placeholder="Offering"
        type="number"
        onChange={(e) => setForm({ ...form, offering_amount: e.target.value })}
      />

      <textarea
        placeholder="Summary"
        onChange={(e) => setForm({ ...form, summary: e.target.value })}
      />

      <input
        type="file"
        multiple
        onChange={(e) => setImages([...e.target.files])}
      />

      <button type="submit">Submit</button>
    </form>
  );
}

export default SubmitReport;