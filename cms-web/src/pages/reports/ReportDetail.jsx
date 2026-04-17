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
  const [success, setSuccess] = useState("");
  const [confirmAction, setConfirmAction] = useState("");
  const canComment = ["fellowship_leader", "pastor"].includes(user?.role);
  const canReview = user?.role === "fellowship_leader" && report.status === "pending";
  const canApprove = user?.role === "pastor" && report.status === "reviewed";
  
  const handleApprove = async () => {
    try {
      setError("");
      setSuccess("");
      await approveReport(report.id);
      setConfirmAction("");
      setSuccess("Report approved successfully.");
      refresh();
    } catch (err) {
      setError(err.message || "Failed to approve report.");
    }
  };

  const handleReject = async () => {
    try {
      setError("");
      setSuccess("");
      await rejectReport(report.id);
      setConfirmAction("");
      setSuccess("Report rejected successfully.");
      refresh();
    } catch (err) {
      setError(err.message || "Failed to reject report.");
    }
  };

  const handleReview = async () => {
    try {
      setError("");
      setSuccess("");
      await reviewReport(report.id);
      setSuccess("Report reviewed successfully.");
      refresh();
    } catch (err) {
      setError(err.message || "Failed to review report.");
    }
  };

  const handleComment = async () => {
    if (!comment) return;
    try {
      setError("");
      setSuccess("");
      await addComment(report.id, { comment });
      setComment("");
      setSuccess("Comment added successfully.");
      refresh();
    } catch (err) {
      setError(err.message || "Failed to add comment.");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">Report Details</h2>
      <ErrorState error={error} />
      {success && <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}

      <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p><strong>Fellowship:</strong> {report.fellowship_name || "-"}</p>
        <p><strong>Cell:</strong> {report.cell_name || report.cell}</p>
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
      </div>

      <h3 className="text-lg font-semibold text-slate-900">Images</h3>
      <div className="flex flex-wrap gap-2">
        {report.images?.map((img) => (
          <img key={img.id} src={img.image} width="150" className="rounded-lg border border-slate-200 object-cover" />
        ))}
      </div>

      <h3 className="text-lg font-semibold text-slate-900">Actions</h3>
      <div className="flex flex-wrap gap-2">
      {canReview && (
        <Button onClick={handleReview}>Review</Button>
      )}

      {canApprove && (
        <>
          <Button onClick={() => setConfirmAction("approve")}>Approve</Button>
          <Button onClick={() => setConfirmAction("reject")}>Reject</Button>
        </>
      )}
      </div>

      <h3 className="text-lg font-semibold text-slate-900">Comments</h3>
      {report.comments?.map((c) => (
        <div key={c.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p><strong>{c.author?.username}</strong></p>
          <p className="text-sm text-slate-600">{c.comment}</p>
        </div>
      ))}

      {canComment && (
        <>
          <textarea
            placeholder="Add comment..."
            className="min-h-24 w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none ring-brand-500 focus:ring-2"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button onClick={handleComment}>Send</Button>
        </>
      )}

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
