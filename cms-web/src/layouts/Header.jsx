import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

function Header() {
  const { user, logout } = useContext(AuthContext);

  return (
    <div style={{ padding: "10px", borderBottom: "1px solid #ccc" }}>
      <span>{user?.username} ({user?.role})</span>
      {user?.is_frozen && (
        <span style={{ marginLeft: "12px", color: "#b45309" }}>
          Your account is temporarily restricted. Please submit your pending report.
        </span>
      )}
      <button onClick={logout} style={{ float: "right" }}>
        Logout
      </button>
    </div>
  );
}

export default Header;
