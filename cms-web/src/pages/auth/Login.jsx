import { useState, useContext } from "react";
import { loginUser } from "../../api/auth";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

function Login() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const redirectUser = (currentUser) => {
    if (currentUser?.is_frozen) return "/reports/submit";
    switch (currentUser?.role) {
      case "pastor":
      case "staff":
        return "/dashboard";
      case "fellowship_leader":
        return "/reports/manage";
      case "cell_leader":
        return "/reports/submit";
      case "teacher":
      case "member":
        return "/messages";
      default:
        return "/login";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await loginUser(form);
      login(data);
      navigate(redirectUser(data.user));
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-brand-700 p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Welcome back</h1>

        <div className="space-y-4">
          <input
            placeholder="Username"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none ring-brand-500 transition focus:ring-2"
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none ring-brand-500 transition focus:ring-2"
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        <button
          type="submit"
          className="mt-6 w-full rounded-lg bg-slate-600 px-4 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
        {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </form>
    </div>
  );
}

export default Login;
