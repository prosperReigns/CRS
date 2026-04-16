import { useContext, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import {
  approveReport,
  rejectReport,
  reviewReport,
  addComment,
} from "../../api/reports";
import ErrorState from "../../components/ui/ErrorState";
import ConfirmModal from "../../components/ui/ConfirmModal";
import Button from "../../components/ui/Button";

function ReportDetail({ report, refresh }) {
  const { user } = useContext(AuthContext);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState("");
  
  const handleApprove = async () => {
    try {
      setError("");
      await approveReport(report.id);
      setConfirmAction("");
      refresh();
    } catch (err) {
      setError(err.message || "Failed to approve report.");
    }
  };

  const handleReject = async () => {
    try {
      setError("");
      await rejectReport(report.id);
      setConfirmAction("");
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
      <ErrorState error={error} />

      <p><strong>Date:</strong> {report.meeting_date}</p>
      <p><strong>Attendance:</strong> {report.attendance_count}</p>
      <p>
        <strong>Attendees:</strong>{" "}
        {report.attendees?.length
          ? report.attendees.map((attendee) => attendee.user?.username).join(", ")
          : "None"}
      </p>
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
        <Button onClick={handleReview}>Review</Button>
      )}

      {user?.role === "pastor" && report.status === "reviewed" && (
        <>
          <Button onClick={() => setConfirmAction("approve")}>Approve</Button>
          <Button onClick={() => setConfirmAction("reject")}>Reject</Button>
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

      <Button onClick={handleComment}>Send</Button>

      <ConfirmModal
        open={confirmAction === "approve"}
        title="Approve report"
        message="Approve this report now?"
        confirmText="Approve"
        onCancel={() => setConfirmAction("")}
        onConfirm={handleApprove}
      />
      <ConfirmModal
        open={confirmAction === "reject"}
        title="Reject report"
        message="Reject this report now?"
        confirmText="Reject"
        onCancel={() => setConfirmAction("")}
        onConfirm={handleReject}
      />
    </div>
  );
}

export default ReportDetail;
