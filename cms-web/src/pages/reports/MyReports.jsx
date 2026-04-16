import { useEffect, useState } from "react";
import { getMyReports } from "../../api/reports";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import EmptyState from "../../components/ui/EmptyState";


const getStatusColor = (status) => {
  switch (status) {
    case "approved":
      return "text-emerald-600";
    case "rejected":
      return "text-red-600";
    case "reviewed":
      return "text-amber-600";
    default:
      return "text-slate-500";
  }
};

function MyReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const data = await getMyReports();
      setReports(data);
    } catch (err) {
      setError(err.message || "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState label="Loading reports..." />;
  if (error) return <ErrorState error={error} />;
  if (reports.length === 0) return <EmptyState label="No reports submitted yet." />;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">My Reports</h2>

      {reports.map((r) => (
        <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-600">Date: {r.meeting_date}</p>
          <p className="text-sm text-slate-600">Attendance: {r.attendance_count}</p>
          <p className="text-sm text-slate-600">
            Attendees: {r.attendees?.length ? r.attendees.map((attendee) => attendee.user?.username).join(", ") : "-"}
          </p>
          <p className={`mt-2 font-semibold capitalize ${getStatusColor(r.status)}`}>
            Status: {r.status}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {r.images?.map((img) => (
              <img key={img.id} src={img.image} alt="" width="100" className="rounded-lg border border-slate-200 object-cover" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MyReports;
