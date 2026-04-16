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
    <form onSubmit={handleSubmit}>
      <input
        placeholder="Username"
        onChange={(e) => setForm({ ...form, username: e.target.value })}
      />

      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />

      <button type="submit">Login</button>
      {loading && <p>Logging in...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  );
}

export default Login;
