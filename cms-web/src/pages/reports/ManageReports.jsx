import { useEffect, useState } from "react";
import { getReports } from "../../api/reports";
import ReportDetail from "./ReportDetail";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import EmptyState from "../../components/ui/EmptyState";
import { getReportTypeLabel } from "./reportType";

function ManageReports() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const data = await getReports();
      setReports(data);
      if (selectedReport) {
        const updated = data.find((r) => r.id === selectedReport.id);
        setSelectedReport(updated || null);
      }
    } catch (err) {
      setError(err.message || "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
        <h2 className="text-2xl font-bold text-slate-900">Reports</h2>
        {loading && <LoadingState label="Loading reports..." />}
        <ErrorState error={error} />
        {!loading && !error && reports.length === 0 && <EmptyState label="No reports found." />}

        {reports.map((r) => (
          <div
            key={r.id}
            onClick={() => setSelectedReport(r)}
            className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:border-brand-300 hover:bg-brand-50"
          >
            <p className="font-semibold text-slate-800">
              {r.fellowship_name ? `${r.fellowship_name} / ` : ""}
              {r.cell_name || r.cell}
            </p>
            <p className="text-sm text-slate-600">{r.meeting_date}</p>
            <p className="text-sm text-slate-600">{getReportTypeLabel(r.report_type)}</p>
            <p className="text-sm capitalize text-slate-600">Status: {r.status}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-3">
        {selectedReport ? <ReportDetail report={selectedReport} refresh={fetchReports} /> : <EmptyState label="Select a report" />}
      </div>
    </div>
  );
}

export default ManageReports;
