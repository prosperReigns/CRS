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
  ResponsiveContainer,
} from "recharts";
import LoadingState from "../../components/ui/LoadingState";
import ErrorState from "../../components/ui/ErrorState";
import EmptyState from "../../components/ui/EmptyState";

function Dashboard({ title = "Dashboard" }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const responseData = await getDashboardData();
      setData(responseData);
    } catch (err) {
      setError(err.message || "Failed to load dashboard data.");
    }
  };

  if (error) return <ErrorState error={error} />;
  if (!data) return <LoadingState />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="text-sm font-medium text-slate-500">Membership Strength</h4>
          <p className="mt-2 text-3xl font-bold text-slate-900">{data.membership?.strength ?? data.members.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="text-sm font-medium text-slate-500">Visitors</h4>
          <p className="mt-2 text-3xl font-bold text-amber-600">{data.membership?.visitors ?? 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="text-sm font-medium text-slate-500">First Timers</h4>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{data.membership?.first_timers ?? 0}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="text-sm font-medium text-slate-500">Total Offering</h4>
          <p className="mt-2 text-3xl font-bold text-brand-600">₦{data.offering_total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="text-sm font-medium text-slate-500">Membership Growth Rate</h4>
          <p className="mt-2 text-3xl font-bold text-slate-900">{data.membership?.growth_rate ?? 0}%</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-lg font-semibold text-slate-900">Attendance Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.attendance_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-lg font-semibold text-slate-900">Attendance by Service</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.services || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="attendance" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-lg font-semibold text-slate-900">Daily Total Attendance</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.daily_total_attendance || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="attendance" stroke="#0ea5e9" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-lg font-semibold text-slate-900">Offering Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.offering_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="meeting_date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#14b8a6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-lg font-semibold text-slate-900">Reports</h3>
          <p className="text-slate-700">Total: {data.report_stats.total}</p>
          <p className="text-emerald-700">Approved: {data.report_stats.approved}</p>
          <p className="text-red-700">Rejected: {data.report_stats.rejected}</p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-lg font-semibold text-slate-900">Top Cells</h3>
          {data.top_cells?.length ? (
            <div className="space-y-2">
              {data.top_cells.map((cell) => (
                <p key={cell.cell_id} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                  {cell.cell_name} - Members: {cell.member_count ?? 0}, Visitors: {cell.visitor_count ?? 0}, First Timers:{" "}
                  {cell.first_timer_count ?? 0}
                </p>
              ))}
            </div>
          ) : (
            <EmptyState label="No top cell data yet." />
          )}
        </section>
      </div>
    </div>
  );
}

export default Dashboard;
