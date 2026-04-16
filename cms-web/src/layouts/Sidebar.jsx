import { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const linkStyle = {
  display: "block",
  padding: "8px 0",
  color: "#fff",
  textDecoration: "none",
};

function Sidebar() {
  const { user } = useContext(AuthContext);

  if (!user) return null;

  const canManageReports = ["pastor", "staff", "fellowship_leader"].includes(user.role);
  const canViewDashboard = ["pastor", "staff"].includes(user.role);
  const canManageMembers = ["pastor", "staff", "fellowship_leader"].includes(user.role);
  const canMessage = ["pastor", "staff", "fellowship_leader", "cell_leader", "teacher", "member"].includes(
    user.role
  );
  const isFrozen = Boolean(user.is_frozen);

  return (
    <div style={{ width: "220px", background: "#111", color: "#fff", minHeight: "100vh", padding: "16px" }}>
      <h3>ChurchSys</h3>

      {canViewDashboard && !isFrozen && (
        <Link style={linkStyle} to="/dashboard">
          Dashboard
        </Link>
      )}

      {user.role === "cell_leader" && (
        <>
          <Link style={linkStyle} to="/reports/submit">
            Submit Report
          </Link>
          {!isFrozen && (
            <Link style={linkStyle} to="/reports/my">
              My Reports
            </Link>
          )}
        </>
      )}

      {canManageReports && !isFrozen && (
        <Link style={linkStyle} to="/reports/manage">
          {user.role === "fellowship_leader" ? "Review Reports" : "Manage Reports"}
        </Link>
      )}

      {canManageMembers && !isFrozen && (
        <>
          <Link style={linkStyle} to="/members">
            Members
          </Link>
          <Link style={linkStyle} to="/attendance">
            Attendance
          </Link>
        </>
      )}

      {canMessage && !isFrozen && (
        <Link style={linkStyle} to="/messages">
          Messages
        </Link>
      )}
    </div>
  );
}

export default Sidebar;
