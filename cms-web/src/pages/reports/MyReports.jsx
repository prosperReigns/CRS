import { useEffect, useState } from "react";
import { getMyReports } from "../../api/reports";


const getStatusColor = (status) => {
  switch (status) {
    case "approved":
      return "green";
    case "rejected":
      return "red";
    case "reviewed":
      return "orange";
    default:
      return "gray";
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

  if (loading) return <p>Loading reports...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (reports.length === 0) return <p>No reports submitted yet.</p>;

  return (
    <div>
      <h2>My Reports</h2>

      {reports.map((r) => (
        <div key={r.id} style={{ border: "1px solid #ccc", margin: "10px" }}>
          <p>Date: {r.meeting_date}</p>
          <p>Attendance: {r.attendance_count}</p>
          <p style={{ color: getStatusColor(r.status) }}>
            Status: {r.status}
          </p>

          {/* Images */}
          {r.images?.map((img) => (
            <img
              key={img.id}
              src={img.image}
              alt=""
              width="100"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default MyReports;
