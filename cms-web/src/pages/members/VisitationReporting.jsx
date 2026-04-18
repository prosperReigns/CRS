import { useEffect, useMemo, useState } from "react";
import { getAssignedVisitationFirstTimers, getVisitationReports, submitVisitationReport } from "../../api/members";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import EmptyState from "../../components/ui/EmptyState";

const methodOptions = [
  { value: "calling", label: "Calling" },
  { value: "one_on_one_visitation", label: "One on One Visitation" },
];

function VisitationReporting() {
  const [members, setMembers] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    member: "",
    visitation_date: "",
    visitation_time: "",
    method_used: "calling",
    comment: "",
  });

  useEffect(() => {
    Promise.all([getAssignedVisitationFirstTimers(), getVisitationReports()])
      .then(([memberData, reportData]) => {
        setMembers(memberData);
        setReports(reportData);
      })
      .catch((err) => setError(err.message || "Failed to load visitation form data."))
      .finally(() => setLoading(false));
  }, []);

  const pendingReports = useMemo(() => reports.filter((report) => report.status === "pending"), [reports]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const created = await submitVisitationReport({
        member: Number(form.member),
        visitation_date: form.visitation_date,
        visitation_time: form.visitation_time,
        method_used: form.method_used,
        comment: form.comment.trim(),
      });
      setReports((prev) => [created, ...prev]);
      setForm({
        member: "",
        visitation_date: "",
        visitation_time: "",
        method_used: "calling",
        comment: "",
      });
      setSuccess("Visitation report submitted for review.");
    } catch (err) {
      setError(err.message || "Failed to submit visitation report.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label="Loading visitation reporting form..." />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Visitation Reporting</h2>
        {success && <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}

        {members.length === 0 ? (
          <EmptyState label="No first timers are currently assigned to you for visitation." />
        ) : (
          <>
            <label className="block text-sm text-slate-700">
              First Timer Member
              <select
                required
                value={form.member}
                onChange={(event) => setForm((prev) => ({ ...prev, member: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.user?.username}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm text-slate-700">
                Date
                <input
                  type="date"
                  required
                  value={form.visitation_date}
                  onChange={(event) => setForm((prev) => ({ ...prev, visitation_date: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm text-slate-700">
                Time
                <input
                  type="time"
                  required
                  value={form.visitation_time}
                  onChange={(event) => setForm((prev) => ({ ...prev, visitation_time: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="block text-sm text-slate-700">
              Method Used
              <select
                required
                value={form.method_used}
                onChange={(event) => setForm((prev) => ({ ...prev, method_used: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {methodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm text-slate-700">
              Comment
              <textarea
                required
                value={form.comment}
                onChange={(event) => setForm((prev) => ({ ...prev, comment: event.target.value }))}
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-70"
            >
              {submitting ? "Submitting..." : "Submit for Review"}
            </button>
          </>
        )}
      </form>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">My Pending Visitation Reports</h3>
        {pendingReports.length === 0 ? (
          <EmptyState label="No pending visitation reports." />
        ) : (
          <div className="space-y-2">
            {pendingReports.map((report) => (
              <div key={report.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-medium text-slate-900">{report.member_name}</p>
                <p>
                  {report.visitation_date} {report.visitation_time}
                </p>
                <p>{methodOptions.find((option) => option.value === report.method_used)?.label || report.method_used}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default VisitationReporting;
