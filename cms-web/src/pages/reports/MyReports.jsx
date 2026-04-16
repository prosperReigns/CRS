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

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await getMyReports();
      setReports(res.data);
    } catch (err) {
      console.error(err);
    }
  };

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