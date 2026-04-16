import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

function Sidebar() {
  const { user } = useContext(AuthContext);

  return (
    <div style={{ width: "200px", background: "#111", color: "#fff", height: "100vh" }}>
      <h3>ChurchSys</h3>

      {user.role === "cell_leader" && (
        <>
          <Link>Submit Report</Link>
          <Link>My Reports</Link>
        </>
      )}

      {(user.role === "pastor" || user.role === "staff") && (
        <>
          <Link>Dashboard</Link>
          <Link>Manage Reports</Link>
          <Link>Members</Link>
          <Link>My Reports</Link>
          <Link>Members</Link>
          <Link>Attendance</Link>
          <Link>Messages</Link>
        </>
      )}

      {user.role === "fellowship_leader" && (
        <>
          <Link>Review Reports</Link>
          <Link>My Reports</Link>
        </>
      )}
    </div>
  );
}

export default Sidebar;