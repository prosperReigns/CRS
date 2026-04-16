import { useEffect, useState } from "react";
import { getReports } from "../../api/reports";
import ReportDetail from "./ReportDetail";

function ManageReports() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    const res = await getReports();
    setReports(res.data);
  };

  return (
    <div style={{ display: "flex" }}>
      {/* LEFT: LIST */}
      <div style={{ width: "40%" }}>
        <h2>Reports</h2>

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