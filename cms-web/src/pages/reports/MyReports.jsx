import { useEffect, useState } from "react";
import { getMyReports } from "../../api/reports";
import ReportDetail from "./ReportDetail";
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
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const data = await getMyReports();
      setReports(data);
      if (!selectedReport && data.length > 0) {
        setSelectedReport(data[0]);
      }
      if (selectedReport) {
        const updated = data.find((report) => report.id === selectedReport.id);
        setSelectedReport(updated || null);
      }
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
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
        <h2 className="text-2xl font-bold text-slate-900">My Reports</h2>
        {reports.map((report) => (
          <div
            key={report.id}
            onClick={() => setSelectedReport(report)}
            className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:border-brand-300 hover:bg-brand-50"
          >
            <p className="font-semibold text-slate-800">
              {report.fellowship_name ? `${report.fellowship_name} / ` : ""}
              {report.cell_name || report.cell}
            </p>
            <p className="text-sm text-slate-600">{report.meeting_date}</p>
            <p className={`text-sm font-semibold capitalize ${getStatusColor(report.status)}`}>Status: {report.status}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-3">
        {selectedReport ? <ReportDetail report={selectedReport} refresh={fetchReports} /> : <EmptyState label="Select a report" />}
      </div>
    </div>
  );
}

export default MyReports;
