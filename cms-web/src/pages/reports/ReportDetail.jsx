import { useState } from "react";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import {
  approveReport,
  rejectReport,
  reviewReport,
  addComment,
} from "../../api/reports";

const { user } = useContext(AuthContext);

function ReportDetail({ report, refresh }) {
  const [comment, setComment] = useState("");

  const handleApprove = async () => {
    await approveReport(report.id);
    refresh();
  };

  const handleReject = async () => {
    await rejectReport(report.id);
    refresh();
  };

  const handleReview = async () => {
    await reviewReport(report.id);
    refresh();
  };

  const handleComment = async () => {
    if (!comment) return;

    await addComment(report.id, { comment });
    setComment("");
    refresh();
  };

  return (
    <div>
      <h2>Report Details</h2>

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
      {user.role === "fellowship_leader" && (
        <button onClick={handleReview}>Review</button>
      )}

      {user.role === "pastor" && (
        <>
          <button onClick={handleApprove}>Approve</button>
          <button onClick={handleReject}>Reject</button>
        </>
      )}

      {/* 💬 Comments */}
      <h3>Comments</h3>
      {report.comments?.map((c) => (
        <div key={c.id} style={{ borderBottom: "1px solid #ccc" }}>
          <p><strong>{c.author}</strong></p>
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