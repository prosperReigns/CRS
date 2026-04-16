import { useEffect, useState } from "react";
import { getDashboardData } from "../../api/analytics";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await getDashboardData();
      setData(res.data);
    } catch (err) {
      setError("Failed to load dashboard data.");
    }
  };

  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!data) return <p>Loading...</p>;

  return (
    <div>
      <h2>Dashboard</h2>

      {/* 🔢 SUMMARY */}
      <div style={{ display: "flex", gap: "20px" }}>
        <div style={{
          padding: "20px",
          border: "1px solid #ccc",
          borderRadius: "10px"
        }}>
          <h4>Total Members</h4>
          <p>{data.members.total}</p>
        </div>
        <div>Active: {data.members.active}</div>
        <div>Inactive: {data.members.inactive}</div>
      </div>

      <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
        <div>Offering: ₦{data.offering_total}</div>
        <div>Souls Won: {data.souls_won}</div>
      </div>

      {/* 📈 Attendance Chart */}
      <h3>Attendance Trend</h3>
      <LineChart width={600} height={300} data={data.attendance_trend}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="week" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="count" />
      </LineChart>

      {/* 💰 Offering Chart */}
      <h3>Offering Trend</h3>
      <BarChart width={600} height={300} data={data.offering_trend}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="week" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="total" />
      </BarChart>

      {/* 🧾 Reports Summary */}
      <h3>Reports</h3>
      <p>Total: {data.reports.total}</p>
      <p>Approved: {data.reports.approved}</p>
      <p>Rejected: {data.reports.rejected}</p>
    </div>
  );
}

export default Dashboard;
