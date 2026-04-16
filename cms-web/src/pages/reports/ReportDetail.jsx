import { useState } from "react";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import {
  approveReport,
  rejectReport,
  reviewReport,
  addComment,
} from "../../api/reports";

function ReportDetail({ report, refresh }) {
  const { user } = useContext(AuthContext);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const handleApprove = async () => {
    if (!window.confirm("Approve this report?")) return;
    try {
      setError("");
      await approveReport(report.id);
      refresh();
    } catch (err) {
      setError(err.message || "Failed to approve report.");
    }
  };

  const handleReject = async () => {
    if (!window.confirm("Reject this report?")) return;
    try {
      setError("");
      await rejectReport(report.id);
      refresh();
    } catch (err) {
      setError(err.message || "Failed to reject report.");
    }
  };

  const handleReview = async () => {
    try {
      setError("");
      await reviewReport(report.id);
      refresh();
    } catch (err) {
      setError(err.message || "Failed to review report.");
    }
  };

  const handleComment = async () => {
    if (!comment) return;
    try {
      setError("");
      await addComment(report.id, { comment });
      setComment("");
      refresh();
    } catch (err) {
      setError(err.message || "Failed to add comment.");
    }
  };

  return (
    <div>
      <h2>Report Details</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <p><strong>Date:</strong> {report.meeting_date}</p>
      <p><strong>Attendance:</strong> {report.attendance_count}</p>
      <p><strong>Offering:</strong> {report.offering_amount}</p>
      <p><strong>Summary:</strong> {report.summary}</p>

      {/* 📸 Images */}
      <h3>Images</h3>
      {report.images?.map((img) => (
        <img key={img.id} src={img.image} width="150" />
      ))}

      {/* 🔄 Actions */}
      <h3>Actions</h3>
      {user?.role === "fellowship_leader" && report.status === "pending" && (
        <button onClick={handleReview}>Review</button>
      )}

      {user?.role === "pastor" && report.status === "reviewed" && (
        <>
          <button onClick={handleApprove}>Approve</button>
          <button onClick={handleReject}>Reject</button>
        </>
      )}

      {/* 💬 Comments */}
      <h3>Comments</h3>
      {report.comments?.map((c) => (
        <div key={c.id} style={{ borderBottom: "1px solid #ccc" }}>
          <p><strong>{c.author?.username}</strong></p>
          <p>{c.comment}</p>
        </div>
      ))}

      <textarea
        placeholder="Add comment..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      <button onClick={handleComment}>Send</button>
    </div>
  );
}

export default ReportDetail;
