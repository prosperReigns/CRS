import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

function Header() {
  const { user, logout } = useContext(AuthContext);

  return (
    <div style={{ padding: "10px", borderBottom: "1px solid #ccc" }}>
      <span>{user?.username} ({user?.role})</span>
      <button onClick={logout} style={{ float: "right" }}>
        Logout
      </button>
    </div>
  );
}

export default Header;