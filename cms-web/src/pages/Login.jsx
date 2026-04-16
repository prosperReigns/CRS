import { useState } from "react";
import { loginUser } from "../api/auth";
import { setAuth } from "../utils/auth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [form, setForm] = useState({ username: "", password: "" });
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await loginUser(form);
      setAuth(res.data);

      // 🔥 Role-based redirect
      const role = res.data.user.role;

      if (role === "pastor" || role === "staff") {
        navigate("/dashboard");
      } else if (role === "fellowship_leader") {
        navigate("/reports");
      } else {
        navigate("/my-reports");
      }

    } catch (err) {
      alert("Login failed");
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-3">
      <input
        placeholder="Username"
        className="border p-2"
        onChange={(e) => setForm({ ...form, username: e.target.value })}
      />

      <input
        type="password"
        placeholder="Password"
        className="border p-2"
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />

      <button
        className="bg-blue-500 text-white px-4 py-2"
        onClick={handleLogin}
      >
        Login
      </button>
    </div>
  );
}