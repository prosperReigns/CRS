import { useEffect, useState } from "react";
import { getReports } from "../../api/reports";
import ReportDetail from "./ReportDetail";

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
    <div style={{ display: "flex" }}>
      {/* LEFT: LIST */}
      <div style={{ width: "40%" }}>
        <h2>Reports</h2>
        {loading && <p>Loading reports...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
        {!loading && !error && reports.length === 0 && <p>No reports found.</p>}

        {reports.map((r) => (
          <div
            key={r.id}
            onClick={() => setSelectedReport(r)}
            style={{
              border: "1px solid #ccc",
              margin: "10px",
              padding: "10px",
              cursor: "pointer",
            }}
          >
            <p>{r.cell}</p>
            <p>{r.meeting_date}</p>
            <p>Status: {r.status}</p>
          </div>
        ))}
      </div>

      {/* RIGHT: DETAILS */}
      <div style={{ width: "60%" }}>
        {selectedReport && (
          <ReportDetail report={selectedReport} refresh={fetchReports} />
        )}
      </div>
    </div>
  );
}

export default ManageReports;
